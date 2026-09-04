import React, { useState, useEffect, useRef } from 'react';
import { X, GraduationCap, Check } from 'lucide-react';

interface ClassModalProps {
  isOpen: boolean;
  mode: 'add' | 'rename';
  currentName?: string;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  mode,
  currentName = '',
  onClose,
  onSave,
}) => {
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setClassName(mode === 'rename' ? currentName : '');
      setError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, mode, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = className.trim();
    if (!trimmed) {
      setError('សូមបញ្ចូលឈ្មោះថ្នាក់រៀន!');
      return;
    }
    if (mode === 'rename' && trimmed === currentName.trim()) {
      onClose();
      return;
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {mode === 'rename' ? 'កែប្រែឈ្មោះថ្នាក់រៀន' : 'បង្កើតថ្នាក់រៀនថ្មី'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'rename' ? 'ផ្លាស់ប្ដូរឈ្មោះថ្នាក់ទៅកាន់ឈ្មោះថ្មី' : 'បញ្ចូលឈ្មោះថ្នាក់រៀនដើម្បីចាប់ផ្ដើម'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ឈ្មោះថ្នាក់រៀន <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                if (error) setError('');
              }}
              placeholder="ឧទាហរណ៍៖ ថ្នាក់ទី១០ក, ថ្នាក់ទី១១ខ..."
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all focus:outline-none focus:ring-2 ${
                error
                  ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{mode === 'rename' ? 'រក្សាទុក' : 'បង្កើតថ្នាក់'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
