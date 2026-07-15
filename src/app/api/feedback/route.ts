import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const apiKey = (process.env.RESEND_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
const resend = new Resend(apiKey);

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Chưa nạp RESEND_API_KEY. Nếu bạn vừa thêm vào file .env, vui lòng KHỞI ĐỘNG LẠI server (Ctrl+C rồi chạy lại npm run dev).' }, 
        { status: 500 }
      );
    }

    const { name, email, message } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Nội dung góp ý không được để trống' }, { status: 400 });
    }

    const recipient = 'contact@manhhuynh.work';
    const sender = 'AgriSynthe <Agri@manhhuynh.work>';

    const emailResponse = await resend.emails.send({
      from: sender,
      to: [recipient],
      subject: `[Góp ý AgriSynthe] Phản hồi từ ${name || 'Độc giả ẩn danh'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2b1f13; line-height: 1.6;">
          <h2 style="color: #e8590c; border-bottom: 2px solid #e8590c; padding-bottom: 8px;">Ý kiến đóng góp từ độc giả</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 120px;">Họ tên:</td>
              <td style="padding: 6px 0;">${name || 'Ẩn danh'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Email:</td>
              <td style="padding: 6px 0;">${email || 'Không cung cấp'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Thời gian:</td>
              <td style="padding: 6px 0;">${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
            </tr>
          </table>

          <hr style="border: 0; border-top: 1px solid #dcd3c1; margin: 20px 0;" />

          <p style="font-weight: bold;">Nội dung chi tiết:</p>
          <div style="background-color: #f4ecd8; border-left: 4px solid #e8590c; padding: 15px; border-radius: 4px; font-style: italic; white-space: pre-wrap;">${message}</div>

          <footer style="margin-top: 30px; font-size: 12px; color: #8a7c6a; text-align: center;">
            Thư được tự động gửi từ biểu mẫu Hộp thư góp ý của AgriSynthe.
          </footer>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error('Resend Email Error:', emailResponse.error);
      return NextResponse.json({ error: emailResponse.error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Gửi ý kiến góp ý thành công! Xin cảm ơn bạn.' }, { status: 200 });
  } catch (error: any) {
    console.error('Feedback API Error:', error);
    return NextResponse.json({ error: error.message || 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
