const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const NOTEBOOK_ID = '47861196-dfb2-42e4-8dcd-cfc9eeb28ced';
const TOPICS_FILE = path.join(__dirname, '..', '_data', 'topics.json');
const POSTS_DIR = path.join(__dirname, '..', '_posts');

// Helper to format date as YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 1. Read topics and find an unwritten one
if (!fs.existsSync(TOPICS_FILE)) {
  console.error('Error: topics.json not found!');
  process.exit(1);
}

const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
const postFiles = fs.readdirSync(POSTS_DIR);

let selectedTopic = null;
for (const topic of topics) {
  const hasBeenWritten = postFiles.some(file => file.includes(topic.id));
  if (!hasBeenWritten) {
    selectedTopic = topic;
    break;
  }
}

if (!selectedTopic) {
  console.log('All topics have been written! Selecting a random one.');
  selectedTopic = topics[Math.floor(Math.random() * topics.length)];
}

console.log(`Selected Topic: "${selectedTopic.title}" (ID: ${selectedTopic.id})`);

// Map topics to existing images
const imageMapping = {
  'u-phan-chuong-hoai-muc': '/assets/images/than_sinh_hoc_biochar.png',
  'quan-ly-dich-hai-ipm': '/assets/images/thien_dich_vuon_huu_co.png',
  'cay-che-phu-dat-phu-xanh': '/assets/images/cach_mang_mot_cong_rom.png',
  'mo-hinh-luan-canh-xen-canh': '/assets/images/thiet_ke_permaculture.png',
  'he-sinh-thai-vac-truyen-thong': '/assets/images/thiet_ke_permaculture.png',
  'ky-thuat-trong-rau-sach-huu-co': '/assets/images/nong_nghiep_quy_mo_nho.png',
  'thuoc-tru-sau-thao-moc': '/assets/images/thien_dich_vuon_huu_co.png',
  'vi-sinh-vat-ban-dia-imo': '/assets/images/than_sinh_hoc_biochar.png'
};
const selectedImage = imageMapping[selectedTopic.id] || '/assets/images/cach_mang_mot_cong_rom.png';

// 2. Start MCP server
const child = spawn('npx', ['notebooklm-mcp-server', 'server'], {
  shell: true
});

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

child.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`MCP Server exited with code ${code}`);
    process.exit(code);
  }
});

function tryParseMessages() {
  const lines = buffer.split('\n');
  buffer = lines.pop();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (e) {
      // not JSON
    }
  }
}

function send(method, params = {}, id = null) {
  const msg = { jsonrpc: '2.0', method, params };
  if (id !== null) msg.id = id;
  child.stdin.write(JSON.stringify(msg) + '\n');
}

// Start handshake
send('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'cron-client', version: '1.0.0' }
}, messageId++);

function handleMessage(msg) {
  if (msg.error) {
    console.error('Server Error:', JSON.stringify(msg.error, null, 2));
    child.kill();
    process.exit(1);
  }

  if (msg.id === 1) {
    // Initialized, refresh auth
    send('notifications/initialized');
    send('tools/call', {
      name: 'refresh_auth',
      arguments: {}
    }, 2);
  } 
  else if (msg.id === 2) {
    // Auth refreshed, now query NotebookLM
    console.log('Sending query to NotebookLM...');
    const queryText = `Viết một bài viết blog kỹ thuật chi tiết bằng tiếng Việt về chủ đề: "${selectedTopic.title}".
    Yêu cầu cụ thể:
    1. Sử dụng định dạng Markdown Jekyll có Front Matter đầy đủ ở đầu bài viết:
       layout: post
       title: "${selectedTopic.title}"
       categories: [${selectedTopic.categories.join(', ')}]
       tags: [${selectedTopic.categories.concat(['Hữu cơ']).join(', ')}]
       image: ${selectedImage}
       description: Mô tả ngắn gọn của bài viết trong 1-2 câu.
    2. Ngay đầu bài viết, trước nội dung chính, bắt buộc phải có khối cảnh báo:
       > [!WARNING]
       > **⚠️ Lưu ý:** Nội dung bài viết này được hỗ trợ khởi tạo bởi AI, vui lòng kiểm chứng lại các thông tin kỹ thuật trước khi áp dụng vào thực tế sản xuất.
    3. Viết nội dung kỹ thuật chi tiết, có phân chia các tiêu đề H2 rõ ràng (sử dụng định dạng ## Tiêu đề).
    4. Trong thân bài, hãy dẫn chứng nguồn rõ ràng từ tài liệu bằng cách ghi tên tài liệu hoặc số trích dẫn trong ngoặc vuông (ví dụ: [Nguồn: Giáo trình Nông nghiệp hữu cơ]).
    5. Ở cuối bài, ghi rõ phần nguồn trích dẫn từ Giáo trình Nông nghiệp hữu cơ.
    Hãy trả về TRỰC TIẾP nội dung bài viết Markdown, không thêm bất kỳ văn bản giải thích nào khác ở đầu hoặc cuối kết quả.`;

    send('tools/call', {
      name: 'notebook_query',
      arguments: {
        notebook_id: NOTEBOOK_ID,
        query: queryText
      }
    }, 100);
  } 
  else if (msg.id === 100) {
    // NotebookLM response received
    let content = '';
    if (msg.result && msg.result.content && msg.result.content[0]) {
      content = msg.result.content[0].text;
    } else {
      console.error('Error: Empty response from NotebookLM.');
      child.kill();
      process.exit(1);
    }

    // Clean up content (remove ```markdown blocks if present)
    content = content.replace(/^```markdown\s*/i, '');
    content = content.replace(/^```html\s*/i, '');
    content = content.replace(/```\s*$/, '');
    content = content.trim();

    // Append YouTube link if present
    if (selectedTopic.youtube) {
      const ytSection = `\n\n---
### Dẫn nguồn & Tài liệu tham khảo
- **Nguồn trích dẫn:** Giáo trình Nông nghiệp hữu cơ (Dựa trên tài liệu tham khảo chính thức của notebook).
- **Video Youtube tham khảo:** Bạn có thể tham khảo thêm nội dung qua video tại đây:
  [Video hướng dẫn chi tiết](${selectedTopic.youtube})`;
      
      // If content already has a references section, append to it, otherwise add at the end
      if (!content.includes('Tài liệu tham khảo') && !content.includes('Dẫn nguồn')) {
        content += ytSection;
      } else {
        content += `\n- **Video Youtube tham khảo:** [Xem video hướng dẫn chi tiết](${selectedTopic.youtube})`;
      }
    }

    // Write file
    const todayStr = getTodayString();
    const filename = `${todayStr}-${selectedTopic.id}.md`;
    const filepath = path.join(POSTS_DIR, filename);

    fs.writeFileSync(filepath, content);
    console.log(`Successfully generated and saved daily post to: _posts/${filename}`);

    child.kill();
  }
}
