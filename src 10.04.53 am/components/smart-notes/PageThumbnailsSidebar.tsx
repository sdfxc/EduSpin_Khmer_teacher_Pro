import React from 'react';
import { 
  X, 
  Plus, 
  Copy, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  FileText,
  Check
} from 'lucide-react';
import { NotebookPage } from './types';

interface PageThumbnailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pages: NotebookPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  isDarkMode: boolean;
}

export default function PageThumbnailsSidebar({
  isOpen,
  onClose,
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  isDarkMode
}: PageThumbnailsSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className={`w-72 border-r flex flex-col shrink-0 select-none z-20 ${
      isDarkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
    }`}>
      {/* Sidebar Header */}
      <div className={`h-12 px-4 border-b flex items-center justify-between ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-black">ទំព័រទាំងអស់ ({pages.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onAddPage}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
            title="បន្ថែមទំព័រថ្មី"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pages Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((p, idx) => {
          const isActive = idx === activePageIndex;
          return (
            <div
              key={p.id}
              onClick={() => onSelectPage(idx)}
              className={`group relative p-2 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30'
                  : isDarkMode 
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* Mini Preview Box */}
              <div className={`w-full h-32 rounded-xl border flex flex-col justify-between p-2 overflow-hidden mb-1.5 relative ${
                isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Simulated template stripes */}
                <div className="space-y-1.5 opacity-30">
                  <div className="h-1 bg-current w-3/4 rounded" />
                  <div className="h-1 bg-current w-full rounded" />
                  <div className="h-1 bg-current w-1/2 rounded" />
                  <div className="h-1 bg-current w-2/3 rounded" />
                </div>

                <div className="text-[10px] font-bold text-slate-400 truncate">
                  {p.strokes.length} គំនូស • {p.texts.length} អត្ថបទ • {p.equations.length} រូបមន្ត
                </div>

                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Page Number & Title */}
              <div className="flex items-center justify-between text-xs font-bold px-1">
                <span className="truncate max-w-[130px]">
                  {idx + 1}. {p.title || `ទំព័រទី ${idx + 1}`}
                </span>

                {/* Page Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMovePage(idx, idx - 1); }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                      title="រំកិលឡើងលើ"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                  {idx < pages.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMovePage(idx, idx + 1); }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                      title="រំកិលចុះក្រោម"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDuplicatePage(idx); }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    title="ចម្លងទំព័រ (Duplicate)"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeletePage(idx); }}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 rounded"
                      title="លុបទំព័រ"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
