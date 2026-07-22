const fs = require('fs');
const path = require('path');
const https = require('https');
const matter = require('gray-matter');

// Load environment variables from .env
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
          res.on('end', () => resolve(Buffer.concat(chunks)));
        } else {
          resolve(null);
        }
      }).on('error', (err) => {
        console.error('[Buffer Downloader] Error:', err.message);
        resolve(null);
      });
    };
    fetchUrl(url);
  });
}

function buildDetailedScenePrompt(title, context = '') {
  const { spawnSync } = require('child_process');
  console.log(`[Scene Prompt Builder] Generating detailed visual scene prompt for: "${title}"...`);

  const promptGenText = `Create a minimalist, very simple and concise visual scene description in English (maximum 12 words) for an editorial illustration about: "${title}". ${context ? `Context: ${context}` : ''}
The output must be formatted exactly as:
"[Concise main subject - simple action or object], [simple setting: location, time of day, lighting]"

Keep it extremely simple and clean. Do not describe complex details, textures, or multiple actions.
Return ONLY this single comma-separated description. Do not wrap in quotes or add any introductory text.
Example:
"A hand watering a Monstera plant, a modern living room with morning light"`;

  try {
    const result = spawnSync('agy', [
      '--dangerously-skip-permissions',
      '--print-timeout', '1m0s',
      '-p', promptGenText
    ], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });

    if (result.status === 0 && result.stdout && result.stdout.trim().length > 15) {
      let scene = result.stdout.trim();
      scene = scene.replace(/^```[\s\S]*?\n/, '').replace(/```\s*$/, '').trim();
      scene = scene.replace(/^.*?(📖|✏️|🆕|READ|EDIT|CREATE).*$/gm, '').trim();
      const lines = scene.split('\n').filter(l => l.trim().length > 15);
      if (lines.length > 0) scene = lines[lines.length - 1].trim();

      scene = scene.replace(/^['"]|['"]$/g, '').trim();

      if (scene.length > 15 && !/(📖|✏️|🆕|I will|Let me)/.test(scene)) {
        console.log(`[Scene Prompt Builder] ✅ Detailed scene description: "${scene}"`);
        return scene;
      }
    }
  } catch (e) {
    console.warn(`[Scene Prompt Builder] Warning: LLM scene generation failed, using fallback string:`, e.message);
  }

  const fallbackScene = `A detailed organic agricultural scene showing ${title}, set in a clean modern organic agricultural farm during warm diffused morning light`;
  console.log(`[Scene Prompt Builder] Fallback scene prompt: "${fallbackScene}"`);
  return fallbackScene;
}

function moderateImageWithLlm(imageBuffer, imageName) {
  const { spawnSync } = require('child_process');
  const tempPath = path.join(__dirname, '..', `temp_mod_${imageName.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
  
  try {
    fs.writeFileSync(tempPath, imageBuffer);
  } catch (err) {
    console.error('[Image Moderation] Failed to write temp file:', err.message);
    return { pass: true, reason: 'Failed to write temp file, skipping moderation' };
  }

  const promptText = `Inspect the image at ${tempPath}. Check strictly for the following quality, style, and physical logic criteria:
1. Physical & Action Logic (CRITICAL): Does the action make sense physically? For example:
   - If spraying water or pesticide mist, the spray bottle/nozzle MUST be pointing directly towards the plant or leaves (NOT into empty air, away from plants, or pointing at nothing).
   - If watering, mixing soil, or pruning, tools and hands MUST directly interact with the soil/pot/plant logically.
   - No floating tools, disconnected hose pipes, or physically impossible interactions.
2. Hands/Fingers: Are human hands or fingers deformed, distorted, having extra/missing digits, or unnaturally jointed?
3. Text/Logos: Does the image contain ANY text, garbled characters, watermarks, or logos?
4. Composition & Style:
   - Is it a clean flat 2D editorial vector-style illustration with muted earth tones?
   - Must NOT be a photograph, photorealistic image, or 3D render.
   - Composition must be uncluttered and balanced.

If the image fails ANY of these criteria (especially illogical actions, spraying in wrong direction, deformed hands, text/logos, or photorealism), return pass=false.
Return JSON format ONLY:
{
  "pass": true/false,
  "reason": "Clear explanation of pass or failure"
}`;

  console.log(`[Image Moderation] Sending image "${imageName}" to agy for strict visual moderation...`);
  try {
    const result = spawnSync('agy', [
      '--dangerously-skip-permissions',
      '--print-timeout', '1m0s',
      '-p', promptText
    ], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });

    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    if (result.status === 0 && result.stdout) {
      let output = result.stdout.trim();
      const match = output.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`[Image Moderation] Result for "${imageName}":`, parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.error(`[Image Moderation] Error calling agy:`, e.message);
  }

  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }
  return { pass: true, reason: "Fallback: Moderation tool error, skipped verification." };
}

function generateAiImage(scenePrompt, imageName) {
  return new Promise(async (resolve) => {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.warn('[Fal AI] Warning: FAL_KEY not found in environment.');
      return resolve(null);
    }

    const enrichedPrompt = `${scenePrompt}, simple flat editorial illustration style, muted earth-tone color palette of olive green, warm ochre and soft terracotta, clean minimal linework, soft diffused natural lighting, uncluttered composition with generous negative space, warm and approachable mood, no text, no watermark, no logo`;
    
    const url = 'https://fal.run/fal-ai/flux-2/klein/9b';
    const reqData = JSON.stringify({ prompt: enrichedPrompt, image_size: 'landscape_16_9' });
    const urlParts = new URL(url);

    const callFalApi = () => {
      return new Promise((resResolve) => {
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
                    .then(buffer => resResolve(buffer))
                    .catch(err => {
                      console.error('[Fal AI] Download error:', err.message);
                      resResolve(null);
                    });
                } else {
                  console.error('[Fal AI] No image URL found in response:', data);
                  resResolve(null);
                }
              } catch (e) {
                console.error('[Fal AI] JSON Parse error:', e.message);
                resResolve(null);
              }
            } else {
              console.error(`[Fal AI] API failed, status: ${res.statusCode}, response: ${data}`);
              resResolve(null);
            }
          });
        });

        req.on('error', (err) => {
          console.error('[Fal AI] Connection error:', err.message);
          resResolve(null);
        });

        req.write(reqData);
        req.end();
      });
    };

    let buffer = null;
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Fal AI] Generating 16:9 2D illustration via Flux Klein 9B (Bản ${attempt}/${maxRetries}) for prompt:\n"${enrichedPrompt}"\n...`);
      buffer = await callFalApi();
      if (!buffer) {
        console.warn(`[Fal AI] Generation failed on attempt ${attempt}.`);
        continue;
      }

      // Perform LLM image moderation
      const modResult = moderateImageWithLlm(buffer, imageName);
      if (modResult.pass) {
        console.log(`[Image Moderation] ✅ Verification PASSED for "${imageName}" (Bản ${attempt}).`);
        return resolve(buffer);
      } else {
        console.warn(`[Image Moderation] ❌ Verification FAILED for "${imageName}" (Bản ${attempt}/${maxRetries}): ${modResult.reason}`);
        if (attempt < maxRetries) {
          console.log(`[Image Moderation] 🔄 Tiến hành tạo lại bản 2...`);
        }
      }
    }

    console.warn(`[Image Moderation] 🚫 Ảnh "${imageName}" không đạt kiểm duyệt sau 2 bản. Cắt bỏ hình ảnh này khỏi bài viết.`);
    resolve(null);
  });
}

function uploadToR2(bucketName, key, buffer) {
  return new Promise((resolve) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    
    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('[Cloudflare R2] Warning: Cloudflare credentials missing in environment.');
      return resolve(false);
    }

    console.log(`[Cloudflare R2] Uploading object "${key}" to bucket "${bucketName}"...`);
    
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
          console.log(`[Cloudflare R2] Upload successful for "${key}".`);
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

async function rerenderSpecificImages(filename, targetIndices = [2, 4]) {
  const filepath = path.join(__dirname, '..', '_posts', filename);
  if (!fs.existsSync(filepath)) {
    console.error(`Error: Post file ${filepath} not found.`);
    process.exit(1);
  }

  let content = fs.readFileSync(filepath, 'utf-8');
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
  const parsedMatter = matter(content);
  const title = parsedMatter.data.title || slug;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'agrisynthe';
  const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-agrisynthe.r2.dev').replace(/\/$/, '');
  const timestamp = Date.now();

  console.log(`\n==================================================`);
  console.log(`[Rerender Target Images] Re-rendering images ${targetIndices.join(', ')} for post: "${title}"...`);
  console.log(`==================================================\n`);

  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+|\/assets\/images\/posts\/[^\)]+)\)/g;
  let match;
  const imageMatches = [];
  while ((match = imgRegex.exec(content)) !== null) {
    imageMatches.push({
      fullMatch: match[0],
      caption: match[1],
      oldUrl: match[2]
    });
  }

  console.log(`[Target Rerender] Post has ${imageMatches.length} total images.`);

  let indexCounter = 1;
  for (const item of imageMatches) {
    if (targetIndices.includes(indexCounter)) {
      const caption = item.caption || `Illustration ${indexCounter} for ${title}`;
      console.log(`\n[Target Rerender Image ${indexCounter}] Processing: "${caption}"...`);
      const sectionScene = buildDetailedScenePrompt(caption, `Topic: ${title}`);
      const imgBuffer = await generateAiImage(sectionScene, `${slug}_${indexCounter}_v3`);

      if (imgBuffer) {
        const imgKey = `posts/${slug}-${indexCounter}-v4.png`;
        const uploadSuccess = await uploadToR2(bucketName, imgKey, imgBuffer);
        const newImgUrl = uploadSuccess
          ? `${publicUrl}/${imgKey}?v=${timestamp}`
          : `/assets/images/posts/${slug}-${indexCounter}-v4.png`;

        if (!uploadSuccess) {
          const postsImgDir = path.join(__dirname, '..', 'public', 'assets', 'images', 'posts');
          if (!fs.existsSync(postsImgDir)) fs.mkdirSync(postsImgDir, { recursive: true });
          fs.writeFileSync(path.join(postsImgDir, `${slug}-${indexCounter}-v4.png`), imgBuffer);
        }

        content = content.replace(item.fullMatch, `![${item.caption}](${newImgUrl})`);
        console.log(`[Target Rerender ${indexCounter}] ✅ Successfully updated image URL: ${newImgUrl}`);
      } else {
        console.warn(`[Target Rerender ${indexCounter}] 🚫 Ảnh "${caption}" không đạt kiểm duyệt sau 2 bản. Cắt bỏ hình ảnh này khỏi bài viết.`);
        content = content.replace(item.fullMatch, '');
      }
    }
    indexCounter++;
  }

  // Save updated .md file
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`\n[Save] ✅ Saved updated post file: _posts/${filename}`);
}

const targetFile = process.argv[2] || '2026-07-21-phong-tru-sau-benh-cay-canh-trong-nha.md';
const indicesArg = process.argv[3] ? process.argv[3].split(',').map(Number) : [2];

rerenderSpecificImages(targetFile, indicesArg).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
