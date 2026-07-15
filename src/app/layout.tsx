import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "AgriSynthe — Thư viện số nông nghiệp tuần hoàn sinh thái",
  description: "Hệ thống tự động tổng hợp, chắt lọc và biên soạn kiến thức nông nghiệp hữu cơ bền vững từ các tài liệu khoa học bởi Trí tuệ Nhân tạo (AI).",
  icons: {
    icon: "/assets/images/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC (Flash of Unstyled Content) script for light/dark theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                  if (savedTheme === 'light' || (!savedTheme && systemPrefersLight)) {
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.removeAttribute('data-theme');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
