const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', '_posts');
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const filepath = path.join(POSTS_DIR, file);
  let content = fs.readFileSync(filepath, 'utf-8');

  // Extract YouTube section if present
  let ytBlock = '';
  const ytMatch = content.match(/(### Video tham khảo thực tế[\s\S]*?<\/div>)/i);
  if (ytMatch) {
    ytBlock = ytMatch[1].trim();
    // Strip ytBlock from content
    content = content.replace(/---[\s]*\n### Video tham khảo thực tế[\s\S]*?<\/div>/gi, '').trim();
    content = content.replace(/### Video tham khảo thực tế[\s\S]*?<\/div>/gi, '').trim();
  }

  // Extract all citation blocks
  const citMatches = [...content.matchAll(/(?:##|###) Tài liệu trích dẫn chi tiết[\s\S]*?(?=(?:---|##|###|$))/gi)];
  
  const citationLinesMap = new Map();

  citMatches.forEach(m => {
    const text = m[0];
    const lines = text.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(/^[-*]\s*(?:<span id="ref-(\d+)">|\s*)(?:\*\*\[(\d+)\]\*\*|\[(\d+)\])(?:<\/span>|\s*)([\s\S]+?)(?:\s*<a href[\s\S]+|$)/i);
      if (match) {
        const num = match[1] || match[2] || match[3];
        let citText = match[4].replace(/<\/?sup>/g, '').replace(/<\/?a[^>]*>/g, '').replace(/\*\*\[\d+\]\*\*/g, '').trim();
        if (num && citText && !citationLinesMap.has(num)) {
          citationLinesMap.set(num, citText);
        }
      }
    });
  });

  // Remove all existing citation sections from content
  content = content.replace(/(?:---|)\s*(?:##|###) Tài liệu trích dẫn chi tiết[\s\S]*$/gi, '').trim();

  // Re-clean inline citations in content body
  // Clean old sup tags
  content = content.replace(/<sup><a href="#ref-\d+" class="citation-ref" id="cit-\d+">\[(\d+)\]<\/a><\/sup>/g, '[$1]');

  if (citationLinesMap.size > 0) {
    // Re-wrap inline citations [1], [2] in sup tag
    citationLinesMap.forEach((text, num) => {
      const numRegex = new RegExp('\\[(' + num + ')\\](?![^<]*<\\/a>)', 'g');
      content = content.replace(numRegex, `<sup><a href="#ref-${num}" class="citation-ref" id="cit-${num}">[${num}]</a></sup>`);
    });

    // Build fresh references section
    let newRefSection = `\n\n### Tài liệu trích dẫn chi tiết\n`;
    const sortedNums = Array.from(citationLinesMap.keys()).sort((a, b) => parseInt(a) - parseInt(b));
    sortedNums.forEach(num => {
      const citText = citationLinesMap.get(num);
      newRefSection += `- <span id="ref-${num}">**[${num}]**</span> ${citText} <a href="#cit-${num}" class="back-to-citation" title="Quay lại câu viết">&crarr;</a>\n`;
    });

    content += newRefSection;
  }

  if (ytBlock) {
    content += `\n---\n${ytBlock}\n`;
  }

  fs.writeFileSync(filepath, content, 'utf-8');
});

console.log('✅ Đã dọn dẹp sạch sẽ cấu trúc HTML trích dẫn và YouTube cho 43 bài viết.');
