---
name: svg-diagrams
description: Guidelines and patterns for drawing technical SVG diagrams matching the Agri Blog design system.
---

# Hướng dẫn vẽ sơ đồ kỹ thuật SVG chuẩn Blog Agri-Biochar

Tài liệu này hướng dẫn chi tiết cách thiết lập, vẽ và định dạng các sơ đồ kỹ thuật (Vector SVG) tương thích hoàn hảo với hệ thống giao diện (Light/Dark Mode) và bộ CSS đặc thù của Blog Nông Nghiệp Sinh Thái.

---

## 1. Kích thước & Cấu trúc cơ bản

Khi tạo sơ đồ mới, luôn bọc trong thẻ `<svg>` với tỷ lệ chuẩn 16:9 và cấu hình responsive như sau:
```xml
<svg viewBox="0 0 640 360" width="100%" height="auto" class="diagram-svg" xmlns="http://www.w3.org/2000/svg">
  <!-- Các định nghĩa tái sử dụng nằm trong _includes/svg-defs.html không cần định nghĩa lại -->
  
  <!-- Thân sơ đồ -->
</svg>
```

---

## 2. Các lớp CSS định dạng đường nét (Stroke)

Hệ thống CSS của blog (`style.css`) đã định nghĩa sẵn các class đặc thù cho đường kẻ. Không nên hardcode mã màu (`#fff`, `#000`) mà hãy sử dụng các class sau:

| Tên Class | Độ dày | Định dạng nét | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `.d-line` | 1.8px | Nét liền | Vẽ khung chính, thân lò nung, các ống dẫn chính. |
| `.d-line-2` | 1.2px | Nét liền mảnh | Vẽ các vách ngăn phụ, chi tiết nhỏ bên trong. |
| `.d-ember` | 1.8px | Nét liền màu cam | Biểu thị nhiệt độ cao, lửa, dòng khí nóng, hướng lò đốt. |
| `.d-ember-dash`| 1.5px | Nét đứt màu cam | Hướng luồng khói yếm khí, rò rỉ nhiệt, khí gas. |
| `.d-dim` | 1.2px | Nét xám mờ | Đường gióng kích thước, chú thích phụ, mặt cắt. |
| `.d-dim-ext` | 0.8px | Nét siêu mảnh | Đường ranh giới phụ, chi tiết phụ xa. |
| `.d-leader` | 0.8px | Nét đứt xám | Đường chỉ dẫn từ nhãn chữ vào chi tiết sơ đồ. |
| `.d-frame` | 1.5px | Nét đứt bao quanh | Vẽ khung bao bên ngoài của sơ đồ (nếu cần). |
| `.d-check` | 2.2px | Nét xanh lá | Biểu thị hành động đúng, kết nối thành công, khí sạch. |

---

## 3. Các mẫu tô (Fill & Patterns)

Để tô bề mặt vật liệu hoặc các bộ phận lò, hãy sử dụng các mẫu tô (Pattern) có sẵn từ file `_includes/svg-defs.html`:

- **Mẫu Hatch mắt cáo (`fill="url(#hatch)"`):** Sử dụng class `.d-hatch` để vẽ các lớp đất bọc, lớp cát cách nhiệt, hoặc lớp sinh khối (củi, trấu) nạp bên trong lò.
- **Lớp che phủ yếm khí (`class="d-hole"`):** Sử dụng cho các lỗ hút khí hoặc tay xách, tự động chuyển màu nền theo theme Sáng/Tối.

---

## 4. Quy chuẩn Chữ viết & Chú thích (Typography)

Tất cả văn bản trong sơ đồ kỹ thuật phải tuân thủ hai quy chuẩn font chữ sau:

### Tiêu đề sơ đồ (Diagram Title / Header):
*   Sử dụng font chữ không chân **`Inter`**.
*   Sử dụng class **`.d-label-title`**.
*   *Mã mẫu:*
    ```xml
    <text x="320" y="30" text-anchor="middle" class="d-label-title">SƠ ĐỒ NGUYÊN LÝ LÒretort</text>
    ```

### Chú thích chi tiết (Labels / Specs):
*   Sử dụng font chữ đơn cách chuyên nghiệp **`JetBrains Mono`** để thể hiện tính kỹ thuật.
*   Kích thước mặc định: **`11.5px`**.
*   Sử dụng class **`.d-label`** cho chú thích thường, và **`.d-label-em`** (màu cam) cho các điểm nhấn quan trọng hoặc cảnh báo.
*   *Mã mẫu:*
    ```xml
    <text x="150" y="240" class="d-label">Bình ngưng tụ</text>
    <text x="450" y="120" class="d-label-em">Khí gas cháy tự do</text>
    ```

---

## 5. Mẫu sơ đồ kỹ thuật chuẩn mẫu (Template)

Dưới đây là một ví dụ hoàn chỉnh về cách vẽ sơ đồ kỹ thuật tích hợp mũi tên chỉ dẫn chỉ bằng lớp CSS:

```xml
<div class="diagram-card">
  <svg viewBox="0 0 640 260" width="100%" height="auto" class="diagram-svg" xmlns="http://www.w3.org/2000/svg">
    <!-- Tiêu đề sơ đồ -->
    <text x="20" y="35" class="d-label-title">VẼ SƠ ĐỒ DẪN HƯỚNG DÒNG KHÍ</text>
    
    <!-- Đường lò chính (Sử dụng marker đầu mũi tên có sẵn 'arrow') -->
    <path d="M 50,150 L 250,150" class="d-line" />
    <path d="M 250,150 L 450,150" class="d-ember" marker-end="url(#arrow)" />
    
    <!-- Đường gióng chú thích -->
    <path d="M 350,150 L 350,200" class="d-leader" />
    
    <!-- Chữ chú thích -->
    <text x="350" y="220" text-anchor="middle" class="d-label">Điểm gia nhiệt</text>
    <text x="460" y="145" class="d-label-em">Hỗn hợp khí gas hóa</text>
  </svg>
  <div class="diagram-note">
    <p><b>Hình A:</b> Mô tả luồng khí nóng nhiệt phân di chuyển từ buồng đốt yếm khí ra ngoài đầu đốt tự do.</p>
  </div>
</div>
```
