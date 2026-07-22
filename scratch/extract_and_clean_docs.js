const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const docsList = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs_list.json'), 'utf8'));

// Filter out youtube_transcripts and non-document files (.jpg, .jpeg, .tif)
const docsOnly = docsList.filter(d => {
  if (d.folder.includes('youtube_transcripts')) return false;
  const ext = path.extname(d.fileName).toLowerCase();
  return ['.pdf', '.epub', '.mobi', '.azw', '.doc', '.docx', '.txt', '.ppt', '.xlsx'].includes(ext);
});

console.log(`Analyzing ${docsOnly.length} document files...`);

async function extractMetadata(item) {
  const ext = path.extname(item.fileName).toLowerCase();
  let extractedTitle = '';
  let sampleText = '';

  if (ext === '.pdf') {
    try {
      const buf = fs.readFileSync(item.fullPath);
      const instance = new PDFParse({ data: buf });
      const res = await instance.getText({ max: 2 });
      if (res && res.text) {
        sampleText = res.text.substring(0, 1500);
      }
    } catch (e) {
      // PDF parse fallback
    }
  } else if (ext === '.txt') {
    try {
      sampleText = fs.readFileSync(item.fullPath, 'utf8').substring(0, 1500);
    } catch (e) {}
  }

  return {
    ...item,
    sampleText
  };
}

async function run() {
  const results = [];
  for (let i = 0; i < docsOnly.length; i++) {
    const item = docsOnly[i];
    if (i % 50 === 0) console.log(`Processed ${i}/${docsOnly.length}...`);
    const meta = await extractMetadata(item);
    results.push(meta);
  }

  fs.writeFileSync(path.join(__dirname, 'docs_extracted.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(`Saved extracted data for ${results.length} documents!`);
}

run();
