const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

function fixMermaidNewlines() {
  const files = fs.readdirSync(POSTS_DIR);
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(POSTS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (!content.includes('class="mermaid"')) continue;
    
    console.log(`Fixing Mermaid block newlines in [${file}]...`);
    
    const mermaidRegex = /<div class="mermaid">([\s\S]*?)<\/div>/g;
    
    content = content.replace(mermaidRegex, (match, code) => {
      // Unescape escaped strings
      let unescaped = code
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\r/g, '');
      
      unescaped = unescaped.trim();
      
      // Remove any duplicate escaping if it exists
      unescaped = unescaped.replace(/\\"/g, '"');
      
      return `<div class="mermaid">\n${unescaped}\n</div>`;
    });
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  console.log('Mermaid newlines fixed successfully.');
}

fixMermaidNewlines();
