"use client";

import { useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

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
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        triggerToast(data.message || "Đăng ký nhận bài viết thành công!");
        setEmail("");
      } else {
        triggerToast(data.error || "Có lỗi xảy ra, vui lòng thử lại.", false);
      }
    } catch (err) {
      console.error('Subscribe Error:', err);
      triggerToast("Không thể kết nối máy chủ.", false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="newsletter-section">
      <div className="newsletter-container">
        <h2>Đăng ký nhận bài viết mới</h2>
        <p>
          Nhận các nghiên cứu, hướng dẫn kỹ thuật nông nghiệp tuần hoàn sinh thái sớm nhất được biên soạn bởi AI.
        </p>
        <form onSubmit={handleSubmit} className="newsletter-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Địa chỉ email của bạn..."
            required
            disabled={loading}
            aria-label="Địa chỉ email"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng ký nhận tin"}
          </button>
        </form>
      </div>
    </section>
  );
}
