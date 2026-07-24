const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Load .env
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

const postsDir = path.join(__dirname, '..', '_posts');
const postFiles = fs.readdirSync(postsDir);

const postsIndex = [];

postFiles.forEach(file => {
  if (!file.endsWith('.md') && !file.endsWith('.html')) return;
  const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(content);

  const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
  const dateStr = dateMatch ? dateMatch[1] : '';
  let formattedDate = '';
  if (dateStr) {
    const [year, month, day] = dateStr.split('-');
    formattedDate = `${day}/${month}/${year}`;
  }

  postsIndex.push({
    slug: slug,
    title: data.title || slug,
    description: data.description || data.subtitle || '',
    subtitle: data.subtitle || data.description || '',
    date: data.date || `${dateStr} 12:00:00 +0700`,
    dateString: data.dateString || formattedDate,
    categories: Array.isArray(data.categories) ? data.categories : (data.category ? [data.category] : ['Hướng dẫn']),
    tags: Array.isArray(data.tags) ? data.tags : ['Hữu cơ'],
    image: data.image || `/assets/images/generated_${slug}.svg`,
    readTime: data.read_time || '5 phút'
  });
});

postsIndex.sort((a, b) => new Date(b.date) - new Date(a.date));

console.log(`Parsed ${postsIndex.length} posts from local _posts/`);

// Upload to R2
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Cloudflare R2 credentials missing!');
  process.exit(1);
}

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

const indexBuffer = Buffer.from(JSON.stringify(postsIndex, null, 2), 'utf8');

const command = new PutObjectCommand({
  Bucket: bucketName,
  Key: 'posts-index.json',
  Body: indexBuffer,
  ContentType: 'application/json'
});

s3.send(command).then(() => {
  console.log('✅ Successfully rebuilt and uploaded posts-index.json to R2!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed to upload posts-index.json to R2:', err);
  process.exit(1);
});
