const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOPICS_FILE = path.join(__dirname, '..', '_data', 'topics.json');
const POSTS_DIR = path.join(__dirname, '..', '_posts');
const NOTEBOOK_ID = '47861196-dfb2-42e4-8dcd-cfc9eeb28ced';

async function main() {
  // 1. Gather all existing slugs to avoid duplication
  const postFiles = fs.readdirSync(POSTS_DIR);
  const existingSlugs = [];
  postFiles.forEach(file => {
    const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
    existingSlugs.push(slug);
  });

  const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
  topics.forEach(t => existingSlugs.push(t.id));

  console.log('Spawning MCP Server to generate a new topic...');
  const child = spawn('npx', ['notebooklm-mcp-server', 'server'], { shell: true });
  
  let buffer = '';
  let messageId = 1;
  
  child.stdout.on('data', (data) => {
    buffer += data.toString();
    tryParseMessages();
  });

  child.stderr.on('data', (data) => {
    if (data.toString().includes('Error')) {
      console.error('STDERR:', data.toString().trim());
    }
  });

  function send(method, params = {}, id = null) {
    const msg = { jsonrpc: '2.0', method, params };
    if (id !== null) msg.id = id;
    child.stdin.write(JSON.stringify(msg) + '\n');
  }

  function tryParseMessages() {
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        handleMessage(msg);
      } catch (e) {}
    }
  }

  send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'topic-generator', version: '1.0.0' }
  }, messageId++);

  function handleMessage(msg) {
    if (msg.error) {
      console.error('Server Error:', JSON.stringify(msg.error, null, 2));
      child.kill();
      process.exit(1);
    }

    if (msg.id === 1) {
      send('notifications/initialized');
      send('tools/call', { name: 'refresh_auth', arguments: {} }, 2);
    } 
    else if (msg.id === 2) {
      console.log('Querying NotebookLM for a new topic...');
      const queryText = `Hãy đề xuất 1 chủ đề học tập/nông nghiệp hữu cơ độc đáo mới dựa trên tài liệu của chúng ta, hoàn toàn khác và không tương tự với danh sách các ID chủ đề sau: [${existingSlugs.join(', ')}].
      Trả về duy nhất một chuỗi JSON hợp lệ theo định dạng sau:
      {
        "id": "slug-viet-lien-khong-dau-ngan-gon",
        "title": "Tiêu đề chủ đề tiếng Việt ngắn gọn và hay",
        "prompt": "Mô tả chi tiết yêu cầu viết bài cho chủ đề này",
        "youtube": "link_youtube_viet_nam_lien_quan_truc_tiep_neu_co_khong_thi_de_trong",
        "categories": ["Thể loại 1", "Thể loại 2"]
      }
      Lưu ý: Chỉ trả về chuỗi JSON, không thêm bất kỳ định dạng codeblock hay giải thích nào khác.`;
      
      send('tools/call', {
        name: 'notebook_query',
        arguments: {
          notebook_id: NOTEBOOK_ID,
          query: queryText
        }
      }, 100);
    }
    else if (msg.id === 100) {
      let content = '';
      if (msg.result && msg.result.content && msg.result.content[0]) {
        content = msg.result.content[0].text;
      }
      
      try {
        const parsed = JSON.parse(content);
        if (parsed.answer) {
          content = parsed.answer;
        }
      } catch(e) {}

      // Clean markdown code blocks if wrapped
      content = content.replace(/^```json\s*/i, '');
      content = content.replace(/^```\s*/i, '');
      content = content.replace(/```\s*$/, '');
      content = content.trim();

      try {
        const newTopic = JSON.parse(content);
        if (newTopic.id && newTopic.title) {
          console.log(`\nFound new topic: "${newTopic.title}" (ID: ${newTopic.id})`);
          topics.push(newTopic);
          fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));
          console.log('Successfully appended new topic to topics.json.');
          child.kill();
          process.exit(0);
        } else {
          throw new Error('Invalid topic structure returned.');
        }
      } catch (e) {
        console.error('Error parsing JSON returned from NotebookLM:', e.message);
        console.error('Raw content received:', content);
        child.kill();
        process.exit(1);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
