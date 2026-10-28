import React from 'react';
import { motion } from 'motion/react';
import { X, Keyboard, Play, RotateCcw, Maximize, Volume2, Sparkles } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = false
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      key: 'Space',
      description: 'បង្វិលកង ឬចាប់ឈ្មោះសិស្សចៃដន្យ (Spin / Pick Student)',
      icon: Play,
      category: 'ការចាប់ឈ្មោះ'
    },
    {
      key: 'R',
      description: 'កំណត់បញ្ជីឈ្មោះសិស្សដែលបានហៅឡើងវិញ (Reset Picked Pool)',
      icon: RotateCcw,
      category: 'ការគ្រប់គ្រង'
    },
    {
      key: 'F',
      description: 'ពង្រីកពេញអេក្រង់ / ចេញពីអេក្រង់ពេញ (Toggle Fullscreen)',
      icon: Maximize,
      category: 'ការបង្ហាញ'
    },
    {
      key: 'M',
      description: 'បិទ ឬបើកសំឡេងហ្គេម (Toggle Sound Mute)',
      icon: Volume2,
      category: 'សំឡេង'
    },
    {
      key: 'Esc',
      description: 'បិទផ្ទាំង Dialog ឬ Modal ណាមួយ (Close Modal)',
      icon: X,
      category: 'ទូទៅ'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-[#1e1e24] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`px-6 py-4.5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">គ្រាប់ចុចកាត់ (Keyboard Shortcuts)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">សម្រាប់គ្រូប្រើប្រាស់រហ័សក្នុងថ្នាក់</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {shortcuts.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{s.description}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{s.category}</div>
                  </div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs shrink-0">
                  {s.key}
                </kbd>
              </div>
            );
          })}
        </div>

        <div className={`px-6 py-3.5 border-t flex justify-end ${
          isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            យល់ព្រម
          </button>
        </div>
      </motion.div>
    </div>
  );
};
