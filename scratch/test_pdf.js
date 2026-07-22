const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function testPdf() {
  const docsList = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs_list.json'), 'utf8'));
  const pdfs = docsList.filter(d => d.fileName.endsWith('.pdf')).slice(0, 10);

  for (const item of pdfs) {
    try {
      const buffer = fs.readFileSync(item.fullPath);
      const data = await pdfParse(buffer, { max: 2 });
      console.log('==================================================');
      console.log('File:', item.fileName);
      console.log('Metadata info:', data.info);
      const firstLines = data.text.split('\n').map(l => l.trim()).filter(l => l.length > 3).slice(0, 8);
      console.log('First text lines:', firstLines);
    } catch (err) {
      console.error('Error parsing', item.fileName, err.message);
    }
  }
}

testPdf();
