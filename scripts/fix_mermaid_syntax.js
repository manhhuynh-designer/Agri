const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

function fixMermaidSyntax() {
  const files = fs.readdirSync(POSTS_DIR);
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(POSTS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (!content.includes('class="mermaid"')) continue;
    
    console.log(`Checking Mermaid syntax in [${file}]...`);
    
    // Replace unquoted subgraph names: e.g. "subgraph Cơ chế cải tạo đất" -> "subgraph \"Cơ chế cải tạo đất\""
    // We match "subgraph " followed by text that has spaces and does NOT contain any double quotes, until the end of the line.
    const subgraphRegex = /subgraph\s+([^"\r\n]+)$/gm;
    
    let updated = false;
    const matches = content.match(subgraphRegex);
    if (matches) {
      content = content.replace(subgraphRegex, (match, p1) => {
        const trimmed = p1.trim();
        // If it's a single word without spaces, it's fine. If it has spaces, wrap in quotes.
        if (trimmed.includes(' ') && !trimmed.startsWith('"')) {
          updated = true;
          return `subgraph "${trimmed}"`;
        }
        return match;
      });
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`-> Fixed subgraph quotes in [${file}]`);
    }
  }
  
  console.log('Mermaid syntax check completed.');
}

fixMermaidSyntax();
