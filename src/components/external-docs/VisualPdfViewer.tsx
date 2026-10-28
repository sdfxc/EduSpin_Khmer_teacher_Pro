import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  X,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookOpen,
  Layers,
  AlertCircle,
  Scroll,
  FileBox
} from 'lucide-react';
import { ExternalPdfDoc } from '../../types/externalDocs';
import { getFileFromStorage } from '../../lib/fileStorage';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface VisualPdfViewerProps {
  doc: ExternalPdfDoc;
  onClose: () => void;
  isDarkMode?: boolean;
}

// -------------------------------------------------------------
// Subcomponent: Miniature PDF Thumbnail Item for Sidebar (រូបទី២)
// Renders actual visual preview of the page at low resolution
// -------------------------------------------------------------
interface PdfThumbnailItemProps {
  pdfDoc: any;
  pageNumber: number;
  isSelected: boolean;
  onClick: () => void;
  aspectRatio: number;
  isDarkMode?: boolean;
}

const PdfThumbnailItem = React.memo(({
  pdfDoc,
  pageNumber,
  isSelected,
  onClick,
  aspectRatio,
}: PdfThumbnailItemProps) => {
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const renderTaskRef = useRef<any | null>(null);

  const renderThumbnail = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || isRendered) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Miniature target width ~110px
      const targetWidth = 110;
      const unscaledVp = page.getViewport({ scale: 1 });
      const thumbScale = targetWidth / unscaledVp.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: thumbScale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${Math.round(targetWidth * (unscaledVp.height / unscaledVp.width))}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const task = page.render({
        canvasContext: ctx,
        viewport,
      });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
      setIsRendered(true);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`Thumbnail render error on page ${pageNumber}:`, err);
      }
    }
  }, [pdfDoc, pageNumber, isRendered]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            renderThumbnail();
          }
        });
      },
      {
        rootMargin: '400px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [renderThumbnail]);

  return (
    <button
      id={`pdf-thumb-${pageNumber}`}
      ref={containerRef}
      type="button"
      onClick={onClick}
      className={`w-full p-2 rounded-xl text-left transition-all border cursor-pointer flex flex-col items-center group relative ${
        isSelected
          ? 'bg-red-500/10 border-red-500 dark:border-red-500 shadow-md font-bold ring-2 ring-red-500/20'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
      title={`ទំព័រទី ${pageNumber}`}
    >
      <div
        className="w-full relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-200/80 dark:border-slate-700/60"
        style={{
          aspectRatio: `${1 / (aspectRatio || 1.414)}`,
          minHeight: '135px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ display: isRendered ? 'block' : 'none' }}
        />

        {!isRendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-slate-400 bg-slate-100/90 dark:bg-slate-800/90">
            <FileText className={`w-5 h-5 mb-1 ${isSelected ? 'text-red-500' : 'text-slate-400'}`} />
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
              P. {pageNumber}
            </span>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1">
        <span
          className={`text-[10px] font-mono ${
            isSelected
              ? 'text-red-600 dark:text-red-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
          }`}
        >
          ទំព័រទី {pageNumber}
        </span>
      </div>
    </button>
  );
});

// -------------------------------------------------------------
// Subcomponent: Individual PDF Page Item for continuous vertical scroll (រូប១)
// Pre-calculates exact height to eliminate scroll jumping and flickering
// -------------------------------------------------------------
interface PdfPageItemProps {
  key?: React.Key;
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  rotation: number;
  onVisible: (pageNumber: number) => void;
  baseWidthPt: number;
  baseHeightPt: number;
  isDarkMode?: boolean;
}

const PdfPageItem = React.memo(({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  onVisible,
  baseWidthPt,
  baseHeightPt,
}: PdfPageItemProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Exact deterministic pixel dimension calculation to prevent any layout shift or jumps
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveWidthPt = isRotated ? baseHeightPt : baseWidthPt;
  const effectiveHeightPt = isRotated ? baseWidthPt : baseHeightPt;

  const targetWidthPx = Math.round(effectiveWidthPt * scale);
  const targetHeightPx = Math.round(effectiveHeightPt * scale);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    setIsRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr, rotation });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      const task = page.render({
        canvasContext: context,
        viewport,
      });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
      setIsRendered(true);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`Render error on page ${pageNumber}:`, err);
      }
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, pageNumber, scale, rotation]);

  // Observer to load and render well in advance before scrolling into viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            renderPage();
          }
          // If page covers at least 30% of viewport, notify parent of active page
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            onVisible(pageNumber);
          }
        });
      },
      {
        rootMargin: '1200px 0px', // Pre-render 1200px in advance for completely flicker-free scroll
        threshold: [0, 0.3, 0.6],
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [renderPage, onVisible, pageNumber]);

  // Re-render when scale or rotation changes
  useEffect(() => {
    if (isRendered) {
      renderPage();
    }
  }, [scale, rotation, renderPage]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      ref={containerRef}
      className="relative flex flex-col items-center my-4 transition-all duration-75 select-none"
      style={{
        width: `${targetWidthPx}px`,
        minHeight: `${targetHeightPx}px`,
      }}
    >
      <div
        className="relative rounded-xl overflow-hidden shadow-xl border border-slate-300/80 dark:border-slate-800 bg-white"
        style={{
          width: `${targetWidthPx}px`,
          height: `${targetHeightPx}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{
            display: isRendered ? 'block' : 'none',
          }}
        />

        {/* Loading skeleton placeholder: Only visible before initial render */}
        {!isRendered && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400"
          >
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-red-600" />
            <span className="text-xs font-medium font-mono text-slate-500 dark:text-slate-400">
              កំពុងបង្ហាញទំព័រ {pageNumber}...
            </span>
          </div>
        )}
      </div>

      {/* Page number badge */}
      <div className="mt-2 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1">
        <span>ទំព័រទី</span>
        <span className="text-red-600 dark:text-red-400 font-extrabold">{pageNumber}</span>
      </div>
    </div>
  );
});

export default function VisualPdfViewer({
  doc,
  onClose,
  isDarkMode = false,
}: VisualPdfViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [zoomInputValue, setZoomInputValue] = useState<string>('100');
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [viewMode, setViewMode] = useState<'scroll' | 'single'>('scroll');
  const [resolvedUrl, setResolvedUrl] = useState<string>(doc.fileUrl || '');

  // Base PDF dimensions (default A4 standard in pt: 595.28 x 841.89)
  const [baseWidthPt, setBaseWidthPt] = useState<number>(595.28);
  const [baseHeightPt, setBaseHeightPt] = useState<number>(841.89);
  const [defaultAspect, setDefaultAspect] = useState<number>(1.414);

  // PDF.js document state
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputValue, setPageInputValue] = useState<string>('1');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('កំពុងដំណើរការអានទិន្នន័យ PDF...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const singleRenderTaskRef = useRef<any | null>(null);
  const currentPageRef = useRef<number>(1);
  currentPageRef.current = currentPage;

  // Effective PDF scale factor:
  // 100% zoom = 1.35x base point size (approx 803px width, standard optimal reading width)
  const scale = (zoomPercent / 100) * 1.35;

  // Zoom handlers (រូបទី៣: អាចវាយបញ្ចូលលេខដើម្បីប្តូរកម្រិតបង្ហាញជា %)
  const handleZoomIn = () => {
    const next = Math.min(300, Math.round((zoomPercent + 15) / 5) * 5);
    setZoomPercent(next);
    setZoomInputValue(String(next));
  };

  const handleZoomOut = () => {
    const next = Math.max(30, Math.round((zoomPercent - 15) / 5) * 5);
    setZoomPercent(next);
    setZoomInputValue(String(next));
  };

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setZoomInputValue(raw);
  };

  const commitZoomInput = () => {
    let val = parseInt(zoomInputValue, 10);
    if (isNaN(val) || val < 25) {
      val = 25;
    } else if (val > 400) {
      val = 400;
    }
    setZoomPercent(val);
    setZoomInputValue(String(val));
  };

  const handleZoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitZoomInput();
  };

  // Check if URL is Google Drive preview
  const isGoogleDrive = Boolean(
    resolvedUrl &&
    (resolvedUrl.includes('drive.google.com') || resolvedUrl.includes('docs.google.com'))
  );

  // 1. Resolve full data URL or storage file
  useEffect(() => {
    let isSubscribed = true;

    async function loadData() {
      if (doc.fileStorageId) {
        try {
          const data = await getFileFromStorage(doc.fileStorageId);
          if (isSubscribed && data) {
            setResolvedUrl(data);
            return;
          }
        } catch (e) {
          console.warn('Storage fetch failed:', e);
        }
      }
      if (doc.id) {
        try {
          const data = await getFileFromStorage(doc.id);
          if (isSubscribed && data) {
            setResolvedUrl(data);
            return;
          }
        } catch (e) {}
      }
      if (isSubscribed && doc.fileUrl) {
        setResolvedUrl(doc.fileUrl);
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [doc.fileStorageId, doc.id, doc.fileUrl]);

  // 2. Parse and load PDF Document using PDF.js
  useEffect(() => {
    let isCancelled = false;

    async function loadPdfDocument() {
      if (!resolvedUrl) {
        setIsLoading(false);
        return;
      }

      // If Google Drive preview link, use iframe
      if (isGoogleDrive) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);
      setLoadingStatus('កំពុងបើកឯកសារ PDF...');

      try {
        let loadingTask: any;

        if (resolvedUrl.startsWith('data:')) {
          // Convert base64 data URL to Uint8Array
          const base64Index = resolvedUrl.indexOf(';base64,');
          if (base64Index !== -1) {
            const base64Data = resolvedUrl.substring(base64Index + 8);
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            loadingTask = pdfjsLib.getDocument({
              data: bytes,
              cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
              cMapPacked: true,
            });
          } else {
            loadingTask = pdfjsLib.getDocument({ url: resolvedUrl });
          }
        } else {
          loadingTask = pdfjsLib.getDocument({
            url: resolvedUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          });
        }

        const loadedPdf = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setCurrentPage(1);
        setPageInputValue('1');

        // Extract page dimensions from page 1 for accurate rendering & layout-shift prevention
        try {
          const firstPage = await loadedPdf.getPage(1);
          const vp = firstPage.getViewport({ scale: 1, rotation: 0 });
          if (vp && vp.width > 0 && vp.height > 0) {
            setBaseWidthPt(vp.width);
            setBaseHeightPt(vp.height);
            setDefaultAspect(vp.height / vp.width);
          }
        } catch (aspectErr) {
          console.warn('Aspect ratio fetch failed:', aspectErr);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('PDF.js loading error:', err);
        if (isCancelled) return;
        setIsLoading(false);
        setErrorMsg('មិនអាចដំណើរការ Render ឯកសារនេះបានដោយផ្ទាល់។ លោកគ្រូអាចចុចទាញយក (Download) ឬបើកក្នុង Tab ថ្មី។');
      }
    }

    loadPdfDocument();

    return () => {
      isCancelled = true;
    };
  }, [resolvedUrl, isGoogleDrive]);

  // Render active page in 'single' mode
  const renderSinglePage = useCallback(async () => {
    if (viewMode !== 'single' || !pdfDoc || !singleCanvasRef.current || isGoogleDrive) return;

    if (singleRenderTaskRef.current) {
      try {
        singleRenderTaskRef.current.cancel();
      } catch {}
      singleRenderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = singleCanvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr, rotation });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      const task = page.render({
        canvasContext: context,
        viewport,
      });
      singleRenderTaskRef.current = task;
      await task.promise;
      singleRenderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Single page render notice:', err);
      }
    }
  }, [viewMode, pdfDoc, currentPage, scale, rotation, isGoogleDrive]);

  useEffect(() => {
    if (viewMode === 'single') {
      renderSinglePage();
    }
  }, [viewMode, renderSinglePage]);

  // Callback when a page enters viewport in continuous scroll mode (only updates if changed)
  const handlePageVisible = useCallback((pageNum: number) => {
    if (currentPageRef.current !== pageNum) {
      currentPageRef.current = pageNum;
      setCurrentPage(pageNum);
      setPageInputValue(String(pageNum));
    }
  }, []);

  // Auto-scroll active thumbnail into view in the sidebar
  useEffect(() => {
    if (showThumbnails && numPages > 1) {
      const thumbEl = document.getElementById(`pdf-thumb-${currentPage}`);
      if (thumbEl) {
        thumbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentPage, showThumbnails, numPages]);

  // Smooth scroll to target page
  const scrollToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > numPages) return;

    if (viewMode === 'scroll') {
      const el = document.getElementById(`pdf-page-${pageNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setCurrentPage(pageNum);
      setPageInputValue(String(pageNum));
    } else {
      setCurrentPage(pageNum);
      setPageInputValue(String(pageNum));
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      scrollToPage(currentPage + 1);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      scrollToPage(pageNum);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, isFullscreen, onClose]);

  const handleDownload = () => {
    const urlToUse = resolvedUrl || doc.fileUrl;
    if (!urlToUse) return;

    if (urlToUse.startsWith('data:')) {
      try {
        const [header, b64] = urlToUse.split(',');
        const mimeMatch = header.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.fileName || `${doc.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      } catch (e) {
        console.warn('Blob download fallback:', e);
      }
    }

    const a = document.createElement('a');
    a.href = urlToUse;
    a.download = doc.fileName || `${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const activeCanvas = (document.querySelector(`#pdf-page-${currentPage} canvas`) as HTMLCanvasElement) || singleCanvasRef.current;
    if (activeCanvas) {
      try {
        const dataUrl = activeCanvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${doc.title} - ទំព័រ ${currentPage}</title>
                <style>
                  body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
                  img { max-width: 100%; height: auto; }
                  @media print {
                    body { margin: 0; }
                    img { width: 100%; }
                  }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" />
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 400);
          return;
        }
      } catch (e) {
        console.warn('Canvas print failed, trying window.open:', e);
      }
    }

    const urlToUse = resolvedUrl || doc.fileUrl;
    if (urlToUse && !urlToUse.startsWith('data:')) {
      const printWindow = window.open(urlToUse, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Google Drive Embed URL formatter
  const getDrivePreviewUrl = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${
        isFullscreen
          ? 'bg-black'
          : isDarkMode
          ? 'bg-[#0b1120] text-slate-100'
          : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header / PDF Toolbar */}
      <header
        className={`h-14 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 shadow-sm ${
          isDarkMode
            ? 'bg-[#0f172a] border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        {/* Document Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {doc.title}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold shrink-0">
                PDF Reader
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {doc.subject} {doc.grade ? `• ${doc.grade}` : ''}{' '}
              {doc.fileSize ? `• ${doc.fileSize}` : ''}
            </p>
          </div>
        </div>

        {/* Page Navigation Controls */}
        {!isGoogleDrive && numPages > 0 && (
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border-none bg-transparent cursor-pointer"
              title="ទំព័រមុន (Previous Page)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={pageInputValue}
                onChange={e => setPageInputValue(e.target.value)}
                onBlur={() => setPageInputValue(String(currentPage))}
                className="w-10 text-center text-xs font-bold font-mono py-0.5 px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-800 dark:text-slate-100"
              />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 select-none">
                / {numPages}
              </span>
            </form>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border-none bg-transparent cursor-pointer"
              title="ទំព័របន្ទាប់ (Next Page)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Scroll vs Single Page Mode Toggle */}
          {!isGoogleDrive && numPages > 1 && (
            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('scroll')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border-none transition-all ${
                  viewMode === 'scroll'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                }`}
                title="អូសចុះឡើង (Continuous Scroll)"
              >
                <Scroll className="w-3.5 h-3.5" />
                <span>អូសចុះឡើង</span>
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border-none transition-all ${
                  viewMode === 'single'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                }`}
                title="ទំព័រទោល (Single Page)"
              >
                <FileBox className="w-3.5 h-3.5" />
                <span>ទំព័រទោល</span>
              </button>
            </div>
          )}

          {/* Thumbnails Sidebar Toggle */}
          {!isGoogleDrive && numPages > 1 && (
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-2 rounded-lg transition-colors cursor-pointer border-none ${
                showThumbnails
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'
              }`}
              title="បញ្ជីទំព័រ (Thumbnails)"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}

          {/* Zoom controls with percentage input (រូបទី៣: អាចវាយបញ្ចូលលេខដើម្បីប្ដូរកម្រិតបង្ហាញជា %) */}
          {!isGoogleDrive && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomPercent <= 30}
                className="p-1 hover:text-red-600 disabled:opacity-30 disabled:hover:text-inherit cursor-pointer border-none bg-transparent text-slate-600 dark:text-slate-300 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="ពង្រួម (Zoom Out)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <form onSubmit={handleZoomSubmit} className="flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={zoomInputValue}
                  onChange={handleZoomInputChange}
                  onBlur={commitZoomInput}
                  onFocus={e => e.target.select()}
                  className="w-10 sm:w-11 text-center text-xs font-bold font-mono py-0.5 px-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-800 dark:text-slate-100 transition-all"
                  title="វាយបញ្ចូលកម្រិត % (ឧទាហរណ៍ 100, 125, 150) រួចចុច Enter"
                />
                <span
                  onClick={() => {
                    setZoomPercent(100);
                    setZoomInputValue('100');
                  }}
                  className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 ml-1 select-none cursor-pointer hover:text-red-600"
                  title="ចុចដើម្បីកំណត់ 100% ឡើងវិញ"
                >
                  %
                </span>
              </form>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomPercent >= 300}
                className="p-1 hover:text-red-600 disabled:opacity-30 disabled:hover:text-inherit cursor-pointer border-none bg-transparent text-slate-600 dark:text-slate-300 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="ពង្រីក (Zoom In)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Rotate */}
          {!isGoogleDrive && (
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer border-none bg-transparent"
              title="បង្វិល 90° (Rotate)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {/* Info toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors cursor-pointer border-none ${
              showInfo
                ? 'bg-red-50 text-red-600 dark:bg-red-950/40'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'
            }`}
            title="ព័ត៌មានឯកសារ"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Print */}
          {(resolvedUrl || doc.fileUrl) && (
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer border-none bg-transparent"
              title="បោះពុម្ព (Print)"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {/* Download */}
          {(resolvedUrl || doc.fileUrl) && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border-none"
              title="ទាញយក File PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ទាញយក</span>
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer border-none bg-transparent"
            title={isFullscreen ? 'ចេញពីពេញអេក្រង់' : 'ពេញអេក្រង់'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
            title="បិទ (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area: Thumbnails + Continuous Scroll / Single Page + Info Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Page Thumbnails Rail */}
        {!isGoogleDrive && numPages > 1 && showThumbnails && (
          <aside
            className={`w-36 sm:w-44 border-r flex flex-col shrink-0 overflow-y-auto ${
              isDarkMode
                ? 'bg-[#0f172a] border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-between sticky top-0 bg-inherit z-10">
              <span>ទំព័រទាំងអស់ ({numPages})</span>
              <button
                onClick={() => setShowThumbnails(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0.5"
                title="បង្រួម"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-2 space-y-2">
              {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
                <PdfThumbnailItem
                  key={p}
                  pdfDoc={pdfDoc}
                  pageNumber={p}
                  isSelected={p === currentPage}
                  onClick={() => scrollToPage(p)}
                  aspectRatio={defaultAspect}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          </aside>
        )}

        {/* PDF Reader Canvas / View Area (អូសចុះឡើង Smooth គ្មាន Flicker) */}
        <main
          ref={mainScrollRef}
          className="flex-1 flex flex-col items-center overflow-y-auto overflow-x-auto p-2 sm:p-6 bg-slate-200/80 dark:bg-slate-950 scroll-smooth"
        >
          {/* Loading state */}
          {isLoading && (
            <div className="my-auto flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {loadingStatus}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                ប្រព័ន្ធកំពុងដំណើរការរៀបចំទំព័រ PDF ទាំងអស់
              </p>
            </div>
          )}

          {/* Error fallback state */}
          {errorMsg && !isLoading && (
            <div className="my-auto text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/40 shadow-xl max-w-md">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
                មិនអាចបង្ហាញឯកសារ PDF
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                {errorMsg}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  ទាញយក File PDF
                </button>
                {resolvedUrl && !resolvedUrl.startsWith('data:') && (
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 no-underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    បើកក្នុង Tab ថ្មី
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Google Drive Iframe Mode */}
          {!isLoading && isGoogleDrive && resolvedUrl && (
            <div className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-white">
              <iframe
                src={getDrivePreviewUrl(resolvedUrl)}
                title={doc.title}
                className="w-full h-full border-none"
                allow="autoplay"
              />
            </div>
          )}

          {/* CONTINUOUS VERTICAL SCROLL MODE (Default: អូសចុះឡើង) */}
          {!isLoading && !errorMsg && !isGoogleDrive && pdfDoc && viewMode === 'scroll' && (
            <div className="w-full flex flex-col items-center py-2">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <PdfPageItem
                  key={pageNum}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  scale={scale}
                  rotation={rotation}
                  onVisible={handlePageVisible}
                  baseWidthPt={baseWidthPt}
                  baseHeightPt={baseHeightPt}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          )}

          {/* SINGLE PAGE MODE (ទំព័រម្តងមួយ) */}
          {!isLoading && !errorMsg && !isGoogleDrive && pdfDoc && viewMode === 'single' && (
            <div className="my-auto relative flex flex-col items-center transition-transform duration-150 py-4">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-white">
                <canvas
                  ref={singleCanvasRef}
                  className="block max-w-full"
                />
              </div>

              {/* Floating Bottom Quick Bar */}
              {numPages > 1 && (
                <div className="mt-4 bg-slate-900/85 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-3 shadow-lg text-xs">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                    className="hover:text-red-400 disabled:opacity-30 cursor-pointer border-none bg-transparent text-white"
                    title="ទំព័រមុន"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold font-mono">
                    {currentPage} / {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage >= numPages}
                    className="hover:text-red-400 disabled:opacity-30 cursor-pointer border-none bg-transparent text-white"
                    title="ទំព័របន្ទាប់"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Info Sidebar */}
        {showInfo && (
          <aside
            className={`w-72 sm:w-80 border-l p-4 flex flex-col justify-between shrink-0 overflow-y-auto ${
              isDarkMode
                ? 'bg-[#0f172a] border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ព័ត៌មានលម្អិតឯកសារ PDF
                </h4>
                <button
                  onClick={() => setShowInfo(false)}
                  className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  ឈ្មោះឯកសារ
                </label>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {doc.title}
                </p>
              </div>

              {doc.description && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    ការពិពណ៌នា
                  </label>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">មុខវិជ្ជា</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {doc.subject}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">កម្រិតថ្នាក់</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {doc.grade || 'មិនបានបញ្ជាក់'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ទំហំឯកសារ</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                    {doc.fileSize || 'មិនដឹង'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ចំនួនទំព័រ</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                    {numPages > 0 ? `${numPages} ទំព័រ` : '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>បច្ចេកវិទ្យា Continuous Scroll</span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  គាំទ្រការអូសចុះឡើង (Scroll) ដោយរលូន និងប្រើប្រាស់ Intersection Observer ដើម្បី Pre-render ទំព័រនីមួយៗឱ្យលឿនបំផុត។
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleDownload}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border-none shadow"
              >
                <Download className="w-4 h-4" />
                ទាញយក File PDF
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
