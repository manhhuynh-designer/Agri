---
name: article-writing
description: Hướng dẫn viết bài, định dạng Front-matter, trích dẫn chi tiết nguồn và nhúng video YouTube hoạt động cho blog AgriSynthe.
---

# Kỹ năng viết bài chuẩn mực cho AgriSynthe Blog

Tài liệu này định nghĩa bộ quy tắc, tiêu chuẩn định dạng và phong cách viết bài dành cho Agent khi thực hiện tạo mới hoặc sửa đổi các bài viết (Jekyll Posts) trên blog AgriSynthe.

---

## 1. Cấu trúc Front-matter chuẩn (Jekyll YAML)

Mỗi bài viết mới phải khai báo đầy đủ các trường Front-matter chuẩn sau ở đầu tệp Markdown (`_posts/YYYY-MM-DD-filename.md`):

```yaml
---
layout: post
title: "Tiêu đề bài viết ngắn gọn, hấp dẫn và chứa từ khóa"
subtitle: "Mô tả ngắn gọn nội dung cốt lõi của bài viết trong 1-2 câu"
date: YYYY-MM-DD HH:MM:SS +0700
categories: ["Danh mục chính", "Danh mục phụ"]
tags: ["từ-khóa-1", "từ-khóa-2"]
image: "/assets/images/posts/thumbnail-name.png"
---
```

> [!IMPORTANT]
> - Trường `categories` bắt buộc phải sử dụng định dạng mảng (`[...]`) thay vì chuỗi đơn lẻ để đảm bảo các thẻ nhãn ở trang chủ hiển thị chính xác.
> - Ngày đăng bài viết (`date`) phải sử dụng múi giờ Việt Nam (`+0700`).

---

## 2. Khối tuyên bố miễn trừ trách nhiệm (AI Disclaimer)

Mọi bài viết tự động biên soạn bởi AI bắt buộc phải có khối cảnh báo ở đầu bài viết, ngay dưới phần tiêu đề chính:

```html
<div class="ai-warning-box" style="background: rgba(220, 38, 38, 0.05); border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
  <p style="margin: 0; font-size: 0.92rem; color: var(--ash); line-height: 1.5;">
    <strong>⚠️ LƯU Ý QUAN TRỌNG:</strong> Bài viết này được tổng hợp và biên tập tự động từ sách bởi Trí tuệ Nhân tạo (AI). Mặc dù hệ thống đã đối chiếu với các nguồn tài liệu chính thống, thông tin chỉ mang tính chất tham khảo. Độc giả cần kiểm chứng lại nguồn gốc hoặc thảo luận với chuyên gia trước khi ứng dụng thực tế.
  </p>
</div>
```

---

## 3. Quy chuẩn trích dẫn nguồn chi tiết (MANDATORY)

Tuyệt đối không trích dẫn chung chung như "Nguồn Internet" hoặc "Theo tài liệu kỹ thuật". Cuối mỗi bài viết, bắt buộc phải có một mục riêng tên là `### Tài liệu trích dẫn chi tiết` với đầy đủ các thông tin:

*   **Tên nguồn:** (Tên sách, giáo trình, báo cáo khoa học)
*   **Tác giả:** (Tên tác giả, nhóm tác giả hoặc cơ quan ban hành)
*   **Tác phẩm:** (Tên tác phẩm cụ thể được in nghiêng)
*   **Chương:** (Chương, mục hoặc phần cụ thể)
*   **Trang:** (Khoảng số trang tham chiếu trực tiếp, ví dụ: Trang 112-128)

*Ví dụ:*
```markdown
### Tài liệu trích dẫn chi tiết
- **Tên nguồn:** Giáo trình Kỹ thuật canh tác hữu cơ bền vững.
- **Tác giả:** Bộ Nông nghiệp & Phát triển Nông thôn Việt Nam.
- **Tác phẩm:** *Giáo trình Kỹ thuật canh tác hữu cơ bền vững*.
- **Chương:** Chương 4 - "Quản lý dinh dưỡng đất trồng" & Mục 4.2 - "Công nghệ Biochar".
- **Trang:** Trang 112-128.
```

---

## 4. Quy chuẩn nhúng Video YouTube (oEmbed Validation)

Để cung cấp minh chứng trực quan sinh động cho người đọc, cuối mỗi bài viết cần tích hợp mục `### Video tham khảo thực tế`.

### Khung mã nhúng Iframe chuẩn:
Mã nhúng phải có độ co giãn responsive tốt (`padding-bottom: 56.25%` tạo tỷ lệ khung hình 16:9) và bo tròn góc:

```html
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
  <iframe src="https://www.youtube.com/embed/[YOUTUBE_ID]" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"></iframe>
</div>
```

### Điều kiện tiên quyết đối với YouTube ID:
- **Chỉ sử dụng** các ID video đã được xác thực là hoạt động và cho phép nhúng (Public & Embeddable).
- Kiểm tra trạng thái video qua công cụ kiểm thử: `node scripts/check_existing_videos.js` trước khi xuất bản.
- Tham khảo danh mục link đã xác minh trong `_data/topics.json`.

---

## 5. Định dạng Hình ảnh trong bài viết

Mọi hình ảnh chèn trong thân bài viết bắt buộc phải tuân thủ responsive của AgriSynthe:
- Sử dụng cú pháp Markdown chuẩn: `![Mô tả ảnh](/assets/images/posts/name.png)`.
- Không sử dụng các thẻ hình ảnh HTML cứng chiều rộng (`width`/`height`) để tránh phá vỡ giao diện trên các thiết bị di động.
- Mọi hình ảnh sẽ tự động kế thừa bộ lọc bo tròn, căn giữa và tạo bóng từ lớp CSS `.post-content img` đã thiết lập.
