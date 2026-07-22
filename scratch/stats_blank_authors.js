const fs = require('fs');
const path = require('path');

const METADATA_PATH = path.join(__dirname, '..', 'scratch', 'docs_vision_strict_authors.json');

if (!fs.existsSync(METADATA_PATH)) {
  console.error('Metadata file not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
const total = data.length;
const withAuthor = data.filter(item => item.author && item.author.trim() !== '');
const withoutAuthor = data.filter(item => !item.author || item.author.trim() === '');

console.log(`==================================================`);
console.log(`TỔNG SỐ TÀI LIỆU TRONG THƯ VIỆN: ${total}`);
console.log(`- Đã trích xuất được Tác giả/NXB: ${withAuthor.length} (${(withAuthor.length / total * 100).toFixed(1)}%)`);
console.log(`- Chưa có Tác giả trên bìa (Để trống): ${withoutAuthor.length} (${(withoutAuthor.length / total * 100).toFixed(1)}%)`);
console.log(`==================================================\n`);

// Group by folder
const folderStats = {};
withoutAuthor.forEach(item => {
  const folder = item.folder || 'Thư mục gốc';
  folderStats[folder] = (folderStats[folder] || 0) + 1;
});

console.log(`--- THỐNG KÊ TÀI LIỆU TRỐNG TÁC GIẢ THEO THƯ MỤC ---`);
Object.entries(folderStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([folder, count]) => {
    console.log(`- Thư mục [${folder}]: ${count} tài liệu`);
  });

console.log(`\n==================================================`);
console.log(`DANH SÁCH CHI TIẾT CÁC TÀI LIỆU CHƯA CÓ TÊN TÁC GIẢ (HỢP LỆ THEO QUY TẮC STRICT BLANK):`);
console.log(`==================================================`);
withoutAuthor.forEach((item, index) => {
  console.log(`${index + 1}. [${item.fileName}] -> Tên tác phẩm: "${item.title || item.fileName}" | Thư mục: ${item.folder}`);
});
