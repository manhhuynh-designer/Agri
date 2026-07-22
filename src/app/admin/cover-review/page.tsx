'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface DocItem {
  fileName: string;
  folder: string;
  relPath: string;
  fullPath: string;
  title: string;
  author: string;
}

export default function CoverReviewPage() {
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'blank' | 'completed' | 'all'>('blank');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Concurrent loading states per file
  const [savingFilesMap, setSavingFilesMap] = useState<{ [fileName: string]: boolean }>({});
  const [analyzingFilesMap, setAnalyzingFilesMap] = useState<{ [fileName: string]: boolean }>({});
  const [openingFilesMap, setOpeningFilesMap] = useState<{ [fileName: string]: boolean }>({});

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authorInputs, setAuthorInputs] = useState<{ [key: string]: string }>({});
  const [selectedPagesMap, setSelectedPagesMap] = useState<{ [fileName: string]: { [page: number]: boolean } }>({});
  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; title: string; page: number } | null>(null);

  // Crop Modal State
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    fileName: string;
    pageUrl: string;
    page: number;
    title: string;
  } | null>(null);

  // Canvas Crop refs & state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/missing-authors?all=true');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        const initialInputs: { [key: string]: string } = {};
        const initialPages: { [fileName: string]: { [page: number]: boolean } } = {};
        data.items.forEach((item: DocItem) => {
          initialInputs[item.fileName] = item.author || '';
          initialPages[item.fileName] = { 1: true, 2: true, 3: true };
        });
        setAuthorInputs(initialInputs);
        setSelectedPagesMap(initialPages);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInputChange = (fileName: string, value: string) => {
    setAuthorInputs(prev => ({
      ...prev,
      [fileName]: value
    }));
  };

  const togglePageSelection = (fileName: string, page: number) => {
    setSelectedPagesMap(prev => {
      const filePages = prev[fileName] || { 1: true, 2: true, 3: true };
      return {
        ...prev,
        [fileName]: {
          ...filePages,
          [page]: !filePages[page]
        }
      };
    });
  };

  const getSelectedPageNumbers = (fileName: string): number[] => {
    const filePages = selectedPagesMap[fileName] || { 1: true, 2: true, 3: true };
    return [1, 2, 3].filter(p => filePages[p]);
  };

  const handleSave = async (fileName: string) => {
    const authorValue = authorInputs[fileName] || '';
    setSavingFilesMap(prev => ({ ...prev, [fileName]: true }));

    try {
      const res = await fetch('/api/update-author', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, author: authorValue })
      });

      const data = await res.json();
      if (data.success) {
        setItems(prev => prev.map(item => item.fileName === fileName ? { ...item, author: authorValue } : item));
        showToast(`✅ Đã lưu tác giả cho: ${fileName}`);
      } else {
        showToast(`❌ Lỗi: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`❌ Lỗi lưu dữ liệu: ${err.message}`);
    } finally {
      setSavingFilesMap(prev => ({ ...prev, [fileName]: false }));
    }
  };

  const handleReanalyzeWithAgy = async (fileName: string, croppedBase64?: string) => {
    const pagesToAnalyze = getSelectedPageNumbers(fileName);
    if (!croppedBase64 && pagesToAnalyze.length === 0) {
      showToast(`⚠️ Vui lòng tích chọn ít nhất 1 ảnh (Trang 1, 2 hoặc 3) để AI phân tích!`);
      return;
    }

    setAnalyzingFilesMap(prev => ({ ...prev, [fileName]: true }));

    if (croppedBase64) {
      showToast(`🤖 Đang gửi VÙNG ĐÃ CẮT cho agy Gemini 3.6 Flash quét...`);
    } else {
      showToast(`🤖 Đang gửi ${pagesToAnalyze.length} ảnh trang [${pagesToAnalyze.join(', ')}] cho agy Gemini 3.6 Flash...`);
    }

    try {
      const res = await fetch('/api/reanalyze-author', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          selectedPages: pagesToAnalyze,
          croppedImage: croppedBase64
        })
      });

      const data = await res.json();
      if (data.success) {
        const newAuthor = data.author || '';
        handleInputChange(fileName, newAuthor);
        setItems(prev => prev.map(item => item.fileName === fileName ? { ...item, author: newAuthor, title: data.title || item.title } : item));

        if (newAuthor) {
          showToast(`🤖 AI đã trích xuất (${fileName}): "${newAuthor}"`);
        } else {
          showToast(`🤖 AI xác nhận (${fileName}): Không thấy tên tác giả trong vùng quét.`);
        }
        if (cropModal) {
          setCropModal(null);
        }
      } else {
        showToast(`❌ Lỗi phân tích (${fileName}): ${data.error}`);
      }
    } catch (err: any) {
      showToast(`❌ Lỗi gọi AI (${fileName}): ${err.message}`);
    } finally {
      setAnalyzingFilesMap(prev => ({ ...prev, [fileName]: false }));
    }
  };

  const handleOpenFileInExplorer = async (fileName: string, fullPath: string) => {
    setOpeningFilesMap(prev => ({ ...prev, [fileName]: true }));
    try {
      const res = await fetch('/api/open-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fullPath })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📁 Đã mở file trong Windows Explorer!`);
      } else {
        showToast(`❌ Không mở được file: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`❌ Lỗi mở Explorer: ${err.message}`);
    } finally {
      setOpeningFilesMap(prev => ({ ...prev, [fileName]: false }));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Crop Canvas Logic
  const openCropModal = (item: DocItem, page: number) => {
    const pageUrl = `/api/cover-image?file=${encodeURIComponent(item.fileName)}&page=${page}`;
    setCropRect(null);
    setCroppedPreviewUrl(null);
    setImageLoaded(false);
    setCropModal({
      isOpen: true,
      fileName: item.fileName,
      pageUrl,
      page,
      title: item.title || item.fileName
    });
  };

  useEffect(() => {
    if (!cropModal || !cropModal.isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = cropModal.pageUrl;
    imageRef.current = img;

    img.onload = () => {
      setImageLoaded(true);
      drawCanvas(null);
    };
  }, [cropModal]);

  const drawCanvas = (rect: { x: number; y: number; w: number; h: number } | null) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth || 600;
    canvas.height = img.naturalHeight || 800;

    ctx.drawImage(img, 0, 0);

    if (rect && rect.w > 5 && rect.h > 5) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);

      ctx.strokeStyle = '#3fb950';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bbox = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bbox.width;
    const scaleY = canvas.height / bbox.height;
    return {
      x: (e.clientX - bbox.left) * scaleX,
      y: (e.clientY - bbox.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDragging(true);
    setDragStart(coords);
    setCropRect(null);
    setCroppedPreviewUrl(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;
    const coords = getCanvasCoords(e);
    const x = Math.min(dragStart.x, coords.x);
    const y = Math.min(dragStart.y, coords.y);
    const w = Math.abs(coords.x - dragStart.x);
    const h = Math.abs(coords.y - dragStart.y);

    const rect = { x, y, w, h };
    setCropRect(rect);
    drawCanvas(rect);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (cropRect && cropRect.w > 10 && cropRect.h > 10) {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (canvas && img) {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropRect.w;
        cropCanvas.height = cropRect.h;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
          setCroppedPreviewUrl(cropCanvas.toDataURL('image/png'));
        }
      }
    }
  };

  const submitCroppedImageToAI = () => {
    if (!croppedPreviewUrl || !cropModal) {
      showToast(`⚠️ Vui lòng kéo chuột chọn một vùng trên ảnh trước!`);
      return;
    }
    handleReanalyzeWithAgy(cropModal.fileName, croppedPreviewUrl);
  };

  const filteredItems = items.filter(item => {
    if (filterMode === 'blank' && item.author && item.author.trim() !== '') return false;
    if (filterMode === 'completed' && (!item.author || item.author.trim() === '')) return false;

    if (selectedFolder !== 'all' && item.folder !== selectedFolder) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.fileName.toLowerCase().includes(q);
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchAuthor = (item.author || '').toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchAuthor) return false;
    }

    return true;
  });

  const totalCount = items.length;
  const blankCount = items.filter(i => !i.author || i.author.trim() === '').length;
  const completedCount = totalCount - blankCount;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Sticky Top Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #30363d', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/sources" style={{ textDecoration: 'none', color: '#58a6ff', fontSize: '0.9rem', fontWeight: 600 }}>
                ← Quay lại Thư viện Nguồn
              </Link>
              <span style={{ color: '#8b949e' }}>|</span>
              <span style={{ backgroundColor: '#238636', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                ADMIN TOOL - ASYNCHRONOUS MULTI-THREADING
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f0f6fc', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📖 Công Cụ Nhập Tác Giả & Cắt Vùng Ảnh (Quét Đa Tiến Trình Song Song)
            </h1>
          </div>

          {/* Counters Banner */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>Chưa có tác giả</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f85149' }}>{blankCount}</div>
            </div>
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>Đã trích xuất</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3fb950' }}>{completedCount}</div>
            </div>
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>Tổng tài liệu</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#58a6ff' }}>{totalCount}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1500px', margin: '0 auto', padding: '24px' }}>
        {/* Filters Toolbar */}
        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#0d1117', padding: '4px', borderRadius: '8px', border: '1px solid #30363d' }}>
            <button
              onClick={() => setFilterMode('blank')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                backgroundColor: filterMode === 'blank' ? '#238636' : 'transparent',
                color: filterMode === 'blank' ? '#fff' : '#8b949e'
              }}>
              Cần nhập tác giả ({blankCount})
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                backgroundColor: filterMode === 'completed' ? '#1f6feb' : 'transparent',
                color: filterMode === 'completed' ? '#fff' : '#8b949e'
              }}>
              Đã hoàn thành ({completedCount})
            </button>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                backgroundColor: filterMode === 'all' ? '#30363d' : 'transparent',
                color: filterMode === 'all' ? '#fff' : '#8b949e'
              }}>
              Tất cả ({totalCount})
            </button>
          </div>

          {/* Search & Folder Select */}
          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm theo tên file hoặc tiêu đề sách..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 14px', color: '#c9d1d9', fontSize: '0.9rem'
              }}
            />
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              style={{
                backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 14px', color: '#c9d1d9', fontSize: '0.9rem', cursor: 'pointer'
              }}>
              <option value="all">📂 Tất cả thư mục</option>
              <option value="Tủ sách Nông nghiệp">📂 Tủ sách Nông nghiệp</option>
              <option value="Permaculture">📂 Permaculture</option>
            </select>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#8b949e' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>🔄</div>
            <div>Đang tải danh sách tài liệu...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ backgroundColor: '#161b22', border: '1px dashed #30363d', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#8b949e' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f0f6fc' }}>Không có tài liệu nào khớp với điều kiện tìm kiếm</div>
          </div>
        ) : (
          /* Document Cards Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(700px, 1fr))', gap: '24px' }}>
            {filteredItems.map((item) => {
              const isSaving = !!savingFilesMap[item.fileName];
              const isAnalyzing = !!analyzingFilesMap[item.fileName];
              const isOpening = !!openingFilesMap[item.fileName];
              const selectedPages = getSelectedPageNumbers(item.fileName);
              const filePageSelection = selectedPagesMap[item.fileName] || { 1: true, 2: true, 3: true };

              return (
                <div
                  key={item.fileName}
                  style={{
                    backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px',
                    display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                  {/* Card Header & File Info + Open in Explorer Button */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#8b949e', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          📂 {item.folder}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#8b949e', wordBreak: 'break-all' }}>
                          {item.fileName}
                        </span>
                      </div>

                      {/* Open File in Explorer Button */}
                      <button
                        onClick={() => handleOpenFileInExplorer(item.fileName, item.fullPath)}
                        disabled={isOpening}
                        style={{
                          backgroundColor: '#21262d', color: '#58a6ff', border: '1px solid #388bfd', borderRadius: '6px',
                          padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: isOpening ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                        title="Mở tệp gốc trực tiếp trong Windows Explorer">
                        {isOpening ? '⏳ Đang mở...' : '📁 Mở file gốc (Explorer)'}
                      </button>
                    </div>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f6fc', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                      {item.title || item.fileName}
                    </h2>
                  </div>

                  {/* 3 Pages Side-by-Side Preview Thumbnails WITH CHECKBOXES & CROP BUTTON */}
                  <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>🖼️ CHỌN TRANG HOẶC CẮT VÙNG ẢNH ĐỂ QUÉT AI:</span>
                      <span style={{ color: '#58a6ff' }}>🔍 Bấm vào ảnh để xem to</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {[1, 2, 3].map((page) => {
                        const imgUrl = `/api/cover-image?file=${encodeURIComponent(item.fileName)}&page=${page}`;
                        const isChecked = !!filePageSelection[page];

                        return (
                          <div
                            key={page}
                            style={{
                              display: 'flex', flexDirection: 'column', gap: '6px'
                            }}>
                            {/* Checkbox Header & Crop Button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <label
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700,
                                  color: isChecked ? '#3fb950' : '#8b949e', cursor: 'pointer', userSelect: 'none'
                                }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePageSelection(item.fileName, page)}
                                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#238636' }}
                                />
                                Trang {page}
                              </label>

                              {/* Crop Button */}
                              <button
                                onClick={() => openCropModal(item, page)}
                                style={{
                                  backgroundColor: '#21262d', color: '#e3b341', border: '1px solid #d29922', borderRadius: '4px',
                                  padding: '2px 6px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'
                                }}
                                title="Mở công cụ cắt vùng ảnh trang này">
                                ✂️ Cắt vùng
                              </button>
                            </div>

                            {/* Image Box */}
                            <div
                              onClick={() => setSelectedImageModal({ url: imgUrl, title: item.title || item.fileName, page })}
                              style={{
                                position: 'relative', height: '180px', backgroundColor: '#161b22',
                                border: isChecked ? '2px solid #238636' : '1px solid #30363d',
                                borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s'
                              }}>
                              <img
                                src={imgUrl}
                                alt={`Trang ${page}`}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: isChecked ? 1 : 0.4 }}
                                onError={(e: any) => {
                                  e.target.style.display = 'none';
                                  e.target.parentNode.innerHTML = `<div style="font-size:0.75rem; color:#8b949e; text-align:center; padding:10px;">Trang ${page}<br/>(Không có)</div>`;
                                }}
                              />
                              <div style={{ position: 'absolute', top: 4, left: 4, backgroundColor: isChecked ? 'rgba(35, 134, 54, 0.9)' : 'rgba(0,0,0,0.85)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                {isChecked ? `✓ Trang ${page}` : `Trang ${page}`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Input Form & AI Re-analyze Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#c9d1d9', marginBottom: '6px' }}>
                        Tác giả / Nhà xuất bản in trên các trang 1-3:
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: GS.TS. Nguyễn Văn A / NXB Nông Nghiệp (hoặc để trống nếu không có)..."
                        value={authorInputs[item.fileName] || ''}
                        onChange={(e) => handleInputChange(item.fileName, e.target.value)}
                        style={{
                          width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px',
                          padding: '10px 14px', color: '#f0f6fc', fontSize: '0.95rem', outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Re-analyze with agy Button */}
                      <button
                        onClick={() => handleReanalyzeWithAgy(item.fileName)}
                        disabled={isAnalyzing || selectedPages.length === 0}
                        style={{
                          backgroundColor: isAnalyzing ? '#6e40c9' : (selectedPages.length > 0 ? '#8957e5' : '#21262d'),
                          color: '#fff', border: 'none', borderRadius: '6px',
                          padding: '10px 14px', fontWeight: 700, fontSize: '0.85rem',
                          cursor: (isAnalyzing || selectedPages.length === 0) ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        title={`Gửi ${selectedPages.length} trang đã chọn cho agy Gemini 3.6 Flash`}>
                        {isAnalyzing ? '🤖 AI đang đọc...' : `🤖 Gửi AI (agy 3.6) quét ${selectedPages.length} ảnh đã chọn`}
                      </button>

                      {/* Save Button */}
                      <button
                        onClick={() => handleSave(item.fileName)}
                        disabled={isSaving}
                        style={{
                          flex: 1, backgroundColor: isSaving ? '#21262d' : '#238636', color: '#fff', border: 'none',
                          borderRadius: '6px', padding: '10px 16px', fontWeight: 700, fontSize: '0.9rem', cursor: isSaving ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '180px'
                        }}>
                        {isSaving ? '⏳ Đang lưu...' : '💾 Lưu & Đồng Bộ'}
                      </button>

                      {/* Blank Confirm Button */}
                      <button
                        onClick={() => {
                          handleInputChange(item.fileName, '');
                          handleSave(item.fileName);
                        }}
                        style={{
                          backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '6px',
                          padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                        }}
                        title="Xác nhận không có tên tác giả trên 3 trang đầu">
                        Xác nhận Trống
                      </button>
                    </div>

                    {item.author && (
                      <div style={{ fontSize: '0.85rem', color: '#3fb950', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Tác giả hiện tại: <strong>{item.author}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Interactive Canvas Crop Modal */}
      {cropModal && cropModal.isOpen && (
        <div
          onClick={() => setCropModal(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px',
              maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto'
            }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid #30363d', paddingBottom: '12px' }}>
              <div>
                <span style={{ backgroundColor: '#d29922', color: '#000', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                  ✂️ CẮT VÙNG QUÉT AI
                </span>
                <h3 style={{ margin: '4px 0 0 0', color: '#f0f6fc', fontSize: '1.2rem', fontWeight: 700 }}>
                  {cropModal.title} (Trang {cropModal.page})
                </h3>
              </div>
              <button
                onClick={() => setCropModal(null)}
                style={{ backgroundColor: '#21262d', color: '#fff', border: '1px solid #30363d', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                ✕ Hủy / Đóng
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#e3b341', backgroundColor: 'rgba(210, 153, 34, 0.1)', border: '1px solid rgba(210, 153, 34, 0.3)', padding: '10px 14px', borderRadius: '6px' }}>
              💡 <strong>Hướng dẫn:</strong> Dùng chuột <strong>kéo và thả một vùng chữ nhật</strong> bao quanh khu vực in tên Tác giả / NXB trên ảnh bên dưới. Gemini 3.6 Flash (High) sẽ chỉ tập trung quét riêng vùng đó!
            </div>

            {/* Canvas & Preview Container */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Interactive Canvas Area */}
              <div style={{ position: 'relative', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0d1117', maxWidth: '65vw', maxHeight: '65vh' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '65vh', cursor: 'crosshair', userSelect: 'none' }}
                />
              </div>

              {/* Cropped Preview Side Panel */}
              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: 0, color: '#f0f6fc', fontSize: '0.95rem', fontWeight: 700 }}>
                  🖼️ Xem trước vùng cắt:
                </h4>

                <div style={{ width: '100%', height: '200px', backgroundColor: '#161b22', border: '1px dashed #30363d', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {croppedPreviewUrl ? (
                    <img src={croppedPreviewUrl} alt="Cropped Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#8b949e', textAlign: 'center', padding: '10px' }}>
                      Vui lòng kéo giữ chuột trên ảnh để chọn vùng
                    </span>
                  )}
                </div>

                <button
                  onClick={submitCroppedImageToAI}
                  disabled={!croppedPreviewUrl || !!analyzingFilesMap[cropModal.fileName]}
                  style={{
                    width: '100%', backgroundColor: croppedPreviewUrl ? '#238636' : '#21262d', color: '#fff', border: 'none',
                    borderRadius: '6px', padding: '12px', fontWeight: 800, fontSize: '0.9rem',
                    cursor: (croppedPreviewUrl && !analyzingFilesMap[cropModal.fileName]) ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                  {analyzingFilesMap[cropModal.fileName] ? '🤖 AI đang quét...' : '🚀 Gửi vùng đã cắt cho Gemini 3.6 Flash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Zoom Modal */}
      {selectedImageModal && (
        <div
          onClick={() => setSelectedImageModal(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px',
              maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h3 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.2rem', fontWeight: 700 }}>
                {selectedImageModal.title} (Trang {selectedImageModal.page}/3)
              </h3>
              <button
                onClick={() => setSelectedImageModal(null)}
                style={{ backgroundColor: '#21262d', color: '#fff', border: '1px solid #30363d', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                ✕ Đóng
              </button>
            </div>
            <img
              src={selectedImageModal.url}
              alt="Xem phóng to trang"
              style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid #30363d' }}
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#1f6feb', color: '#fff',
          padding: '12px 20px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontWeight: 600,
          fontSize: '0.9rem', zIndex: 2000, border: '1px solid #388bfd'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
