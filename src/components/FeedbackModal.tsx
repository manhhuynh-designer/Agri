"use client";

import { useState, useEffect } from "react";

export default function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      document.body.style.overflow = "hidden";
    };
    window.addEventListener("open-feedback-modal", handleOpen);
    return () => {
      window.removeEventListener("open-feedback-modal", handleOpen);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    document.body.style.overflow = "";
    setName("");
    setEmail("");
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = message.trim();
    if (!cleanMsg) return;

    setLoading(true);

    const triggerToast = (msg: string, isSuccess: boolean = true) => {
      const toastEl = document.getElementById("toast-notification");
      if (toastEl) {
        toastEl.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor" style="width:20px;height:20px;color:${isSuccess ? 'var(--char)' : 'var(--ember)'}">
            ${isSuccess 
              ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>'
              : '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>'
            }
          </svg>
          <span>${msg}</span>
        `;
        toastEl.classList.add("show");
        setTimeout(() => toastEl.classList.remove("show"), 4000);
      }
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: cleanMsg,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        triggerToast(data.message || "Gửi ý kiến đóng góp thành công!");
        handleClose();
      } else {
        triggerToast(data.error || "Gửi góp ý thất bại, vui lòng thử lại.", false);
      }
    } catch (err) {
      console.error('Feedback Submit Error:', err);
      triggerToast("Không thể kết nối máy chủ.", false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="verify-modal-overlay active"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{ zIndex: 1100 }}
    >
      <div className="verify-modal-card" style={{ maxWidth: "500px" }}>
        <div className="verify-modal-header" style={{ borderBottom: "1px solid var(--line)", padding: "16px 20px" }}>
          <div className="verify-header-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: "20px", height: "20px", color: "var(--ember)", marginRight: "8px" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h4 style={{ margin: 0, fontSize: "16px", fontFamily: "'Archivo', sans-serif" }}>
              Gửi ý kiến đóng góp & phản hồi
            </h4>
          </div>
          <button
            onClick={handleClose}
            className="verify-modal-close"
            aria-label="Đóng"
            style={{ background: "none", border: "none", color: "var(--ash)", fontSize: "28px", cursor: "pointer", lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <div className="verify-modal-body" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "13px", color: "var(--ash-dim)", margin: 0, lineHeight: 1.5 }}>
              Mọi ý kiến đóng góp của bạn về tài liệu, bản dịch hoặc kỹ thuật thực nghiệm đều vô cùng quý giá để cải thiện thư viện.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="feedback-name" style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--ash)" }}>
                Họ và tên (Tùy chọn)
              </label>
              <input
                id="feedback-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "var(--char)",
                  fontSize: "13.5px"
                }}
                disabled={loading}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="feedback-email" style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--ash)" }}>
                Địa chỉ email (Tùy chọn)
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="de-an@nongnghiep.vn"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "var(--char)",
                  fontSize: "13.5px"
                }}
                disabled={loading}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="feedback-message" style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--ash)" }}>
                Nội dung góp ý <span style={{ color: "var(--ember)" }}>*</span>
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập nội dung góp ý hoặc phát hiện lỗi khoa học tại đây..."
                rows={4}
                required
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "var(--char)",
                  fontSize: "13.5px",
                  resize: "vertical",
                  lineHeight: 1.5
                }}
                disabled={loading}
              />
            </div>
          </div>
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--line)",
              background: "var(--bg)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "none",
                border: "1px solid var(--line)",
                borderRadius: "6px",
                padding: "8px 16px",
                color: "var(--ash)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer"
              }}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{
                background: "var(--ember)",
                border: "none",
                borderRadius: "6px",
                padding: "8px 20px",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer"
              }}
              disabled={loading}
            >
              {loading ? "Đang gửi..." : "Gửi góp ý"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
