"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Footer() {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScroll(true);
      } else {
        setShowScroll(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-links">
            <Link href="/">Trang Chủ</Link>
            <Link href="/about">Giới Thiệu</Link>
            <Link href="/sources">Tài liệu AI tham khảo</Link>
          </div>
          <div>
            AgriSynthe &bull; Thư viện số tự động tổng hợp tri thức nông nghiệp tuần hoàn và sinh thái hữu cơ bởi AI.
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`back-to-top ${showScroll ? "show" : ""}`}
        aria-label="Cuộn về đầu trang"
        style={{
          display: showScroll ? "flex" : "none",
          opacity: showScroll ? 1 : 0,
          pointerEvents: showScroll ? "auto" : "none"
        }}
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Toast Notification Container */}
      <div id="toast-notification" className="toast"></div>
    </>
  );
}
