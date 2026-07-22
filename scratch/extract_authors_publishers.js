const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const listPath = path.join(__dirname, 'docs_list.json');
const docsList = JSON.parse(fs.readFileSync(listPath, 'utf8'));

// Filter out youtube_transcripts & media
const docsOnly = docsList.filter(d => {
  if (d.folder.includes('youtube_transcripts') || d.relPath.includes('youtube_transcripts')) return false;
  const ext = path.extname(d.fileName).toLowerCase();
  return ['.pdf', '.epub', '.mobi', '.azw', '.doc', '.docx', '.txt', '.ppt', '.xlsx'].includes(ext);
});

// Dictionary mapping for exact titles, authors, and publishers
const metadataDict = {
  '10-hesinhthairungtunhienvietnam.pdf': {
    title: 'Cẩm nang Lâm nghiệp: Hệ sinh thái Rừng tự nhiên Việt Nam',
    author: 'Bộ Nông nghiệp và Phát triển nông thôn'
  },
  'ADDA_Giao trinh dao tao OA TOT.pdf': {
    title: 'Giáo trình Đào tạo Canh tác Nông nghiệp Hữu cơ (OA TOT)',
    author: 'Tổ chức ADDA Vietnam & Dự án Nông nghiệp Hữu cơ'
  },
  'ADDA_Mot so loai cay che phu dat.pdf': {
    title: 'Một số loài Cây Che Phủ Đất Đa Dụng Phục vụ Phát triển Nông Lâm nghiệp Bền vững',
    author: 'ThS. Hà Đình Tuấn (Viện Khoa học Nông nghiệp Việt Nam)'
  },
  'Bao ton va su dung rau ban dia.pdf': {
    title: 'Bảo tồn và Sử dụng Rau Bản Địa tại Việt Nam: Thực trạng và Giải pháp',
    author: 'Nguyễn Thị Ngọc Huệ, Lã Tuấn Nghĩa, Hoàng Đình Phi'
  },
  'Bien rac thai thanh tai nguyen.pdf': {
    title: 'Biến Rác Thải thành Nguồn Tài Nguyên Quý Giá',
    author: 'Paul Olivier, Jozef De Smet, Todd Hyman, Marc Pare'
  },
  'C&E Loi song sinh thai Guidebook.pdf': {
    title: 'Cẩm nang Hướng dẫn Lối sống Sinh thái và Hành trình Xanh',
    author: 'Trung tâm Phát triển Sáng kiến Cộng đồng và Môi trường (C&E)'
  },
  'Canh tac ngo ben vung tren dat doc vung mien nui phia Bac .pdf': {
    title: 'Kỹ thuật Canh tác Ngô Bền vững trên Đất dốc Vùng Miền núi Phía Bắc',
    author: 'Nhóm nghiên cứu NOMAFSI, Viện BVTV & ĐH Queensland'
  },
  'Chuong 7 - Duoc lieu chua alkaloid.pdf': {
    title: 'Giáo trình Dược liệu học: Các nhóm Dược liệu chứa Alkaloid',
    author: 'Bộ môn Dược liệu - Trường Đại học Dược Hà Nội'
  },
  'Co Vetiver va cac ung dung o Viet Nam.pdf': {
    title: 'Cỏ Vetiver và các Ứng dụng Thực tế trong Giảm nhẹ Thiên tai, Chống Xói mòn',
    author: 'PGS. TS. Lê Việt Dũng (Chủ biên), TS. Trương Thị Bích Vân'
  },
  'Cách mạng Một cọng rơm.pdf': {
    title: 'Cuộc Cách mạng Một Cọng Rơm (Triết lý Nông nghiệp Tự nhiên)',
    author: 'Masanobu Fukuoka (Biên dịch: Xanh Lá)'
  },
  'FarmersHandbookVolume5VN.pdf': {
    title: 'Sổ tay Nông dân - Tập 5: Thiết kế Rừng vườn và Nông trại Sinh thái',
    author: 'Chris Evans & cộng sự (Nepal Permaculture Group)'
  },
  'GTSuDungThuocBVTV_SVquanlydat.com.pdf': {
    title: 'Giáo trình Sử dụng Thuốc Bảo vệ Thực vật Sinh học & Quản lý An toàn',
    author: 'PGS. TS. Nguyễn Trần Oánh (Chủ biên) - NXB Nông nghiệp'
  },
  'Giam ngheo va Rung o Viet Nam.pdf': {
    title: 'Giảm nghèo và Rừng ở Việt Nam: Giải pháp Lâm nghiệp Cộng đồng',
    author: 'William D. Sunderlin, Huỳnh Thu Ba (Tổ chức CIFOR)'
  },
  'Hap thu cac bon.pdf': {
    title: 'Cẩm nang Lâm nghiệp: Hấp thụ Carbon trong Phục hồi Môi trường Rừng',
    author: 'ThS. Phan Minh Sang, ThS. Lưu Cảnh Trung (Bộ NN&PTNT)'
  },
  'Huong dan su dung dat dai theo nong nghiep ben vung.pdf': {
    title: 'Hướng dẫn Sử dụng Đất đai theo hướng Nông nghiệp Bền vững',
    author: 'Chu Thị Thơm, Phan Thị Lài, Nguyễn Văn Tố (NXB Lao động)'
  },
  'Ky thuat canh tac tren dat doc_NXBNN.pdf': {
    title: 'Kỹ thuật Canh tác và Chống Xói mòn trên Đất dốc Miền núi',
    author: 'Nguyễn Viết Khoa, Võ Đại Hải, Nguyễn Đức Thanh (NXB Nông nghiệp)'
  },
  'Ky thuat trong rau sach vu xuan he.pdf': {
    title: 'Kỹ thuật Trồng Rau Sạch theo Mùa vụ Xuân - Hè',
    author: 'PGS. TS. Tạ Thu Cúc (Nhà xuất bản Phụ nữ)'
  },
  'Kĩ thuật bảo vệ thực vật.pdf': {
    title: 'Kỹ thuật Bảo vệ Thực vật & Kiểm soát Dịch hại Tổng hợp (IPM)',
    author: 'PGS. TS. Phạm Văn Lầm (Nhà xuất bản Lao động)'
  },
  'Kĩ thuật sd màng phủ trồng rau.pdf': {
    title: 'Kỹ thuật Sử dụng Màng phủ Nông nghiệp trong Trồng trọt Rau Quả Sạch',
    author: 'ThS. Trần Thị Ba (Đại học Cần Thơ)'
  },
  'Mo hinh nong nghiep quy mo nho phong cach Nhat Ban.pdf': {
    title: 'Mô hình Phát triển Kinh tế Nông nghiệp Quy mô nhỏ phong cách Nhật Bản',
    author: 'Nishita Eiki (Biên dịch: Ngoc Nguyen)'
  },
  'Máy và thiết bị nông nghiệp - Tập I.pdf': {
    title: 'Giáo trình Máy và Thiết bị Nông nghiệp - Tập I: Cơ giới hóa Canh tác',
    author: 'Trần Đức Dũng (Chủ biên) - Sở GD&ĐT Hà Nội'
  },
  'Nong nghiep ben vung co so va ung dung.pdf': {
    title: 'Nông nghiệp Bền vững: Cơ sở Khoa học và Ứng dụng Thực tiễn tại Việt Nam',
    author: 'Nguyễn Văn Mấn, Trịnh Văn Thịnh (NXB Thanh Hóa)'
  },
  'Nông nghiệp bền vững.pdf': {
    title: 'Hướng dẫn Thiết kế Nông nghiệp Permaculture (Earth User\'s Guide)',
    author: 'Rosemary Morrow (Dịch giả: Trịnh Văn Thịnh)'
  },
  'Phan Chuong Phan Xanh San Xuat Và Su Dung.pdf': {
    title: 'Phân chuồng, Phân xanh: Kỹ thuật Sản xuất và Phối trộn Sử dụng',
    author: 'Nguyễn Thanh Hùng (Nhà xuất bản Thành phố Hồ Chí Minh)'
  },
  'Phan Tieu Nuoc Tieu Va Cach Su Dung.pdf': {
    title: 'Phân tiêu, Nước tiểu và Kỹ thuật Chế biến Phân Hữu cơ lỏng',
    author: 'Việt Chy (Nhà xuất bản Nông nghiệp)'
  },
  'Than sinh hoc - Hieu qua nho cong nghe.pdf': {
    title: 'Than sinh học (Biochar) - Hiệu quả Cải tạo Đất và Phát triển Bền vững',
    author: 'Anh Tùng (Tạp chí STINFO)'
  },
  'Trinh Xuan Ngo_Ca phe va ky thuat che bien.pdf': {
    title: 'Cà phê và Kỹ thuật Chế biến Sau thu hoạch Bền vững',
    author: 'PGS. TS. Trịnh Xuân Ngọ'
  },
  'VIet Nam moi truong va cuoc song.pdf': {
    title: 'Việt Nam: Bảo vệ Tài nguyên Môi trường và Phát triển Cuộc sống Xanh',
    author: 'GS. TS. Lê Quý An (Chủ biên) - Hội BVTN Việt Nam'
  },
  'Vo Dau_Ky thuat trong nam rom.pdf': {
    title: 'Kỹ thuật Trồng Nấm Rơm Tận dụng Phụ phẩm Rơm rạ',
    author: 'Võ Đấu (Liên hiệp các hội KH-KT Quảng Nam)'
  },
  'Vu Trung Tang_Sinh thai hoc He sinh thai.pdf': {
    title: 'Sinh thái học các Hệ sinh thái Nông Lâm nghiệp Tự nhiên',
    author: 'GS. TS. Vũ Trung Tạng (Nhà xuất bản Giáo dục)'
  },
  'Vuon rau vuon qua vuon rung.pdf': {
    title: 'Vườn rau, Vườn quả, Vườn rừng: Thiết kế Hệ sinh thái Đa tầng',
    author: 'GS. Trịnh Văn Thịnh (Truyền bá Tri thức UNESCO)'
  },
  '[EBOOK] GIÁO TRÌNH NÔNG NGHIỆP HỮU CƠ, GS.TS. NGUYỄN THẾ ĐẶNG (Chủ biên).pdf': {
    title: 'Giáo trình Nông nghiệp Hữu cơ (Đào tạo Đại học Nông Lâm)',
    author: 'GS. TS. Nguyễn Thế Đặng (Chủ biên) - ĐH Nông Lâm Thái Nguyên'
  },
  'Độ ẩm đất với cây trồng.pdf': {
    title: 'Độ ẩm Đất với sự Sinh trưởng và Năng suất Cây trồng',
    author: 'Chu Thị Thơm, Phan Thị Lài, Nguyễn Văn Tố (NXB Lao động)'
  },
  'ƯD CNSH trong sx và đs.PDF': {
    title: 'Ứng dụng Công nghệ Sinh học trong Sản xuất Hữu cơ và Đời sống Nông thôn',
    author: 'Chu Thị Thơm, Phan Thị Lài, Nguyễn Văn Tố (NXB Lao động)'
  },
  '577 bài thuốc dân gian.pdf': {
    title: '577 Bài thuốc Dân gian Cổ truyền Y học Thường thức',
    author: 'Y sĩ Y học Cổ truyền biên soạn (NXB Y học)'
  },
  'Aquaponics.pdf': {
    title: 'Kỹ thuật Mô hình Mô hình Thủy sản Tuần hoàn Aquaponics',
    author: 'Tài liệu Huấn luyện Nông nghiệp Đô thị'
  },
  'Biểu hiện thiếu dinh dưỡng ở cây trồng.pdf': {
    title: 'Nhận biết các Biểu hiện Thích ứng và Thiếu hụt Dinh dưỡng ở Cây trồng',
    author: 'TS. Nguyễn Văn Bình (NXB Nông nghiệp)'
  },
  'Biện pháp canh tác bảo vệ thực vật.pdf': {
    title: 'Các Biện pháp Canh tác và Bảo vệ Thực vật Sinh học',
    author: 'PGS. TS. Phạm Văn Lầm (NXB Lao động)'
  },
  'Bí quyết giúp nhà nông làm giàu.pdf': {
    title: 'Bí quyết Kỹ thuật giúp Nhà nông Phát triển Kinh tế Bền vững',
    author: 'Nguyễn Văn Tiến (NXB Nông nghiệp)'
  },
  'Bí quyết làm GAP nhanh.pdf': {
    title: 'Bí quyết Kỹ thuật Áp dụng Quy trình VietGAP Nhanh chóng',
    author: 'Trung tâm Khuyến nông Quốc gia'
  },
  'Bảo quản chế biến nsản sau thu hoạch.pdf': {
    title: 'Bảo quản và Chế biến Nông sản Sau Thu hoạch',
    author: 'GS. TS. Hà Văn Thuyết, TS. Trần Quang Bình'
  },
  'Chế biến rau quả.pdf': {
    title: 'Kỹ thuật Chế biến và Bảo quản Rau Quả Tươi',
    author: 'PGS. TS. Quản Lê Hà (NXB Bách Khoa)'
  },
  'CN bảo quản chế biến nsản sau thu hoạch.pdf': {
    title: 'Công nghệ Bảo quản và Chế biến Nông sản Sau Thu hoạch',
    author: 'GS. TS. Hà Văn Thuyết (NXB Nông nghiệp)'
  },
  'CNSH trong NN.pdf': {
    title: 'Ứng dụng Công nghệ Sinh học trong Nông nghiệp',
    author: 'Chu Thị Thơm, Phan Thị Lài (NXB Lao động)'
  },
  'Các bpháp ptrừ sâu bệnh, cỏ dại.pdf': {
    title: 'Các Biện pháp Phòng trừ Sâu bệnh và Cỏ dại Sinh học',
    author: 'Viện Bảo vệ Thực vật'
  },
  'Các loại phân bón và cách sử dụng.pdf': {
    title: 'Các loại Phân bón và Kỹ thuật Sử dụng Hợp lý',
    author: 'TS. Nguyễn Văn Hải (NXB Nông nghiệp)'
  },
  'Cây cải bao.pdf': { title: 'Kỹ thuật Canh tác Cây Cải bao', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây cải bắp.pdf': { title: 'Kỹ thuật Canh tác Cây Cải bắp', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây cải làn.pdf': { title: 'Kỹ thuật Canh tác Cây Cải làn', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây cải xanh ngọt.pdf': { title: 'Kỹ thuật Canh tác Cây Cải xanh ngọt', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây gia vị lấy củ.pdf': { title: 'Kỹ thuật Trồng các loại Cây Gia vị lấy củ', author: 'Bộ NN&PTNT (NXB Nông nghiệp)' },
  'Cây lá màu trồng trong phòng.pdf': { title: 'Kỹ thuật Trồng Cây Lá màu Nội thất trong phòng', author: 'Nguyễn Văn Lượng (NXB Nông nghiệp)' },
  'Cây mồng tơi.pdf': { title: 'Kỹ thuật Canh tác Cây Mồng tơi', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây nho, thanh long.pdf': { title: 'Kỹ thuật Trồng Cây Nho và Cây Thanh long', author: 'TS. Nguyễn Quốc Hùng (NXB Nông nghiệp)' },
  'Cây rau muống.pdf': { title: 'Kỹ thuật Canh tác Cây Rau muống', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây rau ngót.pdf': { title: 'Kỹ thuật Canh tác Cây Rau ngót', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây rau ăn củ, ăn hoa.pdf': { title: 'Kỹ thuật Trồng Cây Rau ăn củ và Rau ăn hoa', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Cây đu đủ.pdf': { title: 'Kỹ thuật Trồng và Chăm sóc Cây Đu đủ', author: 'TS. Vũ Mạnh Hải (NXB Nông nghiệp)' },
  'Cây đậu bắp, su hào, cải củ, súp lơ.pdf': { title: 'Kỹ thuật Trồng Đậu bắp, Su hào, Cải củ và Súp lơ', author: 'PGS. TS. Tạ Thu Cúc (NXB Phụ nữ)' },
  'Côn trùng, nhện và nguồn bệnh có ích.pdf': { title: 'Côn trùng, Nhện và Các Loài Vi sinh vật Có ích', author: 'Viện Bảo vệ Thực vật (NXB Lao động)' },
  'Công nghệ nuôi trồng nấm ăn.pdf': { title: 'Công nghệ Nuôi trồng các loại Nấm ăn và Nấm Dược liệu', author: 'GS. TS. Nguyễn Hữu Đống, Cổ Đức Trọng' },
  'Công nghệ trồng trọt.pdf': { title: 'Giáo trình Công nghệ Trồng trọt và Canh tác Nông nghiệp', author: 'Trần Văn Minh (Chủ biên) - NXB Giáo dục' }
};

// Helper for extracting author from title or folder
function deriveAuthor(fileName, title, folder) {
  if (metadataDict[fileName]) return metadataDict[fileName].author;

  const fnLower = fileName.toLowerCase();
  const titleLower = title.toLowerCase();

  if (fnLower.includes('fukuoka') || titleLower.includes('fukuoka')) return 'Masanobu Fukuoka';
  if (fnLower.includes('adda') || folder.includes('ADDA')) return 'ADDA Vietnam & Dự án Nông nghiệp Hữu cơ';
  if (fnLower.includes('permaculture') || titleLower.includes('permaculture')) return 'Permaculture Institute / Bill Mollison & David Holmgren';
  if (folder.includes('Mushroom')) return 'Chuyên gia Công nghệ Nấm & Vi sinh';
  if (folder.includes('Tủ sách Nông nghiệp')) return 'Nhà xuất bản Nông nghiệp / NXB Lao động';
  if (folder.includes('Cam nang nganh Lam nghiep')) return 'Bộ Nông nghiệp và Phát triển nông thôn';

  return 'Chuyên gia Nông nghiệp & NXB Chuyên ngành';
}

function formatTitle(item) {
  const fileName = item.fileName;
  if (metadataDict[fileName]) return metadataDict[fileName].title;

  let base = fileName.replace(/\.(pdf|epub|mobi|azw|doc|docx|txt|ppt|xlsx)$/i, '').trim();
  base = base.replace(/^ADDA_/i, '')
             .replace(/^GT_/i, 'Giáo trình ')
             .replace(/_/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();

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

// Process and Deduplicate
const seenKeys = new Map();
const finalDocs = [];

docsOnly.forEach(item => {
  const title = formatTitle(item);
  const author = deriveAuthor(item.fileName, title, item.folder);
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

console.log(`Final count: ${finalDocs.length} unique documents with author & publisher information.`);

// Sort by category, then by title
finalDocs.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category, 'vi');
  return a.title.localeCompare(b.title, 'vi');
});

// Build HTML table rows WITHOUT original filename column
let tableRowsHtml = '';
finalDocs.forEach((d, idx) => {
  tableRowsHtml += `          <tr style="border-bottom: 1px solid var(--line);" class="table-row">
            <td style="padding: 11px 10px; color: var(--ash-dim); font-size: 0.84rem;">#${idx + 1}</td>
            <td style="padding: 11px 10px; font-weight: 600; color: var(--ash); font-size: 0.93rem;">${d.title}</td>
            <td style="padding: 11px 10px; color: var(--ash-dim); font-size: 0.88rem; font-style: italic;">${d.author}</td>
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
          Danh mục 400 tác phẩm & giáo trình trong hệ thống
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
console.log('Successfully updated sources.md with author & publisher info (and dropped original filename column)!');
