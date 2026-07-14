---
layout: default
title: "Giới thiệu"
permalink: /about/
---

<div class="about-layout">
  <header class="about-header">
    <h1>Về Dự Án Nông Nghiệp Sinh Thái</h1>
    <p>Thư viện số tự động hóa bằng AI, chuyên tổng hợp và đối chiếu tri thức nông nghiệp hữu cơ bền vững.</p>
  </header>

  <div class="about-content">
    <div class="highlight-box">
      <p>"Nông Nghiệp Sinh Thái là một thử nghiệm công nghệ kết hợp trí tuệ nhân tạo (AI) và tri thức bản địa, tự động chuyển đổi các giáo trình khoa học nặng tính học thuật thành các bài viết thực tiễn dễ tiếp cận cho mọi nông hộ."</p>
    </div>

    <h2>Bản chất của Dự án: Biên soạn tự động bởi AI</h2>
    <p>Blog này hoạt động dựa trên cơ chế tự động hóa hoàn toàn. Thay vì có ban biên tập viết bài thủ công, chúng tôi sử dụng mô hình ngôn ngữ lớn (LLM) thông qua kết nối trực tiếp với <b>Google NotebookLM</b> để phân tích nguồn tài liệu kỹ thuật đáng tin cậy. Quy trình diễn ra như sau:</p>
    <ol>
      <li><b>Cơ sở tài liệu gốc:</b> Hệ thống chỉ tổng hợp thông tin từ các tài liệu khoa học chính thống, giáo trình đại học nông lâm và sách kinh điển (như cuốn <i>"Cuộc cách mạng một cọng rơm"</i> của Masanobu Fukuoka) được nạp sẵn trong cơ sở dữ liệu.</li>
      <li><b>Trích xuất thông minh (Jekyll Cronjob):</b> Hàng ngày, một tiến trình tự động (GitHub Actions) sẽ gửi truy vấn y học hoặc kỹ thuật đến NotebookLM để biên soạn một bài viết hoàn chỉnh.</li>
      <li><b>Xác minh nguồn gốc chi tiết:</b> Mỗi thông tin kỹ thuật được viết ra đều đi kèm trích dẫn chính xác đến từng [Tên tài liệu, Tác giả, Chương, Trang] để người đọc dễ dàng đối chiếu nguồn gốc.</li>
      <li><b>Kiểm chứng liên kết tự động:</b> Mọi video hướng dẫn thực tế từ YouTube được đưa vào bài viết đều đi qua bộ lọc kiểm thử tự động (oEmbed API) để ngăn chặn hoàn toàn các liên kết hỏng, link lỗi.</li>
    </ol>

    <h2>Tuyên bố miễn trừ trách nhiệm (AI Disclaimer)</h2>
    <p>Mặc dù hệ thống AI của chúng tôi được thiết kế để trích dẫn chính xác từ các nguồn tài liệu tin cậy và lọc bỏ thông tin nhiễu, các mô hình ngôn ngữ lớn vẫn có khả năng xảy ra lỗi logic hoặc nhầm lẫn kỹ thuật. Do đó, tất cả các bài viết trên trang web này đều được gắn nhãn cảnh báo đầu trang.</p>
    <p>Chúng tôi khuyến cáo bà con nông dân và các bạn độc giả luôn đối chiếu lại thông tin với tài liệu gốc hoặc tham khảo ý kiến của các chuyên gia nông nghiệp địa phương trước khi áp dụng rộng rãi vào thực tế sản xuất.</p>

    <h2>Chia sẻ và Đóng góp</h2>
    <p>Mọi mã nguồn của trang web, các công thức ủ phân hữu cơ, bản vẽ lò retort và giấm gỗ đều được công khai miễn phí và phi lợi nhuận. Nếu bạn có tài liệu nông nghiệp hay muốn chia sẻ kết quả thực nghiệm của mình, vui lòng liên hệ với chúng tôi qua địa chỉ email: <b>contact@nongnghiepsinhthai.vn</b>.</p>
  </div>
</div>
