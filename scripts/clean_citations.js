const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const filepath = path.join(POSTS_DIR, file);
  let content = fs.readFileSync(filepath, 'utf-8');

  // Regex to match our long inline citations: e.g. [Giáo trình Nông nghiệp hữu cơ, GS.TS. Nguyễn Thế Đặng, Chương 3, Trang 41-42]
  const citationRegex = /\[([^\]\n]+, [^\]\n]+, (?:Chương|Mục|Phần) [^\]\n]+, Trang [^\]\n]+)\]/g;

  const citations = [];
  let match;
  
  // Find all matches
  while ((match = citationRegex.exec(content)) !== null) {
    const rawCit = match[1];
    if (!citations.includes(rawCit)) {
      citations.push(rawCit);
    }
  }

  if (citations.length === 0) {
    console.log(`No long inline citations found in: ${file}`);
    return;
  }

  console.log(`Processing ${file}: found ${citations.length} citations.`);

  // Replace each long citation with its [Index]
  citations.forEach((cit, idx) => {
    const num = idx + 1;
    const escapedCit = cit.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp('\\[' + escapedCit + '\\]', 'g');
    content = content.replace(regex, `[${num}]`);
  });

  // Now, find the "Tài liệu trích dẫn chi tiết" section and rewrite it
  let newReferencesSection = `### Tài liệu trích dẫn chi tiết\n`;
  citations.forEach((cit, idx) => {
    newReferencesSection += `- [${idx + 1}] ${cit}\n`;
  });

  // Check if YouTube section is at the end
  const ytRegex = /(### Video tham khảo thực tế[\s\S]*)$/i;
  const ytMatch = content.match(ytRegex);
  const ytContent = ytMatch ? `\n\n---\n` + ytMatch[1] : '';

  // Remove old references and YouTube from content
  content = content.replace(/### Tài liệu trích dẫn chi tiết[\s\S]*$/, '');
  content = content.replace(/---[\s]*\n### Video tham khảo thực tế[\s\S]*$/, '');
  content = content.replace(/### Video tham khảo thực tế[\s\S]*$/, '');

  content = content.trim() + '\n\n' + newReferencesSection.trim() + ytContent;

  fs.writeFileSync(filepath, content);
  console.log(`Successfully cleaned citations for: ${file}`);
});
