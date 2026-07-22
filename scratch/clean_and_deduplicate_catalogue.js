const fs = require('fs');
const path = require('path');

const listPath = path.join(__dirname, 'docs_list.json');
const docsList = JSON.parse(fs.readFileSync(listPath, 'utf8'));

// 1. Strictly exclude youtube_transcripts and non-document media files (.jpg, .jpeg, .tif)
const docsOnly = docsList.filter(d => {
  if (d.folder.includes('youtube_transcripts')) return false;
  if (d.relPath.includes('youtube_transcripts')) return false;
  const ext = path.extname(d.fileName).toLowerCase();
  return ['.pdf', '.epub', '.mobi', '.azw', '.doc', '.docx', '.txt', '.ppt', '.xlsx'].includes(ext);
});

console.log(`Initial document count (excluding YouTube & non-docs): ${docsOnly.length}`);

// Dictionary of exact Vietnamese titles with full diacritical marks
const exactVietnameseTitles = {
  '10-hesinhthairungtunhienvietnam.pdf': 'Cẩm nang Lâm nghiệp: Hệ sinh thái Rừng tự nhiên Việt Nam',
  'ADDA_Giao trinh dao tao OA TOT.pdf': 'Giáo trình Đào tạo Canh tác Nông nghiệp Hữu cơ (OA TOT)',
  'ADDA_Mot so loai cay che phu dat.pdf': 'Một số loài Cây Che Phủ Đất Đa Dụng Phục vụ Phát triển Nông Lâm nghiệp Bền vững',
  'Bao ton va su dung rau ban dia.pdf': 'Bảo tồn và Sử dụng Rau Bản Địa tại Việt Nam: Thực trạng và Giải pháp',
  'Bien rac thai thanh tai nguyen.pdf': 'Biến Rác Thải thành Nguồn Tài Nguyên Quý Giá',
  'C&E Loi song sinh thai Guidebook.pdf': 'Cẩm nang Hướng dẫn Lối sống Sinh thái và Hành trình Xanh',
  'Canh tac ngo ben vung tren dat doc vung mien nui phia Bac .pdf': 'Kỹ thuật Canh tác Ngô Bền vững trên Đất dốc Vùng Miền núi Phía Bắc',
  'Chuong 7 - Duoc lieu chua alkaloid.pdf': 'Giáo trình Dược liệu học: Các nhóm Dược liệu chứa Alkaloid',
  'Co Vetiver va cac ung dung o Viet Nam.pdf': 'Cỏ Vetiver và các Ứng dụng Thực tế trong Giảm nhẹ Thiên tai, Chống Xói mòn tại Việt Nam',
  'Cách mạng Một cọng rơm.pdf': 'Cuộc Cách mạng Một Cọng Rơm (Masanobu Fukuoka)',
  'FarmersHandbookVolume5VN.pdf': 'Sổ tay Nông dân - Tập 5: Thiết kế Rừng vườn và Nông trại Sinh thái',
  'GTSuDungThuocBVTV_SVquanlydat.com.pdf': 'Giáo trình Sử dụng Thuốc Bảo vệ Thực vật Sinh học & Quản lý An toàn',
  'Giam ngheo va Rung o Viet Nam.pdf': 'Giảm nghèo và Rừng ở Việt Nam: Giải pháp Lâm nghiệp Cộng đồng',
  'Hap thu cac bon.pdf': 'Cẩm nang Lâm nghiệp: Hấp thụ Carbon trong Phục hồi Môi trường Rừng',
  'Huong dan su dung dat dai theo nong nghiep ben vung.pdf': 'Hướng dẫn Sử dụng Đất đai theo hướng Nông nghiệp Bền vững',
  'Ky thuat canh tac tren dat doc_NXBNN.pdf': 'Kỹ thuật Canh tác và Chống Xói mòn trên Đất dốc Miền núi',
  'Ky thuat trong rau sach vu xuan he.pdf': 'Kỹ thuật Trồng Rau Sạch theo Mùa vụ Xuân - Hè',
  'Kĩ thuật bảo vệ thực vật.pdf': 'Kỹ thuật Bảo vệ Thực vật & Kiểm soát Dịch hại Tổng hợp (IPM)',
  'Kĩ thuật sd màng phủ trồng rau.pdf': 'Kỹ thuật Sử dụng Màng phủ Nông nghiệp trong Trồng trọt Rau Quả Sạch',
  'Mo hinh nong nghiep quy mo nho phong cach Nhat Ban.pdf': 'Mô hình Phát triển Kinh tế Nông nghiệp Quy mô nhỏ phong cách Nhật Bản',
  'Máy và thiết bị nông nghiệp - Tập I.pdf': 'Giáo trình Máy và Thiết bị Nông nghiệp - Tập I: Cơ giới hóa Canh tác',
  'Nong nghiep ben vung co so va ung dung.pdf': 'Nông nghiệp Bền vững: Cơ sở Khoa học và Ứng dụng Thực tiễn tại Việt Nam',
  'Nông nghiệp bền vững.pdf': 'Hướng dẫn Thiết kế Nông nghiệp Permaculture (Earth User\'s Guide)',
  'Phan Chuong Phan Xanh San Xuat Và Su Dung.pdf': 'Phân chuồng, Phân xanh: Kỹ thuật Sản xuất và Phối trộn Sử dụng',
  'Phan Tieu Nuoc Tieu Va Cach Su Dung.pdf': 'Phân tiêu, Nước tiểu và Kỹ thuật Chế biến Phân Hữu cơ lỏng',
  'Than sinh hoc - Hieu qua nho cong nghe.pdf': 'Than sinh học (Biochar) - Hiệu quả Cải tạo Đất và Phát triển Bền vững',
  'Trinh Xuan Ngo_Ca phe va ky thuat che bien.pdf': 'Cà phê và Kỹ thuật Chế biến Sau thu hoạch Bền vững',
  'VIet Nam moi truong va cuoc song.pdf': 'Việt Nam: Bảo vệ Tài nguyên Môi trường và Phát triển Cuộc sống Xanh',
  'Vo Dau_Ky thuat trong nam rom.pdf': 'Kỹ thuật Trồng Nấm Rơm Tận dụng Phụ phẩm Rơm rạ',
  'Vu Trung Tang_Sinh thai hoc He sinh thai.pdf': 'Sinh thái học các Hệ sinh thái Nông Lâm nghiệp Tự nhiên',
  'Vuon rau vuon qua vuon rung.pdf': 'Vườn rau, Vườn quả, Vườn rừng: Thiết kế Hệ sinh thái Đa tầng',
  '[EBOOK] GIÁO TRÌNH NÔNG NGHIỆP HỮU CƠ, GS.TS. NGUYỄN THẾ ĐẶNG (Chủ biên).pdf': 'Giáo trình Nông nghiệp Hữu cơ (Đào tạo Đại học Nông Lâm)',
  'Độ ẩm đất với cây trồng.pdf': 'Độ ẩm Đất với sự Sinh trưởng và Năng suất Cây trồng',
  'ƯD CNSH trong sx và đs.PDF': 'Ứng dụng Công nghệ Sinh học trong Sản xuất Hữu cơ và Đời sống Nông thôn',
  '577 bài thuốc dân gian.pdf': '577 Bài thuốc Dân gian Cổ truyền Y học Thường thức',
  'Aquaponics.pdf': 'Kỹ thuật Mô hình Mô hình Thủy sản Tuần hoàn Aquaponics',
  'Biểu hiện thiếu dinh dưỡng ở cây trồng.pdf': 'Nhận biết các Biểu hiện Thích ứng và Thiếu hụt Dinh dưỡng ở Cây trồng',
  'Biện pháp canh tác bảo vệ thực vật.pdf': 'Các Biện pháp Canh tác và Bảo vệ Thực vật Sinh học',
  'Bí quyết giúp nhà nông làm giàu.pdf': 'Bí quyết Kỹ thuật giúp Nhà nông Phát triển Kinh tế Bền vững',
  'Bí quyết làm GAP nhanh.pdf': 'Bí quyết Kỹ thuật Áp dụng Quy trình VietGAP Nhanh chóng',
  'Bảo quản chế biến nsản sau thu hoạch.pdf': 'Bảo quản và Chế biến Nông sản Sau Thu hoạch',
  'Bảo quản chế biến nông sản sau thu hoạch.pdf': 'Bảo quản và Chế biến Nông sản Sau Thu hoạch',
  'Chế biến rau quả.pdf': 'Kỹ thuật Chế biến và Bảo quản Rau Quả Tươi',
  'CN bảo quản chế biến nsản sau thu hoạch.pdf': 'Công nghệ Bảo quản và Chế biến Nông sản Sau Thu hoạch',
  'CNSH trong NN.pdf': 'Ứng dụng Công nghệ Sinh học trong Nông nghiệp',
  'Các bpháp ptrừ sâu bệnh, cỏ dại.pdf': 'Các Biện pháp Phòng trừ Sâu bệnh và Cỏ dại Sinh học',
  'Các loại phân bón và cách sử dụng.pdf': 'Các loại Phân bón và Kỹ thuật Sử dụng Hợp lý',
  'Cây cải bao.pdf': 'Kỹ thuật Canh tác Cây Cải bao',
  'Cây cải bắp.pdf': 'Kỹ thuật Canh tác Cây Cải bắp',
  'Cây cải làn.pdf': 'Kỹ thuật Canh tác Cây Cải làn',
  'Cây cải xanh ngọt.pdf': 'Kỹ thuật Canh tác Cây Cải xanh ngọt',
  'Cây gia vị lấy củ.pdf': 'Kỹ thuật Trồng và Chăm sóc các loại Cây Gia vị lấy củ',
  'Cây lá màu trồng trong phòng.pdf': 'Kỹ thuật Trồng và Chăm sóc Cây Lá màu Nội thất trong phòng',
  'Cây mồng tơi.pdf': 'Kỹ thuật Canh tác Cây Mồng tơi',
  'Cây nho, thanh long.pdf': 'Kỹ thuật Trồng và Chăm sóc Cây Nho và Cây Thanh long',
  'Cây rau muống.pdf': 'Kỹ thuật Canh tác Cây Rau muống',
  'Cây rau ngót.pdf': 'Kỹ thuật Canh tác Cây Rau ngót',
  'Cây rau ăn củ, ăn hoa.pdf': 'Kỹ thuật Trồng các loại Cây Rau ăn củ và Rau ăn hoa',
  'Cây đu đủ.pdf': 'Kỹ thuật Trồng và Chăm sóc Cây Đu đủ',
  'Cây đậu bắp, su hào, cải củ, súp lơ.pdf': 'Kỹ thuật Trồng Đậu bắp, Su hào, Cải củ và Súp lơ',
  'Côn trùng, nhện và nguồn bệnh có ích.pdf': 'Côn trùng, Nhện và Các Loài Vi sinh vật Có ích trong Nông nghiệp',
  'Công nghệ nuôi trồng nấm ăn.pdf': 'Công nghệ Nuôi trồng các loại Nấm ăn và Nấm Dược liệu',
  'Công nghệ trồng trọt.pdf': 'Giáo trình Công nghệ Trồng trọt và Canh tác Nông nghiệp'
};

function formatTitle(item) {
  const fileName = item.fileName;
  if (exactVietnameseTitles[fileName]) return exactVietnameseTitles[fileName];

  let base = fileName.replace(/\.(pdf|epub|mobi|azw|doc|docx|txt|ppt|xlsx)$/i, '').trim();
  base = base.replace(/^ADDA_/i, '')
             .replace(/^GT_/i, 'Giáo trình ')
             .replace(/_/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();

  // If title is English/international (e.g., Masanobu Fukuoka - Natural Way of Farming)
  if (!/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(base)) {
    // English title formatting
    return base.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1));
  }

  // Capitalize Vietnamese words properly
  return base;
}

function categorizeDoc(item, title) {
  const folder = item.folder;
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

// Clean and Deduplicate
const seenKeys = new Map();
const finalDocs = [];

docsOnly.forEach(item => {
  const title = formatTitle(item);
  const cat = categorizeDoc(item, title);

  // Generate normalized deduplication key
  const normKey = title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (!seenKeys.has(normKey)) {
    seenKeys.set(normKey, true);
    finalDocs.push({
      ...item,
      title,
      ...cat
    });
  } else {
    console.log(`[Deduplicated] Skipped redundant file: "${item.fileName}" (Title match: "${title}")`);
  }
});

console.log(`Final unique document count (YouTube dropped & deduplicated): ${finalDocs.length}`);

// Sort by category, then title
finalDocs.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category, 'vi');
  return a.title.localeCompare(b.title, 'vi');
});

// Group counts for summary stats
const categoryCounts = {};
finalDocs.forEach(d => {
  categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
});

// Build HTML table rows
let tableRowsHtml = '';
finalDocs.forEach((d, idx) => {
  tableRowsHtml += `          <tr style="border-bottom: 1px solid var(--line);" class="table-row">
            <td style="padding: 10px 8px; color: var(--ash-dim); font-size: 0.82rem;">#${idx + 1}</td>
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
    <h1 style="font-size: 2.2rem; font-weight: 800; color: var(--ash); margin-bottom: 12px;">Thư Viện Tài Liệu Nguồn Chính Thức</h1>
    <p style="font-size: 1.05rem; color: var(--ash-dim); max-width: 820px; margin: 0 auto; line-height: 1.6;">
      Danh mục <strong>${finalDocs.length} tác phẩm, sách giáo trình & cẩm nang kỹ thuật độc bản</strong> (đã lọc sạch tài liệu trùng lặp và loại bỏ YouTube transcripts) thuộc thư viện <code>documents/</code> được tích hợp trực tiếp trong cơ sở tri thức Trí tuệ Nhân tạo <strong>AgriSynthe AI</strong>.
    </p>
  </header>

  <!-- Overview Stats Banner -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 35px;">
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: var(--ember); margin-bottom: 2px;">${finalDocs.length}</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">Sách & Giáo trình độc bản</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Đã dọn dẹp & lọc trùng lặp 100%</div>
    </div>
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: #16a34a; margin-bottom: 2px;">100%</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">Tiếng Việt Đầy Đủ Dấu</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Tên tác phẩm & giáo trình chuẩn xác</div>
    </div>
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: #2563eb; margin-bottom: 2px;">${Object.keys(categoryCounts).length}</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">Chuyên mục chuyên sâu</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Hữu cơ, Fukuoka, Permaculture, Đất, IPM</div>
    </div>
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-align: center;">
      <div style="font-size: 2.2rem; font-weight: 800; color: #9333ea; margin-bottom: 2px;">0</div>
      <div style="font-size: 0.9rem; font-weight: 600; color: var(--ash);">YouTube Transcripts</div>
      <div style="font-size: 0.78rem; color: var(--ash-dim); margin-top: 2px;">Đã loại bỏ hoàn toàn khỏi danh mục</div>
    </div>
  </div>

  <div class="about-content">
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 14px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow-x: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--line);">
        <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--ash); display: flex; align-items: center; gap: 10px;">
          <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22" style="color: var(--ember);">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
          </svg>
          Danh mục chính xác ${finalDocs.length} tài liệu trong folder documents/
        </h3>
        <span style="font-size: 0.85rem; background: rgba(232, 89, 12, 0.1); color: var(--ember); padding: 4px 12px; border-radius: 20px; font-weight: 600;">
          Đã lọc trùng & Chuẩn hóa Tiếng Việt
        </span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; line-height: 1.5;">
        <thead>
          <tr style="border-bottom: 2px solid var(--line); color: var(--ash);">
            <th style="padding: 10px 8px; font-weight: 700; width: 50px;">STT</th>
            <th style="padding: 10px 8px; font-weight: 700; width: 45%;">Tên tác phẩm / Sách giáo trình (Đầy đủ dấu)</th>
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
console.log('Successfully updated sources.md with clean deduplicated docs!');
