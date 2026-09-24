import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ToolType, 
  PenType, 
  EraserMode, 
  ShapeType, 
  PaperTemplate, 
  Point, 
  Stroke, 
  ShapeElement, 
  TextElement, 
  ImageElement, 
  EquationElement,
  NotebookPage 
} from './types';
import { 
  drawSmoothStroke, 
  recognizeShape, 
  isStrokeInLasso, 
  getSelectionBounds,
  distance 
} from './canvasMath';
import katex from 'katex';
import { Move, Trash2, Copy, Palette, Type, Maximize2, RotateCw } from 'lucide-react';

interface SmartCanvasProps {
  page: NotebookPage;
  onUpdatePage: (updater: (prev: NotebookPage) => NotebookPage) => void;
  currentTool: ToolType;
  penType: PenType;
  currentColor: string;
  currentWidth: number;
  eraserMode: EraserMode;
  shapeType: ShapeType;
  autoRecognizeShapes: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  isDarkMode: boolean;
  onPushHistory: () => void;
  onOpenEquationEdit?: (eq: EquationElement) => void;
}

export default function SmartCanvas({
  page,
  onUpdatePage,
  currentTool,
  penType,
  currentColor,
  currentWidth,
  eraserMode,
  shapeType,
  autoRecognizeShapes,
  zoom,
  onZoomChange,
  isDarkMode,
  onPushHistory,
  onOpenEquationEdit
}: SmartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pan offset (for panning the large canvas)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing state
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);

  // Laser pointer trails
  const [laserPoints, setLaserPoints] = useState<Point[]>([]);
  const laserTimerRef = useRef<any>(null);

  // Lasso selection state
  const [lassoPath, setLassoPath] = useState<Point[]>([]);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectedTextIds, setSelectedTextIds] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedEquationIds, setSelectedEquationIds] = useState<string[]>([]);

  // Dragging selected elements
  const isDraggingSelectionRef = useRef(false);
  const dragStartPointRef = useRef<Point>({ x: 0, y: 0 });

  // Active editing text box
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  // Standard Page Dimensions (A4 aspect ratio: 900 x 1280 px at 1x)
  const PAGE_WIDTH = 920;
  const PAGE_HEIGHT = 1320;

  // Convert Screen/Pointer coords to Canvas Document Coords
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Account for zoom and canvas bounding box
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    return { x, y, pressure, time: Date.now() };
  };

  // Render Background Paper Template
  const drawPaperTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, template: PaperTemplate) => {
    // Fill paper base background
    if (template === 'chalkboard') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
    } else if (template === 'yellow-pad') {
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = isDarkMode ? '#182033' : '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    const lineColor = template === 'chalkboard' 
      ? 'rgba(255, 255, 255, 0.08)' 
      : template === 'yellow-pad'
        ? 'rgba(234, 88, 12, 0.2)'
        : isDarkMode 
          ? 'rgba(255, 255, 255, 0.07)' 
          : 'rgba(203, 213, 225, 0.55)';

    const marginColor = template === 'yellow-pad' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(244, 63, 94, 0.35)';

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    // 1. Ruled / Lined
    if (template === 'ruled' || template === 'yellow-pad') {
      const lineGap = 32;
      const topMargin = 80;
      
      // Horizontal lines
      for (let y = topMargin; y < height - 20; y += lineGap) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
      }

      // Left red/pink margin line
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(90, 30);
      ctx.lineTo(90, height - 30);
      ctx.stroke();
    }

    // 2. Narrow Ruled
    else if (template === 'narrow-ruled') {
      const lineGap = 24;
      const topMargin = 70;
      for (let y = topMargin; y < height - 20; y += lineGap) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
      }
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 20);
      ctx.lineTo(80, height - 20);
      ctx.stroke();
    }

    // 3. Graph / Grid
    else if (template === 'graph') {
      const gridGap = 24;
      for (let x = 20; x < width - 20; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, height - 20);
        ctx.stroke();
      }
      for (let y = 20; y < height - 20; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    }

    // 4. Dot Grid
    else if (template === 'dot-grid') {
      const dotGap = 24;
      ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(148, 163, 184, 0.6)';
      for (let x = 30; x < width - 30; x += dotGap) {
        for (let y = 30; y < height - 30; y += dotGap) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Cornell Notes Template
    else if (template === 'cornell') {
      // Header area line
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(20, 80);
      ctx.lineTo(width - 20, 80);
      ctx.stroke();

      // Cue column vertical divider
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(240, 80);
      ctx.lineTo(240, height - 160);
      ctx.stroke();

      // Summary bottom horizontal line
      ctx.beginPath();
      ctx.moveTo(20, height - 160);
      ctx.lineTo(width - 20, height - 160);
      ctx.stroke();

      // Notes area ruled lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      for (let y = 110; y < height - 170; y += 30) {
        ctx.beginPath();
        ctx.moveTo(240, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // Draw Shapes on Canvas
  const drawShape = (ctx: CanvasRenderingContext2D, shape: ShapeElement) => {
    ctx.save();
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (shape.isDashed) {
      ctx.setLineDash([6, 6]);
    }

    if (shape.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
    } else if (shape.type === 'arrow') {
      const headlen = 16;
      const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(shape.x2, shape.y2);
      ctx.lineTo(
        shape.x2 - headlen * Math.cos(angle - Math.PI / 6),
        shape.y2 - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        shape.x2 - headlen * Math.cos(angle + Math.PI / 6),
        shape.y2 - headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = shape.strokeColor;
      ctx.fill();
    } else if (shape.type === 'rectangle') {
      const x = Math.min(shape.x1, shape.x2);
      const y = Math.min(shape.y1, shape.y2);
      const w = Math.abs(shape.x2 - shape.x1);
      const h = Math.abs(shape.y2 - shape.y1);
      ctx.strokeRect(x, y, w, h);
    } else if (shape.type === 'circle' || shape.type === 'ellipse') {
      const cx = (shape.x1 + shape.x2) / 2;
      const cy = (shape.y1 + shape.y2) / 2;
      const rx = Math.abs(shape.x2 - shape.x1) / 2;
      const ry = Math.abs(shape.y2 - shape.y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo((shape.x1 + shape.x2) / 2, shape.y1);
      ctx.lineTo(shape.x1, shape.y2);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.closePath();
      ctx.stroke();
    } else if (shape.type === 'axes') {
      // Coordinate Cartesian Axes (X & Y with arrows)
      ctx.beginPath();
      // X-axis
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y1);
      // Y-axis
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x1, shape.y2);
      ctx.stroke();

      // Arrow on X
      ctx.beginPath();
      ctx.moveTo(shape.x2, shape.y1);
      ctx.lineTo(shape.x2 - 10, shape.y1 - 6);
      ctx.lineTo(shape.x2 - 10, shape.y1 + 6);
      ctx.closePath();
      ctx.fillStyle = shape.strokeColor;
      ctx.fill();

      // Arrow on Y
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y2);
      ctx.lineTo(shape.x1 - 6, shape.y2 + 10);
      ctx.lineTo(shape.x1 + 6, shape.y2 + 10);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  // Main Canvas Redraw Effect
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;

    // 1. Draw Paper
    drawPaperTemplate(ctx, PAGE_WIDTH, PAGE_HEIGHT, page.template);

    // 2. Draw Shapes
    for (const shape of page.shapes) {
      drawShape(ctx, shape);
    }

    // 3. Draw Completed Strokes
    for (const stroke of page.strokes) {
      drawSmoothStroke(
        ctx,
        stroke.points,
        stroke.width,
        stroke.color,
        stroke.opacity,
        stroke.tool,
        stroke.penType
      );
    }

    // 4. Draw Active/Live Drawing Stroke
    if (isDrawingRef.current && currentPointsRef.current.length > 0) {
      if (currentTool === 'pen' || currentTool === 'pencil' || currentTool === 'highlighter') {
        drawSmoothStroke(
          ctx,
          currentPointsRef.current,
          currentWidth,
          currentColor,
          currentTool === 'highlighter' ? 0.4 : 1,
          currentTool,
          penType
        );
      } else if (currentTool === 'shape') {
        const start = currentPointsRef.current[0];
        const end = currentPointsRef.current[currentPointsRef.current.length - 1];
        drawShape(ctx, {
          id: 'temp-shape',
          type: shapeType,
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          strokeColor: currentColor,
          strokeWidth: currentWidth
        });
      } else if (currentTool === 'lasso') {
        // Draw lasso selection loop dashed line
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i < currentPointsRef.current.length; i++) {
          const p = currentPointsRef.current[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. Draw Laser Trail
    if (laserPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < laserPoints.length; i++) {
        const p = laserPoints[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }

  }, [page, currentTool, currentColor, currentWidth, penType, shapeType, isDarkMode, laserPoints]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const coords = getCanvasCoords(e);

    // Pan hand tool
    if (currentTool === 'hand' || e.button === 1 || e.buttons === 4) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    // Text tool click -> Add or select text box
    if (currentTool === 'text') {
      const newText: TextElement = {
        id: `txt-${Date.now()}`,
        x: coords.x,
        y: coords.y,
        width: 320,
        height: 48,
        text: 'វាយអក្សរទីនេះ...',
        fontSize: 20,
        fontFamily: 'Kantumruy Pro, sans-serif',
        color: currentColor,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        align: 'left'
      };
      onPushHistory();
      onUpdatePage(prev => ({
        ...prev,
        texts: [...prev.texts, newText]
      }));
      setActiveTextId(newText.id);
      return;
    }

    isDrawingRef.current = true;
    currentPointsRef.current = [coords];

    if (currentTool === 'laser') {
      setLaserPoints([coords]);
    } else if (currentTool === 'eraser') {
      handleErase(coords);
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);
    currentPointsRef.current.push(coords);

    if (currentTool === 'laser') {
      setLaserPoints(prev => [...prev.slice(-25), coords]);
      clearTimeout(laserTimerRef.current);
      laserTimerRef.current = setTimeout(() => {
        setLaserPoints([]);
      }, 600);
    } else if (currentTool === 'eraser') {
      handleErase(coords);
    } else {
      renderCanvas();
    }
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = [...currentPointsRef.current];
    currentPointsRef.current = [];

    if (points.length === 0) return;

    // 1. Pen / Pencil / Highlighter
    if (currentTool === 'pen' || currentTool === 'pencil' || currentTool === 'highlighter') {
      // Shape Recognition on stroke completion if enabled
      if (autoRecognizeShapes && points.length > 10) {
        const recognized = recognizeShape(points);
        if (recognized) {
          onPushHistory();
          onUpdatePage(prev => ({
            ...prev,
            shapes: [
              ...prev.shapes,
              {
                id: `shape-${Date.now()}`,
                type: recognized.type,
                x1: recognized.x1,
                y1: recognized.y1,
                x2: recognized.x2,
                y2: recognized.y2,
                strokeColor: currentColor,
                strokeWidth: currentWidth
              }
            ]
          }));
          return;
        }
      }

      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tool: currentTool,
        penType: currentTool === 'pen' ? penType : undefined,
        color: currentColor,
        width: currentWidth,
        opacity: currentTool === 'highlighter' ? 0.4 : 1,
        points,
        createdAt: Date.now()
      };

      onPushHistory();
      onUpdatePage(prev => ({
        ...prev,
        strokes: [...prev.strokes, newStroke]
      }));
    }

    // 2. Shape Tool
    else if (currentTool === 'shape' && points.length > 1) {
      const start = points[0];
      const end = points[points.length - 1];
      const newShape: ShapeElement = {
        id: `shape-${Date.now()}`,
        type: shapeType,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        strokeColor: currentColor,
        strokeWidth: currentWidth
      };

      onPushHistory();
      onUpdatePage(prev => ({
        ...prev,
        shapes: [...prev.shapes, newShape]
      }));
    }

    // 3. Lasso Tool Selection
    else if (currentTool === 'lasso' && points.length > 4) {
      setLassoPath(points);
      // Find all strokes inside lasso
      const matchedStrokes = page.strokes.filter(s => isStrokeInLasso(s, points));
      setSelectedStrokeIds(matchedStrokes.map(s => s.id));
    }
  };

  // Erase logic (Stroke or Partial)
  const handleErase = (pt: Point) => {
    const eraseRadius = currentWidth * 5 + 16;

    if (eraserMode === 'stroke') {
      const remainingStrokes = page.strokes.filter(s => {
        return !s.points.some(p => distance(p, pt) < eraseRadius);
      });

      const remainingShapes = page.shapes.filter(sh => {
        const d1 = distance({ x: sh.x1, y: sh.y1 }, pt);
        const d2 = distance({ x: sh.x2, y: sh.y2 }, pt);
        return d1 > eraseRadius && d2 > eraseRadius;
      });

      if (remainingStrokes.length !== page.strokes.length || remainingShapes.length !== page.shapes.length) {
        onPushHistory();
        onUpdatePage(prev => ({
          ...prev,
          strokes: remainingStrokes,
          shapes: remainingShapes
        }));
      }
    } else {
      // Partial point-wise erase
      let modified = false;
      const updatedStrokes = page.strokes.map(s => {
        const filteredPoints = s.points.filter(p => distance(p, pt) >= eraseRadius);
        if (filteredPoints.length !== s.points.length) {
          modified = true;
          return { ...s, points: filteredPoints };
        }
        return s;
      }).filter(s => s.points.length > 1);

      if (modified) {
        onUpdatePage(prev => ({
          ...prev,
          strokes: updatedStrokes
        }));
      }
    }
  };

  // Delete Selection
  const handleDeleteSelected = () => {
    onPushHistory();
    onUpdatePage(prev => ({
      ...prev,
      strokes: prev.strokes.filter(s => !selectedStrokeIds.includes(s.id)),
      shapes: prev.shapes.filter(sh => !selectedShapeIds.includes(sh.id)),
      texts: prev.texts.filter(t => !selectedTextIds.includes(t.id)),
      images: prev.images.filter(img => !selectedImageIds.includes(img.id)),
      equations: prev.equations.filter(eq => !selectedEquationIds.includes(eq.id))
    }));
    setSelectedStrokeIds([]);
    setLassoPath([]);
  };

  // Move selected strokes
  const handleMoveSelection = (dx: number, dy: number) => {
    onUpdatePage(prev => ({
      ...prev,
      strokes: prev.strokes.map(s => {
        if (!selectedStrokeIds.includes(s.id)) return s;
        return {
          ...s,
          points: s.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }))
        };
      })
    }));
  };

  // Calculate selection bounds for lasso
  const selectionBounds = getSelectionBounds(
    page.strokes.filter(s => selectedStrokeIds.includes(s.id)),
    page.shapes.filter(sh => selectedShapeIds.includes(sh.id)),
    [],
    [],
    []
  );

  return (
    <div 
      ref={containerRef}
      className={`relative flex-1 h-full overflow-hidden flex items-center justify-center select-none ${
        isDarkMode ? 'bg-[#090d16]' : 'bg-slate-200/70'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Zoomable & Pannable Document Sheet Container */}
      <div
        className="relative transition-transform duration-75 origin-center shadow-2xl rounded-2xl"
        style={{
          width: `${PAGE_WIDTH}px`,
          height: `${PAGE_HEIGHT}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Main Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-2xl cursor-crosshair block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        />

        {/* Text Elements Layer */}
        {page.texts.map(t => {
          const isEditing = activeTextId === t.id;
          return (
            <div
              key={t.id}
              className={`absolute group p-1.5 rounded-xl border transition-all cursor-move select-text ${
                isEditing ? 'border-indigo-500 bg-white/95 dark:bg-slate-900/95 shadow-xl' : 'border-transparent hover:border-indigo-300/50'
              }`}
              style={{
                left: `${t.x}px`,
                top: `${t.y}px`,
                width: `${t.width}px`,
                color: t.color,
                fontSize: `${t.fontSize}px`,
                fontFamily: t.fontFamily,
                fontWeight: t.isBold ? 'bold' : 'normal',
                fontStyle: t.isItalic ? 'italic' : 'normal',
                textDecoration: t.isUnderline ? 'underline' : 'none',
                textAlign: t.align
              }}
              onClick={() => setActiveTextId(t.id)}
            >
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    autoFocus
                    value={t.text}
                    onChange={(e) => {
                      const newText = e.target.value;
                      onUpdatePage(prev => ({
                        ...prev,
                        texts: prev.texts.map(txt => txt.id === t.id ? { ...txt, text: newText } : txt)
                      }));
                    }}
                    onBlur={() => setActiveTextId(null)}
                    className="w-full bg-transparent border-none focus:outline-none resize-none"
                    rows={2}
                  />
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onUpdatePage(prev => ({
                            ...prev,
                            texts: prev.texts.map(txt => txt.id === t.id ? { ...txt, isBold: !txt.isBold } : txt)
                          }));
                        }}
                        className={`px-1.5 py-0.5 rounded font-bold ${t.isBold ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onUpdatePage(prev => ({
                            ...prev,
                            texts: prev.texts.map(txt => txt.id === t.id ? { ...txt, fontSize: Math.max(14, txt.fontSize - 2) } : txt)
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800"
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onUpdatePage(prev => ({
                            ...prev,
                            texts: prev.texts.map(txt => txt.id === t.id ? { ...txt, fontSize: Math.min(48, txt.fontSize + 2) } : txt)
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800"
                      >
                        A+
                      </button>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPushHistory();
                        onUpdatePage(prev => ({
                          ...prev,
                          texts: prev.texts.filter(txt => txt.id !== t.id)
                        }));
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{t.text}</div>
              )}
            </div>
          );
        })}

        {/* Equations Layer (Rendered with KaTeX) */}
        {page.equations.map(eq => {
          return (
            <div
              key={eq.id}
              className="absolute group p-2 rounded-2xl border border-transparent hover:border-cyan-400/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs shadow-xs hover:shadow-lg transition-all cursor-move select-none"
              style={{
                left: `${eq.x}px`,
                top: `${eq.y}px`,
                color: eq.color
              }}
              onDoubleClick={() => onOpenEquationEdit?.(eq)}
            >
              <div 
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(eq.latex, { throwOnError: false, displayMode: true })
                }}
                style={{ fontSize: `${eq.fontSize}px` }}
              />

              {/* Floating controls on hover */}
              <div className="absolute -top-3 -right-3 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onOpenEquationEdit?.(eq)}
                  className="p-1 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-cyan-600 rounded"
                  title="កែសម្រួលរូបមន្ត"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPushHistory();
                    onUpdatePage(prev => ({
                      ...prev,
                      equations: prev.equations.filter(e => e.id !== eq.id)
                    }));
                  }}
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 rounded"
                  title="លុបរូបមន្ត"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Images Layer */}
        {page.images.map(img => {
          return (
            <div
              key={img.id}
              className="absolute group rounded-xl border-2 border-transparent hover:border-indigo-500 cursor-move shadow-sm"
              style={{
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.width}px`,
                height: `${img.height}px`,
                transform: `rotate(${img.rotation || 0}deg)`
              }}
            >
              <img
                src={img.dataUrl}
                alt="Uploaded"
                className="w-full h-full object-contain rounded-xl pointer-events-none"
              />
              <button
                type="button"
                onClick={() => {
                  onPushHistory();
                  onUpdatePage(prev => ({
                    ...prev,
                    images: prev.images.filter(i => i.id !== img.id)
                  }));
                }}
                className="absolute -top-2 -right-2 hidden group-hover:flex p-1 bg-red-500 text-white rounded-full shadow cursor-pointer"
                title="លុបរូបភាព"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Lasso Selection Box Controls */}
        {selectionBounds && selectedStrokeIds.length > 0 && (
          <div
            className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 rounded-xl pointer-events-auto"
            style={{
              left: `${selectionBounds.x}px`,
              top: `${selectionBounds.y}px`,
              width: `${selectionBounds.width}px`,
              height: `${selectionBounds.height}px`
            }}
          >
            {/* Quick Action Toolbar on top of selection */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs whitespace-nowrap">
              <button
                type="button"
                onClick={() => handleMoveSelection(20, 20)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-1 text-slate-700 dark:text-slate-200 font-bold"
                title="រំកិលចុះក្រោម"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Move</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="p-1 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 rounded flex items-center gap-1 font-bold"
                title="លុបអ្វីដែលបានជ្រើសរើស"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
