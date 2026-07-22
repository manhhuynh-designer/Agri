const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const manifestPath = path.join(__dirname, '..', 'temp_covers', 'covers_manifest.json');
const docsListPath = path.join(__dirname, '..', 'scratch', 'docs_list.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const docsList = JSON.parse(fs.readFileSync(docsListPath, 'utf8')).filter(d => {
  if (d.folder.includes('youtube_transcripts') || d.relPath.includes('youtube_transcripts')) return false;
  const ext = path.extname(d.fileName).toLowerCase();
  return ['.pdf', '.epub', '.mobi', '.azw', '.doc', '.docx', '.txt', '.ppt', '.xlsx'].includes(ext);
});

console.log(`Starting strict LLM vision extraction for ${manifest.length} rendered PDF cover images...`);

// Map manifest by fileName for instant lookup
const manifestMap = new Map();
manifest.forEach(m => manifestMap.set(m.fileName, m));

// Results store
const processedResults = [];

// Helper for title formatting
function formatTitle(fileName) {
  let base = fileName.replace(/\.(pdf|epub|mobi|azw|doc|docx|txt|ppt|xlsx)$/i, '').trim();
  base = base.replace(/^ADDA_/i, '').replace(/^GT_/i, 'Giáo trình ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return base;
}

// Parallel worker queue (process 3 at a time)
async function analyzeItem(item) {
  const coverObj = manifestMap.get(item.fileName);
  let extractedAuthor = '';
  let extractedTitle = formatTitle(item.fileName);

  if (coverObj && coverObj.coverImg && fs.existsSync(coverObj.coverImg)) {
    const imgPath = coverObj.coverImg;
    const promptText = `Inspect the book cover / title page image at "${imgPath}".

Tasks:
1. Extract the EXACT official printed Book/Document Title (with FULL Vietnamese diacritical accents if Vietnamese). Do NOT use filename or slang.
2. Extract the EXACT Author Name(s) and Publisher/Organization as printed visually on this cover. If no author/publisher is printed, return empty string "".
3. DO NOT INVENT, GUESS, OR USE PLACEHOLDERS.

Return JSON format ONLY:
{
  "title": "Exact full printed title with accents",
  "author": "Exact Author Name / Publisher or empty string"
}`;

    try {
      const result = spawnSync('agy', [
        '--dangerously-skip-permissions',
        '--print-timeout', '30s',
        '-p', promptText
      ], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });

      if (result.status === 0 && result.stdout) {
        const match = result.stdout.match(/\{[\s\S]*?\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (parsed.author && typeof parsed.author === 'string') {
              let a = parsed.author.trim();
              if (/viện nghiên cứu|nông nghiệp bền vững|chưa xác định|đang cập nhật|nhiều tác giả/i.test(a)) {
                a = '';
              }
              extractedAuthor = a;
            }
            if (parsed.title && typeof parsed.title === 'string' && parsed.title.trim().length > 4) {
              extractedTitle = parsed.title.trim();
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  return {
    fileName: item.fileName,
    folder: item.folder,
    relPath: item.relPath,
    fullPath: item.fullPath,
    title: extractedTitle,
    author: extractedAuthor // BLANK IF NOT VISUALLY PRINTED ON COVER
  };
}

async function runBatch() {
  const batchSize = 2;
  const outPath = path.join(__dirname, '..', 'scratch', 'docs_vision_strict_authors.json');

  for (let i = 0; i < docsList.length; i += batchSize) {
    const chunk = docsList.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map(item => analyzeItem(item)));
    processedResults.push(...chunkResults);
    
    chunkResults.forEach(r => {
      console.log(`[${processedResults.length}/${docsList.length}] ${r.fileName}`);
      console.log(`   -> Author: "${r.author}"`);
    });

    if (processedResults.length % 10 === 0 || processedResults.length === docsList.length) {
      fs.writeFileSync(outPath, JSON.stringify(processedResults, null, 2), 'utf8');
      console.log(`--- Saved progress (${processedResults.length}/${docsList.length}) to ${outPath} ---`);
    }
  }

  console.log(`All covers analyzed! Saved total ${processedResults.length} items to ${outPath}`);
}

runBatch();
