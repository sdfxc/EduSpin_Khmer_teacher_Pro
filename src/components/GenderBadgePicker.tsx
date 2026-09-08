import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface GenderBadgePickerProps {
  gender?: 'ប្រុស' | 'ស្រី';
  onChange: (gender: 'ប្រុស' | 'ស្រី') => void;
  compact?: boolean;
  isDarkMode?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function GenderBadgePicker({
  gender = 'ប្រុស',
  onChange,
  compact = false,
  isDarkMode = false,
  align = 'center'
}: GenderBadgePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isFemale = gender === 'ស្រី';

  const handleSelect = (selectedGender: 'ប្រុស' | 'ស្រី', e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedGender);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="ចុចដើម្បីប្ដូរភេទ (ប្រុស ឬ ស្រី)"
        className={`group flex items-center justify-center gap-1 transition-all cursor-pointer select-none rounded-lg font-black ${
          compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[11px]'
        } ${
          isFemale
            ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/30 hover:bg-pink-500/20 shadow-2xs'
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 shadow-2xs'
        }`}
      >
        <span>{gender}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : 'opacity-60 group-hover:opacity-100'}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 top-full mt-1.5 w-32 p-1.5 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
            align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'right' ? 'right-0' : 'left-0'
          } ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-black/50' 
              : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200/50 dark:border-slate-800 mb-1 text-center">
            ជ្រើសរើសភេទ
          </div>

          <button
            type="button"
            onClick={(e) => handleSelect('ប្រុស', e)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
              !isFemale
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-black'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              ប្រុស (Male)
            </span>
            {!isFemale && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={(e) => handleSelect('ស្រី', e)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left mt-0.5 ${
              isFemale
                ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-black'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              ស្រី (Female)
            </span>
            {isFemale && <Check className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />}
          </button>
        </div>
      )}
    </div>
  );
}
