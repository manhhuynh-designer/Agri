const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const docsDir = path.join(__dirname, '..', 'documents');
const docs = getFiles(docsDir);

console.log('Total document files found:', docs.length);
const result = docs.map((f, idx) => {
  const relPath = path.relative(docsDir, f);
  const baseName = path.basename(f);
  const ext = path.extname(f);
  return {
    stt: idx + 1,
    fullPath: f,
    relPath: relPath,
    fileName: baseName,
    folder: path.dirname(relPath)
  };
});

fs.writeFileSync(path.join(__dirname, 'docs_list.json'), JSON.stringify(result, null, 2), 'utf8');
console.log('Saved to scratch/docs_list.json');
