import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, BookOpen, Loader2, Info, Upload, FileText, Trash2, FileSpreadsheet, Presentation, Key, Languages, HelpCircle } from 'lucide-react';
import { generateQuestions, getSavedApiKey, saveApiKey, FileData } from '../lib/gemini';
import { Question } from '../types';
import { useConfirm } from '../context/ConfirmContext.tsx';
import { GlassLiquidOverlay } from './GlassLiquidCapsule';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (questions: Question[]) => void;
  isDarkMode?: boolean;
}

const getMimeTypeFromExtension = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'text/csv';
    case 'csv': return 'text/csv';
    case 'txt': return 'text/plain';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
};

export default function LessonModal({ isOpen, onClose, onQuestionsGenerated, isDarkMode = false }: LessonModalProps) {
  const { confirmAction } = useConfirm();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(25);
  const [apiKeyInput, setApiKeyInput] = useState(getSavedApiKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generationType, setGenerationType] = useState<'general' | 'pisa'>('general');
  const [pisaLanguage, setPisaLanguage] = useState<'khmer' | 'english' | 'bilingual'>('khmer');
  
  // States for files
  const [uploadedImages, setUploadedImages] = useState<FileData[]>([]);
  const [uploadedPdfs, setUploadedPdfs] = useState<FileData[]>([]);
  const [uploadedOfficeFiles, setUploadedOfficeFiles] = useState<FileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemoveImage = (index: number) => {
    const fileName = uploadedImages[index]?.name || `រូបភាព ${index + 1}`;
    confirmAction({
      title: 'លុបរូបភាព',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់ដករូបភាព «${fileName}» នេះចេញមែនទេ?`,
      confirmText: 'បាទ/ចាស ដកចេញ',
      variant: 'danger',
      onConfirm: () => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const handleRemovePdf = (index: number) => {
    const fileName = uploadedPdfs[index]?.name || `ឯកសារ PDF ${index + 1}`;
    confirmAction({
      title: 'លុបឯកសារ PDF',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់ដកឯកសារ «${fileName}» នេះចេញមែនទេ?`,
      confirmText: 'បាទ/ចាស ដកចេញ',
      variant: 'danger',
      onConfirm: () => {
        setUploadedPdfs(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const handleRemoveOfficeFile = (index: number) => {
    const fileName = uploadedOfficeFiles[index]?.name || `ឯកសារ ${index + 1}`;
    confirmAction({
      title: 'លុបឯកសារ',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់ដកឯកសារ «${fileName}» នេះចេញមែនទេ?`,
      confirmText: 'បាទ/ចាស ដកចេញ',
      variant: 'danger',
      onConfirm: () => {
        setUploadedOfficeFiles(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const nameLower = file.name.toLowerCase();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string; 
        const fileData: FileData = {
          name: file.name,
          mimeType: file.type || getMimeTypeFromExtension(nameLower),
          data: base64String
        };

        if (nameLower.endsWith('.pdf')) {
          setUploadedPdfs(prev => {
            if (prev.some(p => p.name === file.name)) return prev;
            return [...prev, fileData];
          });
        } else if (
          nameLower.endsWith('.docx') ||
          nameLower.endsWith('.doc') ||
          nameLower.endsWith('.pptx') ||
          nameLower.endsWith('.ppt') ||
          nameLower.endsWith('.xlsx') ||
          nameLower.endsWith('.xls') ||
          nameLower.endsWith('.csv') ||
          nameLower.endsWith('.txt') ||
          file.type.includes('wordprocessingml') ||
          file.type.includes('presentationml') ||
          file.type.includes('spreadsheetml') ||
          file.type.includes('msword') ||
          file.type.includes('ms-excel') ||
          file.type.includes('ms-powerpoint') ||
          file.type === 'text/plain'
        ) {
          setUploadedOfficeFiles(prev => {
            if (prev.some(o => o.name === file.name)) return prev;
            return [...prev, fileData];
          });
        } else if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|jfif)$/i.test(nameLower)) {
          setUploadedImages(prev => {
            if (prev.some(p => p.name === file.name)) return prev;
            return [...prev, fileData];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  // Listen to Global Paste Events
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `Pasted Image-${Date.now().toString().slice(-4)}.png`, { type: blob.type });
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        processFiles(files);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!text.trim() && uploadedImages.length === 0 && uploadedPdfs.length === 0 && uploadedOfficeFiles.length === 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const questions = await generateQuestions(text, count, uploadedImages, uploadedPdfs, uploadedOfficeFiles, generationType, pisaLanguage);
      onQuestionsGenerated(questions);
      // Clean up inputs on success
      setText('');
      setUploadedImages([]);
      setUploadedPdfs([]);
      setUploadedOfficeFiles([]);
      onClose();
    } catch (err: any) {
      if (err.message === "NEED_API_KEY") {
        setShowKeyInput(true);
        setErrorMsg("សូមបញ្ចូល កូនសោ API Gemini (Gemini API Key) ដើម្បីបង្កើតសំណួរដោយផ្ទាល់ពីកម្មវិធីរុករក (Browser)។");
      } else {
        const rawErr = err.message || '';
        if (
          rawErr.toLowerCase().includes("quota") ||
          rawErr.toLowerCase().includes("limit") ||
          rawErr.toLowerCase().includes("resource_exhausted") ||
          rawErr.toLowerCase().includes("exhausted") ||
          rawErr.toLowerCase().includes("429") ||
          rawErr.toLowerCase().includes("busy") ||
          rawErr.toLowerCase().includes("overloaded")
        ) {
          setErrorMsg("⚠️ កូតានៃគណនីឥតគិតថ្លៃរួមគ្នាសម្រាប់កម្មវិធី (Gemini API Shared Free Quota) ត្រូវបានកំណត់ទំហំ។ សូមសាកល្បងម្ដងទៀតក្នុងរយៈពេល ១ នាទីខាងមុខ ឬកំណត់ API Key ផ្ទាល់ខ្លួនរបស់អ្នក (ចុច '🔐 កំណត់ API Key' ខាងលើ) ឬជ្រើសរើសប្រើប្រាស់មេរៀនគំរូទូទៅខាងក្រោមភ្លាមៗដោយពុំបាច់រង់ចាំ AI ឡើយ!");
        } else {
          setErrorMsg(rawErr || 'មានបញ្ហាក្នុងការបង្កើតសំណួរ');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop with 3D Glass Liquid blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xl"
            onClick={onClose}
          />

          {/* Modal Container: 3D Glass Liquid Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-slate-900 dark:text-slate-100 w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-white/80 dark:border-white/10 z-10 flex flex-col my-auto"
          >
            {/* Liquid Gloss Crystal Header with 3D Specular Arc & Continuous Liquid Wave */}
            <div className="p-4 sm:p-6 bg-white/20 dark:bg-slate-950/40 backdrop-blur-2xl border-b border-white/30 dark:border-white/10 relative overflow-hidden text-slate-900 dark:text-white flex items-center justify-between shrink-0 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.1)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/30 before:via-white/10 before:to-transparent before:pointer-events-none">
              {/* Continuous Liquid Light Wave across header */}
              <motion.div
                className="absolute inset-y-0 w-1/3 -skew-x-20 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                animate={{ x: ['-120%', '400%'] }}
                transition={{
                  repeat: Infinity,
                  duration: 3.2,
                  ease: [0.4, 0, 0.2, 1],
                  repeatDelay: 1.2,
                }}
              />

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/40 dark:bg-white/15 backdrop-blur-2xl rounded-2xl border border-white/60 dark:border-white/20 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.9),0_4px_15px_rgba(0,0,0,0.08)] flex items-center justify-center text-slate-800 dark:text-white shrink-0">
                  <Sparkles className="w-5 h-5 drop-shadow-xs" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white drop-shadow-xs">
                    បង្កើតសន្លឹកប័ណ្ណសំណួរ AI
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-extrabold">
                      Powered by Gemini AI
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-600">•</span>
                    <button 
                      onClick={() => setShowKeyInput(!showKeyInput)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-extrabold underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Key className="w-2.5 h-2.5" />
                      <span>{showKeyInput ? 'លាក់ API Key' : '🔐 កំណត់ API Key'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 sm:p-2 bg-white/30 dark:bg-white/10 hover:bg-white/50 dark:hover:bg-white/20 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-white/40 dark:border-white/15 transition-colors cursor-pointer relative z-10 shadow-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-5">
              {/* Optional Gemini API Key Banner */}
              {showKeyInput && (
                <div className="p-4 bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/30 rounded-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      កូនសោ API Gemini (Gemini API Key)
                    </label>
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                    >
                      បង្កើត API Key ឥតគិតថ្លៃ ↗
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value);
                        saveApiKey(e.target.value);
                      }}
                      placeholder="បញ្ចូលកូនសោ API Gemini (ឧទាហរណ៍៖ AIzaSy...)"
                      className="flex-1 px-4 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyInput(false)}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-full text-xs font-bold hover:bg-slate-800 cursor-pointer"
                    >
                      រក្សាទុក
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 bg-red-50/90 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 rounded-2xl text-xs font-semibold flex items-start gap-2.5 backdrop-blur-md">
                  <span className="text-red-500 font-bold shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="leading-relaxed">{errorMsg}</p>
                    {(errorMsg.includes("API Key") || errorMsg.includes("កូនសោ") || errorMsg.includes("NEED_API_KEY")) && (
                      <button
                        onClick={() => setShowKeyInput(true)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold mt-1.5 block cursor-pointer"
                      >
                        កំណត់ ឬប្ដូរ API Key ឡើងវិញ ↗
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 💧 Question Category Selector: 3D Crystal Liquid Glass Segmented Capsule */}
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-white/10 backdrop-blur-2xl shadow-xs">
                <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-3 tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ទម្រង់សំណួរលទ្ធផល (Resulting Question Format) ៖</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGenerationType('general')}
                    className={`relative p-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex flex-col items-center gap-1 text-center justify-center overflow-hidden isolate ${
                      generationType === 'general'
                        ? 'text-slate-900 dark:text-white shadow-[0_8px_25px_rgba(0,0,0,0.12)]'
                        : 'bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-900/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {generationType === 'general' && (
                      <GlassLiquidOverlay isDarkMode={isDarkMode} variant="crystal-glass" />
                    )}
                    <span className="relative z-10 text-[13px] font-black">📚 សំណួរបែបទូទៅនៃមេរៀន</span>
                    <span className="relative z-10 text-[10px] font-semibold opacity-80">General Lesson Questions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenerationType('pisa')}
                    className={`relative p-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex flex-col items-center gap-1 text-center justify-center overflow-hidden isolate ${
                      generationType === 'pisa'
                        ? 'text-slate-900 dark:text-white shadow-[0_8px_25px_rgba(0,0,0,0.12)]'
                        : 'bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-900/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {generationType === 'pisa' && (
                      <GlassLiquidOverlay isDarkMode={isDarkMode} variant="crystal-glass" />
                    )}
                    <span className="relative z-10 text-[13px] font-black">🎯 សំណួរបែបតេស្ត PISA</span>
                    <span className="relative z-10 text-[10px] font-semibold opacity-80">PISA Evaluation Standards</span>
                  </button>
                </div>

                {/* Question Language Options */}
                <div className="mt-3.5 pt-3.5 border-t border-slate-200/60 dark:border-white/10">
                  <label className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 mb-2 tracking-wide">
                    <Languages className="w-3 h-3 text-indigo-500" />
                    <span>ជម្រើសភាសានៃសំណួរ (Question Language Option) ៖</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPisaLanguage('khmer')}
                      className={`relative p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-center gap-0.5 text-center justify-center min-h-[58px] overflow-hidden isolate ${
                        pisaLanguage === 'khmer'
                          ? 'text-slate-900 dark:text-white shadow-md'
                          : 'bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-900/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {pisaLanguage === 'khmer' && (
                        <GlassLiquidOverlay isDarkMode={isDarkMode} variant="crystal-glass" />
                      )}
                      <span className="relative z-10 text-[11.5px] font-bold">🇰🇭 ភាសាខ្មែរ (Khmer Only)</span>
                      <span className="relative z-10 text-[9px] opacity-80">1. សំណួរចម្លើយជាភាសាខ្មែរ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPisaLanguage('english')}
                      className={`relative p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-center gap-0.5 text-center justify-center min-h-[58px] overflow-hidden isolate ${
                        pisaLanguage === 'english'
                          ? 'text-slate-900 dark:text-white shadow-md'
                          : 'bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-900/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {pisaLanguage === 'english' && (
                        <GlassLiquidOverlay isDarkMode={isDarkMode} variant="crystal-glass" />
                      )}
                      <span className="relative z-10 text-[11.5px] font-bold">🇬🇧 ភាសាអង់គ្លេស (English)</span>
                      <span className="relative z-10 text-[9px] opacity-80">2. English Questions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPisaLanguage('bilingual')}
                      className={`relative p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-center gap-0.5 text-center justify-center min-h-[58px] overflow-hidden isolate ${
                        pisaLanguage === 'bilingual'
                          ? 'text-slate-900 dark:text-white shadow-md'
                          : 'bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-900/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {pisaLanguage === 'bilingual' && (
                        <GlassLiquidOverlay isDarkMode={isDarkMode} variant="crystal-glass" />
                      )}
                      <span className="relative z-10 text-[11.5px] font-bold">🇬🇧+🇰🇭 អមភាសាអង់គ្លេស</span>
                      <span className="relative z-10 text-[9px] opacity-80">3. With English Support</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lesson Text Input */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ខ្លឹមសារមេរៀន (Lesson Content) *</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="សូមចម្លងខ្លឹមសារមេរៀន ឬកំណត់ចំណាំរបស់អ្នកដាក់ទីនេះ... AI នឹងបង្កើតសំណួរចេញពីមេរៀននេះ។"
                  className="w-full h-32 sm:h-36 p-4 bg-white/50 dark:bg-slate-800/60 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              {/* File / Image Attachment Drag-Drop */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>បញ្ចូលឯកសារ ឬរូបភាពបន្ថែម (Images / PDF / Word / Excel / PowerPoint)</span>
                </label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all flex flex-col items-center justify-center text-center cursor-pointer backdrop-blur-xl ${
                    isDragging 
                      ? "border-indigo-500 bg-indigo-500/10 scale-[0.99] text-indigo-600" 
                      : "border-slate-300/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    multiple 
                    accept="image/*,.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.txt" 
                    className="hidden" 
                  />
                  <div className="w-9 h-9 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 shadow-inner">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ចុចទីនេះ ឬអូសទម្លាក់ឯកសារ ឬរូបភាព (Ctrl+V ដើម្បីបិទភ្ជាប់រូបភាព)
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                    គាំទ្រ PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx) និងរូបភាព JPEG/PNG
                  </p>
                </div>

                {/* Uploaded Files Pills */}
                {(uploadedImages.length > 0 || uploadedPdfs.length > 0 || uploadedOfficeFiles.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {uploadedImages.map((img, idx) => (
                      <div key={`img-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                        <span>🖼️</span>
                        <span className="max-w-[120px] truncate">{img.name || `រូបភាព ${idx + 1}`}</span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                          className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {uploadedPdfs.map((pdf, idx) => (
                      <div key={`pdf-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-semibold text-red-700 dark:text-red-300 shadow-xs">
                        <span>📄</span>
                        <span className="max-w-[120px] truncate">{pdf.name || `PDF ${idx + 1}`}</span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); handleRemovePdf(idx); }}
                          className="text-red-400 hover:text-red-600 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {uploadedOfficeFiles.map((of, idx) => (
                      <div key={`of-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs">
                        <span>📑</span>
                        <span className="max-w-[120px] truncate">{of.name || `ឯកសារ ${idx + 1}`}</span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); handleRemoveOfficeFile(idx); }}
                          className="text-indigo-400 hover:text-red-500 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Number of Cards Slider & Action */}
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-white/10 backdrop-blur-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    ចំនួនសន្លឹកប័ណ្ណសំណួរ (Cards Count)
                  </label>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                    {count} សំណួរ
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={count} 
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500 shadow-inner"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  <span>៥ សន្លឹក</span>
                  <span>១០០ សន្លឹក</span>
                </div>
              </div>

              {/* 💧 3D Crystal Liquid Glass Submit Button: "បង្កើតសំណួរ" */}
              <motion.button
                type="button"
                onClick={handleGenerate}
                disabled={loading || (!text.trim() && uploadedImages.length === 0 && uploadedPdfs.length === 0 && uploadedOfficeFiles.length === 0)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="relative w-full py-3.5 px-6 rounded-full font-black text-sm text-slate-900 dark:text-white flex items-center justify-center gap-2.5 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.15),0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 cursor-pointer overflow-hidden isolate border border-white/40"
              >
                <GlassLiquidOverlay isDarkMode={isDarkMode} variant="crystal-glass" />
                <span className="relative z-10 flex items-center justify-center gap-2.5 drop-shadow-xs">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>កំពុងបង្កើតសំណួរតាមរយៈ Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                      <span className="drop-shadow-xs text-base font-black">បង្កើតសំណួរ AI ឥឡូវនេះ ({count} សំណួរ)</span>
                    </>
                  )}
                </span>
              </motion.button>
            </div>

            {/* Modal Bottom Glass Footer */}
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50/80 dark:bg-slate-950/70 border-t border-slate-100 dark:border-white/5 flex items-center justify-center text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium text-center shrink-0">
              AI នឹងវិភាគខ្លឹមសារមេរៀន ឬឯកសារដែលបានបញ្ចូល រួចបង្កើតសំណួរ និងជម្រើសចម្លើយ 4 ស្វ័យប្រវត្តិ
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
