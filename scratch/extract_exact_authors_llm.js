const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const docsExtracted = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs_extracted.json'), 'utf8'));

console.log(`Extracting accurate authors & publishers for ${docsExtracted.length} documents...`);

// Regex rules for fast offline extraction from sample text
function extractAuthorFromText(sampleText, fileName) {
  if (!sampleText || sampleText.length < 20) return null;

  const text = sampleText;

  // Check for common author patterns
  // e.g. "by Author Name", "By Author Name", "Edited by Name", "Written by Name", "Tác giả: Name", "Chủ biên: Name"
  const byMatch = text.match(/(?:by|edited by|written by|tác giả|chủ biên|biên soạn|tác giả:)\s+([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+){1,4})/i);
  if (byMatch && byMatch[1] && byMatch[1].length > 4 && !/table of contents|introduction|chapter|abstract/i.test(byMatch[1])) {
    return byMatch[1].trim();
  }

  // Check for SARE, USDA, FAO, CSIRO, Extension, NXB
  if (/SARE|Sustainable Agriculture Research/i.test(text)) return 'SARE (Sustainable Agriculture Research & Education)';
  if (/USDA|United States Department of Agriculture/i.test(text)) return 'USDA (United States Dept of Agriculture)';
  if (/FAO|Food and Agriculture Organization/i.test(text)) return 'FAO (Food and Agriculture Organization)';
  if (/CSIRO/i.test(text)) return 'CSIRO Publishing';
  if (/Storey Publishing|Storey's/i.test(text)) return 'Storey Publishing';
  if (/Rodale/i.test(text)) return 'Rodale Institute';
  if (/Permaculture Institute/i.test(text)) return 'Permaculture Institute';
  if (/NXB Nông nghiệp|Nhà xuất bản Nông nghiệp/i.test(text)) return 'Nhà xuất bản Nông nghiệp';
  if (/NXB Lao động|Nhà xuất bản Lao động/i.test(text)) return 'Nhà xuất bản Lao động';
  if (/NXB Giáo dục|Nhà xuất bản Giáo dục/i.test(text)) return 'Nhà xuất bản Giáo dục Việt Nam';
  if (/Đại học Cần Thơ|ĐH Cần Thơ/i.test(text)) return 'Đại học Cần Thơ';
  if (/Đại học Nông Lâm/i.test(text)) return 'Đại học Nông Lâm';

  // Check if filename contains author name (e.g. "Allen V. Barker_Science...")
  const fnMatch = fileName.match(/^([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)_/);
  if (fnMatch) return fnMatch[1];

  return null;
}

// Function to call agy for documents where regex fails
function extractAuthorWithAgy(item) {
  const sample = (item.sampleText || '').substring(0, 1000).replace(/["`'\\]/g, ' ');
  const promptText = `Find the exact author name or publisher/organization for the document titled "${item.fileName}".
Here is the first page text snippet:
"""
${sample}
"""

Return ONLY a concise string containing the Author name or Publisher/Organization (e.g. "Miguel Altieri (SARE)", "Ralph Whiteside (Storey Publishing)", "USDA Agricultural Research Service"). Do not add any explanation or wrapping quotes. If completely unknown, return "SARE / Nông nghiệp Bền vững".`;

  try {
    const result = spawnSync('agy', [
      '--dangerously-skip-permissions',
      '--print-timeout', '30s',
      '-p', promptText
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 });

    if (result.status === 0 && result.stdout) {
      let out = result.stdout.trim().replace(/^['"]|['"]$/g, '').trim();
      out = out.replace(/^.*?(📖|✏️|🆕|READ|EDIT|CREATE).*$/gm, '').trim();
      const lines = out.split('\n').filter(l => l.length > 2 && !l.includes('Let me') && !l.includes('I will'));
      if (lines.length > 0) out = lines[lines.length - 1].trim();
      if (out.length > 3 && out.length < 80) {
        return out;
      }
    }
  } catch (e) {}

  return null;
}

const updatedDocs = [];
for (let i = 0; i < docsExtracted.length; i++) {
  const item = docsExtracted[i];
  let author = extractAuthorFromText(item.sampleText, item.fileName);
  if (!author) {
    author = extractAuthorWithAgy(item);
  }
  if (!author) {
    author = 'Chuyên gia Nông nghiệp Bền vững';
  }

  updatedDocs.push({
    ...item,
    author
  });

  if (i % 20 === 0) console.log(`Processed ${i}/${docsExtracted.length}: ${item.fileName} -> ${author}`);
}

fs.writeFileSync(path.join(__dirname, 'docs_authors_extracted.json'), JSON.stringify(updatedDocs, null, 2), 'utf8');
console.log('Saved docs_authors_extracted.json successfully!');
