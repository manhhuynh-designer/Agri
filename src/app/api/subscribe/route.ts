import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const getCleanResendKey = () => {
  const rawKey = process.env.RESEND_API_KEY || '';
  const lines = rawKey.split(/[\r\n]+/);
  for (let line of lines) {
    line = line.trim().replace(/^['"]|['"]$/g, '');
    if (line.startsWith('re_')) {
      return line;
    }
    if (line.includes('RESEND_API_KEY=')) {
      const parts = line.split('RESEND_API_KEY=');
      const potentialKey = parts[1]?.trim().replace(/^['"]|['"]$/g, '');
      if (potentialKey && potentialKey.startsWith('re_')) {
        return potentialKey;
      }
    }
  }
  return rawKey.trim().replace(/^['"]|['"]$/g, '');
};

const apiKey = getCleanResendKey();
const resend = new Resend(apiKey);

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Chưa nạp RESEND_API_KEY. Nếu bạn vừa thêm vào file .env, vui lòng KHỞI ĐỘNG LẠI server (Ctrl+C rồi chạy lại npm run dev).' }, 
        { status: 500 }
      );
    }

    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    let isSubscribed = false;
    let fallbackUsed = false;

    try {
      // 1. Lấy danh sách Audience hiện tại
      const audiences = (await resend.audiences.list()) as any;
      
      // Kiểm tra nếu API trả về lỗi phân quyền trực tiếp trong dữ liệu
      if (audiences.error && (audiences.error.name === 'restricted_api_key' || audiences.error.statusCode === 401)) {
        throw new Error('restricted_api_key');
      }

      let audienceId = '';
      let audienceList: any[] = [];
      if (audiences.data) {
        if (Array.isArray(audiences.data)) {
          audienceList = audiences.data;
        } else if (Array.isArray(audiences.data.data)) {
          audienceList = audiences.data.data;
        }
      }

      if (audienceList.length > 0) {
        audienceId = audienceList[0].id;
      } else {
        // Tự động tạo nhóm người nhận mặc định nếu chưa có
        const newAudience = await resend.audiences.create({ name: 'AgriSynthe Newsletter' });
        if (newAudience.error && (newAudience.error.name === 'restricted_api_key' || newAudience.error.statusCode === 401)) {
          throw new Error('restricted_api_key');
        }
        if (newAudience.data) {
          audienceId = newAudience.data.id;
        }
      }

      if (audienceId) {
        // 2. Thêm liên hệ vào danh sách người nhận (Audience)
        const contact = await resend.contacts.create({
          email: email,
          audienceId: audienceId,
        });

        if (contact.error) {
          const errorMsg = contact.error.message.toLowerCase();
          if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
            return NextResponse.json({ message: 'Email này đã đăng ký trước đó rồi!' }, { status: 200 });
          }
          throw new Error(contact.error.message);
        }
        isSubscribed = true;
      } else {
        throw new Error('Không thể khởi tạo hoặc tìm kiếm danh sách người nhận (Audience ID trống)');
      }
    } catch (err: any) {
      console.warn('[Subscribe API] RAG/Audience flow failed. Checking for email sending fallback...', err.message);
      
      // Xác định xem lỗi có phải do API Key bị giới hạn (chỉ được phép gửi mail) không
      const isRestricted = err.message === 'restricted_api_key' || 
                           err.message?.toLowerCase().includes('restricted') ||
                           err.message?.toLowerCase().includes('authorized') ||
                           err.message?.toLowerCase().includes('permission');
      
      if (isRestricted) {
        // Gói cứu trợ: Sử dụng chính quyền gửi email của khóa để tự động gửi thông báo đăng ký về cho Admin
        const fallbackEmail = await resend.emails.send({
          from: 'AgriSynthe <Agri@manhhuynh.work>',
          to: ['contact@manhhuynh.work'],
          subject: `[Đăng ký nhận tin] Độc giả mới: ${email}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2b1f13; line-height: 1.6;">
              <h3 style="color: #6b8e4e; border-bottom: 2px solid #6b8e4e; padding-bottom: 8px;">Độc giả mới đăng ký bản tin</h3>
              <p>Hệ thống nhận thấy khóa API Resend của bạn đang ở chế độ giới hạn <b>Chỉ gửi thư (Restricted)</b>, nên đã chuyển hướng đăng ký này thành một email thông báo bảo mật.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 120px;">Email độc giả:</td>
                  <td style="padding: 6px 0; font-size: 16px; color: #e8590c; font-weight: bold;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">Thời gian đăng ký:</td>
                  <td style="padding: 6px 0;">${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
                </tr>
              </table>
              
              <div style="background-color: #f4ecd8; border-left: 4px solid #6b8e4e; padding: 12px; border-radius: 4px; margin-top: 20px; font-size: 13px; color: #5c5346;">
                💡 <b>Mẹo cấu hình:</b> Để người dùng tự động lưu thẳng vào danh mục người nhận (Audience Contacts) trên trang Resend mà không cần gửi email thông báo thủ công như thế này, bạn hãy tạo một API Key mới và tích chọn quyền <b>Full Access</b> (Quyền truy cập đầy đủ) khi khởi tạo khóa trên Resend.
              </div>
            </div>
          `
        });

        if (!fallbackEmail.error) {
          fallbackUsed = true;
          isSubscribed = true;
        } else {
          console.error('[Subscribe API Fallback] Failed to send fallback email:', fallbackEmail.error);
        }
      }
      
      if (!isSubscribed) {
        return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống khi đăng ký' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: fallbackUsed 
        ? 'Đăng ký thành công! (Hệ thống đã ghi nhận email đăng ký của bạn)'
        : 'Đăng ký nhận bài viết thành công!' 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Subscribe API Outer Error:', error);
    return NextResponse.json({ error: error.message || 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
