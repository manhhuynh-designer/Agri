const fs = require('fs');
const path = require('path');

const docsList = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs_list.json'), 'utf8'));

// Filter out image assets (.jpg, .jpeg, .tif) to focus on document books and transcripts
const validDocs = docsList.filter(d => {
  const ext = path.extname(d.fileName).toLowerCase();
  return ['.pdf', '.epub', '.mobi', '.azw', '.doc', '.docx', '.txt', '.ppt', '.xlsx'].includes(ext);
});

console.log(`Processing ${validDocs.length} valid document items...`);

function categorizeItem(item) {
  const folder = item.folder;
  const name = item.fileName.toLowerCase();

  if (folder.includes('Tủ sách Nông nghiệp')) {
    return { category: 'Tủ sách Nông nghiệp', badge: 'badge-amber', icon: '📚' };
  }
  if (folder.includes('Natural Farming Ways') || name.includes('fukuoka') || folder.includes('Massanobu Fukuoka')) {
    return { category: 'Nông nghiệp Tự nhiên & Fukuoka', badge: 'badge-green', icon: '🌾' };
  }
  if (folder.includes('Soil Building')) {
    return { category: 'Cải tạo Đất & Biochar', badge: 'badge-amber', icon: '🪵' };
  }
  if (folder.includes('Farming Techniques')) {
    return { category: 'Kỹ thuật Canh tác Bền vững', badge: 'badge-blue', icon: '🚜' };
  }
  if (folder.includes('Mushroom')) {
    return { category: 'Công nghệ Trồng Nấm', badge: 'badge-purple', icon: '🍄' };
  }
  if (folder.includes('Pest Control') || folder.includes('IPM')) {
    return { category: 'Bảo vệ Thực vật & IPM', badge: 'badge-red', icon: '🐛' };
  }
  if (folder.includes('Seed Saving')) {
    return { category: 'Lưu giữ Hạt giống', badge: 'badge-green', icon: '🌱' };
  }
  if (folder.includes('All about Plants') || folder.includes('Da dang sinh hoc')) {
    return { category: 'Sinh thái & Thực vật', badge: 'badge-green', icon: '🌿' };
  }
  if (folder.includes('youtube_transcripts')) {
    return { category: 'YouTube Transcripts & Bài giảng', badge: 'badge-blue', icon: '📹' };
  }
  return { category: 'Permaculture & Thiết kế Sinh thái', badge: 'badge-green', icon: '🏡' };
}

function cleanTitle(fileName) {
  let title = fileName.replace(/\.(pdf|epub|mobi|azw|doc|docx|txt|ppt|xlsx)$/i, '').trim();
  title = title.replace(/^ADDA_/, '').replace(/^GT/, 'Giáo trình ').replace(/_/g, ' ');
  return title;
}

const categorizedDocs = validDocs.map((item, idx) => {
  const cat = categorizeItem(item);
  return {
    stt: idx + 1,
    title: cleanTitle(item.fileName),
    fileName: item.fileName,
    folder: item.folder,
    category: cat.category,
    badge: cat.badge,
    icon: cat.icon
  };
});

// Group counts by category
const categoryCounts = {};
categorizedDocs.forEach(d => {
  categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
});

console.log('Category Counts:', categoryCounts);

// Generate Markdown table rows
let tableRowsHtml = '';
categorizedDocs.forEach(d => {
  tableRowsHtml += `          <tr style="border-bottom: 1px solid var(--line);" class="table-row">
            <td style="padding: 10px 8px; color: var(--ash-dim); font-size: 0.82rem;">#${d.stt}</td>
            <td style="padding: 10px 8px; font-weight: 600; color: var(--ash);">${d.title}</td>
            <td style="padding: 10px 8px;"><span class="badge ${d.badge}">${d.icon} ${d.category}</span></td>
            <td style="padding: 10px 8px; font-family: monospace; font-size: 0.78rem; color: var(--ash-dim); word-break: break-all;">${d.fileName}</td>
          </tr>\n`;
});

const sourcesMarkdown = `---
layout: default
title: "Nguồn Tài Liệu Tham Khảo — AgriSynthe"
permalink: /sources/
---

<div class="about-layout" style="max-width: 1120px; margin: 0 auto; padding: 20px 0;">
  <header class="about-header" style="text-align: center; margin-bottom: 35px;">
    <h1 style="font-size: 2.2rem; font-weight: 800; color: var(--ash); margin-bottom: 12px;">Cơ Sở Dữ Liệu Tài Liệu Nguồn</h1>
    <p style="font-size: 1.05rem; color: var(--ash-dim); max-width: 820px; margin: 0 auto; line-height: 1.6;">
      Kho tài liệu gốc gồm <strong>${validDocs.length} tệp tin sách, giáo trình, báo cáo nghiên cứu & transcripts</strong> thuộc thư viện <code>documents/</code> được nạp trực tiếp vào cơ sở tri thức Trí tuệ Nhân tạo <strong>AgriSynthe AI</strong>.
    </p>
  </header>

  <!-- Overview Stats Banner -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 35px;">
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: var(--ember); margin-bottom: 2px;">${validDocs.length}</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">Tệp tài liệu gốc</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Sách, Ebook & Nghiên cứu trong folder</div>
    </div>
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: #16a34a; margin-bottom: 2px;">100</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">Tủ sách Nông nghiệp</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Sách kỹ thuật & Cẩm nang Việt Nam</div>
    </div>
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: #2563eb; margin-bottom: 2px;">300+</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">Chuyên đề Permaculture</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Fukuoka, Cải tạo đất, BVTV & Giống</div>
    </div>
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: #9333ea; margin-bottom: 2px;">14</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">YouTube Transcripts</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Bài giảng & Video thực tế</div>
    </div>
  </div>

  <div class="about-content">
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 14px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow-x: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--line);">
        <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--ash); display: flex; align-items: center; gap: 10px;">
          <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22" style="color: var(--ember);">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
          </svg>
          Danh mục chính xác ${validDocs.length} tệp tài liệu trong folder documents/
        </h3>
        <span style="font-size: 0.85rem; background: rgba(232, 89, 12, 0.1); color: var(--ember); padding: 4px 12px; border-radius: 20px; font-weight: 600;">
          Tự động đồng bộ từ hệ thống
        </span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; line-height: 1.5;">
        <thead>
          <tr style="border-bottom: 2px solid var(--line); color: var(--ash);">
            <th style="padding: 10px 8px; font-weight: 700; width: 50px;">STT</th>
            <th style="padding: 10px 8px; font-weight: 700; width: 45%;">Tên tài liệu / Sách giáo trình</th>
            <th style="padding: 10px 8px; font-weight: 700; width: 25%;">Chuyên mục phân loại</th>
            <th style="padding: 10px 8px; font-weight: 700; width: 25%;">Tên tệp tin gốc</th>
          </tr>
        </thead>
        <tbody style="color: var(--ash);">
${tableRowsHtml}        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .table-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  [data-theme="light"] .table-row:hover {
    background: rgba(0, 0, 0, 0.02);
  }
  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .badge-green {
    background: rgba(22, 163, 74, 0.12);
    color: #16a34a;
  }
  .badge-amber {
    background: rgba(217, 119, 6, 0.12);
    color: #d97706;
  }
  .badge-blue {
    background: rgba(37, 99, 235, 0.12);
    color: #2563eb;
  }
  .badge-purple {
    background: rgba(147, 51, 234, 0.12);
    color: #9333ea;
  }
  .badge-red {
    background: rgba(220, 38, 38, 0.12);
    color: #dc2626;
  }
</style>
`;

fs.writeFileSync(path.join(__dirname, '..', 'sources.md'), sourcesMarkdown, 'utf8');
console.log('Successfully written updated sources.md!');
