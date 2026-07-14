const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const filepath = path.join(POSTS_DIR, file);
  let content = fs.readFileSync(filepath, 'utf-8');

  // Regex to match our long inline citations: e.g. [Giáo trình Nông nghiệp hữu cơ, GS.TS. Nguyễn Thế Đặng, Chương 3, Trang 41-42]
  // Or match existing temporary bracket citations [1], [2] to rebuild them as hyperlinks
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

  // If no long citations found, but it has raw numbers, let's see if we should parse the references list first
  // to reconstruct the citations! This is useful if clean_citations has already been run once.
  if (citations.length === 0) {
    const refSectionMatch = content.match(/(?:##|###) Tài liệu trích dẫn chi tiết\n([\s\S]*?)(?:\n\n---|\n*$)/i);
    if (refSectionMatch) {
      const refLines = refSectionMatch[1].trim().split('\n');
      refLines.forEach(line => {
        // Match: - [1] Text or - <span id="ref-1">**[1]**</span> Text
        const lineMatch = line.match(/^-\s*(?:\[\d+\]|<span id="ref-\d+">[^<]+<\/span>)\s*([\s\S]+?)(?:\s*<a href[\s\S]+|$)/i);
        if (lineMatch) {
          const citText = lineMatch[1].trim();
          if (!citations.includes(citText)) {
            citations.push(citText);
          }
        }
      });
    }
  }

  if (citations.length === 0) {
    console.log(`No citations found in: ${file}`);
    return;
  }

  console.log(`Processing ${file}: found ${citations.length} citations.`);

  // Clean old citation numbers or old HTML citations to avoid duplicate wraps
  content = content.replace(/<sup><a href="#ref-\d+" class="citation-ref" id="cit-\d+">\[(\d+)\]<\/a><\/sup>/g, '[$1]');

  // Replace each citation text or raw number with styled link
  citations.forEach((cit, idx) => {
    const num = idx + 1;
    
    // Replace inline citation text
    const escapedCit = cit.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const textRegex = new RegExp('\\[' + escapedCit + '\\]', 'g');
    content = content.replace(textRegex, `<sup><a href="#ref-${num}" class="citation-ref" id="cit-${num}">[${num}]</a></sup>`);
    
    // Replace raw [num] inside body text with the styled link
    // Ensure we don't match it if it's already inside a sup/a tag (we cleaned it above, but just in case)
    const numRegex = new RegExp('\\[(' + num + ')\\](?![^<]*<\\/a>)', 'g');
    content = content.replace(numRegex, `<sup><a href="#ref-${num}" class="citation-ref" id="cit-${num}">[${num}]</a></sup>`);
  });

  // Now, find the "Tài liệu trích dẫn chi tiết" section and rewrite it
  let newReferencesSection = `### Tài liệu trích dẫn chi tiết\n`;
  citations.forEach((cit, idx) => {
    const num = idx + 1;
    newReferencesSection += `- <span id="ref-${num}">**[${num}]**</span> ${cit} <a href="#cit-${num}" class="back-to-citation" title="Quay lại câu viết">&crarr;</a>\n`;
  });

  // Check if YouTube section is at the end
  const ytRegex = /(### Video tham khảo thực tế[\s\S]*)$/i;
  const ytMatch = content.match(ytRegex);
  const ytContent = ytMatch ? `\n\n---\n` + ytMatch[1] : '';

  // Remove old references and YouTube from content
  content = content.replace(/(?:##|###) Tài liệu trích dẫn chi tiết[\s\S]*$/, '');
  content = content.replace(/---[\s]*\n### Video tham khảo thực tế[\s\S]*$/, '');
  content = content.replace(/### Video tham khảo thực tế[\s\S]*$/, '');

  content = content.trim() + '\n\n' + newReferencesSection.trim() + ytContent;

  fs.writeFileSync(filepath, content);
  console.log(`Successfully formatted citations for: ${file}`);
});
