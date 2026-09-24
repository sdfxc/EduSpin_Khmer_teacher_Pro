import React from 'react';
import { 
  Plus, 
  X, 
  Search, 
  Share2, 
  Maximize, 
  Minimize, 
  BookOpen, 
  LayoutList, 
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import { Notebook } from './types';

interface NotebookHeaderProps {
  notebooks: Notebook[];
  activeNotebookId: string;
  onSelectNotebook: (id: string) => void;
  onCloseNotebookTab: (id: string) => void;
  onNewNotebook: () => void;
  onOpenLibrary: () => void;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenExport: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isDarkMode: boolean;
}

export default function NotebookHeader({
  notebooks,
  activeNotebookId,
  onSelectNotebook,
  onCloseNotebookTab,
  onNewNotebook,
  onOpenLibrary,
  onToggleSidebar,
  onOpenSearch,
  onOpenExport,
  isFullscreen,
  onToggleFullscreen,
  isDarkMode
}: NotebookHeaderProps) {
  const activeNotebook = notebooks.find(nb => nb.id === activeNotebookId) || notebooks[0];

  return (
    <header className={`h-12 px-3 border-b flex items-center justify-between gap-2 select-none shrink-0 ${
      isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-200' : 'bg-slate-100/90 border-slate-200/80 text-slate-700'
    }`}>
      {/* Left controls: Library & Sidebar buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onOpenLibrary}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isDarkMode 
              ? 'hover:bg-slate-800 text-indigo-400 hover:text-indigo-300' 
              : 'hover:bg-slate-200 text-indigo-600 hover:text-indigo-700'
          }`}
          title="បើកបណ្ណាល័យសៀវភៅកំណត់ត្រា"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden sm:inline">បណ្ណាល័យ</span>
        </button>

        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
          }`}
          title="បង្ហាញ/លាក់ បញ្ជីទំព័រ (Thumbnails)"
        >
          <LayoutList className="w-4 h-4" />
        </button>
      </div>

      {/* Middle: Open Notebook Tabs (GoodNotes / iPad Tab Bar style) */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
        {notebooks.map((nb) => {
          const isActive = nb.id === activeNotebookId;
          return (
            <div
              key={nb.id}
              onClick={() => onSelectNotebook(nb.id)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-bold cursor-pointer transition-all border-t border-x shrink-0 max-w-[200px] ${
                isActive
                  ? isDarkMode
                    ? 'bg-[#1e293b] border-slate-700 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  : isDarkMode
                    ? 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/60'
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200/60'
              }`}
            >
              <span className="text-sm">{nb.coverIcon || '📘'}</span>
              <span className="truncate">{nb.title}</span>
              
              {notebooks.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseNotebookTab(nb.id);
                  }}
                  className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white text-slate-400 transition-all ml-1 cursor-pointer"
                  title="បិទផ្ទាំងនេះ"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Notebook Tab Button */}
        <button
          type="button"
          onClick={onNewNotebook}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
            isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          title="បង្កើតសៀវភៅកំណត់ត្រាថ្មី (+ New Notebook)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right controls: Search, Export, Fullscreen */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
          }`}
          title="ស្វែងរកក្នុងកំណត់ត្រា (Search)"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isDarkMode 
              ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-700/50' 
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
          }`}
          title="ទាញយក ឬចែករំលែកជា PDF / រូបភាព"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
          }`}
          title={isFullscreen ? 'បង្រួមធម្មតា' : 'ពង្រីកពេញអេក្រង់ (Full Screen)'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
