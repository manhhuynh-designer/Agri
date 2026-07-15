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

    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    // 1. Lấy danh sách Audience hiện tại
    const audiences = (await resend.audiences.list()) as any;
    let audienceId = '';

    if (audiences.data && audiences.data.length > 0) {
      audienceId = audiences.data[0].id;
    } else {
      // Tự động tạo nhóm người nhận mặc định nếu chưa có
      const newAudience = await resend.audiences.create({ name: 'AgriSynthe Newsletter' });
      if (newAudience.data) {
        audienceId = newAudience.data.id;
      }
    }

    if (!audienceId) {
      return NextResponse.json({ error: 'Không thể khởi tạo danh sách người nhận' }, { status: 500 });
    }

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
      return NextResponse.json({ error: contact.error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Đăng ký nhận bài viết thành công!' }, { status: 200 });
  } catch (error: any) {
    console.error('Subscribe API Error:', error);
    return NextResponse.json({ error: error.message || 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
