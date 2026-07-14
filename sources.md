---
layout: default
title: "Nguồn Tài Liệu Tham Khảo"
permalink: /sources/
---

<div class="about-layout">
  <header class="about-header">
    <h1>Cơ Sở Dữ Liệu Tài Liệu Tham Khảo</h1>
    <p>Danh sách 34 nguồn tài liệu, sách giáo trình và tệp tin khoa học được nạp trực tiếp trong Google NotebookLM làm nền tảng tri thức cho AgriSynthe AI.</p>
  </header>

  <div class="about-content">
    <p style="text-align: center; color: var(--ash-dim); margin-bottom: 40px; font-size: 1.1rem; max-width: 700px; margin-left: auto; margin-right: auto;">
      Để đảm bảo tính chính xác cao nhất và loại bỏ hoàn toàn hiện tượng ảo tưởng (hallucination) của AI, tất cả các bài viết đều được đối chiếu độc quyền dựa trên nguồn tài nguyên số dưới đây.
    </p>

    <!-- Source Files Table -->
    <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow-x: auto;">
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: var(--ash); display: flex; align-items: center; gap: 10px;">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" style="color: var(--ember);">
          <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
        </svg>
        Danh mục 34 tài liệu nguồn trong hệ thống
      </h3>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; line-height: 1.6;">
        <thead>
          <tr style="border-bottom: 2px solid var(--line); color: var(--ash);">
            <th style="padding: 12px 8px; font-weight: 700; width: 80px;">Mã số</th>
            <th style="padding: 12px 8px; font-weight: 700;">Tên tài liệu / Tệp tin nguồn</th>
            <th style="padding: 12px 8px; font-weight: 700; width: 140px;">Định dạng</th>
            <th style="padding: 12px 8px; font-weight: 700; width: 140px;">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {% assign sources = "10-hesinhthairungtunhienvietnam.pdf|ADDA_Giao trinh dao tao OA TOT.pdf|ADDA_Mot so loai cay che phu dat.pdf|Bao ton va su dung rau ban dia.pdf|Bien rac thai thanh tai nguyen.pdf|C&E Loi song sinh thai Guidebook.pdf|Canh tac ngo ben vung tren dat doc vung mien nui phia Bac .pdf|Chuong 7 - Duoc lieu chua alkaloid.pdf|Co Vetiver va cac ung dung o Viet Nam.pdf|Cách mạng Một cọng rơm.pdf|FarmersHandbookVolume5VN.pdf|GTSuDungThuocBVTV_SVquanlydat.com.pdf|Giam ngheo va Rung o Viet Nam.pdf|Hap thu cac bon.pdf|Huong dan su dung dat dai theo nong nghiep ben vung.pdf|Ky thuat canh tac tren dat doc_NXBNN.pdf|Ky thuat trong rau sach vu xuan he.pdf|Kĩ thuật bảo vệ thực vật.pdf|Kĩ thuật sd màng phủ trồng rau.pdf|Mo hinh nong nghiep quy mo nho phong cach Nhat Ban.pdf|Máy và thiết bị nông nghiệp - Tập I.pdf|Nong nghiep ben vung co so va ung dung.pdf|Nông nghiệp bền vững.pdf|Phan Chuong Phan Xanh San Xuat Và Su Dung.pdf|Phan Tieu Nuoc Tieu Va Cach Su Dung.pdf|Than sinh hoc - Hieu qua nho cong nghe.pdf|Trinh Xuan Ngo_Ca phe va ky thuat che bien.pdf|VIet Nam moi truong va cuoc song.pdf|Vo Dau_Ky thuat trong nam rom.pdf|Vu Trung Tang_Sinh thai hoc He sinh thai.pdf|Vuon rau vuon qua vuon rung.pdf|[EBOOK] GIÁO TRÌNH NÔNG NGHIỆP HỮU CƠ, GS.TS. NGUYỄN THẾ ĐẶNG (Chủ biên) ET AL., ĐẠI HỌC NÔNG LÂM (THÁI NGUYÊN), NXB NÔNG NGHIỆP.pdf|Độ ẩm đất với cây trồng.pdf|ƯD CNSH trong sx và đs.PDF" | split: "|" %}
          {% for source in sources %}
          <tr style="border-bottom: 1px solid var(--line); transition: background 0.2s;" class="table-row">
            <td style="padding: 12px 8px; color: var(--ash-dim);">#{{ forloop.index }}</td>
            <td style="padding: 12px 8px; color: var(--ash); font-weight: 500;">{{ source }}</td>
            <td style="padding: 12px 8px; color: var(--ash-dim); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">PDF Document</td>
            <td style="padding: 12px 8px;">
              <span style="display: inline-block; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Đã nạp</span>
            </td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .table-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  [data-theme="light"] .table-row:hover {
    background: rgba(0, 0, 0, 0.02);
  }
</style>
