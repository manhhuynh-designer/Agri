"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ClientInteractions() {
  const pathname = usePathname();

  useEffect(() => {
    // 1. Reading progress bar
    const progressBar = document.getElementById("reading-progress");
    const article = document.querySelector(".post-body") as HTMLElement;

    const handleScrollProgress = () => {
      if (!progressBar || !article) return;
      const rect = article.getBoundingClientRect();
      const articleHeight = article.offsetHeight;
      const viewportHeight = window.innerHeight;
      let scrolled = 0;

      if (rect.top < 0) {
        const totalScrollableDistance = articleHeight - viewportHeight;
        scrolled = Math.min(100, Math.max(0, (-rect.top / totalScrollableDistance) * 100));
      }
      progressBar.style.width = `${scrolled}%`;
    };

    window.addEventListener("scroll", handleScrollProgress);

    // 2. Table of Contents generation
    const tocList = document.getElementById("toc-list");
    const headings = document.querySelectorAll(".post-content h2");

    if (tocList && headings.length > 0) {
      tocList.innerHTML = ""; // Clear loader placeholder
      
      const observerOptions = {
        root: null,
        rootMargin: "-10% 0px -75% 0px",
        threshold: 0,
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const activeItem = tocList.querySelector(`[data-target="${id}"]`);
            tocList.querySelectorAll(".toc-item").forEach((item) => {
              item.classList.remove("active");
            });
            if (activeItem) {
              activeItem.classList.add("active");
            }
          }
        });
      }, observerOptions);

      headings.forEach((item, index) => {
        const text = item.textContent || "";
        const sectionId = item.id || `section-${index + 1}`;
        item.id = sectionId;

        const li = document.createElement("li");
        li.className = "toc-item";
        li.setAttribute("data-target", sectionId);

        const a = document.createElement("a");
        a.href = `#${sectionId}`;
        a.textContent = text.replace(/^[#\s]+/, ""); // strip markdown hashes

        li.appendChild(a);
        tocList.appendChild(li);
        observer.observe(item);
      });
    }

    // 3. Image/SVG Lightbox Zoom
    const diagrams = document.querySelectorAll(".post-content svg, .post-content img");
    let overlay = document.getElementById("lightbox-overlay");

    if (!overlay && diagrams.length > 0) {
      overlay = document.createElement("div");
      overlay.id = "lightbox-overlay";
      overlay.className = "lightbox-overlay";
      overlay.innerHTML = `
        <button class="lightbox-close" aria-label="Đóng">&times;</button>
        <div class="lightbox-content"></div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.id === "lightbox-overlay" || target.classList.contains("lightbox-close")) {
          overlay?.classList.remove("active");
          document.body.style.overflow = "";
        }
      });
    }

    const contentContainer = overlay?.querySelector(".lightbox-content");

    diagrams.forEach((item) => {
      (item as HTMLElement).style.cursor = "zoom-in";
      item.setAttribute("title", "Nhấn để phóng to sơ đồ kỹ thuật");

      const handleZoom = () => {
        if (!contentContainer || !overlay) return;
        contentContainer.innerHTML = "";
        const clone = item.cloneNode(true) as HTMLElement;
        clone.style.cursor = "default";
        clone.removeAttribute("title");
        contentContainer.appendChild(clone);
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
      };

      item.addEventListener("click", handleZoom);
    });

    // 4. Alert boxes formatter
    const blockquotes = document.querySelectorAll(".post-content blockquote");
    blockquotes.forEach((bq) => {
      const textContent = bq.textContent || "";
      if (textContent.includes("[!WARNING]")) {
        bq.classList.add("ai-alert-box", "warning");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!WARNING\]/g, "")
          .replace(/⚠️/g, "")
          .replace(/Lưu ý:/g, "<strong>⚠️ Lưu ý:</strong>")
          .trim();
      } else if (textContent.includes("[!NOTE]")) {
        bq.classList.add("ai-alert-box", "note");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!NOTE\]/g, "")
          .replace(/ℹ/g, "")
          .replace(/Ghi chú:/g, "<strong>ℹ️ Ghi chú:</strong>")
          .trim();
      } else if (textContent.includes("[!TIP]")) {
        bq.classList.add("ai-alert-box", "tip");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!TIP\]/g, "")
          .replace(/💡/g, "")
          .replace(/Mách nhỏ:/g, "<strong>💡 Mách nhỏ:</strong>")
          .replace(/Gợi ý:/g, "<strong>💡 Gợi ý:</strong>")
          .trim();
      }
    });

    // 5. Copy Link Button with Toast Notification
    const copyBtn = document.getElementById("copy-link-btn");
    const toast = document.getElementById("toast-notification");

    const showToast = (message: string) => {
      if (!toast) return;
      toast.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor" style="width:20px;height:20px;color:var(--char)">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <span>${message}</span>
      `;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 4000);
    };

    const handleCopy = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url)
        .then(() => showToast("Đã sao chép liên kết thành công!"))
        .catch(() => {
          const input = document.createElement("input");
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          document.body.removeChild(input);
          showToast("Đã sao chép liên kết thành công!");
        });
    };

    if (copyBtn) {
      copyBtn.addEventListener("click", handleCopy);
    }

    // 6. Mermaid.js dynamic diagram compiler
    const mermaidElements = document.querySelectorAll(".mermaid");
    if (mermaidElements.length > 0) {
      import("mermaid").then((m) => {
        const mermaid = m.default;
        const isDark = document.documentElement.getAttribute("data-theme") !== "light";
        
        // Clean each element to strip any markdown-injected <pre><code> tags and decode entities
        mermaidElements.forEach((el) => {
          el.textContent = el.textContent || "";
        });

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "neutral",
          securityLevel: "loose",
        });
        
        // Render each block manually using mermaid.run to avoid DOM ID conflicts
        mermaid.run({
          querySelector: ".mermaid"
        }).catch((err) => {
          console.warn("Mermaid.js compilation failed:", err);
        });
      });
    }

    // Cleanup listeners
    return () => {
      window.removeEventListener("scroll", handleScrollProgress);
      if (copyBtn) {
        copyBtn.removeEventListener("click", handleCopy);
      }
    };
  }, [pathname]);

  return null; // Side-effect only component
}
