/* ==========================================================================
   AGRI-BIOCHAR BLOG - INTERACTION & CLIENT LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initBackToTop();
  
  // Page-specific initialization
  if (document.querySelector('.posts-grid')) {
    initBlogFilters();
  }
  
  if (document.querySelector('.post-content')) {
    initTableOfContents();
    initReadingProgress();
    initCopyLink();
    initLightbox();
    initAlertBoxes();
  }
});

/* ==========================================================================
   1. SYSTEM THEME SWITCHER
   ========================================================================== */
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  
  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  
  if (savedTheme === 'light' || (!savedTheme && systemPrefersLight)) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  });
}

/* ==========================================================================
   2. BACK TO TOP BUTTON
   ========================================================================== */
function initBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (!backToTopBtn) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  });
  
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* ==========================================================================
   3. TOAST NOTIFICATION & NEWSLETTER
   ========================================================================== */
function showToast(message, isSuccess = true) {
  // Check if toast already exists
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.innerHTML = `
    <svg viewBox="0 0 20 20" fill="currentColor" style="width:20px;height:20px;color:${isSuccess ? 'var(--char)' : 'var(--ember)'}">
      ${isSuccess 
        ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>'
        : '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>'
      }
    </svg>
    <span>${message}</span>
  `;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function initNewsletter() {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput.value.trim();
      
      if (!email) return;
      
      // Simulate API call
      showToast('Đăng ký nhận bài viết thành công!');
      emailInput.value = '';
    });
  });
}

/* ==========================================================================
   4. HOMEPAGE SEARCH, TAG FILTERING, SORTING & PAGINATION
   ========================================================================== */
function initBlogFilters() {
  const postsGrid = document.querySelector('.posts-grid');
  if (!postsGrid) return;

  const searchInput = document.getElementById('search-input');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const sortSelect = document.getElementById('sort-select');
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const postCards = document.querySelectorAll('.post-card');
  const postCardsArray = Array.from(postCards);
  
  let activeTag = 'all';
  let searchQuery = '';
  let currentSort = 'newest';
  let currentPage = 1;
  const pageSize = 6;
  
  function sortAndFilterPosts() {
    // 1. Filter posts first
    const filteredCards = postCardsArray.filter(card => {
      const cardTags = card.getAttribute('data-tags').split(' ').map(t => t.trim().toLowerCase());
      const title = card.querySelector('h3').textContent.toLowerCase();
      const desc = card.querySelector('p').textContent.toLowerCase();
      
      const matchesTag = activeTag === 'all' || cardTags.includes(activeTag.toLowerCase());
      const matchesSearch = title.includes(searchQuery) || desc.includes(searchQuery);
      
      return matchesTag && matchesSearch;
    });

    // 2. Sort filtered posts
    filteredCards.sort((a, b) => {
      const dateA = parseInt(a.getAttribute('data-date')) || 0;
      const dateB = parseInt(b.getAttribute('data-date')) || 0;
      const timeA = parseInt(a.getAttribute('data-readtime')) || 5;
      const timeB = parseInt(b.getAttribute('data-readtime')) || 5;

      if (currentSort === 'newest') {
        return dateB - dateA;
      } else if (currentSort === 'oldest') {
        return dateA - dateB;
      } else if (currentSort === 'time-asc') {
        return timeA - timeB;
      } else if (currentSort === 'time-desc') {
        return timeB - timeA;
      }
      return 0;
    });

    // 3. Re-append and show/hide
    postCardsArray.forEach(card => card.style.display = 'none'); // Hide all first

    const totalItems = filteredCards.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    filteredCards.forEach((card, idx) => {
      postsGrid.appendChild(card); // Re-order DOM elements
      
      if (idx >= startIndex && idx < endIndex) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    // 4. Render Pagination UI
    renderPagination(totalPages);

    // 5. Manage empty state
    let emptyState = document.getElementById('empty-state');
    if (totalItems === 0) {
      if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.id = 'empty-state';
        emptyState.className = 'empty-state';
        emptyState.style.textAlign = 'center';
        emptyState.style.padding = '60px 0';
        emptyState.style.color = 'var(--ash-dim)';
        emptyState.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor" width="48" height="48" style="color: var(--line); margin-bottom: 16px; margin-left: auto; margin-right: auto; display: block;">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5L6.8 11.2a1 1 0 101.733 1L9 11.536V14a1 1 0 102 0v-2.464l.467.264a1 1 0 101.733-1L10.867 7.5A1 1 0 0010 7z" clip-rule="evenodd" />
          </svg>
          <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 6px;">Không tìm thấy bài viết nào phù hợp.</p>
          <p style="font-size: 0.9rem;">Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
        `;
        postsGrid.after(emptyState);
      }
    } else if (emptyState) {
      emptyState.remove();
    }
  }

  function renderPagination(totalPages) {
    let pagContainer = document.getElementById('pagination-controls');
    if (!pagContainer) {
      pagContainer = document.createElement('div');
      pagContainer.id = 'pagination-controls';
      pagContainer.className = 'pagination-container';
      postsGrid.after(pagContainer);
    }

    if (totalPages <= 1) {
      pagContainer.style.display = 'none';
      return;
    } else {
      pagContainer.style.display = 'flex';
    }

    let html = `<button class="pag-btn prev" ${currentPage === 1 ? 'disabled' : ''}>&larr; Trang trước</button>`;
    html += `<div class="pag-pages">`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="pag-page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `</div>`;
    html += `<button class="pag-btn next" ${currentPage === totalPages ? 'disabled' : ''}>Trang sau &rarr;</button>`;

    pagContainer.innerHTML = html;

    // Attach pagination events
    pagContainer.querySelector('.prev').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        sortAndFilterPosts();
        scrollToGrid();
      }
    });

    pagContainer.querySelector('.next').addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        sortAndFilterPosts();
        scrollToGrid();
      }
    });

    pagContainer.querySelectorAll('.pag-page-num').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentPage = parseInt(e.target.getAttribute('data-page'));
        sortAndFilterPosts();
        scrollToGrid();
      });
    });
  }

  function scrollToGrid() {
    const rect = postsGrid.getBoundingClientRect();
    if (rect.top < 0) {
      window.scrollTo({
        top: window.scrollY + rect.top - 120,
        behavior: 'smooth'
      });
    }
  }

  // Setup search input listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      currentPage = 1; // Reset to page 1 on new search
      sortAndFilterPosts();
    });
  }

  // Setup category tag listeners
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      activeTag = btn.getAttribute('data-tag');
      currentPage = 1; // Reset to page 1 on tag change
      sortAndFilterPosts();
    });
  });

  // Setup sort dropdown listener
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      currentPage = 1; // Reset to page 1 on sort change
      sortAndFilterPosts();
    });
  }

  // Setup layout view togglers
  if (gridViewBtn && listViewBtn) {
    gridViewBtn.addEventListener('click', () => {
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      postsGrid.classList.remove('list-view');
      localStorage.setItem('blog-layout', 'grid');
    });

    listViewBtn.addEventListener('click', () => {
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      postsGrid.classList.add('list-view');
      localStorage.setItem('blog-layout', 'list');
    });

    // Restore saved layout preference
    const savedLayout = localStorage.getItem('blog-layout');
    if (savedLayout === 'list') {
      listViewBtn.click();
    }
  }

  // Initial call to sort, filter, and paginate
  sortAndFilterPosts();
}

/* ==========================================================================
   5. AUTOMATIC TABLE OF CONTENTS (TOC)
   ========================================================================== */
function initTableOfContents() {
  const tocList = document.getElementById('toc-list');
  let sections = document.querySelectorAll('.post-content section');
  let isMarkdown = false;
  
  if (sections.length === 0) {
    // Fallback for markdown posts where H2s are direct children of post-content
    sections = document.querySelectorAll('.post-content h2');
    isMarkdown = true;
  }
  
  if (!tocList || sections.length === 0) return;
  
  // Clear any placeholder
  tocList.innerHTML = '';
  
  // 1. Generate TOC elements
  sections.forEach((item, index) => {
    const heading = isMarkdown ? item : item.querySelector('h2');
    const targetElement = item;
    if (!heading) return;
    
    // Ensure target element has an ID
    const sectionId = targetElement.id || `section-${index + 1}`;
    targetElement.id = sectionId;
    
    const li = document.createElement('li');
    li.className = 'toc-item';
    li.setAttribute('data-target', sectionId);
    
    const a = document.createElement('a');
    a.href = `#${sectionId}`;
    a.textContent = heading.textContent.replace(/^[#\s]+/, ''); // strip any trailing markdown markers
    
    li.appendChild(a);
    tocList.appendChild(li);
  });
  
  // 2. Scrollspy - Highlight active TOC item
  const tocItems = document.querySelectorAll('.toc-item');
  
  const observerOptions = {
    root: null,
    rootMargin: '-10% 0px -75% 0px', // Trigger when section is near top of viewport
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        
        tocItems.forEach(item => {
          if (item.getAttribute('data-target') === id) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);
  
  sections.forEach(section => observer.observe(section));
}

/* ==========================================================================
   6. READING PROGRESS BAR
   ========================================================================== */
function initReadingProgress() {
  const progressBar = document.getElementById('reading-progress');
  if (!progressBar) return;
  
  const article = document.querySelector('.post-body');
  if (!article) return;
  
  window.addEventListener('scroll', () => {
    const rect = article.getBoundingClientRect();
    const articleHeight = article.offsetHeight;
    
    // Calculate how much of the article is scrolled past the top of the viewport
    let scrolled = 0;
    const viewportHeight = window.innerHeight;
    
    // If the article has started scrolling
    if (rect.top < 0) {
      // Calculate scroll progress percentage (from 0 to 100)
      // When rect.bottom equals viewportHeight, we have reached the bottom of the article
      const totalScrollableDistance = articleHeight - viewportHeight;
      scrolled = Math.min(100, Math.max(0, (-rect.top / totalScrollableDistance) * 100));
    }
    
    progressBar.style.width = `${scrolled}%`;
  });
}

/* ==========================================================================
   7. COPY LINK TO CLIPBOARD
   ========================================================================== */
function initCopyLink() {
  const btn = document.getElementById('copy-link-btn');
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    const url = window.location.href;
    
    navigator.clipboard.writeText(url).then(() => {
      showToast('Đã sao chép liên kết thành công!');
    }).catch(err => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Đã sao chép liên kết thành công!');
    });
  });
}

/* ==========================================================================
   8. LIGHTBOX IMAGE ZOOM FOR DIAGRAMS
   ========================================================================== */
function initLightbox() {
  const diagrams = document.querySelectorAll('.post-content svg, .post-content img');
  if (diagrams.length === 0) return;
  
  let overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Đóng">&times;</button>
      <div class="lightbox-content"></div>
    `;
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox-overlay' || e.target.classList.contains('lightbox-close')) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
  
  const contentContainer = overlay.querySelector('.lightbox-content');
  
  diagrams.forEach(item => {
    item.style.cursor = 'zoom-in';
    item.setAttribute('title', 'Nhấn để phóng to sơ đồ kỹ thuật');
    
    item.addEventListener('click', () => {
      contentContainer.innerHTML = '';
      const clone = item.cloneNode(true);
      clone.style.cursor = 'default';
      clone.removeAttribute('title');
      
      contentContainer.appendChild(clone);
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });
}

/* ==========================================================================
   10. AUTO ALERTS FORMATTER
   ========================================================================== */
function initAlertBoxes() {
  const blockquotes = document.querySelectorAll('.post-content blockquote');
  blockquotes.forEach(bq => {
    const textContent = bq.textContent;
    if (textContent.includes('[!WARNING]')) {
      bq.classList.add('ai-alert-box', 'warning');
      bq.innerHTML = bq.innerHTML
        .replace(/\[!WARNING\]/g, '')
        .replace(/⚠️/g, '')
        .replace(/Lưu ý:/g, '<strong>⚠️ Lưu ý:</strong>')
        .trim();
    } else if (textContent.includes('[!NOTE]')) {
      bq.classList.add('ai-alert-box', 'note');
      bq.innerHTML = bq.innerHTML
        .replace(/\[!NOTE\]/g, '')
        .replace(/ℹ/g, '')
        .replace(/Ghi chú:/g, '<strong>ℹ️ Ghi chú:</strong>')
        .trim();
    }
  });
}

