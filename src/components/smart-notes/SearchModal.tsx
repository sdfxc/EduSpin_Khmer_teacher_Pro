import React, { useState } from 'react';
import { X, Search, FileText, Sigma, ChevronRight } from 'lucide-react';
import { Notebook } from './types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebooks: Notebook[];
  onSelectResult: (notebookId: string, pageIndex: number) => void;
  isDarkMode: boolean;
}

export default function SearchModal({
  isOpen,
  onClose,
  notebooks,
  onSelectResult,
  isDarkMode
}: SearchModalProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  // Search across notebook titles, page titles, text boxes, and latex equations
  const searchResults: { notebook: Notebook; pageIndex: number; title: string; matchPreview: string }[] = [];

  if (query.trim()) {
    const q = query.toLowerCase().trim();

    for (const nb of notebooks) {
      nb.pages.forEach((page, pIdx) => {
        let matchText = '';

        // Check page title
        if (page.title && page.title.toLowerCase().includes(q)) {
          matchText = `ចំណងជើង៖ ${page.title}`;
        }
        // Check texts
        else if (page.texts.some(t => t.text.toLowerCase().includes(q))) {
          const matched = page.texts.find(t => t.text.toLowerCase().includes(q));
          matchText = `អត្ថបទ៖ ${matched?.text || ''}`;
        }
        // Check equations
        else if (page.equations.some(e => e.latex.toLowerCase().includes(q))) {
          const matched = page.equations.find(e => e.latex.toLowerCase().includes(q));
          matchText = `រូបមន្ត៖ ${matched?.latex || ''}`;
        }

        if (matchText) {
          searchResults.push({
            notebook: nb,
            pageIndex: pIdx,
            title: page.title || `ទំព័រទី ${pIdx + 1}`,
            matchPreview: matchText
          });
        }
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
        isDarkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Search Input Bar */}
        <div className={`p-4 border-b flex items-center gap-3 ${
          isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-100 bg-slate-50'
        }`}>
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ស្វែងរកអត្ថបទ រូបមន្ត ឬទំព័រ..."
            className="flex-1 bg-transparent border-none text-sm font-bold focus:outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              សូមវាយពាក្យស្វែងរកក្នុងកំណត់ត្រារបស់លោកអ្នក...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              រកមិនឃើញលទ្ធផលដែលត្រូវនឹង «{query}» ឡើយ។
            </div>
          ) : (
            searchResults.map((res, i) => (
              <div
                key={i}
                onClick={() => {
                  onSelectResult(res.notebook.id, res.pageIndex);
                  onClose();
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isDarkMode 
                    ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500 hover:bg-slate-800/80' 
                    : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black flex items-center gap-2">
                      <span>{res.notebook.title}</span>
                      <span className="text-slate-400 font-normal">→ ទំព័រទី {res.pageIndex + 1}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                      {res.matchPreview}
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
