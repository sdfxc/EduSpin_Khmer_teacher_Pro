import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  BookOpen, 
  Loader2, 
  Info, 
  Upload, 
  FileText, 
  Trash2, 
  Key, 
  Languages, 
  HelpCircle,
  GraduationCap,
  Layers,
  CheckCircle2,
  Sliders,
  Award,
  Compass,
  Cpu,
  Calculator,
  ChevronDown
} from 'lucide-react';
import { generateQuestions, getSavedApiKey, saveApiKey, FileData } from '../lib/gemini';
import { Question } from '../types';
import { useConfirm } from '../context/ConfirmContext.tsx';
import { GlassLiquidOverlay } from './GlassLiquidCapsule';
import { useLanguage } from '../context/LanguageContext';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (questions: Question[]) => void;
  isDarkMode?: boolean;
}

const MOEYS_SUBJECTS = [
  { id: 'math', name: 'គណិតវិទ្យា', icon: '📐', group: 'stem' },
  { id: 'physics', name: 'រូបវិទ្យា', icon: '⚡', group: 'stem' },
  { id: 'chemistry', name: 'គីមីវិទ្យា', icon: '🧪', group: 'stem' },
  { id: 'biology', name: 'ជីវវិទ្យា', icon: '🌿', group: 'stem' },
  { id: 'earth_science', name: 'ផែនដីវិទ្យា', icon: '🌍', group: 'stem' },
  { id: 'khmer', name: 'ភាសាខ្មែរ', icon: '🇰🇭', group: 'social' },
  { id: 'english', name: 'ភាសាអង់គ្លេស', icon: '🇬🇧', group: 'social' },
  { id: 'history', name: 'ប្រវត្តិវិទ្យា', icon: '🏛️', group: 'social' },
  { id: 'geography', name: 'ភូមិវិទ្យា', icon: '🗺️', group: 'social' },
  { id: 'morality', name: 'សីលធម៌–ពលរដ្ឋវិជ្ជា', icon: '🤝', group: 'social' },
  { id: 'stem', name: 'STEM', icon: '🔬', group: 'stem' },
  { id: 'ict', name: 'កុំព្យូទ័រ / ICT', icon: '💻', group: 'stem' },
  { id: 'technology', name: 'បច្ចេកវិទ្យា', icon: '⚙️', group: 'stem' },
  { id: 'home_economics', name: 'គេហវិទ្យា', icon: '🏡', group: 'vocational' },
  { id: 'sports', name: 'អប់រំកាយ និងកីឡា', icon: '⚽', group: 'vocational' },
  { id: 'other', name: 'មុខវិជ្ជាផ្សេងៗ', icon: '📚', group: 'social' },
];

const MOEYS_GRADES = [
  'ថ្នាក់ទី ១', 'ថ្នាក់ទី ២', 'ថ្នាក់ទី ៣', 'ថ្នាក់ទី ៤', 'ថ្នាក់ទី ៥', 'ថ្នាក់ទី ៦',
  'ថ្នាក់ទី ៧', 'ថ្នាក់ទី ៨', 'ថ្នាក់ទី ៩', 'ថ្នាក់ទី ១០', 'ថ្នាក់ទី ១១', 'ថ្នាក់ទី ១២'
];

const QUESTION_TYPES = [
  { id: 'all_mixed', name: 'ចម្រុះទាំងអស់', desc: 'បន្សំគ្រប់ប្រភេទសំណួរ (QCM, T/F, Short, Problem, HOTS, PISA, STEM...)', icon: '✨' },
  { id: 'qcm', name: 'QCM / MCQ', desc: 'ជម្រើស 4 (A, B, C, D) ឆ្លាស់ចម្លើយត្រឹមត្រូវ', icon: '🔘' },
  { id: 'true_false', name: 'True / False', desc: 'ត្រូវ ឬ ខុស រហ័ស', icon: '⚖️' },
  { id: 'short_answer', name: 'Short Answer', desc: 'សំណួរចម្លើយខ្លីៗ ចំគោលដៅ', icon: '📝' },
  { id: 'problem_solving', name: 'Problem Solving', desc: 'លំហាត់គណនា រូបមន្ត និងដំណោះស្រាយ', icon: '🧮' },
  { id: 'application', name: 'Application & Scenario', desc: 'ការអនុវត្តជាក់ស្តែង & ជីវភាពរស់នៅ', icon: '🌱' },
  { id: 'hots', name: 'HOTS', desc: 'ការគិតកម្រិតខ្ពស់ (Higher Order Thinking)', icon: '💡' },
  { id: 'pisa', name: 'PISA-style', desc: 'ស្ដង់ដារតេស្ត PISA អន្តរជាតិ MoEYS', icon: '🎯' },
  { id: 'stem', name: 'STEM Project', desc: 'គម្រោង STEM & សមត្ថភាពអនុវត្ត', icon: '🔬' },
];

const BLOOM_LEVELS = [
  { id: 'all', name: 'ចម្រុះគ្រប់កម្រិត (Balanced)', desc: 'បែងចែកពី L1 ដល់ L6 សមស្រប' },
  { id: 'remember', name: 'Level 1 — Remember (ចងចាំ)', desc: 'កំណត់, រំលឹក, រាយ, សម្គាល់' },
  { id: 'understand', name: 'Level 2 — Understand (យល់ដឹង)', desc: 'ពន្យល់, បកស្រាយ, ប្រៀបធៀប, សង្ខេប' },
  { id: 'apply', name: 'Level 3 — Apply (អនុវត្ត)', desc: 'គណនា, អនុវត្ត, ប្រើរូបមន្ត, ដោះស្រាយ' },
  { id: 'analyze', name: 'Level 4 — Analyze (វិភាគ)', desc: 'វិភាគ, បែងចែក, រកមូលហេតុ, ទំនាក់ទំនង' },
  { id: 'evaluate', name: 'Level 5 — Evaluate (វាយតម្លៃ)', desc: 'វាយតម្លៃ, បង្ហាញហេតុផល, ជ្រើសរើស' },
  { id: 'create', name: 'Level 6 — Create (បង្កើតថ្មី)', desc: 'បង្កើត, រចនា, ដំណោះស្រាយ, គម្រោង' },
];

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
  const { language: uiLanguage, t } = useLanguage();
  
  // Master Prompt Core Inputs
  const [grade, setGrade] = useState('ថ្នាក់ទី ៩');
  const [subject, setSubject] = useState('គណិតវិទ្យា');
  const [chapter, setChapter] = useState('');
  const [lesson, setLesson] = useState('');
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState('qcm');
  const [bloomLevel, setBloomLevel] = useState('all');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [language, setLanguage] = useState<'khmer' | 'english' | 'bilingual'>('khmer');
  const [points, setPoints] = useState(2);
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');
  const [count, setCount] = useState(25);
  const [text, setText] = useState('');

  // UI state
  const [activeConfigTab, setActiveConfigTab] = useState<'prompt_builder' | 'attachments'>('prompt_builder');
  const [loading, setLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getSavedApiKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Attachments
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

  // Global Paste
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
    setLoading(true);
    setErrorMsg('');
    try {
      const questions = await generateQuestions({
        lessonText: text,
        count,
        images: uploadedImages,
        pdfs: uploadedPdfs,
        officeFiles: uploadedOfficeFiles,
        questionType,
        pisaLanguage: language,
        grade,
        subject,
        chapter,
        lesson,
        topic,
        bloomLevel,
        difficulty,
        points,
        includeExplanation,
        customInstructions
      });

      if (!questions || questions.length === 0) {
        throw new Error("មិនទទួលបានសំណួរត្រឡប់មកវិញទេ សូមព្យាយាមម្តងទៀត។");
      }

      onQuestionsGenerated(questions);
      // Reset inputs
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
          setErrorMsg("⚠️ កូតានៃគណនីឥតគិតថ្លៃរួមគ្នាសម្រាប់កម្មវិធីត្រូវបានកំណត់ទំហំ។ សូមសាកល្បងម្ដងទៀតក្នុងរយៈពេល ១ នាទីខាងមុខ ឬកំណត់ API Key ផ្ទាល់ខ្លួនរបស់អ្នក (ចុច '🔐 កំណត់ API Key' ខាងលើ)!");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-2xl"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-slate-900 dark:text-slate-100 w-full max-w-3xl max-h-[94dvh] rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] border border-white/80 dark:border-white/10 z-10 flex flex-col my-auto"
          >
            {/* Liquid Crystal Header */}
            <div className="p-4 sm:p-5 bg-white/40 dark:bg-slate-950/50 backdrop-blur-2xl border-b border-white/30 dark:border-white/10 relative overflow-hidden text-slate-900 dark:text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      {t('ai_assessment_expert')}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                      {t('moeys_standard')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                      {uiLanguage === 'kh' ? 'ប្រព័ន្ធបង្កើតសំណួរ–ចម្លើយ ស្របតាមកម្មវិធីសិក្សាក្រសួងអប់រំ យុវជន និងកីឡា' : 'System for generating questions according to MoEYS curriculum'}
                    </p>
                    <span className="text-slate-400">•</span>
                    <button 
                      onClick={() => setShowKeyInput(!showKeyInput)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-extrabold underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Key className="w-2.5 h-2.5" />
                      <span>{showKeyInput ? 'លាក់ Key' : '🔐 API Key'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 sm:p-2 bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 rounded-xl text-slate-700 dark:text-slate-200 border border-white/40 transition-colors cursor-pointer relative z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Config & Navigation Tabs */}
            <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveConfigTab('prompt_builder')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeConfigTab === 'prompt_builder'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{t('curriculum_alignment')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveConfigTab('attachments')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeConfigTab === 'attachments'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('files_notes')}</span>
                  {(uploadedImages.length > 0 || uploadedPdfs.length > 0 || uploadedOfficeFiles.length > 0) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>

              <div className="text-[11px] font-bold text-slate-500 hidden sm:block">
                sala.moeys.gov.kh
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Optional Gemini API Key Banner */}
              {showKeyInput && (
                <div className="p-3.5 bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/30 rounded-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      {t('gemini_key_title')}
                    </label>
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                    >
                      {t('gemini_key_get')}
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
                      placeholder={t('gemini_key_desc')}
                      className="flex-1 px-4 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyInput(false)}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-full text-xs font-bold hover:bg-slate-800 cursor-pointer"
                    >
                      {t('save')}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 rounded-2xl text-xs font-semibold flex items-start gap-2 backdrop-blur-md">
                  <span className="text-red-500 font-bold shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {activeConfigTab === 'prompt_builder' ? (
                <div className="space-y-4">
                  {/* Grid 1: Grade & Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Grade Selector */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{t('grade_level')} *</span>
                      </label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      >
                        {MOEYS_GRADES.map((g, idx) => (
                          <option key={g} value={g}>{t('grade_' + (idx + 1))}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Selector */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{t('moeys_subject')} *</span>
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      >
                        {MOEYS_SUBJECTS.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.icon} {t('subj_' + s.id)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Grid 2: Chapter, Lesson, Topic */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase mb-1 block">
                        {t('chapter')}
                      </label>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        placeholder={uiLanguage === 'kh' ? 'ឧ. ជំពូកទី ១៖ ចលនា' : 'e.g. Chapter 1: Motion'}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase mb-1 block">
                        {t('lesson')}
                      </label>
                      <input
                        type="text"
                        value={lesson}
                        onChange={(e) => setLesson(e.target.value)}
                        placeholder={uiLanguage === 'kh' ? 'ឧ. មេរៀនទី ២៖ ច្បាប់អូម' : 'e.g. Lesson 2: Ohm Law'}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase mb-1 block">
                        {t('topic_concept')}
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={uiLanguage === 'kh' ? 'ឧ. រូបមន្តគណនាតង់ស្យុង' : 'e.g. Voltage Formula'}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Question Type Selector */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t('question_assessment_types')} ៖</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {QUESTION_TYPES.map(qt => (
                        <button
                          key={qt.id}
                          type="button"
                          onClick={() => setQuestionType(qt.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                            questionType === qt.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 shadow-sm'
                              : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 hover:bg-white text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-black">{qt.icon} {t('qt_' + qt.id + '_name')}</span>
                            {questionType === qt.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                          </div>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-medium">
                            {t('qt_' + qt.id + '_desc')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bloom's Taxonomy & Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Bloom's Taxonomy */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{t('bloom_taxonomy')}</span>
                      </label>
                      <select
                        value={bloomLevel}
                        onChange={(e) => setBloomLevel(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      >
                        {BLOOM_LEVELS.map(bl => (
                          <option key={bl.id} value={bl.id}>
                            {t('bloom_' + bl.id + '_name')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Difficulty & Points */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5 block">
                          {t('difficulty_level')}
                        </label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="easy">🟢 {t('easy')}</option>
                          <option value="medium">🟡 {t('medium')}</option>
                          <option value="hard">🔴 {t('hard')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5 block">
                          {t('points_per_q')}
                        </label>
                        <select
                          value={points}
                          onChange={(e) => setPoints(parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value={1}>1 {t('points_label')}</option>
                          <option value={2}>2 {t('points_label')}</option>
                          <option value={5}>5 {t('points_label')}</option>
                          <option value={10}>10 {t('points_label')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Language Mode & Step-by-Step Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Language Selector */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                        <Languages className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{t('question_language')}</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLanguage('khmer')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                            language === 'khmer'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          🇰🇭 {t('khmer')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguage('english')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                            language === 'english'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          🇬🇧 English
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguage('bilingual')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                            language === 'bilingual'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          🌐 {t('bilingual')}
                        </button>
                      </div>
                    </div>

                    {/* Step-by-Step Toggle */}
                    <div className="flex flex-col justify-end">
                      <label 
                        onClick={() => setIncludeExplanation(!includeExplanation)}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-indigo-500" />
                          <div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {t('formula_solutions')}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {t('formula_solutions_desc')}
                            </div>
                          </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${includeExplanation ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeExplanation ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Custom Directive Input */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1 block">
                      {t('custom_prompt_teacher')}
                    </label>
                    <input
                      type="text"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder={uiLanguage === 'kh' ? 'ឧ. សង្កត់ធ្ងន់លើលំហាត់អនុវត្តជាក់ស្តែងក្នុងជីវភាពរស់នៅ ឬទ្រឹស្តីបទសំខាន់...' : 'e.g. Focus on practical real-life exercises or key theories...'}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Lesson Text Input */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t('lesson_content_notes')}</span>
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t('copy_lesson_content_placeholder')}
                      className="w-full h-32 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  {/* File / Image Attachment Drag-Drop */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                      <Upload className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t('upload_docs_images')}</span>
                    </label>
                    
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                        isDragging 
                          ? "border-indigo-500 bg-indigo-500/10 scale-[0.99] text-indigo-600" 
                          : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-white/40 dark:bg-slate-800/40 text-slate-500"
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
                      <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-1.5">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t('drag_drop_files_images')}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {t('supported_file_types')}
                      </p>
                    </div>

                    {/* Uploaded Files Pills */}
                    {(uploadedImages.length > 0 || uploadedPdfs.length > 0 || uploadedOfficeFiles.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {uploadedImages.map((img, idx) => (
                          <div key={`img-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <span>🖼️</span>
                            <span className="max-w-[120px] truncate">{img.name || `${t('images_photos_desc')} ${idx + 1}`}</span>
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
                          <div key={`pdf-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-semibold text-red-700 dark:text-red-300">
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
                          <div key={`of-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            <span>📑</span>
                            <span className="max-w-[120px] truncate">{of.name || `${t('school')} ${idx + 1}`}</span>
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
                </div>
              )}

              {/* Number of Cards Slider & Action */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    {t('cards_count')}
                  </label>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white shadow-xs">
                    {count} {t('questions')}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={count} 
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>៥ {t('questions')}</span>
                  <span>១០០ {t('questions')}</span>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full py-3.5 px-6 rounded-full font-black text-sm text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 flex items-center justify-center gap-2.5 shadow-[0_12px_28px_-6px_rgba(79,70,229,0.4)] disabled:opacity-50 cursor-pointer overflow-hidden isolate"
              >
                <span className="relative z-10 flex items-center justify-center gap-2.5 drop-shadow-xs">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('ai_generating_msg')} ({count} {t('questions')})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span className="text-base font-black">
                        {t('create_questions_ai_now')} ({count} {t('questions')} • {t('subj_' + MOEYS_SUBJECTS.find(s=>s.name===subject)?.id) || subject} • {t('grade_' + (MOEYS_GRADES.indexOf(grade) + 1)) || grade})
                      </span>
                    </>
                  )}
                </span>
              </motion.button>
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 flex items-center justify-center text-[11px] text-slate-500 font-medium text-center shrink-0">
              {t('ai_system_notes_msg')}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
