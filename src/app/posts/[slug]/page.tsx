import { marked } from "marked";
import Link from "next/link";
import RelatedPosts from "@/components/RelatedPosts";
import ClientInteractions from "@/components/ClientInteractions";
import NewsletterSection from "@/components/NewsletterSection";
import FeedbackModal from "@/components/FeedbackModal";

interface PostData {
  title: string;
  description: string;
  image: string;
  categories: string[];
  dateString: string;
  readTime: string;
  difficulty?: string;
  author?: string;
  contentHtml: string;
  tags: string[];
}

export const revalidate = 60; // Tự động làm mới cache (ISR) sau mỗi 60 giây

const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://img.manhhuynh.work').replace(/\/$/, '');

async function getPostBySlug(slug: string): Promise<PostData | null> {
  try {
    const res = await fetch(`${publicUrl}/posts/${slug}.json`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    const data = await res.json();

    // Parse markdown sang HTML
    const cleanedContent = (data.content || '').replace(/<div class="diagram-card">([\s\S]*?)<\/div>/g, (match: string, svgContent: string) => {
      const cleanedSvg = svgContent
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join("\n");
      return `<div class="diagram-card">\n${cleanedSvg}\n</div>`;
    });

    const contentHtml = marked(cleanedContent) as string;

    return {
      title: data.title || slug,
      description: data.description || "",
      image: data.image || "/assets/images/favicon.svg",
      categories: data.categories || ["Hướng dẫn"],
      dateString: data.dateString || "",
      readTime: data.readTime || "5 phút",
      difficulty: data.difficulty,
      author: data.author || "AgriSynthe AI",
      contentHtml,
      tags: data.tags || [],
    };
  } catch (e) {
    console.error(`Error fetching post ${slug} from R2:`, e);
    return null;
  }
}

async function getAllPosts() {
  try {
    const res = await fetch(`${publicUrl}/posts-index.json`, {
      next: { revalidate: 60 }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Error fetching all posts for related section:", e);
  }
  return [];
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${publicUrl}/posts-index.json`, {
      next: { revalidate: 60 }
    });
    if (res.ok) {
      const posts = await res.json();
      return posts.map((p: any) => ({ slug: p.slug }));
    }
  } catch (e) {
    console.error("Error generating static params from R2:", e);
  }
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: "Không tìm thấy bài viết" };
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agri.manhhuynh.work').replace(/\/$/, '');
  const postUrl = `${siteUrl}/posts/${slug}`;
  const authorName = post.author || "AgriSynthe AI";

  let publishedTime: string | undefined = undefined;
  if (post.dateString) {
    const parts = post.dateString.split('/');
    if (parts.length === 3) {
      publishedTime = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`;
    }
  }

  return {
    title: `${post.title} — AgriSynthe`,
    description: post.description,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: postUrl,
      siteName: "AgriSynthe",
      locale: "vi_VN",
      type: "article",
      publishedTime,
      authors: [authorName],
      images: [
        {
          url: post.image.startsWith('http') ? post.image : `${siteUrl}${post.image}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.image.startsWith('http') ? post.image : `${siteUrl}${post.image}`],
      creator: "@AgriSynthe",
    },
    other: {
      "geo.region": "VN",
      "geo.placename": "Vietnam",
      "geo.position": "14.058324;108.277199",
      "ICBM": "14.058324, 108.277199",
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return (
      <div className="wrap" style={{ padding: "100px 0", textAlign: "center" }}>
        <h2>Không tìm thấy bài viết</h2>
        <p style={{ marginTop: "10px" }}>Đường dẫn bài viết không tồn tại hoặc đã bị xóa.</p>
        <Link href="/" className="author-contact-btn" style={{ marginTop: "20px", display: "inline-block" }}>
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const allPosts = await getAllPosts();
  const categoryName = post.categories && post.categories.length > 0 ? post.categories[0] : "Hướng dẫn";

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agri.manhhuynh.work').replace(/\/$/, '');
  const postUrl = `${siteUrl}/posts/${slug}`;
  const authorName = post.author || "AgriSynthe AI";

  let publishedTime: string | undefined = undefined;
  if (post.dateString) {
    const parts = post.dateString.split('/');
    if (parts.length === 3) {
      publishedTime = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`;
    }
  }

  return (
    <>
      {/* Schema.org TechArticle JSON-LD for AI Search & Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": post.title,
            "description": post.description,
            "image": [
              post.image.startsWith('http') ? post.image : `${siteUrl}${post.image}`
            ],
            "datePublished": publishedTime || post.dateString,
            "dateModified": publishedTime || post.dateString,
            "author": {
              "@type": "Person",
              "name": authorName
            },
            "publisher": {
              "@type": "Organization",
              "name": "AgriSynthe",
              "logo": {
                "@type": "ImageObject",
                "url": `${siteUrl}/assets/images/favicon.svg`
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": postUrl
            },
            "inLanguage": "vi-VN",
            "contentLocation": {
              "@type": "AdministrativeArea",
              "name": "Vietnam"
            }
          })
        }}
      />

      <div className="reading-progress-container">
        <div id="reading-progress" className="reading-progress-bar"></div>
      </div>

      {/* Post Hero Banner */}
      <div
        className="post-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(28, 25, 23, 0.65), rgba(28, 25, 23, 0.88)), url('${post.image}')`,
        }}
      >
        {/* Visually hidden img for Image SEO & indexing */}
        <img
          src={post.image}
          alt={post.title}
          style={{ display: "none" }}
          aria-hidden="true"
        />
        <div className="wrap post-hero-content">
          <div
            className="eyebrow"
            style={{
              color: "var(--ember)",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              letterSpacing: "0.15em",
              marginBottom: "15px",
            }}
          >
            {categoryName}
          </div>
          <h1
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(28px, 4.5vw, 46px)",
              lineHeight: 1.2,
              margin: "0 0 20px",
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            {post.title}
          </h1>

          <div
            className="post-meta-details"
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              justifyContent: "center",
              fontSize: "0.88rem",
              color: "rgba(255, 255, 255, 0.75)",
            }}
          >
            <span>
              Ngày đăng: <b style={{ color: "#ffffff" }}>{post.dateString}</b>
            </span>
            <span>
              Thời gian đọc: <b style={{ color: "#ffffff" }}>{post.readTime}</b>
            </span>
            {post.difficulty && (
              <span>
                Độ khó: <b style={{ color: "#ffffff" }}>{post.difficulty}</b>
              </span>
            )}
            {post.author && (
              <span>
                Tác giả: <b style={{ color: "#ffffff" }}>{post.author}</b>
              </span>
            )}
          </div>
        </div>
      </div>

      <article className="post-layout wrap">
        <div className="post-body">
          {/* TL;DR / Key Takeaways Box for AI Search & Human Readers */}
          {post.description && (
            <div
              className="post-tldr-box"
              style={{
                backgroundColor: "var(--bg-2)",
                borderLeft: "4px solid var(--ember)",
                padding: "20px",
                borderRadius: "6px",
                marginBottom: "30px",
                fontSize: "1rem",
                lineHeight: "1.6",
                color: "var(--char)",
              }}
            >
              <strong
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "8px",
                  color: "var(--ember)",
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                  letterSpacing: "0.05em",
                }}
              >
                <span>📌</span> Tóm tắt cốt lõi (Key Takeaways)
              </strong>
              <p style={{ margin: 0 }}>{post.description}</p>
            </div>
          )}

          {/* Post Content */}
          <div className="post-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

          {/* Share Buttons */}
          <div className="share-container">
            <span className="share-title">Chia sẻ hướng dẫn:</span>
            <div className="share-buttons">
              {/* Facebook Share */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn share-facebook"
                title="Chia sẻ lên Facebook"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>

              {/* Zalo Share */}
              <a
                href={`https://sp.zalo.me/share/share?url=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn share-zalo"
                title="Chia sẻ lên Zalo"
              >
                <span className="zalo-text">Zalo</span>
              </a>

              {/* Copy Link */}
              <button id="copy-link-btn" className="share-btn share-copy" title="Sao chép liên kết">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Sao chép link
              </button>
            </div>
          </div>

          {/* Related Posts */}
          <RelatedPosts
            currentSlug={slug}
            categories={post.categories}
            tags={post.tags}
            allPosts={allPosts}
          />
        </div>

        {/* Sticky Sidebar with Table of Contents */}
        <aside className="post-sidebar">
          <div className="sticky-sidebar">
            <button id="reading-mode-toggle" className="sidebar-action-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Chế độ đọc
            </button>
            <button id="ai-verify-sidebar-btn" className="sidebar-action-btn verify-btn" style={{ marginTop: "-12px", marginBottom: "24px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Kiểm chứng bằng AI
            </button>
            <div className="toc-card">
              <h4 className="toc-title">Mục lục bài viết</h4>
              <ul id="toc-list" className="toc-list">
                <li className="toc-item">
                  <a href="#">Đang nạp mục lục...</a>
                </li>
              </ul>
            </div>

            {/* Author Card */}
            <div className="author-card">
              <div className="author-avatar-container">
                <svg viewBox="0 0 100 100" className="author-avatar" aria-hidden="true">
                  <circle cx="50" cy="50" r="48" fill="var(--bg-2)" stroke="var(--char)" strokeWidth="2" />
                  <path d="M20 70 Q50 60 80 70 A35 35 0 0 1 20 70" fill="var(--line)" />
                  <path d="M50 72 L50 40" stroke="var(--char)" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M50 48 Q35 38 48 35 Q50 42 50 48" fill="var(--char)" />
                  <path d="M50 56 Q65 48 52 42 Q50 50 50 56" fill="var(--char-dim)" />
                  <circle cx="75" cy="25" r="6" fill="var(--ember)" opacity="0.8" />
                </svg>
              </div>

              <div className="author-info">
                <h4 className="author-name">{post.author}</h4>
                <p className="author-bio">
                  Sáng kiến chia sẻ các thiết kế kỹ thuật tự chế và phương pháp nông nghiệp sinh thái tuần hoàn, phi lợi
                  nhuận hướng tới cộng đồng.
                </p>
                <a href="#" className="author-contact-btn" id="open-feedback-btn">
                  Gửi thư đóng góp
                </a>
              </div>
            </div>
          </div>
        </aside>
      </article>

      {/* Floating Action Button for Mobile */}
      <button id="reading-mode-floating" className="reading-mode-floating" title="Bật chế độ đọc">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </button>

      {/* Floating Reader Controls Panel */}
      <div id="reader-controls" className="reader-controls">
        <div className="reader-controls-wrap">
          <button id="reader-close" className="reader-ctrl-btn exit">Thoát chế độ đọc</button>
          <div className="reader-divider"></div>
          <button id="reader-font-dec" className="reader-ctrl-btn font-size-btn" title="Giảm cỡ chữ">A-</button>
          <button id="reader-font-inc" className="reader-ctrl-btn font-size-btn" title="Tăng cỡ chữ">A+</button>
          <div className="reader-divider"></div>
          <button id="reader-theme-default" className="reader-theme-btn" title="Chế độ màu mặc định">Mặc định</button>
          <button id="reader-theme-sepia" className="reader-theme-btn sepia" title="Chế độ màu giấy úa">Giấy úa</button>
          <button id="reader-theme-dark" className="reader-theme-btn dark" title="Chế độ màu tối đen">Tối đen</button>
        </div>
      </div>

      {/* Newsletter signup under the article layout */}
      <div className="wrap" style={{ paddingBottom: "60px", marginTop: "40px" }}>
        <NewsletterSection />
      </div>

      <FeedbackModal />

      {/* Client Side Interactions Activator */}
      <ClientInteractions />
    </>
  );
}
