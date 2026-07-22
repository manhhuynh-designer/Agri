const fs = require('fs');
const path = require('path');

const visionPath = path.join(__dirname, 'docs_vision_strict_authors.json');
const fastTextPath = path.join(__dirname, 'fast_pdf_text_authors.json');
const rawPath = path.join(__dirname, 'docs_pages1to3_raw.json');

const docsListPath = path.join(__dirname, 'docs_list.json');
const docsList = JSON.parse(fs.readFileSync(docsListPath, 'utf8')).filter(d => {
  if (d.folder.includes('youtube_transcripts') || d.relPath.includes('youtube_transcripts')) return false;
  const ext = path.extname(d.fileName).toLowerCase();
  return ['.pdf', '.epub', '.mobi', '.azw', '.doc', '.docx', '.txt', '.ppt', '.xlsx'].includes(ext);
});

// Load extracted authors & titles maps
const fastMap = new Map();
if (fs.existsSync(fastTextPath)) {
  const fastData = JSON.parse(fs.readFileSync(fastTextPath, 'utf8'));
  fastData.forEach(d => fastMap.set(d.fileName, d.author));
}

const visionMap = new Map();
const visionTitleMap = new Map();
if (fs.existsSync(visionPath)) {
  const visionData = JSON.parse(fs.readFileSync(visionPath, 'utf8'));
  visionData.forEach(d => {
    visionMap.set(d.fileName, d.author);
    if (d.title && d.title.trim().length > 4 && !d.title.endsWith('.pdf')) {
      visionTitleMap.set(d.fileName, d.title.trim());
    }
  });
}

function categorizeDoc(item, title) {
  const folder = item.folder || '';
  const name = (item.fileName + ' ' + title).toLowerCase();

  if (folder.includes('Tủ sách Nông nghiệp')) {
    return { category: 'Tủ sách Nông nghiệp Việt Nam', badge: 'badge-amber', icon: '📚' };
  }
  if (folder.includes('Natural Farming Ways') || name.includes('fukuoka') || folder.includes('Massanobu Fukuoka')) {
    return { category: 'Nông nghiệp Tự nhiên & Fukuoka', badge: 'badge-green', icon: '🌾' };
  }
  if (folder.includes('Soil Building') || name.includes('biochar') || name.includes('đất')) {
    return { category: 'Cải tạo Đất & Biochar', badge: 'badge-amber', icon: '🪵' };
  }
  if (folder.includes('Farming Techniques')) {
    return { category: 'Kỹ thuật Canh tác Bền vững', badge: 'badge-blue', icon: '🚜' };
  }
  if (folder.includes('Mushroom') || name.includes('nấm')) {
    return { category: 'Công nghệ Trồng Nấm', badge: 'badge-purple', icon: '🍄' };
  }
  if (folder.includes('Pest Control') || name.includes('bảo vệ thực vật') || name.includes('sâu bệnh')) {
    return { category: 'Bảo vệ Thực vật & IPM', badge: 'badge-red', icon: '🐛' };
  }
  if (folder.includes('Seed Saving') || name.includes('hạt giống')) {
    return { category: 'Lưu giữ Hạt giống', badge: 'badge-green', icon: '🌱' };
  }
  if (folder.includes('All about Plants') || folder.includes('Da dang sinh hoc')) {
    return { category: 'Sinh thái & Thực vật học', badge: 'badge-green', icon: '🌿' };
  }
  return { category: 'Permaculture & Thiết kế Sinh thái', badge: 'badge-green', icon: '🏡' };
}

// Format Title cleanly with full Vietnamese accents
function cleanTitle(item) {
  const visTitle = visionTitleMap.get(item.fileName);
  if (visTitle && visTitle.length > 4) {
    return visTitle;
  }
  if (item.title && item.title.length > 3 && !item.title.endsWith('.pdf')) {
    return item.title;
  }
  let base = item.fileName.replace(/\.(pdf|epub|mobi|azw|doc|docx|txt|ppt|xlsx)$/i, '').trim();
  base = base.replace(/^ADDA_/i, '').replace(/^GT_/i, 'Giáo trình ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return base;
}

// Format Author strictly: IF NOT VISUALLY FOUND, MUST BE BLANK ("")!
function cleanAuthor(item) {
  let a = visionMap.get(item.fileName) || fastMap.get(item.fileName) || item.author || '';
  if (typeof a !== 'string') return '';
  a = a.trim();
  if (/viện nghiên cứu|nông nghiệp bền vững|chưa xác định|đang cập nhật|nhiều tác giả/i.test(a)) {
    return '';
  }
  return a;
}

// Clean and Deduplicate
const seenKeys = new Map();
const finalDocs = [];

docsList.forEach(item => {
  const title = cleanTitle(item);
  const author = cleanAuthor(item);
  const cat = categorizeDoc(item, title);

  const normKey = title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (!seenKeys.has(normKey)) {
    seenKeys.set(normKey, true);
    finalDocs.push({
      ...item,
      title,
      author,
      ...cat
    });
  }
});

// Sort by category, then title
finalDocs.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category, 'vi');
  return a.title.localeCompare(b.title, 'vi');
});

// Build HTML table rows WITHOUT original filename column
let tableRowsHtml = '';
finalDocs.forEach((d, idx) => {
  // If author is blank, output empty cell so user can easily spot it!
  const authorCell = d.author ? d.author : '';
  tableRowsHtml += `          <tr style="border-bottom: 1px solid var(--line);" class="table-row">
            <td style="padding: 11px 10px; color: var(--ash-dim); font-size: 0.84rem;">#${idx + 1}</td>
            <td style="padding: 11px 10px; font-weight: 600; color: var(--ash); font-size: 0.93rem;">${d.title}</td>
            <td style="padding: 11px 10px; color: var(--ash-dim); font-size: 0.88rem; font-style: italic;">${authorCell}</td>
            <td style="padding: 11px 10px;"><span class="badge ${d.badge}">${d.icon} ${d.category}</span></td>
          </tr>\n`;
});

const sourcesMarkdown = `---
layout: default
title: "Nguồn Tài Liệu Tham Khảo — AgriSynthe"
permalink: /sources/
---

<div class="about-layout" style="max-width: 1120px; margin: 0 auto; padding: 20px 0;">
  <header class="about-header" style="text-align: center; margin-bottom: 35px;">
    <h1 style="font-size: 2.2rem; font-weight: 800; color: var(--ash); margin-bottom: 12px;">Thư Viện Tài Liệu Nguồn Chính Thức</h1>
    <p style="font-size: 1.05rem; color: var(--ash-dim); max-width: 820px; margin: 0 auto; line-height: 1.6;">
      Danh mục <strong>${finalDocs.length} tác phẩm, sách giáo trình & cẩm nang kỹ thuật độc bản</strong> thuộc thư viện <code>documents/</code> được tích hợp trực tiếp trong cơ sở tri thức Trí tuệ Nhân tạo <strong>AgriSynthe AI</strong>.
    </p>
  </header>

  <div class="about-content">
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 14px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow-x: auto;">
      <div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--line);">
        <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--ash); display: flex; align-items: center; gap: 10px;">
          <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22" style="color: var(--ember);">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
          </svg>
          Danh mục ${finalDocs.length} tác phẩm & giáo trình trong hệ thống
        </h3>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; line-height: 1.5;">
        <thead>
          <tr style="border-bottom: 2px solid var(--line); color: var(--ash);">
            <th style="padding: 10px; font-weight: 700; width: 50px;">STT</th>
            <th style="padding: 10px; font-weight: 700; width: 45%;">Tên tác phẩm / Sách giáo trình (Đầy đủ dấu)</th>
            <th style="padding: 10px; font-weight: 700; width: 33%;">Tác giả / Nhà xuất bản / Cơ quan ban hành</th>
            <th style="padding: 10px; font-weight: 700; width: 22%;">Chuyên mục phân loại</th>
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
console.log('Successfully updated sources.md! Blank cells are left empty for items without explicit cover author.');
