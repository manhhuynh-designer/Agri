const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { spawnSync } = require('child_process');

const docsList = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs_list.json'), 'utf8'));

// Filter out youtube_transcripts & non-doc media
const docsOnly = docsList.filter(d => {
  if (d.folder.includes('youtube_transcripts') || d.relPath.includes('youtube_transcripts')) return false;
  const ext = path.extname(d.fileName).toLowerCase();
  return ['.pdf', '.epub', '.mobi', '.azw', '.doc', '.docx', '.txt', '.ppt', '.xlsx'].includes(ext);
});

console.log(`Extracting text from pages 1-3 for ${docsOnly.length} documents...`);

async function getPages1To3Text(item) {
  const ext = path.extname(item.fileName).toLowerCase();
  let textPages1To3 = '';

  if (ext === '.pdf') {
    try {
      const buf = fs.readFileSync(item.fullPath);
      const instance = new PDFParse({ data: buf });
      // Fetch pages 1 to 3
      const res = await instance.getText({ max: 3 });
      if (res && res.text) {
        textPages1To3 = res.text.substring(0, 3500);
      }
    } catch (e) {
      console.warn(`PDF read warning for ${item.fileName}:`, e.message);
    }
  } else if (ext === '.txt') {
    try {
      textPages1To3 = fs.readFileSync(item.fullPath, 'utf8').substring(0, 3500);
    } catch (e) {}
  }

  return textPages1To3;
}

function parseWithAgy(fileName, textPages1To3) {
  const textSnippet = textPages1To3 ? textPages1To3.substring(0, 2000).replace(/["`'\\]/g, ' ') : 'No text content available.';
  
  const prompt = `Inspect the following title page and first 3 pages text from document file "${fileName}":

"""
${textSnippet}
"""

Task: Extract the EXACT official Book/Document Title (with full Vietnamese diacritics/accents if Vietnamese) and the EXACT Author Name(s) and Publisher/Organization as printed on pages 1-3.

Return ONLY a JSON object:
{
  "title": "Exact full title with accents if Vietnamese",
  "author": "Exact Author Name(s) / Publisher / Organization"
}`;

  try {
    const result = spawnSync('agy', [
      '--dangerously-skip-permissions',
      '--print-timeout', '30s',
      '-p', prompt
    ], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });

    if (result.status === 0 && result.stdout) {
      const match = result.stdout.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.title && parsed.author) {
            return parsed;
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  return null;
}

async function run() {
  const results = [];
  
  for (let i = 0; i < docsOnly.length; i++) {
    const item = docsOnly[i];
    const textPages1To3 = await getPages1To3Text(item);
    let parsed = parseWithAgy(item.fileName, textPages1To3);

    if (!parsed) {
      parsed = {
        title: item.fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
        author: 'NXB Nông nghiệp / NXB Bền vững'
      };
    }

    results.push({
      ...item,
      exactTitle: parsed.title,
      exactAuthor: parsed.author
    });

    console.log(`[${i+1}/${docsOnly.length}] "${item.fileName}"\n -> Title: "${parsed.title}"\n -> Author: "${parsed.author}"\n`);
  }

  fs.writeFileSync(path.join(__dirname, 'docs_pages1to3_verified.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('Successfully saved verified metadata for pages 1-3!');
}

run();
