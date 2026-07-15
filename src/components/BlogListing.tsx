"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  description: string;
  dateString: string;
  rawDate: string;
  timestamp: number;
  categories: string[];
  tags: string[];
  readTime: number;
}

interface BlogListingProps {
  initialPosts: Post[];
}

export default function BlogListing({ initialPosts }: BlogListingProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [currentSort, setCurrentSort] = useState("newest");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Restore saved layout preference on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("blog-layout");
    if (savedLayout === "list") {
      setLayout("list");
    }
  }, []);

  // Filter and Sort posts
  const filteredAndSortedPosts = useMemo(() => {
    // 1. Filter
    let result = initialPosts.filter((post) => {
      const matchesTag =
        activeTag === "all" ||
        post.tags.map((t) => t.toLowerCase()).includes(activeTag.toLowerCase());

      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTag && matchesSearch;
    });

    // 2. Sort
    result.sort((a, b) => {
      if (currentSort === "newest") {
        return b.timestamp - a.timestamp;
      } else if (currentSort === "oldest") {
        return a.timestamp - b.timestamp;
      } else if (currentSort === "time-asc") {
        return a.readTime - b.readTime;
      } else if (currentSort === "time-desc") {
        return b.readTime - a.readTime;
      }
      return 0;
    });

    return result;
  }, [initialPosts, searchQuery, activeTag, currentSort]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTag, currentSort]);

  // Pagination calculations
  const totalItems = filteredAndSortedPosts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  const displayedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedPosts.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedPosts, currentPage]);

  const handleLayoutChange = (newLayout: "grid" | "list") => {
    setLayout(newLayout);
    localStorage.setItem("blog-layout", newLayout);
  };

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum);
    window.scrollTo({
      top: 500, // Scroll past the hero banner
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* Filter controls and Search */}
      <div className="blog-controls">
        <div className="filter-tags">
          <button
            onClick={() => setActiveTag("all")}
            className={`filter-btn ${activeTag === "all" ? "active" : ""}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTag("tu-che")}
            className={`filter-btn ${activeTag === "tu-che" ? "active" : ""}`}
          >
            Tự chế thiết bị
          </button>
          <button
            onClick={() => setActiveTag("cai-tao-dat")}
            className={`filter-btn ${activeTag === "cai-tao-dat" ? "active" : ""}`}
          >
            Cải tạo đất
          </button>
          <button
            onClick={() => setActiveTag("biochar")}
            className={`filter-btn ${activeTag === "biochar" ? "active" : ""}`}
          >
            Than sinh học
          </button>
          <button
            onClick={() => setActiveTag("giam-go")}
            className={`filter-btn ${activeTag === "giam-go" ? "active" : ""}`}
          >
            Giấm gỗ
          </button>
        </div>

        <div className="controls-toolbar">
          <div className="search-box">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết..."
            />
          </div>

          <div className="sort-box">
            <select
              value={currentSort}
              onChange={(e) => setCurrentSort(e.target.value)}
              className="sort-select"
              aria-label="Sắp xếp bài viết"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="time-asc">Thời gian đọc: Ngắn &rarr; Dài</option>
              <option value="time-desc">Thời gian đọc: Dài &rarr; Ngắn</option>
            </select>
          </div>

          <div className="layout-toggle">
            <button
              onClick={() => handleLayoutChange("grid")}
              className={`layout-btn ${layout === "grid" ? "active" : ""}`}
              title="Xem dạng lưới"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => handleLayoutChange("list")}
              className={`layout-btn ${layout === "list" ? "active" : ""}`}
              title="Xem dạng danh sách"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path
                  fillRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Post Grid */}
      <div className={`posts-grid ${layout === "list" ? "list-view" : ""}`}>
        {displayedPosts.map((post) => {
          const categoryName = post.categories && post.categories.length > 0 ? post.categories[0] : "Chung";
          return (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="post-card">
              <div className="post-card-body">
                <div className="post-card-meta">
                  <span className="post-card-tag">{categoryName}</span>
                  <span>&bull;</span>
                  <span>{post.dateString}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <div className="post-card-footer">
                  Đọc chi tiết bài viết
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty State */}
      {totalItems === 0 && (
        <div id="empty-state" className="empty-state" style={{ textAlign: "center", padding: "60px 0", color: "var(--ash-dim)" }}>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            width="48"
            height="48"
            style={{ color: "var(--line)", marginBottom: "16px", marginLeft: "auto", marginRight: "auto", display: "block" }}
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5L6.8 11.2a1 1 0 101.733 1L9 11.536V14a1 1 0 102 0v-2.464l.467.264a1 1 0 101.733-1L10.867 7.5A1 1 0 0010 7z"
              clipRule="evenodd"
            />
          </svg>
          <p style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "6px" }}>Không tìm thấy bài viết nào phù hợp.</p>
          <p style={{ fontSize: "0.9rem" }}>Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
        </div>
      )}

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div id="pagination-controls" className="pagination-container" style={{ display: "flex" }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pag-btn prev"
          >
            &larr; Trang trước
          </button>
          <div className="pag-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`pag-page-num ${pageNum === currentPage ? "active" : ""}`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pag-btn next"
          >
            Trang sau &rarr;
          </button>
        </div>
      )}
    </>
  );
}
