const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
      process.env[parts[0].trim()] = parts[1].trim();
    }
  });
}

const NOTEBOOK_ID = '47861196-dfb2-42e4-8dcd-cfc9eeb28ced';
const TOPICS_FILE = path.join(__dirname, '..', '_data', 'topics.json');
const POSTS_DIR = path.join(__dirname, '..', '_posts');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images', 'infographics');

// Ensure output directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read topics
const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Spawns the MCP server and communicates with it
class McpClient {
  constructor() {
    this.child = spawn('npx', ['notebooklm-mcp-server', 'server'], { shell: true });
    this.buffer = '';
    this.messageId = 1;
    this.pendingRequests = new Map();

    this.child.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.tryParseMessages();
    });

    this.child.stderr.on('data', (data) => {
      // Forward warning/error logs if needed
    });
  }

  tryParseMessages() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.id && this.pendingRequests.has(parsed.id)) {
          const { resolve, reject } = this.pendingRequests.get(parsed.id);
          this.pendingRequests.delete(parsed.id);
          if (parsed.error) {
            reject(parsed.error);
          } else {
            resolve(parsed.result);
          }
        }
      } catch (e) {
        // Not JSON
      }
    }
  }

  sendNotification(method, params = {}) {
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });
      this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  async initialize() {
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'infographic-client', version: '1.0.0' }
    });
    this.sendNotification('notifications/initialized');
    await this.sendRequest('tools/call', { name: 'refresh_auth', arguments: {} });
  }

  async callTool(name, toolArgs = {}) {
    const result = await this.sendRequest('tools/call', { name, arguments: toolArgs });
    if (result && result.content && result.content.length > 0) {
      try {
        return JSON.parse(result.content[0].text);
      } catch (e) {
        return result.content[0].text;
      }
    }
    return result;
  }

  close() {
    this.child.kill();
  }
}

async function run() {
  console.log('Starting NotebookLM Infographic Generator...');
  const client = new McpClient();
  await sleep(4000); // Wait for connection

  console.log('Initializing MCP Server Handshake...');
  await client.initialize();
  console.log('MCP Handshake Completed.');

  for (const topic of topics) {
    const imageDest = path.join(IMAGES_DIR, `${topic.id}.png`);
    
    // Check if the image already exists
    if (fs.existsSync(imageDest)) {
      console.log(`[${topic.title}] Infographic already exists, checking if post needs update...`);
      updatePostFile(topic.id);
      continue;
    }

    console.log(`\n--------------------------------------------------`);
    console.log(`Generating Infographic for: "${topic.title}"...`);
    
    try {
      // 0. Clear any existing infographics to free the slot
      console.log('Checking for existing infographic artifacts in the studio...');
      const prePoll = await client.callTool('studio_poll', { notebook_id: NOTEBOOK_ID });
      const preArtifacts = prePoll.artifacts || [];
      const existingInfographics = preArtifacts.filter(art => art.type === 'infographic');
      
      for (const art of existingInfographics) {
        console.log(`Deleting old infographic artifact "${art.title}" (ID: ${art.artifact_id}) to free the slot...`);
        await client.callTool('studio_delete', {
          notebook_id: NOTEBOOK_ID,
          artifact_id: art.artifact_id
        });
        await sleep(2000);
      }

      // 1. Create infographic
      const createRes = await client.callTool('infographic_create', {
        notebook_id: NOTEBOOK_ID,
        language: 'vi',
        focus_prompt: `Sơ đồ và quy trình chi tiết về: ${topic.title}. Đảm bảo các thông tin kỹ thuật được diễn giải trực quan.`
      });

      console.log(`Infographic task created. Polling Google Studio status...`);

      // 2. Poll status
      let mediaUrl = null;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max

      while (attempts < maxAttempts) {
        attempts++;
        await sleep(10000); // Poll every 10 seconds

        const pollRes = await client.callTool('studio_poll', { notebook_id: NOTEBOOK_ID });
        const artifacts = pollRes.artifacts || [];
        
        // Find matching infographic artifact
        const matches = artifacts.filter(art => art.type === 'infographic');
        
        // Let's print the progress status of active infographics
        const completedArt = matches.find(art => art.status === 'completed' && art.media_url);
        
        if (completedArt) {
          mediaUrl = completedArt.media_url;
          console.log(`Found completed infographic with URL: ${mediaUrl}`);
          break;
        } else {
          console.log(`Waiting for infographic to compile (Attempt ${attempts}/${maxAttempts})...`);
        }
      }

      if (!mediaUrl) {
        throw new Error('Infographic generation timed out or no image URL returned.');
      }

      // 3. Download the infographic image
      console.log(`Downloading high-resolution infographic to: ${imageDest}`);
      await downloadImage(mediaUrl, imageDest);
      console.log(`Download completed successfully. Size: ${fs.statSync(imageDest).size} bytes`);

      // 4. Update the markdown post file
      updatePostFile(topic.id);

    } catch (err) {
      console.error(`Error generating infographic for topic "${topic.title}":`, err.message);
    }
  }

  client.close();
  console.log('\nAll done! Exiting.');
  process.exit(0);
}

function updatePostFile(topicId) {
  // Find the post file in _posts
  const files = fs.readdirSync(POSTS_DIR);
  const postFile = files.find(file => file.includes(topicId) && file.endsWith('.md'));
  
  if (!postFile) {
    console.warn(`Warning: Post file for topic ID "${topicId}" not found in _posts.`);
    return;
  }

  const postPath = path.join(POSTS_DIR, postFile);
  let content = fs.readFileSync(postPath, 'utf-8');

  // Regex to match the <div class="diagram-card">...</div> block containing <svg>
  const diagramCardRegex = /<div class="diagram-card">[\s\S]*?<\/div>/;
  
  if (diagramCardRegex.test(content)) {
    const updatedCard = `<div class="diagram-card">
  <img src="/assets/images/infographics/${topicId}.png" alt="Sơ đồ quy trình NotebookLM" class="diagram-img">
</div>`;
    
    // Check if it's already an image tag or if it contains <svg
    if (content.includes(`<img src="/assets/images/infographics/${topicId}.png"`)) {
      console.log(`Post [${postFile}] is already updated with the infographic image.`);
    } else {
      content = content.replace(diagramCardRegex, updatedCard);
      fs.writeFileSync(postPath, content, 'utf-8');
      console.log(`Successfully updated post [${postFile}] with the new infographic image.`);
    }
  } else {
    console.warn(`Note: No diagram-card container found in post [${postFile}].`);
  }
}

run().catch(err => {
  console.error('Fatal error running script:', err);
  process.exit(1);
});
