import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Sparkles, Sigma, HelpCircle, Copy } from 'lucide-react';
import katex from 'katex';

interface EquationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertEquation: (latex: string, color: string, fontSize: number) => void;
  initialLatex?: string;
  isDarkMode: boolean;
}

const MATH_TEMPLATES = [
  { label: 'ប្រភាគ \\frac{a}{b}', latex: '\\frac{a}{b}' },
  { label: 'ស្វ័យគុណ x^2', latex: 'x^{2}' },
  { label: 'សន្ទស្សន៍ x_i', latex: 'x_{i}' },
  { label: 'ឫសការេ \\sqrt{x}', latex: '\\sqrt{x}' },
  { label: 'ឫសទី n', latex: '\\sqrt[n]{x}' },
  { label: 'ផលបូក \\sum', latex: '\\sum_{i=1}^{n} x_i' },
  { label: 'អាំងតេក្រាល \\int', latex: '\\int_{a}^{b} f(x) dx' },
  { label: 'វ៉ិចទ័រ \\vec{F}', latex: '\\vec{F}' },
  { label: 'អូម \\Omega', latex: 'R = 100 \\, \\Omega' },
  { label: 'អូមេហ្គា \\omega', latex: '\\omega = 2\\pi f' },
  { label: 'មុំផាស \\varphi', latex: '\\varphi = \\frac{\\pi}{2}' },
  { label: 'រេស៊ីស្តង់ RLC', latex: 'Z = \\sqrt{R^2 + (L\\omega - \\frac{1}{C\\omega})^2}' },
  { label: 'ចរន្ត i_C', latex: 'i_C = I_{mC} \\sin\\left(\\omega t + \\frac{\\pi}{2}\\right)' },
  { label: 'ហ្វ្រេណែល Fresnel', latex: 'I_m^2 = I_{mR}^2 + (I_{mC} - I_{mL})^2' },
  { label: 'ច្បាប់ញូតុន F=ma', latex: '\\sum \\vec{F} = m\\vec{a}' },
  { label: 'ថាមពល E=mc²', latex: 'E = mc^2' }
];

export default function EquationEditorModal({
  isOpen,
  onClose,
  onInsertEquation,
  initialLatex = 'i_C = I_{mC} \\sin\\left(\\omega t + \\frac{\\pi}{2}\\right)',
  isDarkMode
}: EquationEditorModalProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [color, setColor] = useState('#2563eb');
  const [fontSize, setFontSize] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLatex) {
      setLatex(initialLatex);
    }
  }, [initialLatex]);

  useEffect(() => {
    if (!isOpen) return;
    if (previewRef.current) {
      try {
        katex.render(latex || '...', previewRef.current, {
          throwOnError: true,
          displayMode: true
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'កំហុសទម្រង់ LaTeX');
      }
    }
  }, [latex, isOpen]);

  if (!isOpen) return null;

  const handleInsertTemplate = (tpl: string) => {
    setLatex(prev => prev ? `${prev} + ${tpl}` : tpl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!latex.trim()) return;
    onInsertEquation(latex.trim(), color, fontSize);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-600/10 text-cyan-500 flex items-center justify-center font-black">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">បញ្ចូលរូបមន្តគណិតវិទ្យា & រូបវិទ្យា (LaTeX Equation)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">បង្ហាញរូបមន្តច្បាស់ស្អាតកម្រិតស្តង់ដារវិទ្យាសាស្ត្រ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Live Preview Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ផ្ទាំងបង្ហាញលទ្ធផលផ្ទាល់ (Live Preview)</label>
            <div className={`p-6 rounded-2xl border min-h-[90px] flex items-center justify-center overflow-x-auto ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div 
                ref={previewRef} 
                style={{ color, fontSize: `${fontSize}px` }} 
                className="select-none py-1"
              />
            </div>
            {error && (
              <p className="text-xs text-red-500 font-mono mt-1">⚠️ {error}</p>
            )}
          </div>

          {/* LaTeX Input Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">កូដ LaTeX / រូបមន្ត</label>
            <textarea
              rows={3}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="ឧទាហរណ៍៖ x^2 + y^2 = r^2 ឬ i = I_m \sin(\omega t)"
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isDarkMode ? 'bg-[#1e293b] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Fast Math & Physics Symbols Library */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">គំរូរូបមន្ត & និមិត្តសញ្ញារហ័ស (ចុចដើម្បីបន្ថែម)</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar p-1">
              {MATH_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLatex(tpl.latex)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-700 hover:border-cyan-500 text-cyan-300' 
                      : 'bg-slate-100 border-slate-200 hover:border-cyan-500 text-cyan-700'
                  }`}
                  title={tpl.latex}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color & Size Controls */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">ពណ៌រូបមន្ត</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                />
                <span className="text-xs font-mono font-bold">{color}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">ទំហំអក្សរ ({fontSize}px)</label>
              <input
                type="range"
                min="16"
                max="48"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>បញ្ចូលលើផ្ទាំងកំណត់ត្រា</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
