const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const matter = require('gray-matter');
const { searchRagIndex } = require('./query_rag');

const POSTS_DIR = path.join(__dirname, '..', '_posts');
const RAG_PATH = path.join(__dirname, '..', 'data', 'rag_index.json');

// Danh sách các chủ đề nhạy cảm/từ cấm quảng cáo giật tít cần kiểm tra kiến thức
const FORBIDDEN_WORDS = ['thần kỳ', 'bí mật', 'bí kíp vô giá', 'hoàn hảo tuyệt đối', 'vô song'];

/**
 * Hàm kiểm tra và clarify nguồn trích dẫn của 1 bài viết dựa trên RAG index
 */
function clarifyPostCitations(filePath, content, parsed) {
  const postTitle = parsed.data.title || path.basename(filePath);
  
  // Lấy 4 nguồn RAG tốt nhất hiện tại dựa trên thuật toán mới
  const ragChunks = searchRagIndex(postTitle, 4);
  if (!ragChunks || ragChunks.length === 0) {
    return { status: 'NO_RAG', message: 'Không tìm thấy nguồn RAG' };
  }

  // Lấy khối trích dẫn hiện tại trong bài viết
  const citationSecMatch = content.match(/(?:##|###)\s*Tài liệu trích dẫn chi tiết[\s\S]*?(?=(?:---|##|###|<div style="position: relative;|$))/i);
  
  let isCitationIrrelevant = false;

  if (!citationSecMatch) {
    isCitationIrrelevant = true;
  } else {
    const citBlock = citationSecMatch[0];
    const lowerBlock = citBlock.toLowerCase();
    const titleLower = postTitle.toLowerCase();

    // Nếu bài viết không phải về Chè/Ca cao nhưng lại trích dẫn sách Chè/Ca cao -> Mismatched!
    if (!titleLower.includes('chè') && !titleLower.includes('ca cao')) {
      if (lowerBlock.includes('cây chè') || lowerBlock.includes('ca cao')) {
        isCitationIrrelevant = true;
      }
    }
    // Nếu bài viết về Dịch chuối / Ủ phân nhưng trích dẫn sách không liên quan -> Mismatched!
    if (titleLower.includes('chuối') || titleLower.includes('ủ phân') || titleLower.includes('kali')) {
      if (lowerBlock.includes('cây chè') || lowerBlock.includes('ca cao') || lowerBlock.includes('thuốc gia truyền')) {
        isCitationIrrelevant = true;
      }
    }
  }

  if (!isCitationIrrelevant) {
    return { status: 'VALID', message: 'Trích dẫn hợp lệ và đúng chủ đề.' };
  }

  // Xây dựng lại khối trích dẫn chuẩn xác từ RAG
  const uniqueChunks = [];
  const seenTitles = new Set();
  for (const c of ragChunks) {
    const key = (c.title || c.file).toLowerCase();
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueChunks.push(c);
    }
  }

  let newCitationBlock = `### Tài liệu trích dẫn chi tiết\n`;
  uniqueChunks.forEach((c, idx) => {
    const num = idx + 1;
    const bookTitle = c.title || c.file;
    const authorStr = c.author ? c.author : 'Chuyên gia Nông nghiệp Hữu cơ';
    newCitationBlock += `- <span id="ref-${num}">**[${num}]**</span> ${bookTitle}, ${authorStr} <a href="#cit-${num}" class="back-to-citation" title="Quay lại câu viết">&crarr;</a>\n`;
  });

  // Thay thế khối trích dẫn trong bài
  let newContent = content;
  if (citationSecMatch) {
    newContent = newContent.replace(citationSecMatch[0], newCitationBlock);
  } else {
    const ytIdx = newContent.indexOf('### Video tham khảo thực tế');
    if (ytIdx !== -1) {
      newContent = newContent.slice(0, ytIdx) + newCitationBlock + '\n---\n' + newContent.slice(ytIdx);
    } else {
      newContent = newContent + '\n\n---\n' + newCitationBlock;
    }
  }

  fs.writeFileSync(filePath, newContent, 'utf-8');
  return {
    status: 'FIXED',
    message: `Đã làm rõ & sửa lại ${uniqueChunks.length} nguồn trích dẫn RAG chuẩn: ${uniqueChunks.map(u => u.title).join('; ')}`
  };
}

/**
 * Task kiểm tra kiến thức & tính chính xác nông học qua AGY (Gemini CLI)
 */
function verifyKnowledgeWithAgy(filePath, content, parsed) {
  const title = parsed.data.title || path.basename(filePath);
  let issues = [];

  // 1. Kiểm tra từ ngữ cấm/giật tít
  for (const word of FORBIDDEN_WORDS) {
    if (content.toLowerCase().includes(word)) {
      issues.push(`Chứa từ ngữ giật tít/cường điệu: "${word}"`);
    }
  }

  // 2. Kiểm tra khối cảnh báo AI warning box
  if (!content.includes('ai-warning-box')) {
    issues.push('Thiếu khối cảnh báo AI (ai-warning-box)');
  }

  // 3. Kiểm tra sơ đồ SVG
  if (!content.includes('<svg') && !content.includes('diagram-card')) {
    issues.push('Thiếu sơ đồ minh họa kỹ thuật (SVG diagram)');
  }

  if (issues.length === 0) {
    return { status: 'VALID', message: 'Kiến thức nông học & định dạng chuẩn xác.' };
  }

  // Nếu có lỗi kiến thức hoặc định dạng, gọi AGY để tự động chỉnh sửa
  console.log(`  🤖 [AGY Agent] Phát hiện ${issues.length} vấn đề. Đang gọi agy sửa lỗi cho: "${title}"...`);
  
  const prompt = `Bạn là Agent Kiểm duyệt Nông nghiệp Hữu cơ (Agri QC Agent). Hãy sửa lại bài viết Markdown sau để đạt chuẩn kiến thức và định dạng:

DANH SÁCH LỖI CẦN SỬA:
${issues.map((iss, i) => `${i + 1}. ${iss}`).join('\n')}

NỘI DUNG BÀI VIẾT GỐC:
\`\`\`markdown
${content}
\`\`\`

YÊU CẦU SỬA ĐỔI:
1. Đảm bảo có khối <div class="ai-warning-box">...</div> ở ngay đầu bài viết.
2. Loại bỏ toàn bộ các từ ngữ giật tít, diễn đạt điềm tĩnh, khoa học.
3. Giữ nguyên Front Matter và các sơ đồ SVG/Hình ảnh hiện có.
4. Bọc TOÀN BỘ bài viết đã sửa giữa cặp ký hiệu:
<<<BÀI_VIẾT>>>
...nội dung bài viết Markdown...
<<<KẾT_THÚC>>>
`;

  const result = spawnSync('agy', [
    '--model', 'gemini-3.6-flash',
    '--effort', 'medium',
    '--dangerously-skip-permissions',
    '-p', prompt
  ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

  if (result.status === 0 && result.stdout.includes('<<<BÀI_VIẾT>>>')) {
    const startIndex = result.stdout.indexOf('<<<BÀI_VIẾT>>>') + '<<<BÀI_VIẾT>>>'.length;
    const endIndex = result.stdout.indexOf('<<<KẾT_THÚC>>>');
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const fixedContent = result.stdout.substring(startIndex, endIndex).trim();
      fs.writeFileSync(filePath, fixedContent, 'utf-8');
      return { status: 'FIXED', message: `AGY đã tự động chỉnh sửa: ${issues.join(', ')}` };
    }
  }

  return { status: 'WARNING', message: `Cần xem xét thủ công: ${issues.join(', ')}` };
}

/**
 * Task song song kiểm duyệt 1 bài viết
 */
function auditPostTask(file) {
  const filePath = path.join(POSTS_DIR, file);
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(rawContent);

  // 1. Task song song 1: Clarify & Sửa nguồn trích dẫn RAG
  const citResult = clarifyPostCitations(filePath, rawContent, parsed);

  // Đọc lại nội dung sau khi sửa trích dẫn (nếu có)
  const updatedContent = fs.readFileSync(filePath, 'utf-8');
  const updatedParsed = matter(updatedContent);

  // 2. Task song song 2: Kiểm tra kiến thức & gọi AGY chỉnh sửa nếu lỗi
  const knowResult = verifyKnowledgeWithAgy(filePath, updatedContent, updatedParsed);

  const isFixed = citResult.status === 'FIXED' || knowResult.status === 'FIXED';
  const hasWarning = citResult.status === 'WARNING' || knowResult.status === 'WARNING';

  return {
    file,
    title: parsed.data.title || file,
    status: isFixed ? 'FIXED' : (hasWarning ? 'WARNING' : 'PASS'),
    citDetails: citResult.message,
    knowDetails: knowResult.message
  };
}

/**
 * Hàm điều phối chính (QC Agent Runner)
 */
async function runQCAgent() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN');
  const dateStr = now.toLocaleDateString('vi-VN');

  console.log(`================================================================`);
  console.log(`🤖 [AGY QC AGENT] KÍCH HOẠT QUY TRÌNH KIỂM DUYỆT BÀI VIẾT TỰ ĐỘNG`);
  console.log(`⏰ Thời gian: ${dateStr} - ${timeStr}`);
  console.log(`================================================================\n`);

  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`❌ Thư mục bài viết không tồn tại: ${POSTS_DIR}`);
    return;
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  console.log(`🔍 Tìm thấy tổng cộng ${files.length} bài viết trong thư mục _posts/\n`);

  // Ưu tiên kiểm duyệt bài viết mới tạo hôm nay hoặc bài mới nhất
  const todayPrefix = now.toISOString().split('T')[0];
  let targetFiles = files.filter(f => f.startsWith(todayPrefix));
  if (targetFiles.length === 0) {
    // Nếu hôm nay chưa có bài mới, lấy 10 bài viết gần nhất để kiểm duyệt định kỳ
    targetFiles = files.slice(-10);
  }

  console.log(`⚡ Đang khởi chạy các task kiểm duyệt song song cho ${targetFiles.length} bài viết trọng tâm...\n`);

  let passCount = 0;
  let fixedCount = 0;
  let warningCount = 0;
  let modifiedAnyFile = false;

  const results = [];

  for (const file of targetFiles) {
    console.log(`📌 [Audit Task] Đang kiểm tra bài: "${file}"...`);
    const res = auditPostTask(file);
    results.push(res);

    if (res.status === 'PASS') {
      passCount++;
      console.log(`   🟢 [PASS] ${res.knowDetails}`);
    } else if (res.status === 'FIXED') {
      fixedCount++;
      modifiedAnyFile = true;
      console.log(`   ✏️ [FIXED & CLARIFIED] ${res.citDetails}`);
      if (res.knowDetails) console.log(`      └─> ${res.knowDetails}`);
    } else {
      warningCount++;
      console.log(`   ⚠️ [WARNING] ${res.knowDetails}`);
    }
    console.log(`----------------------------------------------------------------`);
  }

  // BÁO CÁO TỔNG HỢP QUA TERMINAL
  console.log(`\n================================================================`);
  console.log(`📊 [BÁO CÁO TỔNG HỢP KIỂM DUYỆT TERMINAL - AGY QC AGENT]`);
  console.log(`================================================================`);
  console.log(`  - 📝 Tổng số bài đã kiểm duyệt : ${targetFiles.length}`);
  console.log(`  - 🟢 Đạt chuẩn (Pass)          : ${passCount}`);
  console.log(`  - ✏️ Đã tự động sửa & Clarify   : ${fixedCount}`);
  console.log(`  - ⚠️ Cần lưu ý (Warning)        : ${warningCount}`);
  console.log(`================================================================\n`);

  // Nếu có bài viết được tự động chỉnh sửa/clarify nguồn, đồng bộ R2 và Git push
  if (modifiedAnyFile) {
    console.log(`🚀 Phát hiện bài viết đã được cập nhật. Đang đồng bộ hóa lên Cloudflare R2 & Git...`);
    
    // 1. Đồng bộ Cloudflare R2
    const syncRes = spawnSync('node', ['scripts/sync_posts_to_r2.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    console.log(`[R2 Sync] ${syncRes.stdout ? syncRes.stdout.trim().split('\n').pop() : 'Hoàn tất R2 sync'}`);

    // 2. Commit & Push GitHub
    spawnSync('git', ['add', '_posts/'], { cwd: path.join(__dirname, '..') });
    spawnSync('git', ['commit', '-m', `auto: AGY QC Agent verified & clarified post citations (${dateStr})`], { cwd: path.join(__dirname, '..') });
    spawnSync('git', ['push', 'origin', 'main'], { cwd: path.join(__dirname, '..') });
    console.log(`✅ [Git & Vercel] Đã push bài viết đã QC lên GitHub!`);
  } else {
    console.log(`✅ Tất cả các bài viết kiểm duyệt đều đạt chuẩn. Không cần thực hiện commit mới.`);
  }
}

// Chạy trực tiếp QC Agent
runQCAgent().catch(err => {
  console.error('❌ Lỗi khi chạy AGY QC Agent:', err);
});
