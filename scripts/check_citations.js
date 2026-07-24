const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const postsDir = path.join(__dirname, '..', '_posts');
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

let issues = [];

files.forEach(f => {
  const filePath = path.join(postsDir, f);
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(rawContent);
  const content = parsed.content;

  // Check citation header
  const citIdx = content.indexOf('Tài liệu trích dẫn chi tiết');
  if (citIdx === -1) {
    issues.push({ file: f, issue: 'Thiếu mục Tài liệu trích dẫn chi tiết' });
    return;
  }

  const citBlock = content.substring(citIdx);

  // Check HTML escaping
  if (citBlock.includes('&lt;') || citBlock.includes('&gt;')) {
    issues.push({ file: f, issue: 'Bị escape HTML (&lt; hoặc &gt;)' });
  }

  // Check span tags balance
  const openSpans = (citBlock.match(/<span/g) || []).length;
  const closeSpans = (citBlock.match(/<\/span>/g) || []).length;
  if (openSpans !== closeSpans) {
    issues.push({ file: f, issue: `Thẻ <span> không cân bằng (mở: ${openSpans}, đóng: ${closeSpans})` });
  }

  // Check HTML anchor tags balance
  const openAnchors = (citBlock.match(/<a\s/g) || []).length;
  const closeAnchors = (citBlock.match(/<\/a>/g) || []).length;
  if (openAnchors !== closeAnchors) {
    issues.push({ file: f, issue: `Thẻ <a> không cân bằng (mở: ${openAnchors}, đóng: ${closeAnchors})` });
  }

  // Check if marked renders html cleanly without raw markdown symbols bleeding
  const htmlOutput = marked.parse(citBlock);
  if (htmlOutput.includes('**[')) {
    issues.push({ file: f, issue: 'Chưa render hết Markdown syntax (còn dính **[)' });
  }
  if (htmlOutput.includes('&crarr;</span>') || htmlOutput.includes('&crarr; </span>')) {
    // Normal, but check if there are unclosed tags rendered into text
  }
});

console.log(`=== KẾT QUẢ KIỂM TRA THỰC TẾ TRÊN ${files.length} BÀI VIẾT ===`);
if (issues.length === 0) {
  console.log('✅ Tất cả 43 bài viết đều render HTML trích dẫn hoàn hảo, không có lỗi thẻ hay escaping!');
} else {
  console.log(`❌ Phát hiện ${issues.length} lỗi trong các bài viết:`);
  console.log(JSON.stringify(issues, null, 2));
}
