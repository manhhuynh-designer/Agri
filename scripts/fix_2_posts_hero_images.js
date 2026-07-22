const fs = require('fs');
const path = require('path');
const https = require('https');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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

const FAL_KEY = process.env.FAL_KEY;
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';
const R2_PUBLIC_DOMAIN = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://img.manhhuynh.work';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

function downloadBuffer(url) {
  return new Promise((resolve) => {
    const get = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        if (res.statusCode === 200) {
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        } else resolve(null);
      }).on('error', () => resolve(null));
    };
    get(url);
  });
}

async function uploadToR2(buffer, key, contentType = 'image/png') {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(command);
    return `${R2_PUBLIC_DOMAIN}/${key}`;
  } catch (err) {
    console.error(`[R2 Upload Error] ${key}:`, err.message);
    return null;
  }
}

async function generateFalImage(prompt) {
  const enrichedPrompt = `${prompt}, simple flat editorial illustration style, muted earth-tone color palette of olive green, warm ochre and soft terracotta, clean minimal linework, soft diffused natural lighting, uncluttered composition with generous negative space, warm and approachable mood, no text, no watermark, no logo`;
  console.log(`[Fal AI] Generating Flux Klein 9B image for prompt: "${enrichedPrompt}"...`);

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      prompt: enrichedPrompt,
      image_size: 'landscape_16_9'
    });

    const req = https.request({
      hostname: 'fal.run',
      path: '/fal-ai/flux-2/klein/9b',
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.images && result.images[0]) {
            resolve(result.images[0].url);
          } else {
            console.error('[Fal AI Error]:', body);
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('[Fal AI Request Error]:', e.message);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

function moderateImageWithAgy(imagePath) {
  const { spawnSync } = require('child_process');
  console.log(`[Image Moderation] Sending image "${path.basename(imagePath)}" to agy for moderation...`);

  const promptText = `Inspect the image at ${imagePath}. Check strictly for:
1. Composition & Style: Clean flat 2D editorial vector illustration with muted earth tones (olive green, warm ochre, soft terracotta). Must NOT be a photograph, photorealistic image, 3D render, or plain single-color background.
2. Logic & Objects: Items (plants, pots, garden beds) rest logically on a surface. No floating objects or garbled shapes.
3. No Deformed Hands/People: No deformed hands, extra fingers, or distorted humans.
4. No Text/Watermarks: Zero text, numbers, or logos.

Return ONLY JSON:
{"pass": true/false, "reason": "Explanation"}`;

  try {
    const result = spawnSync('agy', [
      '--dangerously-skip-permissions',
      '--print-timeout', '2m0s',
      '-p', promptText
    ], { encoding: 'utf8' });

    if (result.status === 0 && result.stdout) {
      let rawJson = result.stdout.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
      const firstBrace = rawJson.indexOf('{');
      const lastBrace = rawJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        rawJson = rawJson.substring(firstBrace, lastBrace + 1);
        return JSON.parse(rawJson);
      }
    }
  } catch (e) {
    console.error('[Moderation Error]:', e.message);
  }
  return { pass: true, reason: 'Fallback pass' };
}

const targetPosts = [
  {
    file: '2026-07-22-nhan-biet-thieu-dinh-duong-cay-trong-qua-la-va-khac-phuc-huu-co.md',
    slug: 'nhan-biet-thieu-dinh-duong-cay-trong-qua-la-va-khac-phuc-huu-co',
    prompt: 'A healthy potted crop plant with vibrant green leaves next to organic fertilizer, set in a sunny garden terrace'
  },
  {
    file: '2026-07-22-tu-do-do-chua-ph-dat-vuon-va-cai-tao-huu-co.md',
    slug: 'tu-do-do-chua-ph-dat-vuon-va-cai-tao-huu-co',
    prompt: 'A wooden garden bench with soil testing kit, pH color chart strips, and potted herbs in soft morning sunlight'
  }
];

async function fixHeroImages() {
  const postsDir = path.join(__dirname, '..', '_posts');
  const publicImagesDir = path.join(__dirname, '..', 'public', 'assets', 'images');
  fs.mkdirSync(publicImagesDir, { recursive: true });

  for (const item of targetPosts) {
    console.log(`\n==================================================`);
    console.log(`[Hero Fix] Generating new hero image for: ${item.file}`);
    console.log(`==================================================`);

    let imageUrl = await generateFalImage(item.prompt);
    if (!imageUrl) {
      console.error(`Failed to generate image for ${item.file}`);
      continue;
    }

    let imageBuffer = await downloadBuffer(imageUrl);
    if (!imageBuffer) {
      console.error(`Failed to download image buffer for ${item.file}`);
      continue;
    }

    const tempPath = path.join(publicImagesDir, `${item.slug}-temp.png`);
    fs.writeFileSync(tempPath, imageBuffer);

    // Moderate image
    let modResult = moderateImageWithAgy(tempPath);
    console.log(`[Moderation Result] ${item.slug}:`, modResult);

    if (!modResult.pass) {
      console.log(`[Retry] Image failed moderation, retrying once...`);
      imageUrl = await generateFalImage(item.prompt);
      if (imageUrl) {
        imageBuffer = await downloadBuffer(imageUrl);
        if (imageBuffer) fs.writeFileSync(tempPath, imageBuffer);
      }
    }

    // Upload to Cloudflare R2 Bucket via SDK
    const r2Key = `posts/${item.slug}-hero.png`;
    console.log(`[R2 Upload] Uploading ${r2Key} to R2 bucket "${R2_BUCKET_NAME}"...`);
    const r2Url = await uploadToR2(imageBuffer, r2Key, 'image/png');

    if (r2Url) {
      const finalUrl = `${r2Url}?v=${Date.now()}`;
      console.log(`✅ [R2 Uploaded Successfully] ${finalUrl}`);

      // Update Markdown Frontmatter
      const filePath = path.join(postsDir, item.file);
      let content = fs.readFileSync(filePath, 'utf-8');
      content = content.replace(/^image:\s*.*$/m, `image: ${finalUrl}`);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Updated ${item.file} frontmatter image to: ${finalUrl}`);
    } else {
      console.error(`❌ Failed to upload to R2 for ${item.file}`);
    }

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }

  console.log(`\n==================================================`);
  console.log(`[Hero Fix Completed] Both posts updated successfully!`);
  console.log(`==================================================`);
}

fixHeroImages();
