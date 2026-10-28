import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  ClipboardPaste, 
  Trash2, 
  Save, 
  UserPlus, 
  Sparkles, 
  Users, 
  ListChecks, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Student } from '../types';

interface StudentQuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  className?: string;
  onSave: (names: string[], mode: 'replace' | 'append') => void | Promise<void>;
  isDarkMode?: boolean;
}

// Fallback-safe clipboard copy function
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, trying fallback:", err);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    console.error("Copy fallback failed:", e);
    return false;
  }
};

export const StudentQuickEditModal: React.FC<StudentQuickEditModalProps> = ({
  isOpen,
  onClose,
  students,
  className = 'ថ្នាក់រៀន',
  onSave,
  isDarkMode = false
}) => {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [cleanedNotice, setCleanedNotice] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync text when modal opens or student list changes
  useEffect(() => {
    if (isOpen) {
      const initialText = students.map(s => s.name).join('\n');
      setText(initialText);
      setCopied(false);
      setCleanedNotice(false);
      setPasteNotice(null);
      setIsSaving(false);
    }
  }, [isOpen, students]);

  if (!isOpen) return null;

  // Split lines into non-empty student names
  const parsedNames = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  // Detect duplicate names
  const nameCounts: Record<string, number> = {};
  for (const n of parsedNames) {
    nameCounts[n] = (nameCounts[n] || 0) + 1;
  }
  const duplicateCount = Object.values(nameCounts).filter((c: number) => c > 1).length;

  const handleCopyAll = async () => {
    if (parsedNames.length === 0) return;
    const allText = parsedNames.join('\n');
    const success = await copyToClipboard(allText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          setText(prev => {
            const cleanClip = clipText.trim();
            if (!prev.trim()) return cleanClip;
            return prev.trim() + '\n' + cleanClip;
          });
          setPasteNotice(`បានបិទភ្ជាប់ឈ្មោះបន្ថែមជោគជ័យ!`);
          setTimeout(() => setPasteNotice(null), 2500);
          return;
        }
      }
    } catch (err) {
      console.warn("Direct clipboard read unavailable:", err);
    }
    // If browser blocks clipboard access, instruct user
    if (textareaRef.current) {
      textareaRef.current.focus();
      setPasteNotice('សូមចុច Ctrl+V (ឬ Cmd+V) ក្នុងប្រអប់ដើម្បីបិទភ្ជាប់');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  // Clean leading numbers (e.g., "1. សុខ", "1- សុខ", "1) សុខ", "• សុខ", tabs, etc.)
  const handleCleanFormatting = () => {
    const lines = text.split('\n');
    const cleaned = lines.map(line => {
      let l = line.trim();
      // Remove leading index pattern like 1. or 1) or 1- or 1: or No. 1 or bullet points
      l = l.replace(/^(\d+[\.\)\-:\s]+|[•\-\*]\s*|No\.\s*\d+\s*)/i, '').trim();
      // Remove any trailing index or numbering if separated by tabs
      l = l.replace(/\t+/g, ' ').trim();
      return l;
    });
    setText(cleaned.join('\n'));
    setCleanedNotice(true);
    setTimeout(() => setCleanedNotice(false), 2500);
  };

  const handleClear = () => {
    if (text.trim() && window.confirm('តើអ្នកពិតជាចង់សម្អាតអក្សរក្នុងប្រអប់នេះមែនទេ?')) {
      setText('');
    }
  };

  const handleSave = async (mode: 'replace' | 'append') => {
    setIsSaving(true);
    try {
      await onSave(parsedNames, mode);
      onClose();
    } catch (err) {
      console.error('Error saving students:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl border flex flex-col max-h-[92vh] ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-100 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
                isDarkMode ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}>
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <span>បញ្ជី & កែឈ្មោះសិស្សទាំងអស់</span>
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs font-semibold flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full ${
                    isDarkMode ? 'bg-indigo-950/60 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    ថ្នាក់៖ {className}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">•</span>
                  <span className={`px-2 py-0.5 rounded-full font-mono ${
                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    សរុប {parsedNames.length} នាក់
                  </span>
                  {duplicateCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      ឈ្មោះស្ទួន {duplicateCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="បិទផ្ទាំង"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Copy All */}
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={parsedNames.length === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40 active:scale-95 ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : isDarkMode
                      ? 'bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 hover:bg-indigo-900/50'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                }`}
                title="ចម្លងឈ្មោះទាំងអស់ទៅកាន់ Clipboard (Copy)"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងទាំងអស់ (Copy)'}</span>
              </button>

              {/* Paste from Clipboard */}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                  isDarkMode
                    ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-750'
                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title="បិទភ្ជាប់អត្ថបទពី Clipboard (Paste)"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>បិទភ្ជាប់ (Paste)</span>
              </button>

              {/* Clean Numbers & Bullets */}
              <button
                type="button"
                onClick={handleCleanFormatting}
                disabled={!text.trim()}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 active:scale-95 ${
                  cleanedNotice
                    ? 'bg-purple-600 text-white'
                    : isDarkMode
                      ? 'bg-slate-800/80 border border-slate-700/60 text-purple-300 hover:bg-slate-800'
                      : 'bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100'
                }`}
                title="លុបលេខរៀងនាំមុខ (1. , 2. , • ) ពីមុខឈ្មោះ"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{cleanedNotice ? 'បានសម្អាតលេខរៀង!' : 'សម្អាតលេខរៀង (1. , 2.)'}</span>
              </button>
            </div>

            {/* Clear Button */}
            {text.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1 cursor-pointer"
                title="សម្អាតអក្សរទាំងអស់ក្នុងប្រអប់"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>សម្អាត</span>
              </button>
            )}
          </div>

          {/* Feedback Notices */}
          {pasteNotice && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl mb-2 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{pasteNotice}</span>
            </motion.div>
          )}

          {/* Main Textarea Area */}
          <div className="relative flex-1 min-h-[260px] flex flex-col my-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`វាយ ឬ បិទភ្ជាប់ឈ្មោះសិស្សនៅទីនេះ (មួយជួរ ឈ្មោះមួយ)៖\nសុខ ចាន់ដារ៉ា\nម៉ៅ ស្រីនិច\nកែវ សុវណ្ណ\nជា ឧត្តម...`}
              className={`w-full flex-1 p-4 rounded-2xl text-sm leading-relaxed font-sans resize-none border focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all font-medium ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' 
                  : 'bg-slate-50/80 border-slate-200 text-slate-800 placeholder:text-slate-400'
              }`}
              style={{ minHeight: '280px' }}
            />
            
            {/* Quick helper tip */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 px-1">
              <span>ជំនួយ៖ វាយឈ្មោះសិស្ស <b>មួយជួរ ឈ្មោះមួយ</b>។ អ្នកអាច Copy ពី Excel, Word ឬ Telegram មក Paste បានភ្លាមៗ!</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                {parsedNames.length} នាក់
              </span>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              បោះបង់
            </button>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* Option to Append */}
              {students.length > 0 && (
                <button
                  type="button"
                  disabled={isSaving || parsedNames.length === 0}
                  onClick={() => handleSave('append')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-40 active:scale-95 ${
                    isDarkMode 
                      ? 'bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 hover:bg-indigo-900/60' 
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  }`}
                  title="បន្ថែមឈ្មោះដែលបានបញ្ចូលទៅលើបញ្ជីសិស្សដែលមានស្រាប់"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ បន្ថែមលើបញ្ជីចាស់</span>
                </button>
              )}

              {/* Save & Replace All */}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('replace')}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
                title="រក្សាទុក និងជំនួសបញ្ជីសិស្សនៃថ្នាក់នេះទាំងស្រុង"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក និងជំនួសទាំងអស់ (Save All)'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
