/**
 * sync_posts_to_r2.js
 * Script đồng bộ hóa tất cả các bài viết cục bộ lên Cloudflare R2 dưới dạng JSON.
 * Đồng thời cập nhật posts-index.json cho trang chủ.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  });
}

const POSTS_DIR = path.join(__dirname, '..', '_posts');
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';

// Tái sử dụng helper upload R2 sử dụng AWS S3 SDK
function uploadToR2(bucketName, key, buffer, contentType = 'application/json') {
  return new Promise((resolve) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('[Cloudflare R2] Warning: Credentials not found in environment.');
      resolve(false);
      return;
    }

    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType
      });

      s3.send(command)
        .then(() => {
          console.log(`[Cloudflare R2] Upload successful for "${key}"`);
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

async function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('Không tìm thấy thư mục _posts.');
    process.exit(1);
  }

  const filenames = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  console.log(`Tìm thấy ${filenames.length} bài viết cần đồng bộ hóa lên R2...`);

  const postsIndex = [];

  for (const filename of filenames) {
    const filePath = path.join(POSTS_DIR, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    
    // Parse ngày từ tên file
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateString = dateMatch ? dateMatch[1] : '';
    let formattedDate = '';
    if (dateString) {
      const [year, month, day] = dateString.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    let readTime = 5;
    if (data.read_time) {
      const timeStr = String(data.read_time)
        .replace(' phút', '')
        .replace(' min', '')
        .trim();
      readTime = parseInt(timeStr) || 5;
    }

    const postData = {
      slug,
      title: data.title || slug,
      subtitle: data.subtitle || data.description || '',
      description: data.description || data.subtitle || '',
      date: data.date || `${dateString} 12:00:00 +0700`,
      dateString: formattedDate,
      categories: Array.isArray(data.categories) ? data.categories : (data.category ? [data.category] : ['Khác']),
      tags: Array.isArray(data.tags) ? data.tags : [],
      image: data.image || '/assets/images/favicon.svg',
      readTime: `${readTime} phút`,
      content: content.trim()
    };

    // Upload từng file bài viết chi tiết lên R2 dưới dạng JSON
    const postBuffer = Buffer.from(JSON.stringify(postData, null, 2), 'utf8');
    await uploadToR2(bucketName, `posts/${slug}.json`, postBuffer);

    // Lưu meta rút gọn vào postsIndex
    postsIndex.push({
      slug,
      title: postData.title,
      description: postData.description,
      subtitle: postData.subtitle,
      date: postData.date,
      dateString: postData.dateString,
      categories: postData.categories,
      tags: postData.tags,
      image: postData.image,
      readTime: postData.readTime
    });
  }

  // Sắp xếp bài viết giảm dần theo ngày
  postsIndex.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Upload file posts-index.json lên R2
  const indexBuffer = Buffer.from(JSON.stringify(postsIndex, null, 2), 'utf8');
  const indexSuccess = await uploadToR2(bucketName, 'posts-index.json', indexBuffer);

  if (indexSuccess) {
    console.log('✅ Đã đồng bộ toàn bộ bài viết và cập nhật thành công posts-index.json lên Cloudflare R2!');
  } else {
    console.error('❌ Cập nhật posts-index.json thất bại.');
  }
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
