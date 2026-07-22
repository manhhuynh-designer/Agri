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

    // 3. Image/SVG Lightbox Zoom using Event Delegation
    let overlay = document.getElementById("lightbox-overlay");

    if (!overlay) {
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

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Target any image or SVG inside post-content, excluding elements inside the lightbox overlay itself
      const zoomable = target.closest(".post-content img, .post-content svg");
      if (zoomable && !target.closest("#lightbox-overlay")) {
        if (!contentContainer || !overlay) return;
        contentContainer.innerHTML = "";
        const clone = zoomable.cloneNode(true) as HTMLElement;
        clone.style.cursor = "default";
        clone.removeAttribute("title");
        contentContainer.appendChild(clone);
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    };

    document.addEventListener("click", handleGlobalClick);

    // 4. Alert boxes formatter (GitHub Callout syntax)
    const blockquotes = document.querySelectorAll(".post-content blockquote");
    blockquotes.forEach((bq) => {
      const textContent = bq.textContent || "";
      if (textContent.includes("[!IMPORTANT]")) {
        bq.classList.add("ai-alert-box", "important");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!IMPORTANT\]/g, "")
          .trim();
        if (!bq.querySelector(".alert-header")) {
          bq.innerHTML = `<div class="alert-header" style="font-weight:700;margin-bottom:6px;color:var(--ember);display:flex;align-items:center;gap:6px;">📌 LƯU Ý QUAN TRỌNG</div>` + bq.innerHTML;
        }
      } else if (textContent.includes("[!WARNING]")) {
        bq.classList.add("ai-alert-box", "warning");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!WARNING\]/g, "")
          .trim();
        if (!bq.querySelector(".alert-header")) {
          bq.innerHTML = `<div class="alert-header" style="font-weight:700;margin-bottom:6px;color:#dc2626;display:flex;align-items:center;gap:6px;">⚠️ CẢNH BÁO</div>` + bq.innerHTML;
        }
      } else if (textContent.includes("[!NOTE]")) {
        bq.classList.add("ai-alert-box", "note");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!NOTE\]/g, "")
          .trim();
        if (!bq.querySelector(".alert-header")) {
          bq.innerHTML = `<div class="alert-header" style="font-weight:700;margin-bottom:6px;color:#2563eb;display:flex;align-items:center;gap:6px;">ℹ️ GHI CHÚ</div>` + bq.innerHTML;
        }
      } else if (textContent.includes("[!TIP]")) {
        bq.classList.add("ai-alert-box", "tip");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!TIP\]/g, "")
          .trim();
        if (!bq.querySelector(".alert-header")) {
          bq.innerHTML = `<div class="alert-header" style="font-weight:700;margin-bottom:6px;color:#16a34a;display:flex;align-items:center;gap:6px;">💡 MÁCH NHỎ</div>` + bq.innerHTML;
        }
      } else if (textContent.includes("[!CAUTION]")) {
        bq.classList.add("ai-alert-box", "caution");
        bq.innerHTML = bq.innerHTML
          .replace(/\[!CAUTION\]/g, "")
          .trim();
        if (!bq.querySelector(".alert-header")) {
          bq.innerHTML = `<div class="alert-header" style="font-weight:700;margin-bottom:6px;color:#d97706;display:flex;align-items:center;gap:6px;">🛑 THẬN TRỌNG</div>` + bq.innerHTML;
        }
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

    // 8. KaTeX auto-render for math/chemical formulas
    const postContentEl = document.querySelector(".post-content");
    if (postContentEl) {
      Promise.all([
        // @ts-ignore
        import("katex/dist/contrib/auto-render")
      ]).then(([renderMathModule]) => {
        const renderMathInElement = renderMathModule.default;
        renderMathInElement(postContentEl as HTMLElement, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
          ],
          throwOnError: false,
        });
      }).catch((err) => {
        console.warn("KaTeX auto-render failed to load:", err);
      });
    }

    // 7. Reading Mode logic
    const toggleBtn = document.getElementById("reading-mode-toggle");
    const floatingToggleBtn = document.getElementById("reading-mode-floating");
    const closeBtn = document.getElementById("reader-close");
    const decFontBtn = document.getElementById("reader-font-dec");
    const incFontBtn = document.getElementById("reader-font-inc");
    const themeDefaultBtn = document.getElementById("reader-theme-default");
    const themeSepiaBtn = document.getElementById("reader-theme-sepia");
    const themeDarkBtn = document.getElementById("reader-theme-dark");

    let currentFontScale = parseInt(localStorage.getItem("reader-font-scale") || "115");
    let currentTheme = localStorage.getItem("reader-theme") || "default";
    let isReaderActive = localStorage.getItem("reader-active") === "true";

    const setReaderActiveState = (active: boolean) => {
      isReaderActive = active;
      localStorage.setItem("reader-active", active ? "true" : "false");
      if (active) {
        document.body.classList.add("reader-mode-active");
        applyReaderTheme(currentTheme);
        applyReaderFontScale(currentFontScale);
      } else {
        document.body.classList.remove("reader-mode-active");
        document.body.removeAttribute("data-reader-theme");
        const postContent = document.querySelector(".post-content") as HTMLElement;
        if (postContent) postContent.style.fontSize = "";
      }
    };

    const applyReaderTheme = (theme: string) => {
      currentTheme = theme;
      localStorage.setItem("reader-theme", theme);
      if (isReaderActive) {
        document.body.setAttribute("data-reader-theme", theme);
      }
      
      const themeBtns = [themeDefaultBtn, themeSepiaBtn, themeDarkBtn];
      themeBtns.forEach((btn) => btn?.classList.remove("active"));
      
      if (theme === "default" && themeDefaultBtn) themeDefaultBtn.classList.add("active");
      if (theme === "sepia" && themeSepiaBtn) themeSepiaBtn.classList.add("active");
      if (theme === "dark" && themeDarkBtn) themeDarkBtn.classList.add("active");
    };

    const applyReaderFontScale = (scale: number) => {
      currentFontScale = scale;
      localStorage.setItem("reader-font-scale", scale.toString());
      if (isReaderActive) {
        const postContent = document.querySelector(".post-content") as HTMLElement;
        if (postContent) {
          postContent.style.setProperty("font-size", `${scale}%`, "important");
        }
      }
    };

    // Initialize state
    setReaderActiveState(isReaderActive);
    applyReaderTheme(currentTheme);
    applyReaderFontScale(currentFontScale);

    // Event listeners for reading mode
    const handleToggleOn = () => setReaderActiveState(true);
    const handleToggleOff = () => setReaderActiveState(false);
    
    const handleIncFont = () => {
      if (currentFontScale < 160) {
        applyReaderFontScale(currentFontScale + 10);
      }
    };
    const handleDecFont = () => {
      if (currentFontScale > 80) {
        applyReaderFontScale(currentFontScale - 10);
      }
    };

    const handleThemeDefault = () => applyReaderTheme("default");
    const handleThemeSepia = () => applyReaderTheme("sepia");
    const handleThemeDark = () => applyReaderTheme("dark");

    toggleBtn?.addEventListener("click", handleToggleOn);
    floatingToggleBtn?.addEventListener("click", handleToggleOn);
    closeBtn?.addEventListener("click", handleToggleOff);
    incFontBtn?.addEventListener("click", handleIncFont);
    decFontBtn?.addEventListener("click", handleDecFont);
    themeDefaultBtn?.addEventListener("click", handleThemeDefault);
    themeSepiaBtn?.addEventListener("click", handleThemeSepia);
    themeDarkBtn?.addEventListener("click", handleThemeDark);

    // 9. AI Verification Modal initialization
    let verifyModal = document.getElementById("ai-verify-modal");
    if (!verifyModal) {
      verifyModal = document.createElement("div");
      verifyModal.id = "ai-verify-modal";
      verifyModal.className = "verify-modal-overlay";
      verifyModal.innerHTML = `
        <div class="verify-modal-card" style="max-height:85vh;overflow:hidden;">
          <div class="verify-modal-header" style="border-bottom:1px solid var(--line);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
            <div class="verify-header-title" style="display:flex;align-items:center;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="verify-shield-icon" style="width:20px;height:20px;color:#10b981;margin-right:8px;vertical-align:middle;display:inline-block;">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h4 style="margin:0;display:inline-block;vertical-align:middle;font-size:16px;font-family:'Archivo',sans-serif;">Kiểm chứng thông tin bằng AI độc lập</h4>
            </div>
            <button class="verify-modal-close" aria-label="Đóng" style="background:none;border:none;color:var(--ash);font-size:28px;cursor:pointer;line-height:1;">&times;</button>
          </div>
          <div class="verify-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;">
            <p style="font-size:13.5px;color:var(--ash-dim);margin:0;line-height:1.6;">
              Để kiểm chứng độc lập tính khách quan và khoa học của bài viết, bạn có thể sao chép nhanh câu lệnh (prompt) dưới đây cùng nội dung bài viết để gửi trực tiếp cho các mô hình AI lớn (ChatGPT, Gemini, Grok) đối chiếu.
            </p>
            
            <div class="prompt-preview-container" style="border:1px solid var(--line);background-color:var(--bg);border-radius:8px;padding:12px;max-height:150px;overflow-y:auto;text-align:left;">
              <pre id="prompt-preview-text" style="margin:0;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ash-dim);white-space:pre-wrap;word-break:break-all;"></pre>
            </div>

            <div class="verify-action-buttons" style="display:flex;flex-direction:column;gap:10px;">
              <button id="copy-full-prompt-btn" class="verify-action-btn primary" style="background-color:var(--ember);color:#ffffff;border:none;padding:12px;border-radius:6px;font-weight:600;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:var(--transition-smooth);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" /></svg>
                Sao chép Prompt & Nội dung bài viết (Khuyên dùng)
              </button>
              <button id="copy-link-prompt-btn" class="verify-action-btn secondary" style="background:none;border:1px solid var(--line);color:var(--ash);padding:10px;border-radius:6px;font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:var(--transition-smooth);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Chỉ sao chép Prompt & Link bài viết
              </button>
            </div>

            <div class="llm-links-section" style="border-top:1px solid var(--line);padding-top:16px;margin-top:4px;">
              <span style="font-size:12px;color:var(--steel);display:block;margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;text-align:left;">Đến trang các AI để dán lệnh:</span>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" class="llm-link-btn" style="flex:1;text-align:center;padding:8px 12px;border:1px solid var(--line);background-color:var(--bg);border-radius:6px;font-size:13px;color:var(--ash);text-decoration:none;font-weight:600;transition:var(--transition-smooth);box-sizing:border-box;">ChatGPT</a>
                <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" class="llm-link-btn" style="flex:1;text-align:center;padding:8px 12px;border:1px solid var(--line);background-color:var(--bg);border-radius:6px;font-size:13px;color:var(--ash);text-decoration:none;font-weight:600;transition:var(--transition-smooth);box-sizing:border-box;">Gemini</a>
                <a href="https://grok.com" target="_blank" rel="noopener noreferrer" class="llm-link-btn" style="flex:1;text-align:center;padding:8px 12px;border:1px solid var(--line);background-color:var(--bg);border-radius:6px;font-size:13px;color:var(--ash);text-decoration:none;font-weight:600;transition:var(--transition-smooth);box-sizing:border-box;">Grok</a>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(verifyModal);
      
      // Close events
      const closeModal = () => {
        const modal = document.getElementById("ai-verify-modal");
        if (modal) {
          modal.classList.remove("active");
          document.body.style.overflow = "";
        }
      };
      
      verifyModal.querySelector(".verify-modal-close")?.addEventListener("click", closeModal);
      verifyModal.addEventListener("click", (e) => {
        if (e.target === verifyModal) closeModal();
      });
    }

    const openVerifyModal = () => {
      const modal = document.getElementById("ai-verify-modal");
      if (!modal) return;
      
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      
      const currentUrl = window.location.href;
      const articleTitle = document.querySelector(".post-hero h1")?.textContent?.trim() || "";
      const articleBody = document.querySelector(".post-content")?.textContent?.trim() || "";
      
      // Format preview text
      const previewText = `Hãy kiểm chứng độ chính xác kỹ thuật và nguồn tài liệu của bài viết nông nghiệp dưới đây:
- Tiêu đề: ${articleTitle}
- Đường dẫn: ${currentUrl}

NỘI DUNG BÀI VIẾT:
[... Toàn bộ nội dung chữ của bài viết ...]`;

      const previewEl = modal.querySelector("#prompt-preview-text");
      if (previewEl) {
        previewEl.textContent = previewText;
      }

      // Action: Copy Full Prompt (Prompt + Full Body Content)
      const copyFullBtn = modal.querySelector("#copy-full-prompt-btn");
      const handleCopyFull = () => {
        const fullPrompt = `Hãy kiểm chứng độ chính xác kỹ thuật và nguồn tài liệu của bài viết nông nghiệp dưới đây:
- Tiêu đề: ${articleTitle}
- Đường dẫn: ${currentUrl}

NỘI DUNG BÀI VIẾT:
=========================================
${articleBody}
=========================================

Hãy đối chiếu thông tin trên với kiến thức khoa học nông nghiệp hữu cơ và sinh học chính thống, chỉ rõ các phần có luận điểm cần lưu ý, kiểm chứng chéo với danh sách tài liệu trích dẫn ở chân bài viết và đưa ra kết luận khách quan về độ tin cậy.`;

        navigator.clipboard.writeText(fullPrompt)
          .then(() => {
            showToast("Đã sao chép Prompt & Nội dung bài viết!");
            closeModal();
          })
          .catch(() => {
            showToast("Sao chép thất bại, vui lòng thử lại.");
          });
      };

      // Action: Copy Link Only Prompt (Prompt + Link)
      const copyLinkBtn = modal.querySelector("#copy-link-prompt-btn");
      const handleCopyLink = () => {
        const linkPrompt = `Hãy truy cập đường dẫn dưới đây, đọc và kiểm chứng độ chính xác kỹ thuật và các nguồn tài liệu trích dẫn của bài viết nông nghiệp này:
- Tiêu đề: ${articleTitle}
- Đường dẫn: ${currentUrl}

Hãy đối chiếu thông tin bài viết với kiến thức khoa học nông nghiệp hữu cơ và sinh học chính thống, chỉ rõ các phần có luận điểm cần lưu ý, kiểm chứng chéo với danh sách tài liệu trích dẫn ở chân bài viết và đưa ra kết luận khách quan về độ tin cậy.`;

        navigator.clipboard.writeText(linkPrompt)
          .then(() => {
            showToast("Đã sao chép Prompt & Link bài viết!");
            closeModal();
          })
          .catch(() => {
            showToast("Sao chép thất bại, vui lòng thử lại.");
          });
      };

      const closeModal = () => {
        modal.classList.remove("active");
        document.body.style.overflow = "";
        
        // Remove transient listeners
        copyFullBtn?.removeEventListener("click", handleCopyFull);
        copyLinkBtn?.removeEventListener("click", handleCopyLink);
      };

      // Transient listeners for copy buttons inside open instance
      copyFullBtn?.addEventListener("click", handleCopyFull);
      copyLinkBtn?.addEventListener("click", handleCopyLink);
    };

    // Bind triggers
    const sidebarVerifyBtn = document.getElementById("ai-verify-sidebar-btn");
    const handleVerifyOpen = (e: Event) => {
      e.preventDefault();
      openVerifyModal();
    };

    sidebarVerifyBtn?.addEventListener("click", handleVerifyOpen);
    
    // Bind feedback modal trigger
    const openFeedbackBtn = document.getElementById("open-feedback-btn");
    const handleFeedbackOpen = (e: Event) => {
      e.preventDefault();
      const title = document.querySelector("h1")?.innerText || "";
      const url = window.location.href;
      window.dispatchEvent(
        new CustomEvent("open-feedback-modal", {
          detail: { title, url },
        })
      );
    };
    openFeedbackBtn?.addEventListener("click", handleFeedbackOpen);
    
    // Bind to any body triggers appended dynamically (like in alert warning boxes)
    const handleBodyVerifyClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.id === "ai-verify-body-btn" || target.closest("#ai-verify-body-btn"))) {
        e.preventDefault();
        openVerifyModal();
      }
    };
    document.addEventListener("click", handleBodyVerifyClick);

    // Cleanup listeners
    return () => {
      window.removeEventListener("scroll", handleScrollProgress);
      if (copyBtn) {
        copyBtn.removeEventListener("click", handleCopy);
      }
      toggleBtn?.removeEventListener("click", handleToggleOn);
      floatingToggleBtn?.removeEventListener("click", handleToggleOn);
      closeBtn?.removeEventListener("click", handleToggleOff);
      incFontBtn?.removeEventListener("click", handleIncFont);
      decFontBtn?.removeEventListener("click", handleDecFont);
      themeDefaultBtn?.removeEventListener("click", handleThemeDefault);
      themeSepiaBtn?.removeEventListener("click", handleThemeSepia);
      themeDarkBtn?.removeEventListener("click", handleThemeDark);
      sidebarVerifyBtn?.removeEventListener("click", handleVerifyOpen);
      openFeedbackBtn?.removeEventListener("click", handleFeedbackOpen);
      document.removeEventListener("click", handleBodyVerifyClick);
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [pathname]);

  return null; // Side-effect only component
}
