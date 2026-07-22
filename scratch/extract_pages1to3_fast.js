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

// Extract pages 1-3 text for all files synchronously first
async function getPages1To3Text(item) {
  const ext = path.extname(item.fileName).toLowerCase();
  let text = '';

  if (ext === '.pdf') {
    try {
      const buf = fs.readFileSync(item.fullPath);
      const instance = new PDFParse({ data: buf });
      const res = await instance.getText({ max: 3 });
      if (res && res.text) text = res.text.substring(0, 3500);
    } catch (e) {}
  } else if (ext === '.txt') {
    try {
      text = fs.readFileSync(item.fullPath, 'utf8').substring(0, 3500);
    } catch (e) {}
  }

  return text;
}

function parseFromPages1To3(item, text) {
  if (!text || text.length < 20) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 150);

  let author = null;
  let title = null;

  // 1. Check for explicit Author lines on pages 1-3
  // e.g. "by John Smith", "By Jane Doe", "Tác giả: Nguyễn Văn A", "Chủ biên: GS. TS. B"
  for (let l of lines.slice(0, 30)) {
    const authorMatch = l.match(/(?:by|edited by|written by|tác giả|chủ biên|biên soạn|tác giả:|chủ biên:)\s+([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+){1,4})/i);
    if (authorMatch && authorMatch[1] && authorMatch[1].length > 4 && !/table of contents|introduction|chapter|abstract/i.test(authorMatch[1])) {
      author = authorMatch[1].trim();
      break;
    }
  }

  // 2. Check for Publishers / Agencies on pages 1-3
  let publisher = null;
  for (let l of lines.slice(0, 35)) {
    if (/SARE|Sustainable Agriculture Research/i.test(l)) publisher = 'SARE Outreach';
    else if (/USDA|United States Department of Agriculture/i.test(l)) publisher = 'USDA Agricultural Research Service';
    else if (/FAO|Food and Agriculture Organization/i.test(l)) publisher = 'FAO (Food and Agriculture Organization)';
    else if (/CSIRO/i.test(l)) publisher = 'CSIRO Publishing';
    else if (/Storey Publishing|Storey Country Wisdom/i.test(l)) publisher = 'Storey Publishing';
    else if (/Rodale/i.test(l)) publisher = 'Rodale Institute';
    else if (/Nhà xuất bản Nông nghiệp|NXB Nông nghiệp/i.test(l)) publisher = 'Nhà xuất bản Nông nghiệp';
    else if (/Nhà xuất bản Lao động|NXB Lao động/i.test(l)) publisher = 'Nhà xuất bản Lao động';
    else if (/Nhà xuất bản Giáo dục|NXB Giáo dục/i.test(l)) publisher = 'Nhà xuất bản Giáo dục Việt Nam';
    else if (/Nhà xuất bản Phụ nữ|NXB Phụ nữ/i.test(l)) publisher = 'Nhà xuất bản Phụ nữ';
    else if (/Nhà xuất bản Bách Khoa/i.test(l)) publisher = 'Nhà xuất bản Bách Khoa';
    else if (/Đại học Cần Thơ|ĐH Cần Thơ/i.test(l)) publisher = 'Đại học Cần Thơ';
    else if (/Đại học Nông Lâm/i.test(l)) publisher = 'Đại học Nông Lâm Thái Nguyên';
    if (publisher) break;
  }

  // Combine Author + Publisher if both found
  let fullAuthorInfo = null;
  if (author && publisher) fullAuthorInfo = `${author} (${publisher})`;
  else if (author) fullAuthorInfo = author;
  else if (publisher) fullAuthorInfo = publisher;

  // 3. Extract exact Title from pages 1-3 (looking for prominent line)
  for (let l of lines.slice(0, 15)) {
    if (/^(bộ nông nghiệp|nhà xuất bản|giáo trình|báo cáo|tài liệu|chương|tập|phần|trang|\d+)/i.test(l)) continue;
    if (/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(l)) {
      let t = l.replace(/^[-*•\d.\s]+/, '').trim();
      if (t.length >= 8 && t.length <= 100) {
        title = t;
        break;
      }
    }
  }

  return { title, author: fullAuthorInfo };
}

async function run() {
  const extractedItems = [];

  for (let i = 0; i < docsOnly.length; i++) {
    const item = docsOnly[i];
    const textPages1To3 = await getPages1To3Text(item);
    const parsed = parseFromPages1To3(item, textPages1To3);

    extractedItems.push({
      ...item,
      textPages1To3: textPages1To3.substring(0, 1500),
      parsedFromText: parsed
    });
  }

  console.log(`Successfully extracted pages 1-3 text for all ${extractedItems.length} documents.`);
  fs.writeFileSync(path.join(__dirname, 'docs_pages1to3_raw.json'), JSON.stringify(extractedItems, null, 2), 'utf8');
}

run();
