const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const manifestPath = path.join(__dirname, '..', 'temp_covers', 'covers_manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Error: Manifest file not found at:', manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log(`Starting LLM vision analysis on ${manifest.length} book cover images...`);
console.log(`STRICT RULE: If no author or publisher is printed on the cover, author must be left completely BLANK (""). Absolutely NO fallbacks or placeholders allowed.\n`);

const results = [];
for (let i = 0; i < manifest.length; i++) {
  const item = manifest[i];
  const imgPath = item.coverImg;

  const promptText = `Inspect the book cover / title page image at "${imgPath}".
Extract the EXACT Author Name(s) and Publisher/Organization as printed visually on this cover.
If no author name or publisher is printed on this page, return empty string "".
DO NOT INVENT, GUESS, OR USE PLACEHOLDERS. IF UNCERTAIN, RETURN EMPTY STRING "".

Return JSON format ONLY:
{
  "author": "Exact Author Name / Publisher or empty string"
}`;

  let author = '';
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
            author = parsed.author.trim();
            // Filter out generic phrases if LLM accidentally output one
            if (/viện nghiên cứu|nông nghiệp bền vững|chưa xác định|đang cập nhật/i.test(author)) {
              author = '';
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`Error analyzing ${item.fileName}:`, e.message);
  }

  item.extractedAuthor = author;
  results.push(item);

  console.log(`[${i + 1}/${manifest.length}] ${item.fileName}`);
  console.log(`   -> Extracted Author: "${author}"\n`);
}

const outPath = path.join(__dirname, '..', 'temp_covers', 'llm_extracted_authors.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Analysis complete! Saved results to ${outPath}`);
