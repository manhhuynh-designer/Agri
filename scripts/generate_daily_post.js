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
    const trimmed = line.trim();
    // Bỏ qua dòng trống và dòng comment
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  });
}

// ===== CONSTANTS: Delimiter markers & Hype word blacklist =====
const ARTICLE_START_MARKER = '<<<BÀI_VIẾT>>>';
const ARTICLE_END_MARKER = '<<<KẾT_THÚC>>>';

const HYPE_WORDS_PATTERN = /thần kỳ|bí mật|bí kíp|tuyệt vời|hoàn hảo|vô song|vô giá|cực kỳ hiệu quả|tuyệt hảo/gi;

// Trích xuất nội dung bài viết từ output có delimiter wrapper
function extractDelimitedContent(raw) {
  const startIdx = raw.indexOf(ARTICLE_START_MARKER);
  const endIdx = raw.indexOf(ARTICLE_END_MARKER);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return raw.substring(startIdx + ARTICLE_START_MARKER.length, endIdx).trim();
  }
  // Fallback: tìm dấu --- đầu tiên (frontmatter)
  const fmIdx = raw.indexOf('---');
  if (fmIdx !== -1 && fmIdx > 0) {
    return raw.substring(fmIdx).trim();
  }
  return raw.trim();
}

// Validation Gate: kiểm tra cấu trúc bắt buộc của bài viết
function validateArticleStructure(content) {
  const errors = [];
  const warnings = [];
  let score = 0;

  // V1+V2: Frontmatter
  const hasFrontmatter = /^---[\s\S]+?^---/m.test(content);
  const hasTitle = /^title:/m.test(content);
  if (!hasFrontmatter) errors.push('Thiếu frontmatter (cặp dấu ---)');
  if (!hasTitle) errors.push('Thiếu trường title trong frontmatter');
  if (hasFrontmatter && hasTitle) score += 20;

  // V3: Tiêu đề H2
  const h2Count = (content.match(/^## /gm) || []).length;
  if (h2Count >= 4) score += 20;
  else if (h2Count >= 2) { score += 10; warnings.push(`Chỉ có ${h2Count} tiêu đề H2 (khuyến nghị ≥ 4)`); }
  else warnings.push(`Chỉ có ${h2Count} tiêu đề H2 (khuyến nghị ≥ 4)`);

  // V4: SVG diagram
  const hasSvg = /<svg/i.test(content);
  if (hasSvg) score += 15;
  else warnings.push('Thiếu sơ đồ SVG minh họa');

  // V5: Ảnh minh họa
  const imgCount = (content.match(/!\[/g) || []).length;
  if (imgCount >= 3) score += 15;
  else if (imgCount >= 1) { score += 8; warnings.push(`Chỉ có ${imgCount} ảnh minh họa (khuyến nghị ≥ 3)`); }
  else warnings.push('Thiếu ảnh minh họa');

  // V6: Trích dẫn nguồn
  const hasRefs = /Tài liệu trích dẫn/i.test(content);
  const refCount = (content.match(/^[-*]\s*\[\d+\]/gm) || []).length;
  if (hasRefs && refCount >= 3) score += 15;
  else if (hasRefs) { score += 8; warnings.push(`Chỉ có ${refCount} nguồn trích dẫn (khuyến nghị ≥ 3)`); }
  else warnings.push('Thiếu mục trích dẫn nguồn');

  // V7: AI warning box
  const hasWarning = /ai-warning-box|LƯU Ý QUAN TRỌNG/i.test(content);
  if (hasWarning) score += 5;
  else warnings.push('Thiếu khối cảnh báo AI → sẽ tự động chèn');

  // V8: Độ dài bài viết (ngoài frontmatter)
  const bodyMatch = content.match(/^---[\s\S]+?^---\s*([\s\S]*)$/m);
  const bodyLen = bodyMatch ? bodyMatch[1].length : content.length;
  if (bodyLen >= 3000) score += 10;
  else if (bodyLen >= 1000) { score += 5; warnings.push(`Bài viết khá ngắn (${bodyLen} ký tự, khuyến nghị ≥ 3000)`); }
  else errors.push(`Bài viết quá ngắn hoặc rỗng (${bodyLen} ký tự)`);

  return { score, errors, warnings };
}

// Auto-fix từ cường điệu: quét từng câu, gửi câu vi phạm qua LLM để viết lại
function fixHypeWordsWithLLM(content, documentsDir) {
  const { spawnSync } = require('child_process');

  // Tách phần trích dẫn nguồn ra để không xử lý
  const citHeader = '### Tài liệu trích dẫn chi tiết';
  const citIdx = content.indexOf(citHeader);
  let body = citIdx !== -1 ? content.substring(0, citIdx) : content;
  const footer = citIdx !== -1 ? content.substring(citIdx) : '';

  // Tách và bảo vệ khối SVG + HTML
  const protectedBlocks = [];
  body = body.replace(/(<(?:svg|div|iframe)[\s\S]*?<\/(?:svg|div|iframe)>)/gi, (match) => {
    const placeholder = `__PROTECTED_BLOCK_${protectedBlocks.length}__`;
    protectedBlocks.push(match);
    return placeholder;
  });

  // Quét từng câu tìm từ cường điệu
  const sentences = body.split(/(?<=[.!?。]\s)/);
  let fixCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    if (HYPE_WORDS_PATTERN.test(sentences[i])) {
      const original = sentences[i].trim();
      // Reset regex lastIndex
      HYPE_WORDS_PATTERN.lastIndex = 0;

      console.log(`[Hype Fix] Phát hiện từ cường điệu trong câu: "${original.substring(0, 80)}..."`);

      const fixPrompt = `Viết lại câu tiếng Việt sau bằng văn phong học thuật khách quan, trung tính. Giữ nguyên ý nghĩa kỹ thuật, chỉ loại bỏ các từ ngữ cường điệu hoặc quảng cáo. Trả về DUY NHẤT câu đã sửa, không giải thích gì thêm.\n\nCâu gốc: ${original}`;

      const fixResult = spawnSync('agy', [
        '--dangerously-skip-permissions',
        '--print-timeout', '2m0s',
        '-p', fixPrompt
      ], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });

      if (fixResult.status === 0 && fixResult.stdout.trim().length > 10) {
        let fixed = fixResult.stdout.trim();
        // Loại bỏ markdown wrapper nếu có
        fixed = fixed.replace(/^```[\s\S]*?\n/, '').replace(/```\s*$/, '').trim();
        // Loại bỏ thinking logs nếu có
        fixed = fixed.replace(/^.*?(📖|✏️|🆕|READ|EDIT|CREATE).*$/gm, '').trim();
        // Lấy dòng cuối cùng có nội dung (thường là câu đã sửa)
        const lines = fixed.split('\n').filter(l => l.trim().length > 10);
        if (lines.length > 0) fixed = lines[lines.length - 1].trim();

        // Validate: output không quá dài (gấp 3x), không chứa thinking markers
        if (fixed.length > 10 && fixed.length < original.length * 3 && !/(📖|✏️|🆕|I will|Let me)/.test(fixed)) {
          sentences[i] = sentences[i].replace(original, fixed);
          console.log(`[Hype Fix] ✅ Đã sửa thành: "${fixed.substring(0, 80)}..."`);
          fixCount++;
        } else {
          console.warn(`[Hype Fix] ⚠️ Output không hợp lệ, giữ nguyên câu gốc.`);
        }
      } else {
        console.warn(`[Hype Fix] ⚠️ LLM không trả lời, giữ nguyên câu gốc.`);
      }
    }
  }

  body = sentences.join('');

  // Phục hồi các khối được bảo vệ
  for (let i = 0; i < protectedBlocks.length; i++) {
    body = body.replace(`__PROTECTED_BLOCK_${i}__`, protectedBlocks[i]);
  }

  console.log(`[Hype Fix] Tổng cộng đã sửa ${fixCount} câu cường điệu.`);
  return body + footer;
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

// Helper to download an image from a URL into a Buffer (supports redirects)
function downloadImageToBuffer(url) {
  return new Promise((resolve) => {
    const fetchUrl = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetchUrl(res.headers.location);
        }
        if (res.statusCode === 200) {
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
        } else {
          resolve(null);
        }
      }).on('error', (err) => {
        console.error('[Buffer Downloader] Connection error:', err.message);
        resolve(null);
      });
    };
    fetchUrl(url);
  });
}

// Generate image using Fal AI Flux Klein 9B model with standard agriculture blog style framework
function generateAiImage(prompt, imageName) {
  return new Promise((resolve) => {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.warn('[Fal AI] Warning: FAL_KEY not found in environment.');
      return resolve(null);
    }

    const subject = prompt;
    const background = `set in a clean modern organic agricultural farm, warm diffused morning light`;
    const enrichedPrompt = `${subject}, ${background}, simple flat editorial illustration style, muted earth-tone color palette of olive green, warm ochre and soft terracotta, clean minimal linework, soft diffused natural lighting, uncluttered composition with generous negative space, warm and approachable mood, no text, no watermark, no logo`;
    
    console.log(`[Fal AI] Generating 16:9 illustration via Flux Klein 9B for prompt: "${enrichedPrompt}"...`);

    const url = 'https://fal.run/fal-ai/flux-2/klein/9b';
    const reqData = JSON.stringify({ prompt: enrichedPrompt, image_size: 'landscape_16_9' });
    const urlParts = new URL(url);

    const options = {
      hostname: urlParts.hostname,
      path: urlParts.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            const imageUrl = parsed.images?.[0]?.url;
            if (imageUrl) {
              console.log(`[Fal AI] Image generated successfully. Downloading from: ${imageUrl}`);
              downloadImageToBuffer(imageUrl)
                .then(buffer => resolve(buffer))
                .catch(err => {
                  console.error('[Fal AI] Download error:', err.message);
                  resolve(null);
                });
            } else {
              console.error('[Fal AI] No image URL found in response:', data);
              resolve(null);
            }
          } catch (e) {
            console.error('[Fal AI] JSON Parse error:', e.message);
            resolve(null);
          }
        } else {
          console.error(`[Fal AI] API failed, status: ${res.statusCode}, response: ${data}`);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Fal AI] Connection error:', err.message);
      resolve(null);
    });

    req.write(reqData);
    req.end();
  });
}

// Upload a binary buffer to Cloudflare R2 bucket using AWS S3 Client SDK
function uploadToR2(bucketName, key, buffer) {
  return new Promise((resolve) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    
    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('[Cloudflare R2] Warning: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, or CLOUDFLARE_R2_SECRET_ACCESS_KEY not found in environment.');
      return resolve(false);
    }

    console.log(`[Cloudflare R2] Uploading object "${key}" to bucket "${bucketName}" via SDK...`);
    
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey
        }
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/png'
      });

      s3.send(command)
        .then(() => {
          console.log(`[Cloudflare R2] Upload successful for "${key}" via SDK.`);
          resolve(true);
        })
        .catch((err) => {
          console.error('[Cloudflare R2] SDK Send Error:', err.message);
          resolve(false);
        });
    } catch (err) {
      console.error('[Cloudflare R2] SDK Initialization Error:', err.message);
      resolve(false);
    }
  });
}

// Helper to extract YouTube video ID from various URL formats
function getYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Dependency-free YouTube search — scrape trực tiếp trang kết quả YouTube
function searchYoutubeVideo(query) {
  return new Promise((resolve) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // YouTube trả JSON embedded trong HTML, chứa "videoId":"..."
        const matches = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
        if (matches && matches.length > 0) {
          const uniqueIds = [...new Set(matches.map(m => {
            const idMatch = m.match(/"([a-zA-Z0-9_-]{11})"/);
            return idMatch ? idMatch[1] : null;
          }).filter(Boolean))];
          console.log(`[YouTube Search] Tìm thấy ${uniqueIds.length} video từ YouTube Direct.`);
          resolve(uniqueIds.slice(0, 10)); // Giới hạn 10 để verify nhanh
        } else {
          // Fallback: DuckDuckGo HTML search
          console.log('[YouTube Search] YouTube Direct không trả kết quả. Thử DuckDuckGo fallback...');
          const ddgUrl = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(query)}`;
          https.get(ddgUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          }, (ddgRes) => {
            let ddgData = '';
            ddgRes.on('data', chunk => ddgData += chunk);
            ddgRes.on('end', () => {
              const ddgMatches = ddgData.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g);
              if (ddgMatches && ddgMatches.length > 0) {
                const ids = [...new Set(ddgMatches.map(m => m.split('=')[1]))];
                console.log(`[YouTube Search] DuckDuckGo fallback tìm thấy ${ids.length} video.`);
                resolve(ids);
              } else {
                resolve([]);
              }
            });
          }).on('error', () => resolve([]));
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
    console.log('\n[Auto-Topic] Tất cả chủ đề trong topics.json đã được viết. Đang tự động sinh chủ đề mới...');
    
    // Lấy danh sách tiêu đề đã viết để tránh trùng
    const writtenTitles = [...existingTitles].join(', ');
    const { spawnSync } = require('child_process');
    const documentsDir = path.join(__dirname, '..', 'documents');
    
    const topicPrompt = `Dựa trên thư viện tài liệu nông nghiệp hữu cơ, hãy đề xuất MỘT chủ đề bài viết MỚI chưa từng được viết.

Các chủ đề ĐÃ VIẾT (KHÔNG được trùng): ${writtenTitles}

Trả về DUY NHẤT một khối JSON hợp lệ theo đúng format sau, không thêm bất kỳ text nào khác:
<<<BÀI_VIẾT>>>
{
  "id": "slug-tieng-viet-khong-dau",
  "title": "Tiêu đề bài viết bằng tiếng Việt",
  "description": "Mô tả ngắn 1-2 câu",
  "categories": ["Danh mục 1", "Danh mục 2"]
}
<<<KẾT_THÚC>>>`;

    const topicResult = spawnSync('agy', [
      '--add-dir', documentsDir,
      '--dangerously-skip-permissions',
      '--print-timeout', '3m0s',
      '-p', topicPrompt
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

    if (topicResult.status === 0 && topicResult.stdout) {
      let topicOutput = topicResult.stdout;
      // Trích xuất từ delimiter wrapper
      topicOutput = extractDelimitedContent(topicOutput);
      
      // Tìm JSON object trong output
      const jsonMatch = topicOutput.match(/\{[\s\S]*?"id"[\s\S]*?"title"[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const newTopic = JSON.parse(jsonMatch[0]);
          
          // Validate chủ đề mới không trùng
          if (newTopic.id && newTopic.title && !existingSlugs.has(newTopic.id)) {
            selectedTopic = {
              id: newTopic.id,
              title: newTopic.title,
              description: newTopic.description || '',
              categories: newTopic.categories || ['Nông nghiệp hữu cơ'],
              prompt: ''
            };
            
            // Lưu chủ đề mới vào topics.json
            topics.push(selectedTopic);
            fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2), 'utf8');
            console.log(`[Auto-Topic] ✅ Đã sinh chủ đề mới: "${selectedTopic.title}" (${selectedTopic.id})`);
          } else {
            console.error('[Auto-Topic] ❌ Chủ đề sinh ra bị trùng hoặc thiếu trường bắt buộc.');
          }
        } catch (e) {
          console.error('[Auto-Topic] ❌ Không parse được JSON từ output:', e.message);
        }
      } else {
        console.error('[Auto-Topic] ❌ Không tìm thấy JSON trong output của agy.');
      }
    } else {
      console.error('[Auto-Topic] ❌ agy không trả kết quả:', topicResult.stderr || topicResult.error?.message);
    }
    
    if (!selectedTopic) {
      console.error('[Auto-Topic] Không thể tạo chủ đề mới. Dừng workflow.');
      process.exit(1);
    }
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
  let selectedImage = null; // Bypass Pexels to always generate cover illustrations via Fal AI Flux Klein 9B
  if (!selectedImage) {
    console.log(`[Hero Image] Bắt buộc dùng Fal AI Flux Klein 9B tạo ảnh bìa minh họa...`);
    const heroBuffer = await generateAiImage(pexelsSearchQueries[selectedTopic.id] || 'sustainable realistic organic agriculture', `${selectedTopic.id}_hero`);
    if (heroBuffer) {
      const imageName = `${selectedTopic.id}-hero.png`;
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';
      const uploadSuccess = await uploadToR2(bucketName, `posts/${imageName}`, heroBuffer);
      if (uploadSuccess) {
        const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-agrisynthe.r2.dev`;
        const cleanPublicUrl = publicUrl.replace(/\/$/, '');
        selectedImage = `${cleanPublicUrl}/posts/${imageName}?v=${Date.now()}`;
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
    // Rút gọn query: dùng từ khóa tiếng Anh (pexelsSearchQueries) hoặc cắt title ≤ 5 từ
    const shortQuery = pexelsSearchQueries[selectedTopic.id]
      || selectedTopic.title.split(/[:\-–—,]/)[0].trim().split(/\s+/).slice(0, 5).join(' ');
    console.log(`[YouTube Finder] Searching YouTube with short query: "${shortQuery}"...`);
    const candidateIds = await searchYoutubeVideo(shortQuery);
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
     - Tuyệt đối KHÔNG sử dụng văn phong quảng cáo, giật tít hoặc các từ ngữ cường điệu như: "thần kỳ", "bí mật", "bí kíp", "tuyệt vời", "hoàn hảo", "vô song", "vô giá", "cực kỳ hiệu quả". Diễn đạt khách quan, điềm tĩnh, khoa học.
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
     BẮT BUỘC: Tại mỗi mục tiêu đề H2 lớn trong thân bài viết, bạn phải chèn đúng một ảnh minh họa bằng cú pháp đặc biệt trên để hệ thống tự động sinh ảnh vẽ 2D bằng AI. Không viết đường dẫn tĩnh thông thường.
  BẮT BUỘC QUAN TRỌNG NHẤT: Bọc TOÀN BỘ bài viết Markdown (từ dấu --- mở frontmatter đến hết bài) giữa cặp ký hiệu đặc biệt sau. Không viết bất kỳ văn bản giải thích nào NGOÀI cặp ký hiệu này:
  <<<BÀI_VIẾT>>>
  ...toàn bộ nội dung bài viết Markdown ở đây...
  <<<KẾT_THÚC>>>`;

  const { spawnSync } = require('child_process');
  
  const documentsDir = path.join(__dirname, '..', 'documents');
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  console.log('Đang gọi Antigravity CLI (agy) để phân tích tài liệu và viết bài...');
  const result = spawnSync('agy', [
    '--add-dir', documentsDir,
    '--dangerously-skip-permissions',
    '--print-timeout', '10m0s',
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

  // Trích xuất bài viết từ delimiter wrapper (bỏ thinking logs)
  console.log('[Delimiter] Đang trích xuất bài viết từ delimiter wrapper...');
  content = extractDelimitedContent(content);
  console.log(`[Delimiter] Trích xuất thành công. Độ dài bài viết: ${content.length} ký tự.`);

  // VALIDATION GATE: Kiểm tra cấu trúc bắt buộc
  console.log('[Quality Gate] Đang kiểm tra cấu trúc bài viết...');
  const validation = validateArticleStructure(content);
  if (validation.errors.length > 0) {
    console.error('[Quality Gate] ❌ BÀI VIẾT KHÔNG ĐẠT CHUẨN:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  if (validation.warnings.length > 0) {
    console.warn('[Quality Gate] ⚠️ Cảnh báo:');
    validation.warnings.forEach(w => console.warn(`  - ${w}`));
  }
  console.log(`[Quality Gate] ✅ Điểm chất lượng: ${validation.score}/100`);

  // STAGE 2: Hậu kiểm văn phong — tự động sửa từ cường điệu bằng LLM từng câu
  console.log('[Stage 2] Đang quét và sửa từ cường điệu trong bài viết...');
  HYPE_WORDS_PATTERN.lastIndex = 0;
  if (HYPE_WORDS_PATTERN.test(content)) {
    content = fixHypeWordsWithLLM(content, documentsDir);
  } else {
    console.log('[Stage 2] ✅ Không phát hiện từ cường điệu nào.');
  }

  if (selectedTopic.youtube) {
    const ytId = getYoutubeId(selectedTopic.youtube);
    if (ytId) {
      // Kiểm tra LLM đã tự chèn YouTube embed chưa → tránh trùng
      const ytEmbedUrl = `youtube.com/embed/${ytId}`;
      if (!content.includes(ytEmbedUrl)) {
        const ytSection = `\n\n---\n### Video tham khảo thực tế\nXem video hướng dẫn chi tiết liên quan đến chủ đề từ YouTube:\n\n<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">\n  <iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"></iframe>\n</div>`;
        content += ytSection;
        console.log(`[YouTube Embed] Đã chèn video: ${ytId}`);
      } else {
        console.log(`[YouTube Embed] Video ${ytId} đã có trong bài, bỏ qua.`);
      }
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
  
  // Đảm bảo cả 2 trường subtitle và description luôn tồn tại song song
  // (Trang chủ đọc `description`, trang chi tiết đọc `subtitle`)
  const subtitleMatch = content.match(/^subtitle:\s*[\"']?(.+?)[\"']?\s*$/m);
  const descriptionMatch = content.match(/^description:\s*[\"']?(.+?)[\"']?\s*$/m);
  
  if (subtitleMatch && !descriptionMatch) {
    // Có subtitle nhưng thiếu description → clone subtitle thành description
    content = content.replace(/^(subtitle:\s*.+)$/m, `$1\ndescription: "${subtitleMatch[1]}"`);
  } else if (descriptionMatch && !subtitleMatch) {
    // Có description nhưng thiếu subtitle → clone description thành subtitle
    content = content.replace(/^(description:\s*.+)$/m, `subtitle: "${descriptionMatch[1]}"\n$1`);
  } else if (!subtitleMatch && !descriptionMatch) {
    // Thiếu cả 2 → tạo mặc định từ title
    const titleVal = content.match(/^title:\s*[\"']?(.+?)[\"']?\s*$/m);
    if (titleVal) {
      const defaultDesc = titleVal[1];
      content = content.replace(/^(title:\s*.+)$/m, `$1\nsubtitle: "${defaultDesc}"\ndescription: "${defaultDesc}"`);
    }
  }

  // Chèn/thay thế date trong frontmatter (tránh trùng lặp)
  if (/^date:/m.test(content)) {
    // Đã có date → thay bằng date chuẩn
    content = content.replace(/^date:\s*.+$/m, dateLine);
  } else {
    // Chưa có → chèn sau title
    content = content.replace(/^(title:\s*["'].+?["'])$/m, `$1\n${dateLine}`);
  }

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
    // Hỗ trợ mọi dạng bullet: - [1], * [1], *   [1], 1. [1], hoặc [1] đầu dòng
    footer = footer.replace(/^([-*]|\d+\.)\s*(?:`?\[(\d+)\]`?|<sup><a[^>]*>\[(\d+)\]<\/a><\/sup>)\s*(.+)$/gm, (match, prefix, num1, num2, desc) => {
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
  //       Chỉ quét phần BODY (trước mục trích dẫn), không quét trích dẫn + video
  const citationCutoff = content.indexOf('Tài liệu trích dẫn');
  const bodyForImages = citationCutoff !== -1 ? content.substring(0, citationCutoff) : content;
  const pexelsPattern = /!\[([^\]]+)\]\(pexels:\s*([^\)]+)\)/g;
  let imgMatch;
  let imageIndex = 1;
  const pexelsMatches = [];
  while ((imgMatch = pexelsPattern.exec(bodyForImages)) !== null) {
    pexelsMatches.push({
      fullMatch: imgMatch[0],
      caption: imgMatch[1],
      query: imgMatch[2].trim()
    });
  }

  console.log(`[Pexels Content Images] Tìm thấy ${pexelsMatches.length} vị trí cần chèn ảnh minh họa (chỉ trong phần body).`);
  for (const item of pexelsMatches) {
    const query = item.query;
    console.log(`[Fal AI Content Images] Đang gọi Fal AI Flux Klein 9B cho mục: "${query}"...`);
    const urls = null; // Bypass Pexels to always use Fal AI Flux Klein 9B illustrations
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
      console.log(`[Pexels Content Images] Không tìm thấy ảnh trên Pexels cho từ khóa: "${query}". Sử dụng local agy CLI tạo ảnh minh họa...`);
      const imageBuffer = await generateAiImage(query, `${selectedTopic.id}_${imageIndex}`);
      if (imageBuffer) {
        const imageName = `${selectedTopic.id}-${imageIndex}.png`;
        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';
        const uploadSuccess = await uploadToR2(bucketName, `posts/${imageName}`, imageBuffer);
        
        if (uploadSuccess) {
          const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-agrisynthe.r2.dev`;
          const cleanPublicUrl = publicUrl.replace(/\/$/, '');
          resolvedImageUrl = `${cleanPublicUrl}/posts/${imageName}?v=${Date.now()}`;
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

  // 4. Lưu thông tin bài viết mới để gửi email SAU KHI push thành công
  const pendingNotification = {
    title: selectedTopic.title,
    description: selectedTopic.description || 'Nghiên cứu khoa học và cẩm nang khuyến nông hữu cơ.',
    slug: selectedTopic.id,
    createdAt: new Date().toISOString()
  };
  const pendingPath = path.join(__dirname, '..', '_data', 'pending_notification.json');
  fs.writeFileSync(pendingPath, JSON.stringify(pendingNotification, null, 2), 'utf8');
  console.log(`[Email] Đã lưu thông tin bài viết vào pending_notification.json. Email sẽ được gửi SAU KHI git push thành công.`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
