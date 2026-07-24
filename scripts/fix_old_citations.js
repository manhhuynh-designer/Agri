const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { searchRagIndex } = require('./query_rag');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

function extractDelimitedContent(text) {
  const startIndex = text.indexOf('<<<BÀI_VIẾT>>>');
  const endIndex = text.indexOf('<<<KẾT_THÚC>>>');
  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    return text.substring(startIndex + '<<<BÀI_VIẾT>>>'.length, endIndex).trim();
  }
  return text;
}

function processPost(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Strip null bytes to prevent spawnSync errors
  content = content.replace(/\0/g, '');
  
  if (content.includes('<span id="ref-')) {
    console.log(`Bỏ qua ${path.basename(filePath)} (Đã được xử lý trích dẫn mới)`);
    return;
  }

  const parsed = matter(content);
  const title = parsed.data.title;
  
  if (!title) {
    console.log(`Bỏ qua ${path.basename(filePath)} (Không có tiêu đề)`);
    return;
  }

  console.log(`\n==============================================`);
  console.log(`Đang xử lý: ${title}`);
  
  const ragChunks = searchRagIndex(title, 4);
  let ragContextText = "";
  let citationListInstructions = "";

  if (ragChunks.length > 0) {
    ragChunks.forEach((c, idx) => {
      ragContextText += `\n--- [TÀI LIỆU NGUỒN XÁC THỰC [${idx + 1}]] ---\n`;
      ragContextText += `TÊN TÁC PHẨM: ${c.title}\n`;
      ragContextText += `TÁC GIẢ / NXB: ${c.author || 'Chuyên gia Nông nghiệp / NXB Chuyên ngành'}\n`;
      ragContextText += `TRÍCH ĐOẠN NỘI DUNG GỐC:\n${c.text.substring(0, 1000)}\n`;
      citationListInstructions += `     - <span id="ref-${idx + 1}">**[${idx + 1}]**</span> ${c.title}, ${c.author || 'Tác giả Chuyên ngành'} <a href="#cit-${idx + 1}" class="back-to-citation" title="Quay lại câu viết">&crarr;</a>\n`;
    });
  } else {
    console.log(`Bỏ qua ${path.basename(filePath)} (Không tìm thấy context RAG mới)`);
    return;
  }

  const queryText = `Nhiệm vụ: Sửa lỗi trích dẫn tài liệu trong bài viết Markdown có sẵn.

BÀI VIẾT GỐC BỊ LỖI TRÍCH DẪN:
\`\`\`markdown
${content}
\`\`\`

==================================================
TÀI LIỆU NGUỒN XÁC THỰC MỚI (CHÍNH XÁC NHẤT):
${ragContextText}
==================================================

YÊU CẦU NGHIÊM NGẶT:
1. GIỮ NGUYÊN HOÀN TOÀN khối Front Matter (từ --- đến --- ở đầu bài).
2. GIỮ NGUYÊN BỐ CỤC, CÁC HÌNH ẢNH (cú pháp ![...](...)) VÀ CÁC THẺ HTML (như iframe YouTube, thẻ div SVG). TUYỆT ĐỐI KHÔNG xáo trộn hay xóa bỏ chúng.
3. CHỈ ĐƯỢC PHÉP CHỈNH SỬA các câu văn có gắn trích dẫn trong bài (ví dụ [1], [2], [3]...) sao cho nội dung phản ánh đúng dữ liệu từ [TÀI LIỆU NGUỒN XÁC THỰC MỚI].
4. XÓA BỎ hoàn toàn mục "Tài liệu trích dẫn chi tiết" cũ ở cuối bài.
5. VIẾT LẠI mục "Tài liệu trích dẫn chi tiết" ở cuối bài theo đúng chuẩn sau (Thay thế mục cũ):
### Tài liệu trích dẫn chi tiết
${citationListInstructions}
6. Bọc TOÀN BỘ bài viết Markdown (bao gồm cả frontmatter) giữa cặp ký hiệu đặc biệt sau:
<<<BÀI_VIẾT>>>
...nội dung...
<<<KẾT_THÚC>>>
`;

  console.log(`Đang gọi AI xử lý bài viết: ${path.basename(filePath)}...`);
  
  const result = spawnSync('agy', [
    '--model', 'gemini-3.6-flash',
    '--effort', 'high',
    '--dangerously-skip-permissions',
    '-p', queryText
  ], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  if (result.status !== 0) {
    console.error(`❌ Lỗi khi xử lý ${path.basename(filePath)}:`, result.stderr || result.error?.message);
    return;
  }

  let newContent = result.stdout;
  newContent = newContent.replace(/^```markdown\s*/i, '');
  newContent = newContent.replace(/^```html\s*/i, '');
  newContent = newContent.replace(/```\s*$/, '');
  newContent = newContent.trim();
  
  const finalContent = extractDelimitedContent(newContent);
  
  if (finalContent.length > 500 && finalContent.includes('---')) {
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log(`✅ Cập nhật trích dẫn thành công: ${path.basename(filePath)}`);
  } else {
    console.error(`❌ Kết quả trả về không hợp lệ cho: ${path.basename(filePath)}`);
  }
}

function run() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  console.log(`Tìm thấy ${files.length} bài viết cần xử lý.`);
  
  let count = 0;
  for (const file of files) {
    count++;
    console.log(`\n[Tiến độ: ${count}/${files.length}]`);
    processPost(path.join(POSTS_DIR, file));
  }
  
  console.log(`\n🎉 HOÀN TẤT CẬP NHẬT TRÍCH DẪN CHO TOÀN BỘ BÀI VIẾT.`);
}

run();
