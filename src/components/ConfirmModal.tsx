import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isDarkMode?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'បញ្ជាក់ការលុប',
  message,
  confirmText = 'បាទ/ចាស លុប',
  cancelText = 'បោះបង់',
  variant = 'danger',
  isDarkMode = false
}) => {
  if (!isOpen) return null;

  const isDark = isDarkMode || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-100 text-slate-900'
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Icon + Titles */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              variant === 'danger'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {variant === 'danger' ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="pt-0.5">
              <h3 className="text-base font-black tracking-tight leading-snug">
                {title}
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                ការបញ្ជាក់ដើម្បីសុវត្ថិភាពទិន្នន័យ
              </p>
            </div>
          </div>

          {/* Message body */}
          <div className={`p-3.5 rounded-2xl mb-5 text-xs font-semibold leading-relaxed border ${
            isDark 
              ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' 
              : 'bg-slate-50 border-slate-100 text-slate-600'
          }`}>
            {message}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-lg flex items-center gap-1.5 ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
