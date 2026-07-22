const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', '_posts');
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

const allCitations = new Set();
const citationsByPost = {};

files.forEach(f => {
  const content = fs.readFileSync(path.join(postsDir, f), 'utf8');
  const match = content.match(/(?:###|##) Tài liệu trích dẫn chi tiết\n([\s\S]*?)(?:\n\n---|\n*$)/i);
  if (match) {
    const lines = match[1].trim().split('\n');
    lines.forEach(l => {
      let clean = l.replace(/^[-*]\s*/, '')
                   .replace(/<span id="ref-\d+">.*?<\/span>\s*/, '')
                   .replace(/`?<sup>.*?<\/sup>`?\s*/, '')
                   .replace(/\*\*\[\d+\]\*\*\s*/, '')
                   .replace(/<a href[\s\S]+$/, '')
                   .trim();
      if (clean && clean.length > 5) {
        allCitations.add(clean);
        if (!citationsByPost[f]) citationsByPost[f] = [];
        citationsByPost[f].push(clean);
      }
    });
  }
});

console.log('Total unique citations:', allCitations.size);
console.log('\n--- ALL CITATIONS ---');
Array.from(allCitations).sort().forEach((c, i) => console.log(`${i+1}. ${c}`));
