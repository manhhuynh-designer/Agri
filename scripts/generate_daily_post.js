const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

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

// 0. Auto-write auth cookies if present in env (e.g. pulled from Vercel/Github Actions)
if (process.env.NOTEBOOKLM_COOKIES) {
  const authDir = path.join(os.homedir(), '.notebooklm-mcp');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(path.join(authDir, 'auth.json'), JSON.stringify({ cookies: process.env.NOTEBOOKLM_COOKIES }), 'utf8');
  console.log('[Auth] Cookies written to auth.json from environment variables.');
}

const NOTEBOOK_ID = '47861196-dfb2-42e4-8dcd-cfc9eeb28ced';
const TOPICS_FILE = path.join(__dirname, '..', '_data', 'topics.json');
const POSTS_DIR = path.join(__dirname, '..', '_posts');

// Helper to format date as YYYY-MM-DD (always returns today's local date, never future date)
function getNextPostDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  console.log(`[Date Calculator] Using today's local date: ${todayStr}`);
  return todayStr;
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

// Helper to download an image from a URL to a local file path (supports redirects)
function downloadImage(url, localPath) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (redirectRes) => {
          if (redirectRes.statusCode === 200) {
            const fileStream = fs.createWriteStream(localPath);
            redirectRes.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              resolve(true);
            });
          } else {
            resolve(false);
          }
        }).on('error', () => resolve(false));
      } else if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(localPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
      } else {
        resolve(false);
      }
    }).on('error', (err) => {
      console.error('[Image Downloader] Connection error:', err.message);
      resolve(false);
    });
  });
}

// Generate image using Cloudflare Workers AI
function generateAiImage(prompt) {
  return new Promise((resolve) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      console.warn('[Cloudflare AI] Warning: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not found in environment.');
      return resolve(null);
    }

    console.log(`[Cloudflare AI] Generating image for prompt: "${prompt}"...`);
    
    // Using SDXL-lightning model for fast and high-quality generation
    const model = '@cf/bytedance/sdxl-lightning';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    
    const reqData = JSON.stringify({ prompt: prompt });
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      if (res.statusCode !== 200) {
        console.error(`[Cloudflare AI] Failed to generate image, status: ${res.statusCode}`);
        return resolve(null);
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });

    req.on('error', (err) => {
      console.error('[Cloudflare AI] Request error:', err.message);
      resolve(null);
    });

    req.write(reqData);
    req.end();
  });
}

// Upload a binary buffer to Cloudflare R2 bucket using R2 API PUT
function uploadToR2(bucketName, key, buffer) {
  return new Promise((resolve) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      console.warn('[Cloudflare R2] Warning: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not found in environment.');
      return resolve(false);
    }

    console.log(`[Cloudflare R2] Uploading object "${key}" to bucket "${bucketName}"...`);
    
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`;
    
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[Cloudflare R2] Upload successful for "${key}".`);
          resolve(true);
        } else {
          console.error(`[Cloudflare R2] Upload failed, status: ${res.statusCode}, response: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Cloudflare R2] Connection error:', err.message);
      resolve(false);
    });

    req.write(buffer);
    req.end();
  });
}

// Helper to extract YouTube video ID from various URL formats
function getYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Dependency-free YouTube search using DuckDuckGo HTML search
function searchYoutubeVideo(query) {
  return new Promise((resolve) => {
    const searchUrl = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(query)}`;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(searchUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = data.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g);
        if (matches && matches.length > 0) {
          const uniqueIds = [...new Set(matches.map(m => m.split('=')[1]))];
          resolve(uniqueIds);
        } else {
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error('[YouTube Search] Connection error:', err.message);
      resolve([]);
    });
  });
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
  'vi-sinh-vat-ban-dia-imo': 'soil microbes agriculture',
  'lo-kon-tiki-san-xuat-biochar': 'biochar pyrolysis kiln',
  'cong-nghe-sinh-hoc-nong-nghiep': 'agricultural biotechnology microbe'
};

const imageMapping = {
  'u-phan-chuong-hoai-muc': '/assets/images/than_sinh_hoc_biochar.png',
  'quan-ly-dich-hai-ipm': '/assets/images/thien_dich_vuon_huu_co.png',
  'cay-che-phu-dat-phu-xanh': '/assets/images/cach_mang_mot_cong_rom.png',
  'mo-hinh-luan-canh-xen-canh': '/assets/images/thiet_ke_permaculture.png',
  'he-sinh-thai-vac-truyen-thong': '/assets/images/thiet_ke_permaculture.png',
  'ky-thuat-trong-rau-sach-huu-co': '/assets/images/nong_nghiep_quy_mo_nho.png',
  'thuoc-tru-sau-thao-moc': '/assets/images/thien_dich_vuon_huu_co.png',
  'vi-sinh-vat-ban-dia-imo': '/assets/images/than_sinh_hoc_biochar.png',
  'lo-kon-tiki-san-xuat-biochar': '/assets/images/than_sinh_hoc_biochar.png',
  'cong-nghe-sinh-hoc-nong-nghiep': '/assets/images/thien_dich_vuon_huu_co.png'
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
  // 0. Auto-write auth cookies if present in env (e.g. pulled from Vercel)
  if (process.env.NOTEBOOKLM_COOKIES) {
    const os = require('os');
    const mcpDir = path.join(os.homedir(), '.notebooklm-mcp');
    if (!fs.existsSync(mcpDir)) {
      fs.mkdirSync(mcpDir, { recursive: true });
    }
    fs.writeFileSync(path.join(mcpDir, 'auth.json'), process.env.NOTEBOOKLM_COOKIES);
    console.log('[Auth] Successfully wrote NotebookLM auth cookies from environment.');
  }
  // 1. Read topics and find an unwritten one
  if (!fs.existsSync(TOPICS_FILE)) {
    console.error('Error: topics.json not found!');
    process.exit(1);
  }

  const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
  const postFiles = fs.readdirSync(POSTS_DIR);

  // 1. Gather all existing slugs and titles from file names and frontmatter
  const existingSlugs = new Set();
  const existingTitles = new Set();

  postFiles.forEach(file => {
    // Extract slug from filename (remove date prefix and extension)
    const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
    existingSlugs.add(slug);
    
    // Read file and extract title from frontmatter
    try {
      const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
      const titleMatch = content.match(/^title:\s*["']?([^"'\r\n]+)["']?/m);
      if (titleMatch) {
        existingTitles.add(titleMatch[1].trim().toLowerCase());
      }
    } catch (e) {
      // Ignore reading errors
    }
  });

  let selectedTopic = null;
  for (const topic of topics) {
    const isSlugWritten = existingSlugs.has(topic.id);
    const isTitleWritten = existingTitles.has(topic.title.trim().toLowerCase());
    
    if (!isSlugWritten && !isTitleWritten) {
      selectedTopic = topic;
      break;
    }
  }

  if (!selectedTopic) {
    console.warn('\n================================================================');
    console.warn('⚠️  BÁO CÁO: Tất cả các chủ đề trong topics.json đều đã được viết!');
    console.warn('Để tránh tạo bài trùng lặp, kịch bản sẽ dừng hoạt động và không tạo thêm bài mới.');
    console.warn('Vui lòng thêm các chủ đề nông nghiệp hữu cơ mới vào file _data/topics.json.');
    console.warn('================================================================\n');
    process.exit(0); // Exit cleanly without creating duplicate post
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
    console.log(`[Hero Image] Không tìm thấy ảnh bìa trên Pexels. Sử dụng Cloudflare AI tạo ảnh bìa...`);
    const heroBuffer = await generateAiImage(pexelsSearchQueries[selectedTopic.id] || 'sustainable realistic organic agriculture');
    if (heroBuffer) {
      const imageName = `${selectedTopic.id}-hero.png`;
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';
      const uploadSuccess = await uploadToR2(bucketName, `posts/${imageName}`, heroBuffer);
      if (uploadSuccess) {
        const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-agrisynthe.r2.dev`;
        const cleanPublicUrl = publicUrl.replace(/\/$/, '');
        selectedImage = `${cleanPublicUrl}/posts/${imageName}`;
        console.log(`[Hero Image] AI hero image generated and uploaded to R2: ${selectedImage}`);
      } else {
        const postsImgDir = path.join(__dirname, '..', 'public', 'assets', 'images', 'posts');
        if (!fs.existsSync(postsImgDir)) {
          fs.mkdirSync(postsImgDir, { recursive: true });
        }
        fs.writeFileSync(path.join(postsImgDir, imageName), heroBuffer);
        selectedImage = `/assets/images/posts/${imageName}`;
        console.log(`[Hero Image] R2 upload failed. Saved AI hero image locally: ${selectedImage}`);
      }
    } else {
      selectedImage = generateSvgPlaceholder(selectedTopic.id, selectedTopic.title);
    }
  }
  console.log(`Using post image: ${selectedImage}`);

  // 4. Handle YouTube searching and transcript downloading
  if (!selectedTopic.youtube) {
    console.log(`[YouTube Finder] Topic does not have a predefined YouTube video. Searching YouTube for: "${selectedTopic.title}"...`);
    const candidateIds = await searchYoutubeVideo(selectedTopic.title);
    console.log(`[YouTube Finder] Found ${candidateIds.length} candidate videos. Verifying...`);
    for (const id of candidateIds) {
      const url = `https://www.youtube.com/watch?v=${id}`;
      const isValid = await verifyYoutubeLink(url);
      if (isValid) {
        console.log(`[YouTube Finder] Successfully verified video: ${url}`);
        selectedTopic.youtube = url;
        break;
      }
    }
  }

  if (selectedTopic.youtube) {
    const isValidYt = await verifyYoutubeLink(selectedTopic.youtube);
    if (isValidYt) {
      console.log(`[YouTube Verification] Link is ACTIVE and valid: ${selectedTopic.youtube}`);
      const { downloadYoutubeTranscript } = require('./query_youtube_transcript');
      const ytPath = path.join(__dirname, '..', 'documents', 'youtube_transcripts', `${selectedTopic.id}.txt`);
      console.log(`[YouTube Transcript] Downloading subtitles to: ${ytPath}...`);
      await downloadYoutubeTranscript(selectedTopic.youtube, ytPath);
    } else {
      console.warn(`[YouTube Verification] Warning: Link is BROKEN or inactive: ${selectedTopic.youtube}. It will be omitted.`);
      selectedTopic.youtube = null;
    }
  }

  // 5. Query RAG using local Antigravity CLI (agy)
  const queryText = `Viết một bài viết blog kỹ thuật chi tiết bằng tiếng Việt về chủ đề: "${selectedTopic.title}".
  Yêu cầu cụ thể:
  1. Sử dụng định dạng Markdown Jekyll có Front Matter đầy đủ ở đầu bài viết:
     layout: post
     title: "${selectedTopic.title}"
     subtitle: "Mô tả ngắn gọn nội dung cốt lõi của bài viết trong 1-2 câu."
     categories: [${selectedTopic.categories.join(', ')}]
     tags: [${selectedTopic.categories.concat(['Hữu cơ']).join(', ')}]
     image: ${selectedImage}
  2. Ngay đầu bài viết, trước nội dung chính, bắt buộc phải có khối cảnh báo:
     <div class="ai-warning-box" style="background: rgba(220, 38, 38, 0.05); border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
       <p style="margin: 0; font-size: 0.92rem; color: var(--ash); line-height: 1.5;">
         <strong>⚠️ LƯU Ý QUAN TRỌNG:</strong> Bài viết này được tổng hợp và biên tập tự động từ sách bởi Trí tuệ Nhân tạo (AI). Mặc dù hệ thống đã đối chiếu với các nguồn tài liệu chính thống, thông tin chỉ mang tính chất tham khảo. Độc giả cần kiểm chứng lại nguồn gốc hoặc thảo luận với chuyên gia trước khi ứng dụng thực tế.
       </p>
     </div>
  3. Viết nội dung mang tính chất PHÂN TÍCH, SO SÁNH và CHUYỂN ĐỔI CAO (Transformative & Analytical Style):
     - Không sao chép hay dịch thô lý thuyết suông từ tài liệu gốc.
     - Hãy tổng hợp kiến thức từ nhiều tài liệu, thực hiện so sánh đối chiếu ưu nhược điểm của các phương pháp khác nhau (ví dụ: so sánh cách ủ nóng với ủ nguội, hoặc so sánh thiết bị tự chế với thiết bị công nghiệp).
     - Bắt buộc phải có một phần riêng biệt với tiêu đề "Phân Tích Thực Tiễn & Khả Năng Áp Dụng Tại Việt Nam" (sử dụng tiêu đề H2) để đánh giá khả năng áp dụng kỹ thuật này dưới điều kiện khí hậu nhiệt đới nóng ẩm, loại đất địa phương và quy mô nông hộ nhỏ tại Việt Nam.
     - Đưa ra các giải pháp thay thế nguyên liệu trong sách bằng phế phụ phẩm nông nghiệp phổ biến ở Việt Nam (ví dụ: xơ dừa, vỏ trấu, lục bình, bã mía...).
  4. Viết nội dung kỹ thuật chi tiết, có phân chia các tiêu đề H2 rõ ràng (sử dụng định dạng ## Tiêu đề).
  5. Trong thân bài, để việc đọc được liền mạch và không bị sao nhãng, các thông tin cần dẫn chứng nguồn bắt buộc phải được đánh số thứ tự tăng dần đặt trong ngoặc vuông (ví dụ: [1], [2], [3]...). Tuyệt đối không ghi trực tiếp tên tài liệu hay tên tác giả bên trong các câu viết của thân bài.
  6. Ở cuối bài viết, tạo mục "Tài liệu trích dẫn chi tiết" liệt kê đầy đủ thông tin nguồn gốc tương ứng với các số thứ tự trên theo định dạng danh sách:
     - [1] Tên tài liệu, Tác giả, Chương, Trang.
     - [2] Tên tài liệu, Tác giả, Chương, Trang.
  7. Trong bài viết, bắt buộc phải thiết kế và nhúng tối thiểu một sơ đồ quy trình hoặc sơ đồ tư duy (mindmap/infographic) bằng ngôn ngữ đồ họa Vector SVG chất lượng cao (bọc trong thẻ <div class="diagram-card">...</div> và kèm theo mô tả chú thích <div class="diagram-note"><p><b>Hình A:</b> ...</p></div>). Sơ đồ phải trực quan hóa các bước thực hiện hoặc mối quan hệ giữa các bộ phận.
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
  8. Tại mỗi mục tiêu đề lớn H2 (hoặc mục kỹ thuật quan trọng), bắt buộc chèn một hình ảnh minh họa sinh động bằng cú pháp đặc biệt:
     ![Mô tả ngắn gọn về hình ảnh sinh động](pexels: từ khóa tìm kiếm tiếng Anh liên quan đến hình ảnh)
     Ví dụ:
     ![Ấu trùng ruồi lính đen phân hủy phế phẩm hữu cơ](pexels: black soldier fly larvae compost)
     Không viết đường dẫn tĩnh thông thường, hệ thống sẽ tự động dùng từ khóa tìm kiếm để nạp ảnh thực tế tương ứng từ Pexels.
  Hãy trả về TRỰC TIẾP nội dung bài viết Markdown, không thêm bất kỳ văn bản giải thích nào khác ở đầu hoặc cuối kết quả.`;

  const { spawnSync } = require('child_process');
  
  const documentsDir = path.join(__dirname, '..', 'documents');
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  console.log('Đang gọi Antigravity CLI (agy) để phân tích tài liệu và viết bài...');
  const result = spawnSync('agy', [
    '--add-dir', documentsDir,
    '-p', queryText
  ], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  if (result.status !== 0) {
    console.error('Antigravity CLI Error:', result.stderr || result.error?.message);
    process.exit(1);
  }

  let content = result.stdout;

  // Clean markdown wrappers
  content = content.replace(/^```markdown\s*/i, '');
  content = content.replace(/^```html\s*/i, '');
  content = content.replace(/```\s*$/, '');
  content = content.trim();

  // STAGE 2: Hậu kiểm đánh giá và tự động sửa văn phong (Self-Refinement & Style Review)
  console.log('Đang thực hiện hậu kiểm đánh giá văn phong bài viết (Stage 2: Style Review & Refinement)...');
  const reviewPrompt = `Bạn là một Tổng biên tập Học thuật và Chuyên gia Khuyến nông hữu cơ có kinh nghiệm.
Nhiệm vụ của bạn là rà soát, đánh giá và tinh lọc lại văn phong của bài viết nông nghiệp dưới đây.

YÊU CẦU NGHIÊM NGẶT VỀ VĂN PHONG (STYLE GUIDE):
1. KHÔNG được sử dụng văn phong quảng cáo, giật tít, cường điệu hóa (hype) hoặc các từ ngữ sáo rỗng như: "thần kỳ", "bí mật", "bí kíp", "tuyệt vời", "hoàn hảo", "vô song", "vô giá", "cực kỳ hiệu quả".
2. Sử dụng văn phong khách quan, khoa học, trung thực, mang tính khuyến nông thực tiễn cao. Diễn đạt điềm tĩnh, tập trung vào mô tả kỹ thuật và cơ chế sinh học thực nghiệm.
3. Giữ nguyên toàn bộ:
   - Cấu trúc YAML Front-matter ở đầu bài viết.
   - Các tiêu đề (H2, H3), danh mục, các bảng biểu so sánh dữ liệu.
   - Nguyên vẹn khối mã sơ đồ SVG bọc trong thẻ <div class="diagram-card">...</div> và phần chú thích kèm theo.
   - Toàn bộ các ký hiệu trích dẫn nguồn dạng [1], [2] trong thân bài viết và danh sách nguồn dưới mục "Tài liệu trích dẫn chi tiết".
4. Nếu bài viết vi phạm bất kỳ lỗi cường điệu hay quảng cáo nào, hãy tự động chỉnh sửa và viết lại các đoạn văn đó theo văn phong học thuật trung thực.

Hãy trả về TRỰC TIẾP nội dung bài viết sau khi tinh lọc, không thêm bất kỳ dòng giải thích nào khác ở đầu hoặc cuối kết quả.

NỘI DUNG BÀI VIẾT CẦN RÀ SOÁT:
${content}`;

  const reviewResult = spawnSync('agy', [
    '--add-dir', documentsDir,
    '-p', reviewPrompt
  ], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  if (reviewResult.status === 0 && reviewResult.stdout.trim().length > 100) {
    console.log('[Style Review] Bài viết đã được hậu kiểm và tinh lọc văn phong thành công.');
    content = reviewResult.stdout;
    content = content.replace(/^```markdown\s*/i, '');
    content = content.replace(/^```html\s*/i, '');
    content = content.replace(/```\s*$/, '');
    content = content.trim();
  } else {
    console.warn('[Style Review] Hậu kiểm thất bại hoặc trả về nội dung rỗng. Sử dụng bài viết gốc của Stage 1.');
  }

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

  // 0. Cắt sạch logs suy nghĩ của agent xuất hiện trước dấu --- đầu tiên
  const firstDashIndex = content.indexOf('---');
  if (firstDashIndex !== -1 && firstDashIndex > 0) {
    content = content.substring(firstDashIndex);
  }

  // 1. Tự động chuẩn hóa Front-matter
  const dateLine = `date: ${todayStr} 12:00:00 +0700`;
  
  // Đổi description thành subtitle
  content = content.replace(/^description:\s*(.+)$/m, 'subtitle: "$1"');
  // Chèn date ngay sau trường title
  content = content.replace(/^(title:\s*["'].+?["'])$/m, `$1\n${dateLine}`);

  // 2. Chuẩn hóa Khối tuyên bố miễn trừ trách nhiệm AI (AI Warning Box) thành mã HTML chuẩn
  content = content.replace(
    />\s*\[!WARNING\][\s\S]*?trước khi áp dụng vào thực tế sản xuất\./gi,
    `<div class="ai-warning-box" style="background: rgba(220, 38, 38, 0.05); border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
  <p style="margin: 0; font-size: 0.92rem; color: var(--ash); line-height: 1.5;">
    <strong>⚠️ LƯU Ý QUAN TRỌNG:</strong> Bài viết này được tổng hợp và biên tập tự động từ sách bởi Trí tuệ Nhân tạo (AI). Mặc dù hệ thống đã đối chiếu với các nguồn tài liệu chính thống, thông tin chỉ mang tính chất tham khảo. Độc giả cần kiểm chứng lại nguồn gốc hoặc thảo luận với chuyên gia trước khi ứng dụng thực tế.
  </p>
</div>`
  );

  // 3. Xử lý Trích dẫn chuyên sâu (Bảo vệ khối SVG và định dạng 2 chiều danh sách nguồn)
  const citationsHeader = '### Tài liệu trích dẫn chi tiết';
  const citationsIndex = content.indexOf(citationsHeader);
  if (citationsIndex !== -1) {
    let body = content.substring(0, citationsIndex);
    let footer = content.substring(citationsIndex);
    
    // Tách và bảo vệ toàn bộ các khối <svg>...</svg> bên trong phần thân bài viết
    const parts = body.split(/(<svg[\s\S]*?<\/svg>)/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { // Nằm ngoài khối SVG -> Thực hiện replace số trích dẫn trong ngoặc vuông
        parts[i] = parts[i].replace(/\[(\d+)\](?!\()/g, '<sup><a href="#ref-$1" class="citation-ref" id="cit-$1">[$1]</a></sup>');
      }
    }
    body = parts.join('');
    
    // Định dạng danh sách nguồn ở chân bài viết: hỗ trợ cả [1], `[1]` hoặc dạng <sup> lồng
    footer = footer.replace(/^([-*])\s*(?:`?\[(\d+)\]`?|<sup><a[^>]*>\[(\d+)\]<\/a><\/sup>)\s*(.+)$/gm, (match, prefix, num1, num2, desc) => {
      const num = num1 || num2;
      return `${prefix} <span id="ref-${num}">**[${num}]**</span> ${desc.trim()} <a href="#cit-${num}" class="back-to-citation" title="Quay lại câu viết">&crarr;</a>`;
    });
    
    content = body + footer;
  } else {
    // Dự phòng nếu không tìm thấy tiêu đề trích dẫn nguồn
    content = content.replace(/\[(\d+)\](?!\()/g, '<sup><a href="#ref-$1" class="citation-ref" id="cit-$1">[$1]</a></sup>');
  }

  // 4. Định dạng và nén nhẹ khối SVG để tránh markdown pre/code block parsing
  content = content.replace(/<div class="diagram-card">([\s\S]*?)<\/div>/g, (match, svgContent) => {
    const cleanedSvg = svgContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    return `<div class="diagram-card">\n${cleanedSvg}\n</div>`;
  });

  // 4.5. Tự động quét và tải ảnh minh họa từng mục từ Pexels
  const pexelsPattern = /!\[([^\]]+)\]\(pexels:\s*([^\)]+)\)/g;
  let imgMatch;
  let imageIndex = 1;
  const pexelsMatches = [];
  while ((imgMatch = pexelsPattern.exec(content)) !== null) {
    pexelsMatches.push({
      fullMatch: imgMatch[0],
      caption: imgMatch[1],
      query: imgMatch[2].trim()
    });
  }

  console.log(`[Pexels Content Images] Tìm thấy ${pexelsMatches.length} vị trí cần chèn ảnh minh họa.`);
  for (const item of pexelsMatches) {
    const query = item.query;
    console.log(`[Pexels Content Images] Đang tìm ảnh trên Pexels cho mục: "${query}"...`);
    const urls = await fetchPexelsImages(query, 1);
    let resolvedImageUrl = '';

    if (urls && urls.length > 0) {
      const pexelsUrl = urls[0];
      const localImageName = `${selectedTopic.id}-${imageIndex}.png`;
      const postsImgDir = path.join(__dirname, '..', 'public', 'assets', 'images', 'posts');
      if (!fs.existsSync(postsImgDir)) {
        fs.mkdirSync(postsImgDir, { recursive: true });
      }
      const localImagePath = path.join(postsImgDir, localImageName);
      
      console.log(`[Pexels Content Images] Tìm thấy ảnh. Đang tải về: public/assets/images/posts/${localImageName}...`);
      const success = await downloadImage(pexelsUrl, localImagePath);
      if (success) {
        resolvedImageUrl = `/assets/images/posts/${localImageName}`;
      } else {
        console.warn(`[Pexels Content Images] Tải ảnh thất bại. Sử dụng trực tiếp link CDN Pexels.`);
        resolvedImageUrl = pexelsUrl;
      }
    } else {
      console.log(`[Pexels Content Images] Không tìm thấy ảnh trên Pexels cho từ khóa: "${query}". Sử dụng Cloudflare AI tạo ảnh minh họa...`);
      const imageBuffer = await generateAiImage(query);
      if (imageBuffer) {
        const imageName = `${selectedTopic.id}-${imageIndex}.png`;
        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';
        const uploadSuccess = await uploadToR2(bucketName, `posts/${imageName}`, imageBuffer);
        
        if (uploadSuccess) {
          const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-agrisynthe.r2.dev`;
          const cleanPublicUrl = publicUrl.replace(/\/$/, '');
          resolvedImageUrl = `${cleanPublicUrl}/posts/${imageName}`;
          console.log(`[Pexels Content Images] AI image generated and uploaded to R2: ${resolvedImageUrl}`);
        } else {
          const postsImgDir = path.join(__dirname, '..', 'public', 'assets', 'images', 'posts');
          if (!fs.existsSync(postsImgDir)) {
            fs.mkdirSync(postsImgDir, { recursive: true });
          }
          fs.writeFileSync(path.join(postsImgDir, imageName), imageBuffer);
          resolvedImageUrl = `/assets/images/posts/${imageName}`;
          console.log(`[Pexels Content Images] R2 upload failed. Saved AI image locally: ${resolvedImageUrl}`);
        }
      } else {
        console.warn(`[Pexels Content Images] Không thể tạo ảnh bằng Cloudflare AI. Sử dụng ảnh đại diện dự phòng.`);
        resolvedImageUrl = selectedImage.startsWith('/') ? selectedImage : '/assets/images/posts/chan-nuoi-khep-kin-ruoi-linh-den.png';
      }
    }

    content = content.replace(item.fullMatch, `![${item.caption}](${resolvedImageUrl})`);
    imageIndex++;
  }

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Successfully generated and saved daily post to: _posts/${filename}`);

  // 4. Gửi email bản tin tự động cho độc giả đăng ký
  try {
    const getCleanResendKey = () => {
      const rawKey = process.env.RESEND_API_KEY || '';
      const lines = rawKey.split(/[\r\n]+/);
      for (let line of lines) {
        line = line.trim().replace(/^['"]|['"]$/g, '');
        if (line.startsWith('re_')) {
          return line;
        }
        if (line.includes('RESEND_API_KEY=')) {
          const parts = line.split('RESEND_API_KEY=');
          const potentialKey = parts[1]?.trim().replace(/^['"]|['"]$/g, '');
          if (potentialKey && potentialKey.startsWith('re_')) {
            return potentialKey;
          }
        }
      }
      return rawKey.trim().replace(/^['"]|['"]$/g, '');
    };

    const apiKey = getCleanResendKey();
    if (!apiKey) {
      console.warn('[Email Broadcast] Skipped: RESEND_API_KEY not found in environment.');
      process.exit(0);
    }

    const { Resend } = require('resend');
    const resend = new Resend(apiKey);
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    console.log('[Email Broadcast] Fetching subscribers list...');
    const audiences = await resend.audiences.list();
    let audienceId = '';
    
    // Bỏ qua nếu là Restricted Key
    if (audiences.error && (audiences.error.name === 'restricted_api_key' || audiences.error.statusCode === 401)) {
      console.warn('[Email Broadcast] Skipped: API Key is restricted and cannot manage audiences.');
      process.exit(0);
    }

    let audienceList = [];
    if (audiences.data) {
      if (Array.isArray(audiences.data)) {
        audienceList = audiences.data;
      } else if (Array.isArray(audiences.data.data)) {
        audienceList = audiences.data.data;
      }
    }

    if (audienceList.length > 0) {
      audienceId = audienceList[0].id;
    }

    if (!audienceId) {
      console.warn('[Email Broadcast] Skipped: No audience list found.');
      process.exit(0);
    }

    await sleep(1000); // Tránh rate limit 2 RPS

    const contacts = await resend.contacts.list({ audienceId });
    
    if (contacts.error) {
      console.warn('[Email Broadcast] Skipped: Failed to fetch contacts list:', contacts.error.message);
      process.exit(0);
    }

    let contactsList = [];
    if (contacts.data) {
      if (Array.isArray(contacts.data)) {
        contactsList = contacts.data;
      } else if (Array.isArray(contacts.data.data)) {
        contactsList = contacts.data.data;
      }
    }

    if (contactsList.length === 0) {
      console.log('[Email Broadcast] No subscribers found. Skipped.');
      process.exit(0);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://manhhuynh.work';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2b1f13; line-height: 1.6;">
        <div style="background-color: #6b8e4e; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: sans-serif;">AgriSynthe Journal</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #dcd3c1; border-top: none; border-radius: 0 0 8px 8px; background-color: #fdfbf7;">
          <p style="font-size: 15px;">Xin chào độc giả,</p>
          <p style="font-size: 15px;">Chúng tôi xin gửi tới bạn ấn phẩm nghiên cứu nông nghiệp tuần hoàn sinh thái mới nhất vừa được xuất bản:</p>
          
          <div style="background-color: #f4ecd8; padding: 16px; border-left: 4px solid #e8590c; border-radius: 4px; margin: 20px 0;">
            <h2 style="color: #e8590c; margin: 0 0 8px 0; font-size: 18px;">${selectedTopic.title}</h2>
            <p style="margin: 0; font-style: italic; color: #5c5346; font-size: 14px;">
              "${selectedTopic.description || 'Nghiên cứu khoa học và cẩm nang khuyến nông hữu cơ.'}"
            </p>
          </div>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${siteUrl}/posts/${selectedTopic.id}" style="background-color: #e8590c; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 15px;">
              Đọc bài viết chi tiết
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #dcd3c1; margin: 24px 0;" />
          
          <footer style="font-size: 12px; color: #8a7c6a; text-align: center; line-height: 1.5;">
            Thư này được gửi tự động vì bạn đã đăng ký nhận tin tại AgriSynthe.<br />
            &copy; 2026 AgriSynthe. Mọi quyền được bảo lưu.<br />
            <a href="${siteUrl}" style="color: #6b8e4e; text-decoration: underline;">Trang chủ blog</a>
          </footer>
        </div>
      </div>
    `;

    const batchData = contactsList.map(c => ({
      from: 'AgriSynthe <Agri@manhhuynh.work>',
      to: c.email,
      subject: `[Bài viết mới] ${selectedTopic.title}`,
      html: emailHtml
    }));

    await sleep(1000); // Tránh rate limit 2 RPS

    console.log(`[Email Broadcast] Sending post notification to ${batchData.length} subscribers...`);
    const batchResponse = await resend.batch.send(batchData);
    if (batchResponse.error) {
      console.error('[Email Broadcast] Batch send failed:', batchResponse.error);
    } else {
      console.log('[Email Broadcast] Successfully sent email notifications!');
    }
  } catch (err) {
    console.error('[Email Broadcast] Unexpected error during mailing:', err);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
