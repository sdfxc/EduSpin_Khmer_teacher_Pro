import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Presentation,
  Play,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Download,
  FileText,
  Palette,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Tv,
  ListOrdered,
  Sparkles,
  PenTool,
  Eraser,
  LayoutGrid,
  RotateCcw,
  Eye,
  Check,
  Layers,
  HelpCircle
} from 'lucide-react';
import { PptxViewer, type SlideHandle } from '@aiden0z/pptx-renderer';
import { ExternalPowerPointDoc } from '../../types/externalDocs';
import { VisualSlide } from '../../lib/pptxParser';
import { getFileFromStorage } from '../../lib/fileStorage';
import FormulaRenderer from '../FormulaRenderer';

interface VisualPowerPointViewerProps {
  doc: ExternalPowerPointDoc;
  onClose: () => void;
  isDarkMode?: boolean;
}

export type SlideTransition = 'none' | 'fade' | 'push' | 'wipe' | 'zoom' | 'flip' | 'split';
export type AnimationMode = 'none' | 'auto' | 'step';
type SlideTheme = 'office' | 'dark' | 'navy' | 'emerald' | 'crimson';

interface SlideThumbnailItemProps {
  key?: React.Key;
  viewer: PptxViewer | null;
  index: number;
  isActive: boolean;
  fallbackSlide: VisualSlide;
  onClick: () => void;
  isDarkMode: boolean;
}

function SlideThumbnailItem({
  viewer,
  index,
  isActive,
  fallbackSlide,
  onClick,
  isDarkMode,
}: SlideThumbnailItemProps) {
  const thumbContainerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SlideHandle | null>(null);
  const [hasNativeThumb, setHasNativeThumb] = useState(false);

  useEffect(() => {
    if (!viewer || !thumbContainerRef.current) return;

    let isCancelled = false;

    const renderThumb = () => {
      try {
        if (handleRef.current) {
          handleRef.current.dispose();
          handleRef.current = null;
        }

        if (thumbContainerRef.current) {
          thumbContainerRef.current.innerHTML = '';
          const handle = viewer.renderThumbnailToContainer(index, thumbContainerRef.current, { width: 176 });
          if (handle && !isCancelled) {
            handleRef.current = handle;
            setHasNativeThumb(true);
            enhanceRenderedSlide(thumbContainerRef.current);
            setTimeout(() => {
              if (!isCancelled && thumbContainerRef.current) {
                enhanceRenderedSlide(thumbContainerRef.current);
              }
            }, 60);
          }
        }
      } catch (err) {
        console.warn(`Failed to render thumbnail for slide ${index + 1}:`, err);
        setHasNativeThumb(false);
      }
    };

    renderThumb();

    return () => {
      isCancelled = true;
      if (handleRef.current) {
        try {
          handleRef.current.dispose();
        } catch {}
        handleRef.current = null;
      }
    };
  }, [viewer, index]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl transition-all cursor-pointer p-2 flex items-start gap-2 group border-none ${
        isActive
          ? 'bg-orange-500/10 ring-2 ring-[#d04423] shadow-md'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 bg-transparent'
      }`}
    >
      {/* Slide Number Badge */}
      <span
        className={`text-[11px] font-mono font-bold w-5 text-center mt-1 shrink-0 ${
          isActive ? 'text-[#d04423]' : 'text-slate-400'
        }`}
      >
        {index + 1}
      </span>

      {/* Miniature Slide Preview */}
      <div
        className={`flex-1 aspect-[16/9] rounded-lg border overflow-hidden relative flex items-center justify-center shadow-xs ${
          isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Native PPTX Engine Thumbnail */}
        <div
          ref={thumbContainerRef}
          className={`w-full h-full flex items-center justify-center overflow-hidden pointer-events-none ${
            hasNativeThumb ? 'block' : 'hidden'
          }`}
        />

        {/* Fallback Preview if Native Thumbnail is not yet rendered */}
        {!hasNativeThumb && (
          <div className="w-full h-full p-2 flex flex-col justify-between overflow-hidden pointer-events-none select-none">
            <p className="text-[9px] font-bold truncate leading-tight text-slate-800 dark:text-slate-200">
              {fallbackSlide.title || `ស្លាយទី ${index + 1}`}
            </p>
            {fallbackSlide.images && fallbackSlide.images.length > 0 ? (
              <div className="h-6 w-full rounded bg-slate-200 dark:bg-slate-700 overflow-hidden my-auto">
                <img
                  src={fallbackSlide.images[0]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="space-y-0.5 my-auto">
                <div className="h-1 w-3/4 rounded-full bg-slate-300 dark:bg-slate-600" />
                <div className="h-1 w-1/2 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
            )}
            <span className="text-[8px] text-slate-400 font-mono text-right">
              {index + 1}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

interface ActiveSlideStageProps {
  viewer: PptxViewer | null;
  slideIndex: number;
  scale: number;
  width: number;
  height: number;
  transitionClass: string;
  isPenActive: boolean;
  penCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseUp: () => void;
  isLaserPointer: boolean;
  onAdvance: () => void;
  fallbackSlide: VisualSlide;
  currentTheme: { bg: string; text: string; accent: string; cardBg: string; border: string };
  doc: ExternalPowerPointDoc;
}

// Function to post-process and enhance rendered PPTX slides:
// 1. Prevents Khmer vowel/ascender cut-offs (ដាច់សក់ ក្បាលអក្សរ)
// 2. Unhides animated/hidden exercise questions, tables, and math equations (like Slide 20)
// 3. Applies proper fallback fonts for Khmer OS, Siemreap, Moul Light, Content, Battambang, Andong Tep, Tacteing, Times New Roman, and Math/Physics formulas
function enhanceRenderedSlide(container: HTMLElement) {
  if (!container) return;

  const elements = container.querySelectorAll<HTMLElement>('*');
  elements.forEach((el) => {
    const tagName = el.tagName.toLowerCase();

    // Prevent clipping of Khmer vowels, ascenders and descenders
    if (
      tagName === 'p' ||
      tagName === 'span' ||
      tagName === 'div' ||
      tagName === 'h1' ||
      tagName === 'h2' ||
      tagName === 'h3' ||
      tagName === 'h4' ||
      tagName === 'h5' ||
      tagName === 'h6' ||
      tagName === 'text' ||
      tagName === 'tspan' ||
      el.classList.contains('pptx-shape') ||
      el.classList.contains('pptx-text') ||
      el.classList.contains('pptx-paragraph') ||
      el.classList.contains('pptx-run')
    ) {
      // Allow ascenders and descenders to render without box clipping
      if (el.style.overflow === 'hidden' && el !== container) {
        el.style.overflow = 'visible';
      }
      el.style.overflowY = 'visible';

      // Ensure proper line-height for Khmer script so top diacritics are whole
      const computed = window.getComputedStyle(el);
      const fontSize = parseFloat(computed.fontSize) || 16;
      const lineHeight = parseFloat(computed.lineHeight);

      if (!isNaN(lineHeight) && lineHeight < fontSize * 1.35) {
        el.style.lineHeight = '1.48';
      }

      // Unhide any content hidden by entrance animation or 0-opacity flags
      if (el.style.opacity === '0' || computed.opacity === '0') {
        el.style.opacity = '1';
      }
      if (el.style.visibility === 'hidden' || computed.visibility === 'hidden') {
        el.style.visibility = 'visible';
      }
      if (el.style.display === 'none' && !el.classList.contains('hidden')) {
        el.style.display = 'block';
      }

      // Check text color contrast: if text color is invisible or white on white
      const color = computed.color;
      if (
        color === 'rgba(0, 0, 0, 0)' ||
        color === 'transparent' ||
        color === 'rgb(255, 255, 255)' ||
        color === 'rgba(255, 255, 255, 1)'
      ) {
        const bg = computed.backgroundColor;
        if (
          bg === 'rgba(0, 0, 0, 0)' ||
          bg === 'transparent' ||
          bg === 'rgb(255, 255, 255)' ||
          bg === 'rgba(255, 255, 255, 1)'
        ) {
          if (el.textContent && el.textContent.trim().length > 0) {
            el.style.color = '#1e293b';
          }
        }
      }

      // Map fonts to supported font families
      const ff = el.style.fontFamily || computed.fontFamily;
      if (ff) {
        const lowerFF = ff.toLowerCase();
        if (lowerFF.includes('siemreap') || lowerFF.includes('siem reap')) {
          el.style.fontFamily = "'Khmer OS Siemreap', 'Siemreap', 'Kantumruy Pro', sans-serif";
        } else if (lowerFF.includes('battambang')) {
          el.style.fontFamily = "'Khmer OS Battambang', 'Battambang', 'Kantumruy Pro', sans-serif";
        } else if (lowerFF.includes('content') || (lowerFF.includes('khmer os') && !lowerFF.includes('moul') && !lowerFF.includes('muol'))) {
          el.style.fontFamily = "'Khmer OS Content', 'Content', 'Noto Sans Khmer', 'Battambang', sans-serif";
        } else if (lowerFF.includes('moul') || lowerFF.includes('muol')) {
          el.style.fontFamily = "'Khmer OS Muol Light', 'Khmer OS Moul', 'Moulpali', 'Moul', 'Koulen', serif";
        } else if (lowerFF.includes('andong') || lowerFF.includes('tep')) {
          el.style.fontFamily = "'ANdong tep', 'Andong Tep', 'Kantumruy Pro', 'Hanuman', sans-serif";
        } else if (lowerFF.includes('tacteing') || lowerFF.includes('tacteng') || lowerFF.includes('wingdings')) {
          el.style.fontFamily = "'Tacteing', 'Wingdings', 'Segoe UI Symbol', 'Symbol', sans-serif";
        } else if (lowerFF.includes('times') || lowerFF.includes('romand') || lowerFF.includes('roman')) {
          el.style.fontFamily = "'Times New Roman', 'Tinos', 'Noto Serif Khmer', serif";
        } else if (lowerFF.includes('math') || lowerFF.includes('cambria') || lowerFF.includes('katex')) {
          el.style.fontFamily = "'STIX Two Math', 'Cambria Math', 'KaTeX_Math', 'Times New Roman', serif";
        }
      }
    }

    if (tagName === 'svg') {
      (el as unknown as SVGElement).style.overflow = 'visible';
    }
  });
}

function ActiveSlideStage({
  viewer,
  slideIndex,
  scale,
  width,
  height,
  transitionClass,
  isPenActive,
  penCanvasRef,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  isLaserPointer,
  onAdvance,
  fallbackSlide,
  currentTheme,
  doc,
}: ActiveSlideStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SlideHandle | null>(null);
  const [hasNativeSlide, setHasNativeSlide] = useState(false);

  useEffect(() => {
    if (!viewer || !mountRef.current) return;
    let isCancelled = false;
    const container = mountRef.current;

    // Clean up previous slide
    if (handleRef.current) {
      try {
        handleRef.current.dispose();
      } catch {}
      handleRef.current = null;
    }

    container.innerHTML = '';
    setHasNativeSlide(false);

    try {
      const handle = viewer.renderSlideToContainer(slideIndex, container, scale);
      if (handle && !isCancelled) {
        handleRef.current = handle;
        setHasNativeSlide(true);

        // Enhance rendered DOM immediately and after layout paint
        enhanceRenderedSlide(container);
        requestAnimationFrame(() => {
          if (!isCancelled && container) {
            enhanceRenderedSlide(container);
          }
        });
        setTimeout(() => {
          if (!isCancelled && container) {
            enhanceRenderedSlide(container);
          }
        }, 80);
      }
    } catch (err) {
      console.warn(`Error rendering slide ${slideIndex + 1}:`, err);
      if (!isCancelled) {
        setHasNativeSlide(false);
      }
    }

    return () => {
      isCancelled = true;
      if (handleRef.current) {
        try {
          handleRef.current.dispose();
        } catch {}
        handleRef.current = null;
      }
    };
  }, [viewer, slideIndex, scale]);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={`relative select-none shadow-2xl rounded-2xl overflow-hidden bg-white ${transitionClass}`}
      onClick={() => {
        if (!isPenActive && !isLaserPointer) {
          onAdvance();
        }
      }}
    >
      {/* 1. NATIVE HIGH-FIDELITY PPTX STAGE */}
      <div
        ref={mountRef}
        className={`w-full h-full relative pptx-stage-content ${
          hasNativeSlide ? 'block' : 'hidden'
        }`}
      />

      {/* 2. FALLBACK STAGE (if native renderer is parsing or error) */}
      {!hasNativeSlide && (
        <div
          className={`w-full h-full rounded-2xl flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden border ${
            currentTheme.bg
          } ${currentTheme.text} ${currentTheme.border}`}
        >
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] uppercase tracking-wider font-bold ${currentTheme.accent}`}>
                {doc.subject || 'បទបង្ហាញ PowerPoint'}
              </span>
              {doc.grade && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-75 font-medium">
                  {doc.grade}
                </span>
              )}
            </div>
            <span className="text-xs font-mono opacity-50 font-bold">
              {slideIndex + 1}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center my-auto space-y-4">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight pt-1">
              <FormulaRenderer text={fallbackSlide.title} />
            </h1>
            {fallbackSlide.subtitle && (
              <p className="text-sm sm:text-base opacity-80 pt-0.5">
                <FormulaRenderer text={fallbackSlide.subtitle} />
              </p>
            )}
            {fallbackSlide.bulletPoints && fallbackSlide.bulletPoints.length > 0 && (
              <ul className="space-y-2.5">
                {fallbackSlide.bulletPoints.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-orange-500" />
                    <span className="text-sm sm:text-base leading-relaxed pt-0.5">
                      <FormulaRenderer text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {fallbackSlide.images && fallbackSlide.images.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                {fallbackSlide.images.slice(0, 2).map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    className="max-h-48 rounded-lg shadow object-contain bg-black/5"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-3 mt-4 text-[10px] opacity-60">
            <span>{doc.title}</span>
            <span>ស្លាយទី {slideIndex + 1}</span>
          </div>
        </div>
      )}

      {/* 3. DRAWING PEN CANVAS OVERLAY */}
      <canvas
        ref={penCanvasRef}
        width={width}
        height={height}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        className={`absolute inset-0 w-full h-full z-40 rounded-2xl ${
          isPenActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
      />
    </div>
  );
}

export default function VisualPowerPointViewer({
  doc,
  onClose,
  isDarkMode = false,
}: VisualPowerPointViewerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideCount, setSlideCount] = useState<number>(doc.slideCount || doc.slides?.length || 1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [theme, setTheme] = useState<SlideTheme>('office');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [zoomInputStr, setZoomInputStr] = useState<string>('100');
  
  // Transition & Animation Controls
  const [transitionEffect, setTransitionEffect] = useState<SlideTransition>('fade');
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [animationMode, setAnimationMode] = useState<AnimationMode>('none');
  const [currentAnimationStep, setCurrentAnimationStep] = useState(0);

  // Teaching Tools: Laser pointer & Drawing Pen
  const [isLaserPointer, setIsLaserPointer] = useState(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [isPenActive, setIsPenActive] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Fallback and Raw File Resolution
  const [activeSlides, setActiveSlides] = useState<VisualSlide[]>(
    doc.slides && doc.slides.length > 0
      ? doc.slides
      : [
          {
            id: 'default-1',
            slideNumber: 1,
            title: doc.title,
            bulletPoints: ['មិនមានទិន្នន័យស្លាយ'],
            images: [],
          },
        ]
  );
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string>(doc.fileUrl || '');
  const [rawArrayBuffer, setRawArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mainStageRef = useRef<HTMLElement>(null);
  const offscreenMountRef = useRef<HTMLDivElement>(null);
  const penCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<PptxViewer | null>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Track responsive stage dimensions
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 960,
    height: 540,
  });

  useEffect(() => {
    if (!mainStageRef.current) return;
    const updateSize = () => {
      if (mainStageRef.current) {
        setStageSize({
          width: mainStageRef.current.clientWidth || 960,
          height: mainStageRef.current.clientHeight || 540,
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(mainStageRef.current);
    return () => ro.disconnect();
  }, []);

  // Load raw PPTX file and structured slides from IndexedDB or file URL
  useEffect(() => {
    let isCancelled = false;

    async function loadResources() {
      // 1. Structured slides
      if (doc.fileStorageId) {
        try {
          const storedSlides = await getFileFromStorage(`slides_${doc.fileStorageId}`);
          if (storedSlides && !isCancelled) {
            const parsed = JSON.parse(storedSlides);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setActiveSlides(parsed);
              setSlideCount(parsed.length);
            }
          }
        } catch (e) {
          console.warn('Could not read cached slides metadata', e);
        }
      }

      // 2. Raw binary PPTX file for high-fidelity renderer
      let fileDataUri = resolvedFileUrl;
      if (!fileDataUri && doc.fileStorageId) {
        try {
          const storedFile = await getFileFromStorage(doc.fileStorageId);
          if (storedFile && !isCancelled) {
            fileDataUri = storedFile;
            setResolvedFileUrl(storedFile);
          }
        } catch (e) {
          console.warn('Could not read stored binary file', e);
        }
      }

      if (fileDataUri && !isCancelled) {
        try {
          const res = await fetch(fileDataUri);
          const buf = await res.arrayBuffer();
          if (!isCancelled && buf && buf.byteLength > 0) {
            setRawArrayBuffer(buf);
          }
        } catch (err) {
          console.warn('Failed to convert fileDataUri to ArrayBuffer', err);
        }
      }
    }

    loadResources();

    return () => {
      isCancelled = true;
    };
  }, [doc.fileStorageId, doc.fileUrl, resolvedFileUrl]);

  // Synchronize zoom input string when zoomLevel changes
  useEffect(() => {
    setZoomInputStr(String(zoomLevel));
  }, [zoomLevel]);

  // Initialize PptxViewer with high-fidelity OpenXML parser
  useEffect(() => {
    if (!rawArrayBuffer || !offscreenMountRef.current) return;

    let isMounted = true;

    async function initPptx() {
      try {
        setViewerError(null);
        setIsViewerReady(false);

        if (viewerRef.current) {
          try {
            viewerRef.current.destroy();
          } catch {}
          viewerRef.current = null;
        }

        const viewer = new PptxViewer(offscreenMountRef.current!, {
          fitMode: 'contain',
          lazyMedia: false,
          lazySlides: false,
        });

        await viewer.open(rawArrayBuffer, { renderMode: 'slide' });

        if (!isMounted) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;
        if (viewer.slideCount > 0) {
          setSlideCount(viewer.slideCount);
        }
        setIsViewerReady(true);
      } catch (err) {
        console.error('PptxViewer initialization failed:', err);
        if (isMounted) {
          setViewerError('មិនអាចដំណើរការម៉ាស៊ីន Office PPTX បានទេ។ កំពុងប្តូរទៅទម្រង់ជំនួយ (Visual Presentation Mode)');
          setIsViewerReady(false);
        }
      }
    }

    initPptx();

    return () => {
      isMounted = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}
        viewerRef.current = null;
      }
    };
  }, [rawArrayBuffer]);

  // Synchronize Slide navigation
  const navigateToSlide = useCallback(
    (index: number, direction: 'next' | 'prev') => {
      if (index < 0 || index >= slideCount) return;
      setTransitionDirection(direction);
      setCurrentSlideIndex(index);
      setCurrentAnimationStep(0);

      // Smoothly scroll sidebar thumbnail into view
      const thumbBtn = thumbnailRefs.current[index];
      if (thumbBtn) {
        thumbBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Clear drawing canvas when changing slide
      if (penCanvasRef.current) {
        const ctx = penCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, penCanvasRef.current.width, penCanvasRef.current.height);
        }
      }
    },
    [slideCount]
  );

  const handleNextSlide = useCallback(() => {
    if (currentSlideIndex < slideCount - 1) {
      navigateToSlide(currentSlideIndex + 1, 'next');
    }
  }, [currentSlideIndex, navigateToSlide, slideCount]);

  const handlePrevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      navigateToSlide(currentSlideIndex - 1, 'prev');
    }
  }, [currentSlideIndex, navigateToSlide]);

  // Display dimensions and scaling
  const pWidth = viewerRef.current?.slideWidth || 960;
  const pHeight = viewerRef.current?.slideHeight || 540;

  const paddingX = isFullscreen ? 16 : 48;
  const paddingY = isFullscreen ? 16 : (showNotes ? 140 : 64);
  const availableW = Math.max(320, stageSize.width - paddingX);
  const availableH = Math.max(200, stageSize.height - paddingY);

  const fitScale = Math.min(availableW / pWidth, availableH / pHeight);
  const effectiveScale = (fitScale > 0 ? fitScale : 0.8) * (zoomLevel / 100);
  const slideDisplayWidth = Math.round(pWidth * effectiveScale);
  const slideDisplayHeight = Math.round(pHeight * effectiveScale);

  const handleApplyZoomInput = () => {
    const parsed = parseInt(zoomInputStr, 10);
    if (!isNaN(parsed) && parsed >= 25 && parsed <= 300) {
      setZoomLevel(parsed);
    } else {
      setZoomInputStr(String(zoomLevel));
    }
  };

  // Keyboard navigation for PowerPoint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          handleToggleFullscreen();
        }
        if (isGridModalOpen) {
          setIsGridModalOpen(false);
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (!isFullscreen) {
          handleToggleFullscreen();
        }
      } else if (e.key === 'b' || e.key === 'B') {
        // Toggle drawing pen
        setIsPenActive(prev => !prev);
      } else if (e.key === 'l' || e.key === 'L') {
        // Toggle laser pointer
        setIsLaserPointer(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, isFullscreen, isGridModalOpen]);

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Laser pointer tracking in presentation mode
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLaserPointer) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  // Drawing Pen Canvas Logic
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPenActive || !penCanvasRef.current) return;
    const canvas = penCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isPenActive || !penCanvasRef.current) return;
    const canvas = penCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!penCanvasRef.current) return;
    const ctx = penCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, penCanvasRef.current.width, penCanvasRef.current.height);
    }
  };

  // Themes palette definition for fallback mode
  const themeStyles: Record<
    SlideTheme,
    { bg: string; text: string; accent: string; cardBg: string; border: string }
  > = {
    office: {
      bg: 'bg-white',
      text: 'text-slate-900',
      accent: 'text-orange-600',
      cardBg: 'bg-slate-50',
      border: 'border-slate-200',
    },
    dark: {
      bg: 'bg-[#0f172a]',
      text: 'text-slate-100',
      accent: 'text-orange-400',
      cardBg: 'bg-slate-900/80',
      border: 'border-slate-800',
    },
    navy: {
      bg: 'bg-[#0a192f]',
      text: 'text-blue-50',
      accent: 'text-cyan-400',
      cardBg: 'bg-[#112240]',
      border: 'border-cyan-900/50',
    },
    emerald: {
      bg: 'bg-[#064e3b]',
      text: 'text-emerald-50',
      accent: 'text-emerald-300',
      cardBg: 'bg-[#043d2e]',
      border: 'border-emerald-800',
    },
    crimson: {
      bg: 'bg-[#450a0a]',
      text: 'text-rose-50',
      accent: 'text-amber-300',
      cardBg: 'bg-[#330606]',
      border: 'border-rose-900',
    },
  };

  const currentTheme = themeStyles[theme];
  const slides = activeSlides;
  const currentFallbackSlide: VisualSlide = slides[currentSlideIndex] || slides[0];

  // Helper to compute transition animation class
  const getTransitionClass = () => {
    if (transitionEffect === 'fade') return 'pptx-transition-fade';
    if (transitionEffect === 'push') {
      return transitionDirection === 'next' ? 'pptx-transition-push-next' : 'pptx-transition-push-prev';
    }
    if (transitionEffect === 'wipe') return 'pptx-transition-wipe';
    if (transitionEffect === 'zoom') return 'pptx-transition-zoom';
    if (transitionEffect === 'flip') return 'pptx-transition-flip';
    if (transitionEffect === 'split') return 'pptx-transition-split';
    return '';
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 flex flex-col ${
        isFullscreen
          ? 'bg-black select-none'
          : isDarkMode
          ? 'bg-[#0b1120] text-slate-100'
          : 'bg-[#f1f5f9] text-slate-900'
      }`}
    >
      {/* Glowing Laser pointer */}
      {isLaserPointer && laserPos && (
        <div
          className="fixed pointer-events-none z-60 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_16px_4px_#ef4444] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* TOP POWERPOINT RIBBON / TOOLBAR */}
      {!isFullscreen && (
        <header className="h-14 px-4 bg-[#d04423] text-white flex items-center justify-between shadow-md shrink-0 select-none z-30">
          <div className="flex items-center gap-3">
            {/* PowerPoint Icon Badge */}
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm shadow-sm">
              <span className="font-serif">P</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold truncate max-w-xs sm:max-w-md">
                  {doc.title}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 font-mono flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>PowerPoint Office Engine</span>
                </span>
              </div>
              <p className="text-[10px] text-white/80">
                {doc.subject} • {slideCount} ស្លាយសរុប • {isViewerReady ? '✓ គាំទ្រ Shape, Font & Color ពិត' : 'ទម្រង់ Visual Presentation'}
              </p>
            </div>
          </div>

          {/* Quick Actions in PowerPoint Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Slide Show / Present Button (F5) */}
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#d04423] rounded-lg text-xs font-bold hover:bg-orange-50 active:scale-95 transition-all shadow-sm cursor-pointer border-none"
              title="បញ្ចាំងស្លាយពេញអេក្រង់ (F5 / Presentation Mode)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">បញ្ចាំងស្លាយ (F5)</span>
            </button>

            {/* Transition Effect Selector */}
            <div className="hidden md:flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg text-xs">
              <Layers className="w-3.5 h-3.5 text-white/80" />
              <span className="text-[10px] text-white/70">Transition:</span>
              <select
                value={transitionEffect}
                onChange={e => setTransitionEffect(e.target.value as SlideTransition)}
                className="bg-transparent text-white text-xs font-bold border-none outline-none cursor-pointer pr-1"
                title="ជ្រើសរើសចលនាផ្លាស់ប្តូរស្លាយ (Slide Transition)"
              >
                <option value="none" className="text-slate-900">None (គ្មាន)</option>
                <option value="fade" className="text-slate-900">Fade (រលាយ)</option>
                <option value="push" className="text-slate-900">Push (រុញ)</option>
                <option value="wipe" className="text-slate-900">Wipe (ជូតកាត់)</option>
                <option value="zoom" className="text-slate-900">Zoom (ពង្រីក)</option>
                <option value="flip" className="text-slate-900">Flip 3D (បត់)</option>
                <option value="split" className="text-slate-900">Split (ពុះ)</option>
              </select>
            </div>

            {/* Animation Mode Selector (Step-by-step or Auto) */}
            <div className="hidden lg:flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg text-xs">
              <Sparkles className="w-3.5 h-3.5 text-white/80" />
              <span className="text-[10px] text-white/70">ចលនា:</span>
              <select
                value={animationMode}
                onChange={e => setAnimationMode(e.target.value as AnimationMode)}
                className="bg-transparent text-white text-xs font-bold border-none outline-none cursor-pointer pr-1"
                title="របៀបចលនាលើរូបរាង និងអក្សរ (Animation Mode)"
              >
                <option value="step" className="text-slate-900">តាមលំដាប់ (Click Step)</option>
                <option value="auto" className="text-slate-900">ស្វ័យប្រវត្តិ (Auto-Cascade)</option>
                <option value="none" className="text-slate-900">បង្ហាញទាំងអស់ (Static)</option>
              </select>
            </div>

            {/* Slide Sorter Grid View Button */}
            <button
              onClick={() => setIsGridModalOpen(true)}
              className="p-1.5 bg-black/20 hover:bg-black/30 rounded-lg text-xs cursor-pointer border-none transition-colors text-white"
              title="ទិដ្ឋភាពក្រឡាស្លាយទាំងអស់ (Slide Sorter)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* Zoom Controls with Direct % Input */}
            <div className="hidden sm:flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg text-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                className="text-white hover:text-white/80 cursor-pointer border-none bg-transparent p-0.5"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center">
                <input
                  type="text"
                  value={zoomInputStr}
                  onChange={e => setZoomInputStr(e.target.value)}
                  onBlur={handleApplyZoomInput}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleApplyZoomInput();
                    }
                  }}
                  className="w-9 text-center bg-transparent border-none text-[11px] font-mono font-bold text-white outline-none"
                  title="វាយបញ្ចូល % ពង្រីក រួចចុច Enter"
                />
                <span className="text-[10px] font-mono text-white/80">%</span>
              </div>

              <button
                onClick={() => setZoomLevel(prev => Math.min(250, prev + 15))}
                className="text-white hover:text-white/80 cursor-pointer border-none bg-transparent p-0.5"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setZoomLevel(100)}
                className="text-[10px] px-1 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 cursor-pointer border-none ml-0.5"
                title="100% Fit"
              >
                100%
              </button>
            </div>

            {/* Laser Pointer Toggle */}
            <button
              onClick={() => setIsLaserPointer(!isLaserPointer)}
              className={`p-1.5 rounded-lg text-xs cursor-pointer border-none transition-colors ${
                isLaserPointer ? 'bg-red-600 text-white shadow-[0_0_10px_#ef4444]' : 'bg-black/20 text-white/80 hover:bg-black/30'
              }`}
              title="ចង្អុលឡាស៊ែរ (Laser Pointer - Shortcut: L)"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>

            {/* Pen Tool Toggle */}
            <button
              onClick={() => setIsPenActive(!isPenActive)}
              className={`p-1.5 rounded-lg text-xs cursor-pointer border-none transition-colors ${
                isPenActive ? 'bg-amber-400 text-slate-900 shadow-sm' : 'bg-black/20 text-white/80 hover:bg-black/30'
              }`}
              title="ប៊ិចគូសចំណាំលើស្លាយ (Drawing Pen - Shortcut: B)"
            >
              <PenTool className="w-4 h-4" />
            </button>

            {/* Notes Toggle */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`p-1.5 rounded-lg text-xs cursor-pointer border-none transition-colors ${
                showNotes ? 'bg-white/30 text-white' : 'bg-black/20 text-white/80 hover:bg-black/30'
              }`}
              title="បង្ហាញកំណត់ចំណាំគ្រូ (Speaker Notes)"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Download PPTX */}
            {(resolvedFileUrl || doc.fileUrl) && (
              <a
                href={resolvedFileUrl || doc.fileUrl}
                download={doc.fileName || `${doc.title}.pptx`}
                className="p-1.5 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-lg transition-colors"
                title="ទាញយក File (.pptx)"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer border-none ml-1"
              title="បិទ (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* EMBED OPTION / EXTERNAL LINK (OFFICE 365 / GOOGLE SLIDES) */}
      {doc.embedUrl && !isFullscreen && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5" />
            <span>មាន Link Web Embed សម្រាប់ Office 365 / Google Slides Online</span>
          </span>
          <a
            href={doc.embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold underline hover:opacity-80"
          >
            <span>បើកមើលលើ Web ដើម</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* PEN COLOR PALETTE BAR (WHEN PEN IS ACTIVE) */}
      {isPenActive && (
        <div className="h-9 px-4 bg-slate-800 text-white flex items-center justify-between text-xs shrink-0 shadow-inner z-20">
          <div className="flex items-center gap-2">
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-[11px]">ប៊ិចគូសពន្យល់៖</span>
            {['#ef4444', '#eab308', '#22c55e', '#06b6d4', '#ffffff'].map(c => (
              <button
                key={c}
                onClick={() => setPenColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border border-black/30 cursor-pointer transition-transform ${
                  penColor === c ? 'ring-2 ring-white scale-120' : 'opacity-80 hover:opacity-100'
                }`}
                title={`ពណ៌ ${c}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] cursor-pointer border-none"
            >
              <Eraser className="w-3 h-3" />
              <span>លុបគំនូសទាំងអស់</span>
            </button>
            <button
              onClick={() => setIsPenActive(false)}
              className="text-white/60 hover:text-white text-[11px] cursor-pointer border-none bg-transparent"
            >
              បិទប៊ិច
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE: SLIDE THUMBNAILS (LEFT) + HIGH-FIDELITY STAGE (CENTER) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT THUMBNAIL RAIL */}
        {!isFullscreen && (
          <aside
            className={`w-52 sm:w-64 border-r flex flex-col shrink-0 overflow-y-auto ${
              isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 sticky top-0 bg-inherit z-10">
              <span className="flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5" />
                <span>ស្លាយទាំងអស់</span>
              </span>
              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {slideCount}
              </span>
            </div>

            <div className="p-3 space-y-2.5">
              {Array.from({ length: slideCount }).map((_, idx) => {
                const isActive = idx === currentSlideIndex;
                const fallbackSlide = slides[idx] || {
                  id: `slide-${idx}`,
                  slideNumber: idx + 1,
                  title: `ស្លាយទី ${idx + 1}`,
                  bulletPoints: [],
                  images: [],
                };

                return (
                  <div
                    key={idx}
                    ref={el => {
                      if (el) {
                        const btn = el.querySelector('button');
                        thumbnailRefs.current[idx] = btn as HTMLButtonElement | null;
                      }
                    }}
                  >
                    <SlideThumbnailItem
                      viewer={viewerRef.current}
                      index={idx}
                      isActive={isActive}
                      fallbackSlide={fallbackSlide}
                      onClick={() => navigateToSlide(idx, idx > currentSlideIndex ? 'next' : 'prev')}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* MAIN STAGE (POWERPOINT SLIDE CANVAS) */}
        <main
          ref={mainStageRef}
          onMouseMove={handleMouseMove}
          className="flex-1 overflow-auto relative flex flex-col items-center justify-center p-3 sm:p-6 select-none bg-[#0a0f1d] min-h-0"
        >
          {/* Active slide view with transition animation */}
          <div
            key={currentSlideIndex}
            className="flex items-center justify-center transition-all duration-200"
          >
            <ActiveSlideStage
              viewer={viewerRef.current}
              slideIndex={currentSlideIndex}
              scale={effectiveScale}
              width={slideDisplayWidth}
              height={slideDisplayHeight}
              transitionClass={getTransitionClass()}
              isPenActive={isPenActive}
              penCanvasRef={penCanvasRef}
              onCanvasMouseDown={handleCanvasMouseDown}
              onCanvasMouseMove={handleCanvasMouseMove}
              onCanvasMouseUp={handleCanvasMouseUp}
              isLaserPointer={isLaserPointer}
              onAdvance={handleNextSlide}
              fallbackSlide={currentFallbackSlide}
              currentTheme={currentTheme}
              doc={doc}
            />
          </div>

          {/* Hidden offscreen container for PptxViewer parsing */}
          <div ref={offscreenMountRef} className="hidden" aria-hidden="true" />

          {/* SPEAKER NOTES DRAWER */}
          {showNotes && currentFallbackSlide.notes && !isFullscreen && (
            <div
              className={`w-full max-w-5xl mt-3 p-4 rounded-2xl border text-xs leading-relaxed shadow-md ${
                isDarkMode ? 'bg-[#111827] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>កំណត់ចំណាំគ្រូ (Speaker Notes សម្រាប់ស្លាយនេះ)</span>
                </span>
                <button
                  onClick={() => setShowNotes(false)}
                  className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p>{currentFallbackSlide.notes}</p>
            </div>
          )}

          {/* FULLSCREEN FLOATING PRESENTATION BAR */}
          {isFullscreen && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 bg-black/85 backdrop-blur-md rounded-full border border-white/20 text-white shadow-2xl">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 border-none bg-transparent text-white cursor-pointer"
                title="ស្លាយមុន (Left Arrow / PageUp)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs font-mono font-bold px-2">
                {currentSlideIndex + 1} / {slideCount}
              </span>

              <button
                onClick={handleNextSlide}
                disabled={currentSlideIndex === slideCount - 1}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 border-none bg-transparent text-white cursor-pointer"
                title="ស្លាយបន្ទាប់ / ចលនារូបរាង (Right Arrow / Space)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="h-4 w-px bg-white/20 mx-1" />

              {/* Laser Pointer */}
              <button
                onClick={() => setIsLaserPointer(!isLaserPointer)}
                className={`p-1.5 rounded-full transition-colors border-none cursor-pointer ${
                  isLaserPointer ? 'bg-red-600 text-white shadow-[0_0_10px_#ef4444]' : 'hover:bg-white/20 text-white/80'
                }`}
                title="បើក/បិទ Laser Pointer (L)"
              >
                <MousePointer2 className="w-4 h-4" />
              </button>

              {/* Pen Tool */}
              <button
                onClick={() => setIsPenActive(!isPenActive)}
                className={`p-1.5 rounded-full transition-colors border-none cursor-pointer ${
                  isPenActive ? 'bg-amber-400 text-slate-900' : 'hover:bg-white/20 text-white/80'
                }`}
                title="បើក/បិទ ប៊ិចគូស (B)"
              >
                <PenTool className="w-4 h-4" />
              </button>

              {/* Grid View */}
              <button
                onClick={() => setIsGridModalOpen(true)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors border-none bg-transparent text-white cursor-pointer"
                title="មើលក្រឡាស្លាយទាំងអស់ (Slide Sorter)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {/* Exit Fullscreen */}
              <button
                onClick={handleToggleFullscreen}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors border-none bg-transparent text-white cursor-pointer ml-1"
                title="ចាកចេញពី Slide Show (Esc)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* BOTTOM CONTROL BAR (NORMAL VIEW) */}
      {!isFullscreen && (
        <footer
          className={`h-12 px-6 border-t flex items-center justify-between shrink-0 select-none ${
            isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">
              ស្លាយ {currentSlideIndex + 1} នៃ {slideCount}
            </span>
            {animationMode === 'step' && (
              <span className="text-[11px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                ចុចលើស្លាយ ឬ Space ដើម្បីបញ្ចេញចលនារូបរាង
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ថយក្រោយ</span>
            </button>

            <button
              onClick={handleNextSlide}
              disabled={currentSlideIndex === slideCount - 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#d04423] hover:bg-[#b83b1e] text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer border-none shadow-sm"
            >
              <span>បន្ទាប់</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer border-none bg-transparent"
              title="ពេញអេក្រង់"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">ពេញអេក្រង់</span>
            </button>
          </div>
        </footer>
      )}

      {/* SLIDE SORTER / GRID VIEW MODAL */}
      {isGridModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex flex-col p-6 select-none animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-white/20 text-white">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-base">ទិដ្ឋភាពក្រឡាស្លាយទាំងអស់ (Slide Sorter)</h3>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono">
                {slideCount} ស្លាយ
              </span>
            </div>
            <button
              onClick={() => setIsGridModalOpen(false)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer border-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: slideCount }).map((_, idx) => {
              const isActive = idx === currentSlideIndex;
              const fallbackSlide = slides[idx] || {
                id: `slide-${idx}`,
                slideNumber: idx + 1,
                title: `ស្លាយទី ${idx + 1}`,
                bulletPoints: [],
                images: [],
              };

              return (
                <div
                  key={idx}
                  onClick={() => {
                    navigateToSlide(idx, idx > currentSlideIndex ? 'next' : 'prev');
                    setIsGridModalOpen(false);
                  }}
                  className={`rounded-xl p-2 cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500 scale-102'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center relative">
                    <SlideThumbnailItem
                      viewer={viewerRef.current}
                      index={idx}
                      isActive={isActive}
                      fallbackSlide={fallbackSlide}
                      onClick={() => {
                        navigateToSlide(idx, idx > currentSlideIndex ? 'next' : 'prev');
                        setIsGridModalOpen(false);
                      }}
                      isDarkMode={true}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/80 px-1">
                    <span className="font-bold truncate max-w-[120px]">
                      {fallbackSlide.title || `ស្លាយទី ${idx + 1}`}
                    </span>
                    <span className="font-mono text-[10px] text-white/50">{idx + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
