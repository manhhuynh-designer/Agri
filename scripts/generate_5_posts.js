const { execSync } = require('child_process');

for (let i = 0; i < 4; i++) {
  console.log(`\n======================================================`);
  console.log(`BẮT ĐẦU TẠO BÀI VIẾT THỨ ${i + 1}/5...`);
  console.log(`======================================================\n`);
  try {
    execSync('node scripts/generate_daily_post.js', { stdio: 'inherit' });
    console.log(`\nHoàn thành bài viết thứ ${i + 1}/5 thành công!\n`);
  } catch (error) {
    console.error(`Lỗi khi tạo bài viết thứ ${i + 1}:`, error.message);
    process.exit(1);
  }
}

console.log('Tất cả 5 bài viết mới đã được khởi tạo và lưu trữ thành công!');
