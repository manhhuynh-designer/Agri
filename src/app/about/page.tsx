export const metadata = {
  title: "Giới thiệu — AgriSynthe",
  description: "Về Dự Án AgriSynthe - Thư viện số tự động hóa bằng AI, chuyên tổng hợp và đối chiếu tri thức nông nghiệp hữu cơ bền vững.",
};

export default function AboutPage() {
  return (
    <div className="wrap" style={{ padding: "40px 0" }}>
      <div className="about-layout">
        <header className="about-header">
          <h1>Về Dự Án Agri<span>Synthe</span></h1>
          <p>Thư viện số tự động hóa bằng AI, chuyên tổng hợp và đối chiếu tri thức nông nghiệp hữu cơ bền vững.</p>
        </header>

        <div className="about-content">
          <div className="highlight-box">
            <p>&quot;AgriSynthe là một thử nghiệm công nghệ kết hợp trí tuệ nhân tạo (AI) và tri thức bản địa, tự động chuyển đổi các giáo trình khoa học nặng tính học thuật thành các bài viết thực tiễn dễ tiếp cận cho mọi nông hộ.&quot;</p>
          </div>

          <h2>Bản chất của Dự án: Biên soạn tự động bởi AI</h2>
          <p>Blog này hoạt động dựa trên cơ chế tổng hợp tự động. Thay vì có ban biên tập viết bài thủ công, chúng tôi ứng dụng Trí tuệ Nhân tạo (AI) để phân tích, chắt lọc và biên tập tri thức từ các nguồn tài liệu kỹ thuật nông nghiệp đáng tin cậy. Quy trình biên soạn được thực hiện như sau:</p>
          <ol>
            <li><b>Cơ sở tài liệu gốc vững chắc:</b> AI chỉ học tập và tổng hợp thông tin từ các tài liệu chính thống, bao gồm giáo trình nông nghiệp hữu cơ, cẩm nang khuyến nông quốc gia và sách kinh điển về sinh thái (được liệt kê cụ thể tại mục Tài liệu tham khảo).</li>
            <li><b>Tự động cập nhật mỗi ngày:</b> Hàng ngày, hệ thống tự động chọn lọc các chủ đề thực tiễn cần thiết cho nhà nông và yêu cầu AI nghiên cứu nguồn tài liệu gốc để biên soạn thành một bài viết hoàn chỉnh.</li>
            <li><b>Trích nguồn rõ ràng đến từng trang:</b> Để bảo đảm tính minh bạch và độ tin cậy, mỗi kiến thức cốt lõi được viết ra đều đi kèm chú thích nguồn gốc rõ ràng (Tên tài liệu, Tác giả, Chương, Trang) để người đọc dễ dàng đối chiếu trực tiếp.</li>
            <li><b>Video minh họa thực tế được kiểm duyệt:</b> Mọi video hướng dẫn từ YouTube nhúng trong bài viết đều được hệ thống tự động kiểm tra kỹ lưỡng, đảm bảo video vẫn hoạt động tốt, có giá trị thực tiễn và không bị lỗi liên kết.</li>
          </ol>

          <h2>Tuyên bố miễn trừ trách nhiệm (AI Disclaimer)</h2>
          <p>Mặc dù hệ thống AI của chúng tôi được thiết kế để trích dẫn chính xác từ các nguồn tài liệu tin cậy và lọc bỏ thông tin nhiễu, các mô hình ngôn ngữ lớn vẫn có khả năng xảy ra lỗi logic hoặc nhầm lẫn thông tin. Do đó, tất cả các bài viết trên trang web này đều được gắn nhãn cảnh báo ở đầu trang.</p>
          <p>Chúng tôi khuyến cáo bà con nông dân và các bạn độc giả luôn đối chiếu lại thông tin với tài liệu gốc hoặc tham khảo ý kiến của các chuyên gia nông nghiệp địa phương trước khi áp dụng rộng rãi vào thực tế sản xuất.</p>

          <h2>Chia sẻ và Đóng góp</h2>
          <p>Mọi mã nguồn của trang web, các công thức ủ phân hữu cơ, bản vẽ thiết bị và giấm gỗ đều được công khai miễn phí và phi lợi nhuận. Nếu bạn có tài liệu nông nghiệp hay muốn chia sẻ kết quả thực nghiệm của mình, vui lòng liên hệ với chúng tôi qua địa chỉ email: <b>contact@manhhuynh.work</b>.</p>
        </div>
      </div>
    </div>
  );
}
