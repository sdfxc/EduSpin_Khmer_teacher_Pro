import React, { useState } from 'react';
import { 
  Pencil, 
  PenTool, 
  Highlighter, 
  Eraser, 
  Lasso, 
  Type, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  Triangle, 
  ArrowUpRight, 
  Minus, 
  Sigma, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Plus, 
  FileText, 
  Grid, 
  Sparkles, 
  Palette, 
  ChevronLeft, 
  ChevronRight,
  Sliders,
  Hand,
  Crosshair,
  Trash2
} from 'lucide-react';
import { ToolType, PenType, EraserMode, ShapeType, PaperTemplate } from './types';

interface SmartToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  penType: PenType;
  onChangePenType: (type: PenType) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  currentWidth: number;
  onChangeWidth: (width: number) => void;
  eraserMode: EraserMode;
  onChangeEraserMode: (mode: EraserMode) => void;
  shapeType: ShapeType;
  onChangeShapeType: (type: ShapeType) => void;
  autoRecognizeShapes: boolean;
  onToggleAutoRecognizeShapes: () => void;
  paperTemplate: PaperTemplate;
  onChangePaperTemplate: (template: PaperTemplate) => void;
  onAddPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  currentPageIndex: number;
  totalPages: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenEquationModal: () => void;
  onUploadImage: (file: File) => void;
  isDarkMode: boolean;
}

const PRESET_COLORS = [
  '#0f172a', // Dark Black/Slate
  '#2563eb', // Royal Blue
  '#dc2626', // Vibrant Red
  '#16a34a', // Emerald Green
  '#eab308', // Yellow
  '#ea580c', // Orange
  '#9333ea', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#ffffff'  // White
];

const PRESET_WIDTHS = [
  { label: '0.3mm', width: 1.5 },
  { label: '0.5mm', width: 3.0 },
  { label: '1.0mm', width: 6.0 },
  { label: '2.0mm', width: 12.0 }
];

const PAPER_TEMPLATES: { id: PaperTemplate; name: string; icon: string }[] = [
  { id: 'blank', name: 'ក្រដាសទទេ (Blank)', icon: '📄' },
  { id: 'ruled', name: 'បន្ទាត់ធម្មតា (Ruled)', icon: '📝' },
  { id: 'narrow-ruled', name: 'បន្ទាត់ញឹក (Narrow)', icon: '📃' },
  { id: 'graph', name: 'ក្រឡាការ៉ូ (Graph Grid)', icon: '📐' },
  { id: 'dot-grid', name: 'ចំណុចតូចៗ (Dot Grid)', icon: '⠿' },
  { id: 'cornell', name: 'កំណត់ត្រា Cornell', icon: '📋' },
  { id: 'yellow-pad', name: 'ក្រដាសលឿង (Legal Pad)', icon: '📒' },
  { id: 'chalkboard', name: 'ក្ដារខៀនងងឹត (Chalkboard)', icon: '⬛' }
];

export default function SmartToolbar({
  currentTool,
  onSelectTool,
  penType,
  onChangePenType,
  currentColor,
  onChangeColor,
  currentWidth,
  onChangeWidth,
  eraserMode,
  onChangeEraserMode,
  shapeType,
  onChangeShapeType,
  autoRecognizeShapes,
  onToggleAutoRecognizeShapes,
  paperTemplate,
  onChangePaperTemplate,
  onAddPage,
  onPrevPage,
  onNextPage,
  currentPageIndex,
  totalPages,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenEquationModal,
  onUploadImage,
  isDarkMode
}: SmartToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPaperMenu, setShowPaperMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [showPenMenu, setShowPenMenu] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
      e.target.value = '';
    }
  };

  return (
    <div className={`flex flex-col border-b select-none shrink-0 ${
      isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {/* Upper Main Toolbar Row */}
      <div className="h-14 px-3 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Undo / Redo & Clear */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="ត្រឡប់ក្រោយ (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="ទៅមុខវិញ (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClearPage}
            className={`p-2 rounded-xl transition-all cursor-pointer text-red-500 hover:bg-red-500/10`}
            title="លុបសម្អាតទំព័រទាំងមូល (Clear Page)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className={`h-6 w-px ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} mx-0.5 shrink-0`} />

        {/* Primary Tools Palettes (Inspired by modern digital handwriting tools) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. Pen Tool */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (currentTool === 'pen') {
                  setShowPenMenu(!showPenMenu);
                } else {
                  onSelectTool('pen');
                  setShowPenMenu(false);
                }
              }}
              className={`p-2 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer ${
                currentTool === 'pen'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="ប៊ិចសរសេរ (Pen)"
            >
              <PenTool className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: currentColor }} />
            </button>

            {/* Pen Type Submenu */}
            {showPenMenu && currentTool === 'pen' && (
              <div className={`absolute top-full mt-2 left-0 z-50 p-2 rounded-2xl shadow-xl border w-44 space-y-1 ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">ប្រភេទប៊ិច</div>
                <button
                  type="button"
                  onClick={() => { onChangePenType('ballpoint'); setShowPenMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    penType === 'ballpoint' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🖊️ ប៊ិចធម្មតា (Ballpoint)
                </button>
                <button
                  type="button"
                  onClick={() => { onChangePenType('fountain'); setShowPenMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    penType === 'fountain' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  ✒️ ប៊ិចក្បាលស្រួច (Fountain)
                </button>
                <button
                  type="button"
                  onClick={() => { onChangePenType('brush'); setShowPenMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    penType === 'brush' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🖌️ ជក់សិល្បៈ (Brush)
                </button>
              </div>
            )}
          </div>

          {/* 2. Pencil Tool */}
          <button
            type="button"
            onClick={() => onSelectTool('pencil')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              currentTool === 'pencil'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="ខ្មៅដៃ (Pencil)"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* 3. Highlighter */}
          <button
            type="button"
            onClick={() => onSelectTool('highlighter')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              currentTool === 'highlighter'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="ហ្វឺតគូសចំណាំ (Highlighter)"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* 4. Eraser */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (currentTool === 'eraser') {
                  setShowEraserMenu(!showEraserMenu);
                } else {
                  onSelectTool('eraser');
                  setShowEraserMenu(false);
                }
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                currentTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="ជ័រលុប (Eraser)"
            >
              <Eraser className="w-4 h-4" />
            </button>

            {showEraserMenu && currentTool === 'eraser' && (
              <div className={`absolute top-full mt-2 left-0 z-50 p-2 rounded-2xl shadow-xl border w-44 space-y-1 ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">ម៉ូតជ័រលុប</div>
                <button
                  type="button"
                  onClick={() => { onChangeEraserMode('stroke'); setShowEraserMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    eraserMode === 'stroke' ? 'bg-rose-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  ⚡ លុបតាមគន្លងខ្សែ (Stroke)
                </button>
                <button
                  type="button"
                  onClick={() => { onChangeEraserMode('partial'); setShowEraserMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    eraserMode === 'partial' ? 'bg-rose-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🎯 លុបតែចំណុចប៉ះ (Partial)
                </button>
              </div>
            )}
          </div>

          {/* 5. Lasso Tool */}
          <button
            type="button"
            onClick={() => onSelectTool('lasso')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              currentTool === 'lasso'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Lasso / ជ្រើសរើសផ្លាស់ទីវត្ថុ (Select & Move)"
          >
            <Lasso className="w-4 h-4" />
          </button>

          {/* 6. Shape Tool */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (currentTool === 'shape') {
                  setShowShapeMenu(!showShapeMenu);
                } else {
                  onSelectTool('shape');
                  setShowShapeMenu(false);
                }
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                currentTool === 'shape'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="គំនូររាងធរណីមាត្រ (Shapes)"
            >
              <Square className="w-4 h-4" />
            </button>

            {showShapeMenu && currentTool === 'shape' && (
              <div className={`absolute top-full mt-2 left-0 z-50 p-2.5 rounded-2xl shadow-xl border w-56 space-y-2 ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/50">
                  <span className="text-[10px] font-black uppercase text-slate-400">រាងធរណីមាត្រ</span>
                  <button
                    type="button"
                    onClick={onToggleAutoRecognizeShapes}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                      autoRecognizeShapes ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                    title="ស្គាល់រាងស្វ័យប្រវត្តពេលគូសដោយដៃ"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Snap: {autoRecognizeShapes ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'rectangle' as ShapeType, label: 'ចតុកោណ', icon: Square },
                    { id: 'circle' as ShapeType, label: 'រង្វង់', icon: Circle },
                    { id: 'triangle' as ShapeType, label: 'ត្រីកោណ', icon: Triangle },
                    { id: 'line' as ShapeType, label: 'បន្ទាត់', icon: Minus },
                    { id: 'arrow' as ShapeType, label: 'ព្រួញ', icon: ArrowUpRight },
                    { id: 'axes' as ShapeType, label: 'អ័ក្សកូអរ', icon: Crosshair }
                  ].map(sh => {
                    const Icon = sh.icon;
                    return (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => { onChangeShapeType(sh.id); setShowShapeMenu(false); }}
                        className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer transition-all ${
                          shapeType === sh.id ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{sh.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 7. Text Tool */}
          <button
            type="button"
            onClick={() => onSelectTool('text')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              currentTool === 'text'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="វាយអក្សរ (Text Box - Khmer / English)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* 8. Equation Tool */}
          <button
            type="button"
            onClick={() => {
              onSelectTool('equation');
              onOpenEquationModal();
            }}
            className={`px-2.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === 'equation'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : isDarkMode ? 'text-cyan-400 hover:bg-slate-800' : 'text-cyan-700 hover:bg-cyan-50'
            }`}
            title="រូបមន្តគណិត/រូបវិទ្យា (LaTeX Equations)"
          >
            <Sigma className="w-4 h-4" />
            <span className="hidden sm:inline">រូបមន្ត</span>
          </button>

          {/* 9. Image Inserter */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              currentTool === 'image'
                ? 'bg-teal-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="បញ្ចូលរូបភាព (Insert Image)"
          >
            <ImageIcon className="w-4 h-4" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </button>

          {/* 10. Pan / Hand tool */}
          <button
            type="button"
            onClick={() => onSelectTool('hand')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              currentTool === 'hand'
                ? 'bg-slate-700 text-white shadow-md'
                : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="រំកិលផ្ទាំងក្រដាស (Pan Hand)"
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>

        <div className={`h-6 w-px ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} mx-0.5 shrink-0`} />

        {/* Paper Template Selector */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowPaperMenu(!showPaperMenu)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="ប្ដូរម៉ូតក្រដាស (Paper Template)"
          >
            <Grid className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden md:inline">ម៉ូតក្រដាស</span>
          </button>

          {showPaperMenu && (
            <div className={`absolute top-full mt-2 right-0 z-50 p-2 rounded-2xl shadow-2xl border w-64 space-y-1 ${
              isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">ជ្រើសរើសក្រដាសសរសេរ</div>
              {PAPER_TEMPLATES.map(pt => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => { onChangePaperTemplate(pt.id); setShowPaperMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    paperTemplate === pt.id
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{pt.icon}</span>
                  <span>{pt.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page Nav & Add Page */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={currentPageIndex === 0}
            className={`p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-30 ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="ទំព័រមុន"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-black px-1.5 min-w-[48px] text-center text-slate-700 dark:text-slate-300">
            {currentPageIndex + 1} / {totalPages}
          </span>

          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPageIndex === totalPages - 1}
            className={`p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-30 ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="ទំព័របន្ទាប់"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onAddPage}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer ml-1"
            title="បន្ថែមទំព័រថ្មី (+ Add Page)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ទំព័រថ្មី</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 shrink-0 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="បង្រួម (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={onResetZoom}
            className="px-1.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
            title="កំណត់ទំហំដើម 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="ពង្រីក (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Toolbar: Color Palette & Thickness quick controls */}
      <div className={`h-10 px-4 flex items-center justify-between gap-4 border-t text-xs ${
        isDarkMode ? 'bg-[#151e2e] border-slate-800' : 'bg-slate-50/90 border-slate-200/60'
      }`}>
        {/* Quick Color Swatches */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-black text-slate-400 mr-1 hidden sm:inline">ពណ៌៖</span>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onChangeColor(c)}
              className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                currentColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'
              }`}
              style={{ 
                backgroundColor: c,
                borderColor: isDarkMode ? '#475569' : '#cbd5e1'
              }}
              title={c}
            />
          ))}

          {/* Native Color Picker */}
          <label className="relative cursor-pointer p-1 hover:opacity-80 transition-opacity" title="ជ្រើសរើសពណ៌ផ្ទាល់ខ្លួន">
            <Palette className="w-4 h-4 text-slate-500" />
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onChangeColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>

        {/* Quick Stroke Width Selection */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-black text-slate-400 mr-1 hidden sm:inline">ទំហំគំនូស៖</span>
          {PRESET_WIDTHS.map(pw => (
            <button
              key={pw.label}
              type="button"
              onClick={() => onChangeWidth(pw.width)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                Math.abs(currentWidth - pw.width) < 0.5
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {pw.label}
            </button>
          ))}

          {/* Slider width */}
          <input
            type="range"
            min="1"
            max="30"
            step="0.5"
            value={currentWidth}
            onChange={(e) => onChangeWidth(parseFloat(e.target.value))}
            className="w-20 accent-indigo-600 cursor-pointer hidden md:block"
            title={`ទំហំ ${currentWidth}px`}
          />
        </div>
      </div>
    </div>
  );
}
