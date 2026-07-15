const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Manually load .env file if it exists (avoids adding npm dependencies)
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

// Helper to format date as YYYY-MM-DD
function getNextPostDateString() {
  const postFiles = fs.readdirSync(POSTS_DIR);
  let latestDate = new Date();
  postFiles.forEach(file => {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})-/);
    if (match) {
      const fileDate = new Date(match[1]);
      if (fileDate > latestDate) {
        latestDate = fileDate;
      }
    }
  });
  
  // Increment by 1 day
  latestDate.setDate(latestDate.getDate() + 1);
  
  const year = latestDate.getFullYear();
  const month = String(latestDate.getMonth() + 1).padStart(2, '0');
  const day = String(latestDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Dependency-free YouTube link verification using YouTube's oEmbed API
function verifyYoutubeLink(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    https.get(oembedUrl, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', (err) => {
      console.error(`[YouTube Verification] Connection error for ${url}:`, err.message);
      resolve(false);
    });
  });
}

// Helper to extract YouTube video ID from various URL formats
function getYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Pexels API Helper to fetch high-quality images
function fetchPexelsImages(query, perPage = 5) {
  return new Promise((resolve) => {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      console.warn('[Pexels] Warning: PEXELS_API_KEY not found in environment variables.');
      return resolve([]);
    }
    
    // Choose a random page between 1 and 20 for variety
    const page = Math.floor(Math.random() * 20) + 1;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;
    
    const options = {
      headers: {
        'Authorization': apiKey
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.photos && parsed.photos.length > 0) {
            const urls = parsed.photos.map(p => p.src.large2x || p.src.large || p.src.original);
            resolve(urls);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error('[Pexels] Connection error:', err.message);
      resolve([]);
    });
  });
}

const pexelsSearchQueries = {
  'u-phan-chuong-hoai-muc': 'organic compost soil',
  'quan-ly-dich-hai-ipm': 'beneficial insects garden',
  'cay-che-phu-dat-phu-xanh': 'cover crops agriculture',
  'mo-hinh-luan-canh-xen-canh': 'crop rotation farm',
  'he-sinh-thai-vac-truyen-thong': 'integrated farming agriculture',
  'ky-thuat-trong-rau-sach-huu-co': 'vegetable garden organic',
  'thuoc-tru-sau-thao-moc': 'organic pest control',
  'vi-sinh-vat-ban-dia-imo': 'soil microbes agriculture'
};

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

function generateSvgPlaceholder(topicId, title) {
  // Curated premium gradients
  const gradients = [
    { start: '#11998e', end: '#38ef7d' }, // Emerald
    { start: '#373B44', end: '#4286f4' }, // Midnight Blue
    { start: '#8A2387', end: '#E94057' }, // Sunset Violet
    { start: '#f12711', end: '#f5af19' }, // Warm Sun
    { start: '#0F2027', end: '#203A43' }, // Dark Forest
    { start: '#1e3c72', end: '#2a5298' }  // Ocean Blue
  ];
  
  let hash = 0;
  for (let i = 0; i < topicId.length; i++) {
    hash = topicId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const grad = gradients[Math.abs(hash) % gradients.length];
  
  const words = title.split(' ');
  let lines = [];
  let currentLine = '';
  words.forEach(word => {
    if ((currentLine + word).length > 25) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine) lines.push(currentLine.trim());
  
  let textY = 220 - (lines.length - 1) * 30;
  let textElements = lines.map((line, idx) => {
    return `<text x="400" y="${textY + idx * 60}" fill="#ffffff" font-family="'Archivo', 'Segoe UI', sans-serif" font-weight="900" font-size="32" text-anchor="middle">${line}</text>`;
  }).join('\n    ');

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${grad.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${grad.end};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <rect width="800" height="500" fill="url(#grad)" />
  <path d="M -50 550 Q 200 400 400 500 T 850 -50 L 850 550 Z" fill="#ffffff" fill-opacity="0.05" />
  <path d="M -50 550 Q 100 300 300 450 T 850 150 L 850 550 Z" fill="#ffffff" fill-opacity="0.03" />
  
  <rect x="80" y="80" width="640" height="340" rx="16" fill="#1c1917" fill-opacity="0.4" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2" filter="url(#shadow)" />
  
  <g transform="translate(400, 130) scale(0.6)">
    <path d="M 0,-40 L 12,-12 L 40,-12 L 18,6 L 26,34 L 0,16 L -26,34 L -18,6 L -40,-12 L -12,-12 Z" fill="#FBBF24" />
  </g>
  
  <g filter="url(#shadow)">
    ${textElements}
  </g>
  
  <text x="400" y="400" fill="#ffffff" fill-opacity="0.6" font-family="'JetBrains Mono', monospace" font-size="14" letter-spacing="0.2em" text-anchor="middle">AGRISYNTHE JOURNAL</text>
</svg>`;

  const filename = `generated_${topicId}.svg`;
  const relativePath = `/assets/images/${filename}`;
  const absolutePath = path.join(__dirname, '..', 'public', 'assets', 'images', filename);
  
  fs.writeFileSync(absolutePath, svgContent);
  console.log(`[Image Generator] Generated beautiful custom SVG fallback at: ${relativePath}`);
  return relativePath;
}

async function main() {
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

  // 2. Fetch 5 random agriculture images from Pexels for the Hero Section carousel
  console.log('Fetching 5 new Pexels images for the homepage Hero section...');
  const heroUrls = await fetchPexelsImages('sustainable agriculture', 5);
  if (heroUrls.length > 0) {
    const dataDir = path.join(__dirname, '..', '_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    fs.writeFileSync(path.join(dataDir, 'hero_images.json'), JSON.stringify(heroUrls, null, 2));
    console.log('Successfully updated _data/hero_images.json with 5 Pexels images.');
  }

  // 3. Fetch a custom Pexels background image for the specific post
  console.log(`Fetching custom post background image for query: "${pexelsSearchQueries[selectedTopic.id] || 'organic farming'}"...`);
  const topicPhotos = await fetchPexelsImages(pexelsSearchQueries[selectedTopic.id] || 'organic farming', 1);
  let selectedImage = (topicPhotos && topicPhotos[0]) ? topicPhotos[0] : null;
  if (!selectedImage) {
    selectedImage = generateSvgPlaceholder(selectedTopic.id, selectedTopic.title);
  }
  console.log(`Using post image: ${selectedImage}`);

  // 4. Verify YouTube link
  const isValidYt = await verifyYoutubeLink(selectedTopic.youtube);
  if (isValidYt) {
    console.log(`[YouTube Verification] Link is ACTIVE and valid: ${selectedTopic.youtube}`);
  } else {
    console.warn(`[YouTube Verification] Warning: Link is BROKEN or inactive: ${selectedTopic.youtube}. It will be omitted.`);
    selectedTopic.youtube = null;
  }

  // 5. Query NotebookLM
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

  // Handshake
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
      send('notifications/initialized');
      send('tools/call', {
        name: 'refresh_auth',
        arguments: {}
      }, 2);
    } 
    else if (msg.id === 2) {
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
      4. Trong thân bài, để việc đọc được liền mạch và không bị sao nhãng, các thông tin cần dẫn chứng nguồn bắt buộc phải được đánh số thứ tự tăng dần đặt trong ngoặc vuông (ví dụ: [1], [2], [3]...). Tuyệt đối không ghi trực tiếp tên tài liệu hay tên tác giả bên trong các câu viết của thân bài.
      5. Ở cuối bài viết, tạo mục "Tài liệu trích dẫn chi tiết" liệt kê đầy đủ thông tin nguồn gốc tương ứng với các số thứ tự trên theo định dạng danh sách:
         - [1] Tên tài liệu, Tác giả, Chương, Trang.
         - [2] Tên tài liệu, Tác giả, Chương, Trang.
      6. Trong bài viết, bắt buộc phải thiết kế và nhúng tối thiểu một sơ đồ quy trình hoặc sơ đồ tư duy (mindmap/infographic) bằng ngôn ngữ đồ họa Vector SVG chất lượng cao (bọc trong thẻ <div class="diagram-card">...</div> và kèm theo mô tả chú thích <div class="diagram-note"><p><b>Hình A:</b> ...</p></div>). Sơ đồ phải trực quan hóa các bước thực hiện hoặc mối quan hệ giữa các bộ phận.
         Quy chuẩn vẽ SVG:
         - ViewBox: <svg viewBox="0 0 640 260" width="100%" height="auto" class="diagram-svg" xmlns="http://www.w3.org/2000/svg">
         - Cấm tuyệt đối việc hardcode mã màu HEX (#fff, #000...). Chỉ dùng các class CSS có sẵn của blog:
           + Tiêu đề sơ đồ: <text x="320" y="30" text-anchor="middle" class="d-label-title">TIÊU ĐỀ SƠ ĐỒ</text>
           + Chú thích chữ thường: <text class="d-label">...</text>
           + Nhãn chữ nhấn mạnh/Cảnh báo: <text class="d-label-em">...</text>
           + Nét liền vẽ khung chính: class="d-line"
           + Nét liền vẽ bộ phận phụ: class="d-line-2"
           + Đường truyền khí nóng/Lửa/Ember: class="d-ember"
           + Luồng khói yếm khí/Nét đứt cam: class="d-ember-dash"
           + Đường xám đứt gióng chú thích: class="d-leader"
           + Đầu mũi tên chỉ hướng kết nối: marker-end="url(#arrow)"
         - Căn chỉnh tọa độ x, y hợp lý để sơ đồ thoáng đẹp, trực quan và không chồng chéo chữ.
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
      let content = '';
      if (msg.result && msg.result.content && msg.result.content[0]) {
        content = msg.result.content[0].text;
      } else {
        console.error('Error: Empty response from NotebookLM.');
        child.kill();
        process.exit(1);
      }

      try {
        const parsed = JSON.parse(content);
        if (parsed.answer) {
          content = parsed.answer;
        }
      } catch (e) {
        // Keep as-is
      }

      content = content.replace(/^```markdown\s*/i, '');
      content = content.replace(/^```html\s*/i, '');
      content = content.replace(/```\s*$/, '');
      content = content.trim();

      if (selectedTopic.youtube) {
        const ytId = getYoutubeId(selectedTopic.youtube);
        if (ytId) {
          const ytSection = `\n\n---
### Video tham khảo thực tế
Xem video hướng dẫn chi tiết liên quan đến chủ đề từ YouTube:

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
  <iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"></iframe>
</div>`;
          content += ytSection;
        }
      }

      const todayStr = getNextPostDateString();
      const filename = `${todayStr}-${selectedTopic.id}.md`;
      const filepath = path.join(POSTS_DIR, filename);

      fs.writeFileSync(filepath, content);
      console.log(`Successfully generated and saved daily post to: _posts/${filename}`);

      child.kill();
      process.exit(0);
    }
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
