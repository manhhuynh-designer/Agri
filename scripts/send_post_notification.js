/**
 * send_post_notification.js
 * Script riêng biệt gửi email thông báo bài viết mới cho subscriber.
 * Chỉ được gọi SAU KHI git push thành công.
 * Đọc thông tin từ _data/pending_notification.json, gửi email, rồi xóa file tạm.
 */
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  });
}

const pendingPath = path.join(__dirname, '..', '_data', 'pending_notification.json');

async function main() {
  // 1. Kiểm tra file pending
  if (!fs.existsSync(pendingPath)) {
    console.log('[Email] Không có bài viết mới cần thông báo (pending_notification.json không tồn tại).');
    process.exit(0);
  }

  const notification = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
  console.log(`[Email] Đang gửi thông báo cho bài: "${notification.title}"`);

  // 2. Lấy API key
  const rawKey = process.env.RESEND_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^['"]|['"]$/g, '');
  if (!apiKey) {
    console.warn('[Email] Skipped: RESEND_API_KEY not found.');
    process.exit(0);
  }

  // 3. Gửi email
  const { Resend } = require('resend');
  const resend = new Resend(apiKey);
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const audiences = await resend.audiences.list();

  if (audiences.error && (audiences.error.name === 'restricted_api_key' || audiences.error.statusCode === 401)) {
    console.warn('[Email] Skipped: API Key is restricted.');
    process.exit(0);
  }

  let audienceList = [];
  if (audiences.data) {
    audienceList = Array.isArray(audiences.data) ? audiences.data : (audiences.data.data || []);
  }

  if (audienceList.length === 0) {
    console.warn('[Email] Skipped: No audience list found.');
    process.exit(0);
  }

  const audienceId = audienceList[0].id;
  await sleep(1000);

  const contacts = await resend.contacts.list({ audienceId });
  if (contacts.error) {
    console.warn('[Email] Skipped: Failed to fetch contacts:', contacts.error.message);
    process.exit(0);
  }

  let contactsList = [];
  if (contacts.data) {
    contactsList = Array.isArray(contacts.data) ? contacts.data : (contacts.data.data || []);
  }

  if (contactsList.length === 0) {
    console.log('[Email] No subscribers found. Skipped.');
    // Xóa file pending dù không gửi
    fs.unlinkSync(pendingPath);
    process.exit(0);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agri.manhhuynh.work';
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2b1f13; line-height: 1.6;">
      <div style="background-color: #6b8e4e; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: sans-serif;">AgriSynthe Journal</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #dcd3c1; border-top: none; border-radius: 0 0 8px 8px; background-color: #fdfbf7;">
        <p style="font-size: 15px;">Xin chào độc giả,</p>
        <p style="font-size: 15px;">Chúng tôi xin gửi tới bạn ấn phẩm nghiên cứu nông nghiệp tuần hoàn sinh thái mới nhất vừa được xuất bản:</p>
        
        <div style="background-color: #f4ecd8; padding: 16px; border-left: 4px solid #e8590c; border-radius: 4px; margin: 20px 0;">
          <h2 style="color: #e8590c; margin: 0 0 8px 0; font-size: 18px;">${notification.title}</h2>
          <p style="margin: 0; font-style: italic; color: #5c5346; font-size: 14px;">
            "${notification.description}"
          </p>
        </div>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${siteUrl}/posts/${notification.slug}" style="background-color: #e8590c; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 15px;">
            Đọc bài viết chi tiết
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #dcd3c1; margin: 24px 0;" />
        
        <footer style="font-size: 12px; color: #8a7c6a; text-align: center; line-height: 1.5;">
          Thư này được gửi tự động vì bạn đã đăng ký nhận tin tại AgriSynthe.<br />
          &copy; 2026 AgriSynthe. Mọi quyền được bảo lưu.<br />
          <a href="${siteUrl}" style="color: #6b8e4e; text-decoration: underline;">Trang chủ blog</a>
        </footer>
      </div>
    </div>
  `;

  const batchData = contactsList.map(c => ({
    from: 'AgriSynthe <Agri@manhhuynh.work>',
    to: c.email,
    subject: `[Bài viết mới] ${notification.title}`,
    html: emailHtml
  }));

  await sleep(1000);

  console.log(`[Email] Sending to ${batchData.length} subscribers...`);
  const batchResponse = await resend.batch.send(batchData);
  if (batchResponse.error) {
    console.error('[Email] Batch send failed:', batchResponse.error);
  } else {
    console.log('[Email] ✅ Successfully sent email notifications!');
    // 4. Xóa file pending để tránh gửi lại
    fs.unlinkSync(pendingPath);
    console.log('[Email] Đã xóa pending_notification.json để tránh gửi trùng.');
  }
}

main().catch(err => {
  console.error('[Email] Fatal error:', err);
  process.exit(1);
});
