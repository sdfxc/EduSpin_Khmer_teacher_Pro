import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  FileText,
  Upload,
  Image as ImageIcon,
  FileCode,
  Download,
  Check,
  X,
  Trash2,
  Copy,
  Layers,
  GraduationCap,
  Loader2,
  AlertCircle,
  Eye,
  Edit3,
  CheckCircle2,
  FolderOpen,
  HelpCircle,
  Key
} from 'lucide-react';
import { WordDocItem } from '../../types/lessonMaterials';
import {
  exportGeneratedLessonArticleToDocx,
  GeneratedLessonArticleData
} from '../../lib/lessonWordExporter';
import { getSavedApiKey, saveApiKey } from '../../lib/gemini';

interface AiLessonWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToWordDocs: (doc: WordDocItem) => void;
  activeClassName: string;
  schoolName?: string;
  teacherName?: string;
  isDarkMode?: boolean;
}

const POPULAR_SUBJECTS = [
  'ភាសាខ្មែរ',
  'គណិតវិទ្យា',
  'រូបវិទ្យា',
  'គីមីវិទ្យា',
  'ជីវវិទ្យា',
  'ផែនដីវិទ្យា',
  'ប្រវត្តិវិទ្យា',
  'ភូមិវិទ្យា',
  'សីលធម៌-ពលរដ្ឋវិជ្ជា',
  'ភាសាអង់គ្លេស',
  'ព័ត៌មានវិទ្យា / STEM'
];

const GRADES = [
  'ថ្នាក់ទី ៧',
  'ថ្នាក់ទី ៨',
  'ថ្នាក់ទី ៩',
  'ថ្នាក់ទី ១០',
  'ថ្នាក់ទី ១១',
  'ថ្នាក់ទី ១២',
  'បឋមសិក្សា (ថ្នាក់ទី ១-៦)'
];

interface UploadedFileMeta {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'office';
  mimeType: string;
  data: string; // base64
  size?: number;
}

export default function AiLessonWriterModal({
  isOpen,
  onClose,
  onSaveToWordDocs,
  activeClassName,
  schoolName = 'សាលារៀនសុវណ្ណភូមិ',
  teacherName = 'លោកគ្រូ / អ្នកគ្រូ',
  isDarkMode = false
}: AiLessonWriterModalProps) {
  // Input fields
  const [subject, setSubject] = useState('ភាសាខ្មែរ');
  const [grade, setGrade] = useState(activeClassName || 'ថ្នាក់ទី ៩');
  const [chapter, setChapter] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  // Uploaded files
  const [attachedFiles, setAttachedFiles] = useState<UploadedFileMeta[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedLessonArticleData | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'detailed' | 'summary' | 'full' | 'edit'>('detailed');
  const [editDetailed, setEditDetailed] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeySavedSuccess, setIsKeySavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getSavedApiKey());
    }
  }, [isOpen]);

  const handleSaveKey = () => {
    if (!apiKeyInput.trim()) return;
    saveApiKey(apiKeyInput.trim());
    localStorage.setItem('khmer_ai_gemini_api_key', apiKeyInput.trim());
    setIsKeySavedSuccess(true);
    setTimeout(() => {
      setIsKeySavedSuccess(false);
      setShowApiKeyInput(false);
    }, 1200);
  };

  const handleProcessFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        let type: 'image' | 'pdf' | 'office' = 'office';

        if (file.type.startsWith('image/')) {
          type = 'image';
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          type = 'pdf';
        } else {
          type = 'office';
        }

        setAttachedFiles(prev => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            type,
            mimeType: file.type || 'application/octet-stream',
            data: base64,
            size: file.size
          }
        ]);

        if (!lessonTitle && (file.name.endsWith('.docx') || file.name.endsWith('.pdf'))) {
          setLessonTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() && !lessonNotes.trim() && attachedFiles.length === 0) {
      setErrorMsg('សូមបញ្ចូលចំណងជើងមេរៀន ខ្លឹមសារ ឬឯកសារ (រូបភាព/PDF/Word) ជាមុនសិន!');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const imagesPayload = attachedFiles
      .filter(f => f.type === 'image')
      .map(f => ({ mimeType: f.mimeType, data: f.data }));

    const pdfsPayload = attachedFiles
      .filter(f => f.type === 'pdf')
      .map(f => ({ mimeType: f.mimeType, data: f.data }));

    const officePayload = attachedFiles
      .filter(f => f.type === 'office')
      .map(f => ({ name: f.name, mimeType: f.mimeType, data: f.data }));

    try {
      const apiKey = getSavedApiKey() || localStorage.getItem('khmer_ai_gemini_api_key') || '';
      const response = await fetch('/api/generate-lesson-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          subject,
          grade,
          chapter,
          lessonTitle: lessonTitle.trim() || 'មេរៀនថ្មី',
          lessonText: lessonNotes,
          images: imagesPayload,
          pdfs: pdfsPayload,
          officeFiles: officePayload,
          customInstructions,
          schoolName,
          teacherName
        })
      });

      let data: any;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        if (!response.ok) {
          throw new Error(`ម៉ាស៊ីនបម្រើឆ្លើយតបកំហុស (${response.status})៖ ${responseText.slice(0, 150)}`);
        }
        throw new Error('ការឆ្លើយតបពី Server មិនត្រឹមត្រូវជាទម្រង់ JSON ទេ។ សូមព្យាយាមម្តងទៀត។');
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || 'មានបញ្ហាក្នុងការបង្កើតអត្ថបទមេរៀន');
      }

      setGeneratedResult(data);
      setEditDetailed(data.detailedContent || '');
      setEditSummary(data.summaryContent || '');
      setActiveViewTab('detailed');
    } catch (err: any) {
      console.error('Lesson generation error:', err);
      setErrorMsg(err.message || 'មិនអាចបង្កើតអត្ថបទមេរៀនដោយ AI បានទេ។ សូមពិនិត្យ API Key ឬព្យាយាមម្តងទៀត!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToWordLibrary = () => {
    if (!generatedResult) return;

    const fullFormattedContent = `# ${generatedResult.title}
**មុខវិជ្ជា៖** ${generatedResult.subject} | **ថ្នាក់ទី៖** ${generatedResult.grade} ${generatedResult.chapter ? `| **ជំពូក៖** ${generatedResult.chapter}` : ''}

${generatedResult.introduction ? `### សេចក្តីផ្តើម\n${generatedResult.introduction}\n` : ''}

## I. ខ្លឹមសារមេរៀនលម្អិតសម្រាប់បង្រៀន
${editDetailed}

---

## II. មេរៀនសង្ខេបនៅខាងក្រោយ (Lesson Summary Note)
${editSummary}

${generatedResult.keyTakeaways && generatedResult.keyTakeaways.length > 0 ? `### ★ ចំណុចគន្លឹះសំខាន់ៗដែលត្រូវចងចាំ\n${generatedResult.keyTakeaways.map(t => `- ${t}`).join('\n')}\n` : ''}
`;

    const newDoc: WordDocItem = {
      id: `word-ai-lesson-${Date.now()}`,
      title: generatedResult.title,
      subject: generatedResult.subject,
      grade: generatedResult.grade,
      chapter: generatedResult.chapter || '',
      category: 'summary',
      description: `អត្ថបទមេរៀនបង្រៀនលម្អិត និងមេរៀនសង្ខេបនៅខាងក្រោយ ស្របតាមកម្មវិធីសិក្សាថ្មី MoEYS`,
      content: fullFormattedContent,
      fileName: `មេរៀន_${generatedResult.title}.docx`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveToWordDocs(newDoc);
    onClose();
  };

  const handleDownloadDocx = async () => {
    if (!generatedResult) return;
    await exportGeneratedLessonArticleToDocx(
      {
        ...generatedResult,
        detailedContent: editDetailed,
        summaryContent: editSummary
      },
      schoolName,
      teacherName
    );
  };

  const handleCopyAll = () => {
    if (!generatedResult) return;
    const textToCopy = `# ${generatedResult.title}
មុខវិជ្ជា៖ ${generatedResult.subject} | ថ្នាក់ទី៖ ${generatedResult.grade}

=== ខ្លឹមសារមេរៀនលម្អិត ===
${editDetailed}

=== មេរៀនសង្ខេបនៅខាងក្រោយ ===
${editSummary}
`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  AI សរសេរអត្ថបទមេរៀន (MoEYS Expert)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 font-bold border border-emerald-300/30">
                  កម្មវិធីសិក្សាថ្មី
                </span>
              </div>
              <p className="text-xs text-blue-100/80">
                បង្កើតអត្ថបទមេរៀនលម្អិតសម្រាប់បង្រៀន និងមេរៀនសង្ខេបនៅខាងក្រោយ ស្របតាមកម្រិតថ្នាក់ និងមុខវិជ្ជា
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`p-2 rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-medium ${
                showApiKeyInput
                  ? 'bg-white text-blue-700 border-white shadow-sm'
                  : 'text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border-white/20'
              }`}
              title="កំណត់ API Key"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">API Key</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Drawer */}
        <AnimatePresence>
          {showApiKeyInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-blue-50 dark:bg-slate-900 border-b border-blue-100 dark:border-slate-800 p-4 shrink-0 overflow-hidden"
            >
              <div className="max-w-2xl mx-auto space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Gemini API Key (សោរសម្ងាត់ AI)</span>
                  </label>
                  {isKeySavedSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> បានរក្សាទុកជោគជ័យ!
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="បញ្ចូល Gemini API Key របស់អ្នក (AIzaSy...)"
                    className="flex-1 px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none shadow-sm"
                  >
                    រក្សាទុក
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ចំណាំ៖ ប្រសិនបើ Server មានភ្ជាប់ Key រួចហើយ លោកអ្នកមិនចាំបាច់បញ្ចូលក៏បាន។ ប្រសិនបើជួបបញ្ហា សូមបញ្ចូល Key ផ្ទាល់ខ្លួននៅទីនេះ។
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          {!generatedResult ? (
            /* Input Form */
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Subject quick pick & Grade */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ជ្រើសរើសមុខវិជ្ជា <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SUBJECTS.map(subj => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSubject(subj)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        subject === subj
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    កម្រិតថ្នាក់ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl border text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ជំពូក (Optional)
                  </label>
                  <input
                    type="text"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="ឧ. ជំពូកទី ៣៖ អគ្គិសនី"
                    className="w-full px-3 py-2.5 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ចំណងជើងមេរៀន / ប្រធានបទ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="ឧ. ច្បាប់អូម និងអនុវត្តរូបមន្ត"
                    className="w-full px-3 py-2.5 rounded-2xl border text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Drag and Drop Zone for Images, PDFs, Word/Office */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>បញ្ចូលឯកសារមេរៀន (រូបភាព Drag & Drop • PDF • Word • PowerPoint)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {attachedFiles.length} ឯកសារបានភ្ជាប់
                  </span>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleProcessFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 shadow-inner'
                      : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleProcessFiles(e.target.files);
                      }
                    }}
                    accept=".docx,.doc,.pdf,.pptx,.xlsx,.xls,.txt,image/*"
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ImageIcon className="w-6 h-6 text-blue-500" />
                    <FileText className="w-6 h-6 text-emerald-500" />
                    <FileCode className="w-6 h-6 text-purple-500" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                    ចុចដើម្បីជ្រើសរើស ឬទម្លាក់ File / រូបភាពមេរៀននៅទីនេះ
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    គាំទ្រ រូបភាព (JPG, PNG) • សៀវភៅពុម្ព PDF • ឯកសារ Word (.docx) • ស្លាយ PowerPoint (.pptx)
                  </p>
                </div>

                {/* Attached files chips */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {attachedFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 text-xs text-slate-700 dark:text-slate-200"
                      >
                        {file.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                        {file.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                        {file.type === 'office' && <FileCode className="w-3.5 h-3.5 text-purple-500" />}
                        <span className="font-mono truncate max-w-[180px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer border-none bg-transparent"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Text input notes / Textbook extract */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ខ្លឹមសារ ឬកំណត់ចំណាំមេរៀន (Paste ឬវាយបញ្ចូលបន្ថែម)
                </label>
                <textarea
                  rows={4}
                  value={lessonNotes}
                  onChange={(e) => setLessonNotes(e.target.value)}
                  placeholder="បិទភ្ជាប់ (Paste) កថាខណ្ឌសៀវភៅពុម្ព កំណត់ចំណាំ ឬប្រធានបទដែលចង់ឱ្យ AI សរសេរពង្រីកជាមេរៀនលម្អិត..."
                  className="w-full p-4 rounded-2xl border text-xs font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Custom instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ការណែនាំបន្ថែមពិសេស (Custom Directives - Optional)
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="ឧ. សង្កត់ធ្ងន់លើរូបមន្ត និងលំហាត់គំរូដំណោះស្រាយជាជំហានៗ, ភ្ជាប់ឧទាហរណ៍ក្នុងប្រទេសកម្ពុជា"
                  className="w-full px-4 py-2.5 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 border-none disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI កំពុងរៀបចំសរសេរមេរៀន...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>បង្កើតអត្ថបទមេរៀនដោយ AI</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Generated Result Presentation */
            <div className="space-y-6">
              {/* Header Badge */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                      {generatedResult.subject}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      {generatedResult.grade}
                    </span>
                    {generatedResult.chapter && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        • {generatedResult.chapter}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                    {generatedResult.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setGeneratedResult(null);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-900"
                  >
                    🔄 បង្កើតថ្មី
                  </button>
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border-none"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'បានចម្លង' : 'ចម្លង'}</span>
                  </button>
                  <button
                    onClick={handleDownloadDocx}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-sm shadow-blue-600/20"
                    title="ទាញយកជាឯកសារ Word (.docx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយក Word (.docx)</span>
                  </button>
                  <button
                    onClick={handleSaveToWordLibrary}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-sm shadow-emerald-600/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>រក្សាទុកក្នុងប្រព័ន្ធ</span>
                  </button>
                </div>
              </div>

              {/* Objectives Banner */}
              {generatedResult.objectives && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <h5 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    <span>វត្ថុបំណងនៃការបង្រៀន (Learning Objectives)</span>
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {generatedResult.objectives.knowledge?.length ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">១. ចំណេះដឹង</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                          {generatedResult.objectives.knowledge.map((k, i) => <li key={i}>{k}</li>)}
                        </ul>
                      </div>
                    ) : null}

                    {generatedResult.objectives.skills?.length ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">២. បំណិន</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                          {generatedResult.objectives.skills.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    ) : null}

                    {generatedResult.objectives.attitude?.length ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">៣. ឥរិយាបថ</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                          {generatedResult.objectives.attitude.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* View Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveViewTab('detailed')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    activeViewTab === 'detailed'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>១. មេរៀនលម្អិតសម្រាប់បង្រៀន</span>
                </button>

                <button
                  onClick={() => setActiveViewTab('summary')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    activeViewTab === 'summary'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>២. មេរៀនសង្ខេបនៅខាងក្រោយ</span>
                </button>

                <button
                  onClick={() => setActiveViewTab('edit')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    activeViewTab === 'edit'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>៣. កែសម្រួលអត្ថបទ</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeViewTab === 'detailed' && (
                <div className="p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed space-y-4">
                  {generatedResult.introduction && (
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs leading-relaxed text-blue-900 dark:text-blue-200">
                      <span className="font-bold block mb-1">🌟 សេចក្តីផ្តើម និងការផ្សារភ្ជាប់៖</span>
                      {generatedResult.introduction}
                    </div>
                  )}
                  <div>{editDetailed}</div>
                </div>
              )}

              {activeViewTab === 'summary' && (
                <div className="space-y-4">
                  {/* Summary Main Text */}
                  <div className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    <h5 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>ខ្លឹមសារសង្ខេបមេរៀនគន្លឹះ (Core Summary)</span>
                    </h5>
                    {editSummary}
                  </div>

                  {/* Key takeaways */}
                  {generatedResult.keyTakeaways && generatedResult.keyTakeaways.length > 0 && (
                    <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
                      <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        ★ ចំណុចគន្លឹះសំខាន់ៗដែលត្រូវចងចាំ
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {generatedResult.keyTakeaways.map((takeaway, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                          >
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{takeaway}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exercises */}
                  {generatedResult.exercises && generatedResult.exercises.length > 0 && (
                    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>សំណួរ និងលំហាត់ពង្រឹងចំណេះដឹង</span>
                      </h5>
                      <div className="space-y-3">
                        {generatedResult.exercises.map((ex, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5"
                          >
                            <p className="font-bold text-slate-800 dark:text-slate-100">
                              លំហាត់ទី {idx + 1} ({ex.points || 2} ពិន្ទុ)៖ {ex.question}
                            </p>
                            <p className="text-emerald-700 dark:text-emerald-400 font-medium pl-2 border-l-2 border-emerald-500">
                              ដំណោះស្រាយ៖ {ex.answerOrSolution}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeViewTab === 'edit' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      កែសម្រួល៖ ខ្លឹមសារមេរៀនលម្អិត
                    </label>
                    <textarea
                      rows={8}
                      value={editDetailed}
                      onChange={(e) => setEditDetailed(e.target.value)}
                      className="w-full p-4 rounded-2xl border text-xs font-mono leading-relaxed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      កែសម្រួល៖ មេរៀនសង្ខេបនៅខាងក្រោយ
                    </label>
                    <textarea
                      rows={6}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      className="w-full p-4 rounded-2xl border text-xs font-mono leading-relaxed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
