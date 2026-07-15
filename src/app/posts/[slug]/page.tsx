import fs from "fs";
import path from "path";
import matter from "gray-matter";
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

function getPostBySlug(slug: string): PostData | null {
  const postsDirectory = path.join(process.cwd(), "_posts");
  if (!fs.existsSync(postsDirectory)) return null;
  
  const filenames = fs.readdirSync(postsDirectory);
  const matchedFilename = filenames.find(
    (name) => name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "") === slug
  );

  if (!matchedFilename) return null;

  const filePath = path.join(postsDirectory, matchedFilename);
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  const dateMatch = matchedFilename.match(/^(\d{4}-\d{2}-\d{2})/);
  const dateString = dateMatch ? dateMatch[1] : "";
  
  let formattedDate = "";
  if (dateString) {
    const [year, month, day] = dateString.split("-");
    formattedDate = `${day}/${month}/${year}`;
  }

  // Parse markdown to HTML
  const contentHtml = marked(content) as string;

  return {
    title: data.title || slug,
    description: data.description || "",
    image: data.image || "/assets/images/favicon.svg",
    categories: Array.isArray(data.categories) 
      ? data.categories 
      : data.category 
        ? [data.category] 
        : ["Hướng dẫn"],
    dateString: formattedDate,
    readTime: data.read_time || "5 phút",
    difficulty: data.difficulty,
    author: data.author || "AgriSynthe AI",
    contentHtml,
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

function getAllPosts() {
  const postsDirectory = path.join(process.cwd(), "_posts");
  if (!fs.existsSync(postsDirectory)) return [];
  const filenames = fs.readdirSync(postsDirectory);
  
  return filenames
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => {
      const filePath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);
      const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
      const dateString = dateMatch ? dateMatch[1] : "";
      
      let formattedDate = "";
      if (dateString) {
        const [year, month, day] = dateString.split("-");
        formattedDate = `${day}/${month}/${year}`;
      }

      return {
        slug,
        title: data.title || slug,
        description: data.description || "",
        dateString: formattedDate,
        categories: Array.isArray(data.categories) 
          ? data.categories 
          : data.category 
            ? [data.category] 
            : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    });
}

export async function generateStaticParams() {
  const postsDirectory = path.join(process.cwd(), "_posts");
  if (!fs.existsSync(postsDirectory)) return [];
  const filenames = fs.readdirSync(postsDirectory);
  return filenames.map((filename) => {
    const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    return { slug };
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Không tìm thấy bài viết" };
  }
  return {
    title: `${post.title} — AgriSynthe`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: [post.image],
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

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

  const allPosts = getAllPosts();
  const categoryName = post.categories && post.categories.length > 0 ? post.categories[0] : "Hướng dẫn";

  return (
    <>
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
          {/* Post Content */}
          <div className="post-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

          {/* Share Buttons */}
          <div className="share-container">
            <span className="share-title">Chia sẻ hướng dẫn:</span>
            <div className="share-buttons">
              {/* Facebook Share */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=https://manhhuynh-designer.github.io/posts/${slug}`}
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
                href={`https://sp.zalo.me/share/share?url=https://manhhuynh-designer.github.io/posts/${slug}`}
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
