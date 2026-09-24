import React, { useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Printer, Check, Copy } from 'lucide-react';
import { Notebook, NotebookPage } from './types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook;
  currentPageIndex: number;
  isDarkMode: boolean;
}

export default function ExportModal({
  isOpen,
  onClose,
  notebook,
  currentPageIndex,
  isDarkMode
}: ExportModalProps) {
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [format, setFormat] = useState<'png' | 'pdf' | 'json'>('png');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);

    if (format === 'json') {
      // Export raw JSON backup
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notebook, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${notebook.title || 'smart_notes'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setIsExporting(false);
      onClose();
      return;
    }

    if (format === 'png') {
      // Export canvas directly
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `${notebook.title}_Page_${currentPageIndex + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      setIsExporting(false);
      onClose();
      return;
    }

    if (format === 'pdf') {
      // Trigger native print dialog for crystal-clear PDF print
      window.print();
      setIsExporting(false);
      onClose();
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-black">ទាញយកកំណត់ត្រា (Export)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Format Options */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">ទម្រង់ឯកសារ (Format)</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  format === 'png'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span>រូបភាព PNG</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  format === 'pdf'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>ឯកសារ PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  format === 'json'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <Copy className="w-5 h-5" />
                <span>Smart Backup</span>
              </button>
            </div>
          </div>

          {/* Scope Options */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">ជម្រើសទំព័រ</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'current'}
                  onChange={() => setExportScope('current')}
                  className="accent-indigo-600"
                />
                <span className="text-xs font-bold">ទំព័របច្ចុប្បន្ន (ទំព័រទី {currentPageIndex + 1})</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                  className="accent-indigo-600"
                />
                <span className="text-xs font-bold">សៀវភៅទាំងមូល ({notebook.pages.length} ទំព័រ)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'កំពុងទាញយក...' : 'ទាញយកឥឡូវនេះ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
