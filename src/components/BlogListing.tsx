"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

const tagMapping: Record<string, string> = {
  "cai-tao-dat": "Cải tạo đất",
  "biochar": "Biochar",
  "giam-go": "Giấm gỗ",
  "u-phan": "Ủ phân",
  "tuan-hoan": "Tuần hoàn",
  "dinh-duong": "Dinh dưỡng",
  "vi-sinh": "Vi sinh",
  "huu-co": "Hữu cơ",
  "bao-ve-thuc-vat": "Bảo vệ thực vật",
  "sinh-thai-hoc": "Sinh thái học",
  "tu-che": "Tự chế",
  "than-sinh-hoc": "Than sinh học",
  "kieu-lo-retort": "Lò Retort",
  "ben-vung": "Bền vững",
  "ben-vung-hon": "Bền vững",
  "bến vững": "Bền vững",
  "quyen": "Quyển",
  "permaculture": "Permaculture",
  "dinh dưỡng": "Dinh dưỡng",
  "vi sinh": "Vi sinh",
  "rau sạch": "Rau sạch",
  "vườn rừng": "Vườn rừng",
  "bền vững": "Bền vững",
  "thiết kế vườn": "Thiết kế vườn",
  "đất đai": "Đất đai",
  "thiên địch": "Thiên địch",
  "côn trùng có lợi": "Côn trùng có lợi",
  "nông nghiệp quy mô nhỏ": "Nông nghiệp quy mô nhỏ",
  "khởi nghiệp": "Khởi nghiệp",
  "kinh tế nông nghiệp": "Kinh tế nông nghiệp",
  "hộ gia đình": "Hộ gia đình",
  "ủ phân": "Ủ phân",
  "canh tác sinh thái": "Canh tác sinh thái",
  "kỹ thuật": "Kỹ thuật",
  "chăn nuôi hữu cơ": "Chăn nuôi hữu cơ",
  "tái chế chất thải": "Tái chế chất thải",
  "mô hình bền vững": "Mô hình bền vững",
  "năng lượng sạch": "Năng lượng sạch",
  "công nghệ sinh học": "Công nghệ sinh học",
  "vi sinh hữu ích": "Vi sinh hữu ích",
  "thực nghiệm": "Thực nghiệm",
  "canh tác tự nhiên": "Canh tác tự nhiên",
  "rau sach": "Rau sạch",
  "vac": "VAC",
};

const normalizeTag = (tag: string): string => {
  const trimmed = tag.trim();
  const lower = trimmed.toLowerCase();
  if (tagMapping[lower]) {
    return tagMapping[lower];
  }
  if (/^[a-z0-9-]+$/.test(trimmed)) {
    return trimmed
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

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
  const [pageSize, setPageSize] = useState(6);
  const [showAllTags, setShowAllTags] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Extract and normalize unique tags from initialPosts dynamically
  const { allTags, popularTags } = useMemo(() => {
    const frequency: Record<string, number> = {};
    initialPosts.forEach((post) => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          if (tag && tag.trim()) {
            const normalized = normalizeTag(tag);
            frequency[normalized] = (frequency[normalized] || 0) + 1;
          }
        });
      }
    });

    const sortedTags = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
      .map(([tag]) => tag);

    return {
      allTags: sortedTags,
      popularTags: sortedTags.slice(0, 10), // Top 10 most common tags
    };
  }, [initialPosts]);

  // Compute displayed tags: Top 10 + active tag if it's not in Top 10
  const displayedTags = useMemo(() => {
    const base = showAllTags ? allTags : popularTags;
    if (activeTag !== "all" && !base.map(t => t.toLowerCase()).includes(activeTag.toLowerCase())) {
      const matchingTag = allTags.find(t => t.toLowerCase() === activeTag.toLowerCase());
      if (matchingTag) {
        return [...base, matchingTag];
      }
    }
    return base;
  }, [showAllTags, allTags, popularTags, activeTag]);

  // Restore saved preferences on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("blog-layout");
    if (savedLayout === "list") {
      setLayout("list");
    }

    const savedSearch = localStorage.getItem("blog-search") || "";
    const savedTag = localStorage.getItem("blog-tag") || "all";
    const savedSort = localStorage.getItem("blog-sort") || "newest";
    const savedPageSize = parseInt(localStorage.getItem("blog-pageSize") || "6") || 6;
    const savedPage = parseInt(localStorage.getItem("blog-page") || "1") || 1;

    setSearchQuery(savedSearch);
    setActiveTag(savedTag);
    setCurrentSort(savedSort);
    setPageSize(savedPageSize);
    setCurrentPage(savedPage);
    setIsInitialized(true);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("blog-search", searchQuery);
      localStorage.setItem("blog-tag", activeTag);
      localStorage.setItem("blog-sort", currentSort);
      localStorage.setItem("blog-pageSize", pageSize.toString());
    }
  }, [searchQuery, activeTag, currentSort, pageSize, isInitialized]);

  // Filter and Sort posts
  const filteredAndSortedPosts = useMemo(() => {
    // 1. Filter
    let result = initialPosts.filter((post) => {
      const matchesTag =
        activeTag === "all" ||
        post.tags.map((t) => normalizeTag(t).toLowerCase()).includes(activeTag.toLowerCase());

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

  // Reset to page 1 whenever filters or page size change (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      setCurrentPage(1);
      localStorage.setItem("blog-page", "1");
    }
  }, [searchQuery, activeTag, currentSort, pageSize, isInitialized]);

  // Pagination calculations
  const totalItems = filteredAndSortedPosts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  const displayedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedPosts.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedPosts, currentPage, pageSize]);

  const handleLayoutChange = (newLayout: "grid" | "list") => {
    setLayout(newLayout);
    localStorage.setItem("blog-layout", newLayout);
  };

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum);
    localStorage.setItem("blog-page", pageNum.toString());
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
          {displayedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`filter-btn ${activeTag.toLowerCase() === tag.toLowerCase() ? "active" : ""}`}
            >
              {tag}
            </button>
          ))}
          {allTags.length > 10 && (
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              className="filter-btn toggle-all-tags-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "transparent",
                borderColor: "var(--line)",
                color: "var(--ember)",
                fontWeight: "600",
              }}
            >
              {showAllTags ? "Thu gọn ▲" : `Xem thêm (+${allTags.length - 10}) ▼`}
            </button>
          )}
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

          <div className="sort-box" style={{ marginLeft: "8px" }}>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="sort-select"
              aria-label="Số lượng bài hiển thị"
              style={{ minWidth: "110px" }}
            >
              <option value="6">Xem 6 bài</option>
              <option value="12">Xem 12 bài</option>
              <option value="24">Xem 24 bài</option>
              <option value="999">Xem tất cả</option>
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
