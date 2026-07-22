const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const tempCoversDir = path.join(__dirname, '..', 'temp_covers');
const files = fs.readdirSync(tempCoversDir).filter(f => f.endsWith('.png'));

console.log(`Found ${files.length} cover images in temp_covers/`);

const sampleFiles = files.slice(0, 5);

for (const file of sampleFiles) {
  const imgPath = path.join(tempCoversDir, file);
  
  const promptText = `Inspect the book cover / title page image at "${imgPath}".
Extract the EXACT Author Name(s) and Publisher/Organization as printed visually on this cover.
If no author name or publisher is printed on this page, return empty string "".
DO NOT INVENT, GUESS, OR USE PLACEHOLDERS. IF UNCERTAIN, RETURN EMPTY STRING "".

Return JSON format ONLY:
{
  "title": "exact title on cover or empty",
  "author": "exact printed author/publisher or empty"
}`;

  try {
    const result = spawnSync('agy', [
      '--dangerously-skip-permissions',
      '--print-timeout', '30s',
      '-p', promptText
    ], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });

    if (result.status === 0 && result.stdout) {
      console.log('==================================================');
      console.log('File:', file);
      console.log('LLM Vision Response:', result.stdout.trim());
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}
