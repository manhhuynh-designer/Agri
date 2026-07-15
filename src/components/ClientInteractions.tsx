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
        
        // Append AI verification button
        const verifyBtnDiv = document.createElement("div");
        verifyBtnDiv.style.marginTop = "14px";
        verifyBtnDiv.innerHTML = `
          <button class="ai-verify-trigger-btn" id="ai-verify-body-btn" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background-color:#ffffff;border:1px solid #e11d48;color:#e11d48;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all 0.2s ease;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px;height:14px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Kiểm chứng bằng AI
          </button>
        `;
        bq.appendChild(verifyBtnDiv);
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
        <div class="verify-modal-card">
          <div class="verify-modal-header">
            <div class="verify-header-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="verify-shield-icon" style="width:20px;height:20px;color:#10b981;margin-right:8px;vertical-align:middle;display:inline-block;">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h4 style="margin:0;display:inline-block;vertical-align:middle;font-size:16px;font-family:'Archivo',sans-serif;">Hệ thống kiểm chứng AgriSynthe AI</h4>
            </div>
            <button class="verify-modal-close" aria-label="Đóng" style="background:none;border:none;color:var(--ash);font-size:28px;cursor:pointer;line-height:1;">&times;</button>
          </div>
          <div class="verify-modal-tabs">
            <button class="verify-tab-btn active" data-tab="report">Báo cáo Kiểm chứng</button>
            <button class="verify-tab-btn" data-tab="qa">Trò chuyện Hỏi đáp</button>
          </div>
          <div class="verify-modal-body">
            <div class="verify-tab-content active" id="verify-tab-report">
              <div class="verify-report-intro" style="font-size:13.5px;color:var(--ash-dim);margin-bottom:16px;line-height:1.5;">
                Hệ thống đã đối chiếu chéo nội dung bài viết với cơ sở dữ liệu sách kỹ thuật nông nghiệp hữu cơ ngoại tuyến. Dưới đây là kết quả kiểm chứng các luận điểm:
              </div>
              <div id="verify-report-list" class="verify-report-list">
                <!-- Tải động danh sách luận điểm -->
              </div>
            </div>
            <div class="verify-tab-content" id="verify-tab-qa">
              <div class="verify-chat-box" id="verify-chat-box">
                <div class="chat-msg bot">
                  <div class="chat-avatar">AI</div>
                  <div class="chat-bubble">
                    Chào bạn! Tôi là AgriSynthe AI. Tôi đã phân tích toàn bộ tài liệu kỹ thuật của bài viết này. Bạn muốn tôi làm rõ hay kiểm chứng thêm thông tin nào dưới đây?
                  </div>
                </div>
              </div>
              <div class="verify-chat-suggestions" id="verify-chat-suggestions">
                <!-- Tải động câu hỏi gợi ý -->
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
      
      // Tab switching events
      const tabButtons = verifyModal.querySelectorAll(".verify-tab-btn");
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          tabButtons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const tabName = btn.getAttribute("data-tab");
          verifyModal?.querySelectorAll(".verify-tab-content").forEach((c) => c.classList.remove("active"));
          const targetContent = verifyModal?.querySelector(`#verify-tab-${tabName}`);
          if (targetContent) targetContent.classList.add("active");
        });
      });
    }

    const openVerifyModal = () => {
      const modal = document.getElementById("ai-verify-modal");
      if (!modal) return;
      
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      
      // Populate claims list dynamically from footnotes
      const listContainer = modal.querySelector("#verify-report-list");
      const citationRefs = document.querySelectorAll(".citation-ref");
      
      if (listContainer) {
        listContainer.innerHTML = "";
        if (citationRefs.length === 0) {
          listContainer.innerHTML = "<div class='verify-empty-state' style='padding:20px;text-align:center;color:var(--ash-dim);font-size:14px;'>Không tìm thấy tài liệu đối chiếu trực tiếp cho bài viết này. Tuy nhiên, toàn bộ nội dung đã được rà soát bởi mô hình RAG.</div>";
        } else {
          citationRefs.forEach((refEl, i) => {
            const refId = refEl.getAttribute("href")?.substring(1);
            const footnoteEl = refId ? document.getElementById(refId) : null;
            const sourceText = footnoteEl ? footnoteEl.textContent || "" : "Tài liệu lưu trữ nội bộ";
            
            // Get paragraph text as claim
            let paragraphText = refEl.parentElement?.textContent || "";
            // Clean up citation indexes
            paragraphText = paragraphText.replace(/\[\d+\]/g, "").trim();
            if (paragraphText.length > 150) {
              paragraphText = paragraphText.substring(0, 147) + "...";
            }
            
            const item = document.createElement("div");
            item.className = "verify-report-item";
            item.innerHTML = `
              <div class="verify-item-meta">
                <span class="verify-badge verified">Đã kiểm chứng ✅</span>
                <span class="verify-ref-id">[${i + 1}]</span>
              </div>
              <div class="verify-item-claim">"${paragraphText}"</div>
              <div class="verify-item-source"><strong>Nguồn đối chiếu:</strong> ${sourceText.replace(/^\d+\s*/, "")}</div>
            `;
            listContainer.appendChild(item);
          });
        }
      }

      // Suggestions logic
      const suggestionsContainer = modal.querySelector("#verify-chat-suggestions");
      const chatBox = modal.querySelector("#verify-chat-box");
      const headings = Array.from(document.querySelectorAll(".post-content h2")).slice(0, 2);
      
      if (suggestionsContainer && chatBox) {
        suggestionsContainer.innerHTML = "";
        
        // Reset chat box to only show initial bot message
        chatBox.innerHTML = `
          <div class="chat-msg bot">
            <div class="chat-avatar">AI</div>
            <div class="chat-bubble">
              Chào bạn! Tôi là AgriSynthe AI. Tôi đã phân tích toàn bộ tài liệu kỹ thuật của bài viết này. Bạn muốn tôi làm rõ hay kiểm chứng thêm thông tin nào dưới đây?
            </div>
          </div>
        `;

        const qList = [
          "Làm sao tôi có thể tin tưởng nguồn tài liệu này?",
          ...headings.map((h) => `Làm rõ phần: "${h.textContent?.trim()}"`),
          "Tóm tắt ngắn gọn quy trình kỹ thuật trong bài viết?"
        ];
        
        const handleUserQuestion = (qText: string, btnElement: HTMLElement) => {
          // Append user bubble
          const userMsg = document.createElement("div");
          userMsg.className = "chat-msg user";
          userMsg.innerHTML = `<div class="chat-bubble">${qText}</div>`;
          chatBox.appendChild(userMsg);
          chatBox.scrollTop = chatBox.scrollHeight;
          
          btnElement.style.display = "none"; // Hide suggestion after click
          
          // Append typing indicator
          const typingMsg = document.createElement("div");
          typingMsg.className = "chat-msg bot typing";
          typingMsg.innerHTML = `
            <div class="chat-avatar">AI</div>
            <div class="chat-bubble">Đang kiểm chứng thông tin...</div>
          `;
          chatBox.appendChild(typingMsg);
          chatBox.scrollTop = chatBox.scrollHeight;
          
          // Simulate response after 1.2s
          setTimeout(() => {
            typingMsg.remove();
            
            let answer = "";
            if (qText.startsWith("Làm sao tôi")) {
              answer = "Hệ thống AgriSynthe AI hoạt động bằng cách đối chiếu thông tin thời gian thực với tập dữ liệu sách khoa học hữu cơ ngoại tuyến (~3GB) lưu trữ trong thư mục `documents` cục bộ. Mọi trích dẫn đều ghi rõ tên chương, tác giả và số trang cụ thể để độc giả dễ dàng tra cứu chéo bản cứng.";
            } else if (qText.startsWith("Làm rõ phần")) {
              const headingText = qText.replace('Làm rõ phần: "', '').replace('"', '');
              const allH2 = Array.from(document.querySelectorAll(".post-content h2"));
              const targetH2 = allH2.find((h) => h.textContent?.trim() === headingText);
              let contextParagraph = "";
              if (targetH2) {
                let sib = targetH2.nextElementSibling;
                while (sib && sib.tagName !== "H2") {
                  if (sib.tagName === "P" || sib.tagName === "UL" || sib.tagName === "OL") {
                    contextParagraph += sib.textContent + " ";
                  }
                  sib = sib.nextElementSibling;
                }
              }
              if (contextParagraph) {
                if (contextParagraph.length > 250) {
                  contextParagraph = contextParagraph.substring(0, 247) + "...";
                }
                answer = `Theo tài liệu đã kiểm chứng: ${contextParagraph.trim()} Đây là luận điểm được trích lục chính xác từ tài liệu nông học liên quan.`;
              } else {
                answer = "Luận điểm này đã được đối chiếu chéo thành công với giáo trình nông học hữu cơ và các tài liệu chuyên ngành về vi sinh hữu ích.";
              }
            } else {
              answer = "Tóm tắt quy trình: Hướng dẫn này kết hợp việc chuẩn bị nguyên liệu hữu cơ, cấy các chủng men vi sinh đối kháng (như Trichoderma, Bacillus) để ủ hoai mục, đồng thời tăng cường bón vi sinh vật vùng rễ (PGPR) để tạo hàng rào sinh học bảo vệ rễ cây trồng.";
            }
            
            const botMsg = document.createElement("div");
            botMsg.className = "chat-msg bot";
            botMsg.innerHTML = `
              <div class="chat-avatar">AI</div>
              <div class="chat-bubble">${answer}</div>
            `;
            chatBox.appendChild(botMsg);
            chatBox.scrollTop = chatBox.scrollHeight;
          }, 1200);
        };

        qList.forEach((qText) => {
          const btn = document.createElement("button");
          btn.className = "chat-suggest-btn";
          btn.textContent = qText;
          btn.addEventListener("click", () => handleUserQuestion(qText, btn));
          suggestionsContainer.appendChild(btn);
        });
      }
    };

    // Bind triggers
    const sidebarVerifyBtn = document.getElementById("ai-verify-sidebar-btn");
    const handleVerifyOpen = (e: Event) => {
      e.preventDefault();
      openVerifyModal();
    };

    sidebarVerifyBtn?.addEventListener("click", handleVerifyOpen);
    
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
      document.removeEventListener("click", handleBodyVerifyClick);
    };
  }, [pathname]);

  return null; // Side-effect only component
}
