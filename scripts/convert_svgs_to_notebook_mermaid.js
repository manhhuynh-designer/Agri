const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Read topics
const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      // Ignore stderr logs
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
      clientInfo: { name: 'mermaid-converter-client', version: '1.0.0' }
    });
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');
    await this.sendRequest('tools/call', { name: 'refresh_auth', arguments: {} });
  }

  async callTool(name, toolArgs = {}) {
    const result = await this.sendRequest('tools/call', { name, arguments: toolArgs });
    if (result && result.content && result.content.length > 0) {
      return result.content[0].text;
    }
    return '';
  }

  close() {
    this.child.kill();
  }
}

async function run() {
  console.log('Starting NotebookLM Mermaid Converter...');
  const client = new McpClient();
  await sleep(4000); // Wait for connection

  console.log('Initializing MCP Server Handshake...');
  await client.initialize();
  console.log('MCP Handshake Completed.');

  for (const topic of topics) {
    const files = fs.readdirSync(POSTS_DIR);
    const postFile = files.find(file => file.includes(topic.id) && file.endsWith('.md'));
    
    if (!postFile) {
      console.warn(`Post file for topic ID "${topic.id}" not found in _posts. Skipping.`);
      continue;
    }

    const postPath = path.join(POSTS_DIR, postFile);
    let postContent = fs.readFileSync(postPath, 'utf-8');

    // Check if the post already has a mermaid diagram
    if (postContent.includes('class="mermaid"')) {
      console.log(`[${topic.title}] Post already contains a Mermaid diagram.`);
      continue;
    }

    console.log(`\n--------------------------------------------------`);
    console.log(`Querying NotebookLM for Mermaid diagram for topic: "${topic.title}"...`);
    
    try {
      const query = `Hãy thiết kế một sơ đồ quy trình hoặc sơ đồ tư duy bằng mã nguồn Mermaid.js (dạng graph TD hoặc graph LR) để trực quan hóa chủ đề: "${topic.title}".
Hãy phân tích và trích xuất cấu trúc các bước và mối quan hệ trực tiếp từ tài liệu nguồn.
Yêu cầu:
1. Mã nguồn Mermaid.js phải nằm trong khối \`\`\`mermaid ... \`\`\`.
2. Sử dụng tiếng Việt rõ ràng cho nhãn các nút.
3. Chỉ trả về khối mã Mermaid.js, không thêm văn bản giải thích nào khác ở đầu hoặc cuối.`;

      const response = await client.callTool('notebook_query', {
        notebook_id: NOTEBOOK_ID,
        query: query
      });

      // Extract the mermaid code block from the response
      const mermaidMatch = response.match(/```mermaid([\s\S]*?)```/);
      if (!mermaidMatch) {
        console.warn(`Failed to extract Mermaid code block for topic: "${topic.title}". Response was:`, response);
        continue;
      }

      const mermaidCode = mermaidMatch[1].trim();

      // Unescape escaped strings (newlines, quotes, etc.) directly in memory
      let unescapedMermaid = mermaidCode
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\r/g, '');
      
      unescapedMermaid = unescapedMermaid.trim();

      // Wrap unquoted subgraph names with spaces in quotes on separate lines
      const subgraphRegex = /subgraph\s+([^"\r\n]+)$/gm;
      unescapedMermaid = unescapedMermaid.replace(subgraphRegex, (match, p1) => {
        const trimmed = p1.trim();
        if (trimmed.includes(' ') && !trimmed.startsWith('"')) {
          return `subgraph "${trimmed}"`;
        }
        return match;
      });

      // Replace the SVG diagram card block
      const diagramCardRegex = /<div class="diagram-card">[\s\S]*?<\/div>/;
      
      if (diagramCardRegex.test(postContent)) {
        const updatedCard = `<div class="diagram-card">
<div class="mermaid">
${unescapedMermaid}
</div>
</div>`;
        postContent = postContent.replace(diagramCardRegex, updatedCard);
        fs.writeFileSync(postPath, postContent, 'utf-8');
        console.log(`Successfully updated post [${postFile}] with native NotebookLM Mermaid diagram!`);
      } else {
        // Fallback: Insert before the first H2 header (## )
        const firstH2Index = postContent.indexOf('\n## ');
        if (firstH2Index !== -1) {
          const updatedCard = `\n<div class="diagram-card">
<div class="mermaid">
${unescapedMermaid}
</div>
</div>\n`;
          postContent = postContent.slice(0, firstH2Index) + updatedCard + postContent.slice(firstH2Index);
          fs.writeFileSync(postPath, postContent, 'utf-8');
          console.log(`Successfully appended native NotebookLM Mermaid diagram to post [${postFile}] before the first H2!`);
        } else {
          console.warn(`Warning: No H2 heading found in post [${postFile}] to append diagram.`);
        }
      }

    } catch (err) {
      console.error(`Error querying diagram for "${topic.title}":`, err.message);
    }

    await sleep(2000); // Small cooldown between requests
  }

  client.close();
  console.log('\nAll done! Exiting.');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error running script:', err);
  process.exit(1);
});
