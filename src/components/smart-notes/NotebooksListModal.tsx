import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  BookOpen, 
  Trash2, 
  Edit3, 
  Check, 
  Upload, 
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { Notebook } from './types';

interface NotebooksListModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebooks: Notebook[];
  activeNotebookId: string;
  onSelectNotebook: (id: string) => void;
  onCreateNotebook: (title: string, subject: string, coverColor: string, coverIcon: string) => void;
  onDeleteNotebook: (id: string) => void;
  onImportNotebook: (importedNb: Notebook) => void;
  isDarkMode: boolean;
}

const COVER_COLORS = [
  '#4f46e5', // Indigo
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#334155'  // Slate
];

const COVER_ICONS = ['📘', '📙', '📗', '📕', '⚡', '📐', '🔬', '📝', '🎓', '💡', '🌟', '🧮'];

export default function NotebooksListModal({
  isOpen,
  onClose,
  notebooks,
  activeNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  onImportNotebook,
  isDarkMode
}: NotebooksListModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4f46e5');
  const [selectedIcon, setSelectedIcon] = useState('📘');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateNotebook(newTitle.trim(), newSubject.trim() || 'ទូទៅ', selectedColor, selectedIcon);
    setNewTitle('');
    setNewSubject('');
    setIsCreating(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.pages && Array.isArray(parsed.pages)) {
            parsed.id = `nb-${Date.now()}`;
            onImportNotebook(parsed);
          }
        } catch (err) {
          alert('ឯកសារ JSON មិនត្រឹមត្រូវ');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
        isDarkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center font-black">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">បណ្ណាល័យសៀវភៅកំណត់ត្រា (Smart Notebooks)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">គ្រប់គ្រងសៀវភៅកំណត់ត្រា និងកិច្ចការបង្រៀនទាំងអស់</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title="នាំចូលសៀវភៅពីឯកសារ JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>សៀវភៅថ្មី</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create Notebook Form Modal Inline */}
          {isCreating && (
            <form onSubmit={handleCreate} className={`mb-6 p-5 rounded-3xl border space-y-4 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  បង្កើតសៀវភៅកំណត់ត្រាថ្មី
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">ចំណងជើងសៀវភៅ *</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="ឧ. មេរៀនរូបវិទ្យាថ្នាក់ទី១២..."
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">មុខវិជ្ជា</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="ឧ. រូបវិទ្យា, គណិតវិទ្យា, គីមី..."
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Cover Color & Icon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">ពណ៌ក្របទំព័រ</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COVER_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer border ${
                          selectedColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c, borderColor: '#fff' }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">រូបសញ្ញាក្រប</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COVER_ICONS.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setSelectedIcon(ic)}
                        className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                          selectedIcon === ic ? 'bg-indigo-600 text-white shadow' : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow"
                >
                  បង្កើតសៀវភៅ
                </button>
              </div>
            </form>
          )}

          {/* Grid of Notebooks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {notebooks.map(nb => {
              const isActive = nb.id === activeNotebookId;
              return (
                <div
                  key={nb.id}
                  onClick={() => {
                    onSelectNotebook(nb.id);
                    onClose();
                  }}
                  className={`group relative rounded-3xl border p-4 transition-all cursor-pointer flex flex-col justify-between min-h-[190px] ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                      : isDarkMode 
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80' 
                        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
                  }`}
                >
                  {/* Top Cover Badge */}
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-12 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md border-t-2 border-white/40"
                      style={{ backgroundColor: nb.coverColor || '#4f46e5' }}
                    >
                      {nb.coverIcon || '📘'}
                    </div>

                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white shadow-xs">
                          កំពុងបើក
                        </span>
                      )}
                      {notebooks.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`តើលោកអ្នកពិតជាចង់លុបសៀវភៅ «${nb.title}» នេះមែនទេ?`)) {
                              onDeleteNotebook(nb.id);
                            }
                          }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all"
                          title="លុបសៀវភៅនេះ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="pt-3">
                    <h4 className="text-sm font-black line-clamp-1">{nb.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">{nb.subject || 'ទូទៅ'}</p>
                    
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {nb.pages.length} ទំព័រ
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
