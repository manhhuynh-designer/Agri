const fs = require('fs');
const path = require('path');
const https = require('https');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

// Helper to verify YouTube video existence via oEmbed API
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
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Extract YouTube URLs from file content
function extractYoutubeUrls(content) {
  const urls = [];
  
  // Pattern for iframe src /embed/VIDEO_ID
  const iframeRegex = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g;
  let match;
  while ((match = iframeRegex.exec(content)) !== null) {
    urls.push(`https://www.youtube.com/watch?v=${match[1]}`);
  }

  // Pattern for standard watch?v= or youtu.be/ links
  const watchRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  while ((match = watchRegex.exec(content)) !== null) {
    urls.push(match[0]);
  }

  // Deduplicate
  return [...new Set(urls)];
}

async function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('Posts directory not found!');
    return;
  }

  console.log('Auditing existing blog posts for YouTube videos...\n');
  const files = fs.readdirSync(POSTS_DIR);
  
  let totalLinks = 0;
  let brokenLinks = 0;

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const urls = extractYoutubeUrls(content);
    
    if (urls.length === 0) continue;

    console.log(`📄 Post: ${file}`);
    for (const url of urls) {
      totalLinks++;
      console.log(`   🔍 Checking: ${url}`);
      const isActive = await verifyYoutubeLink(url);
      if (isActive) {
        console.log('   ✅ STATUS: ACTIVE');
      } else {
        console.log('   ❌ STATUS: BROKEN / NOT FOUND');
        brokenLinks++;
      }
    }
    console.log('');
  }

  console.log('--------------------------------------------------');
  console.log(`Audit Finished. Total links checked: ${totalLinks}, Broken links: ${brokenLinks}`);
}

main();
