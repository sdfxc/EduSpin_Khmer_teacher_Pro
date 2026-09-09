import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Plus,
  Download,
  Upload,
  Trash2,
  Search,
  ExternalLink,
  Edit3,
  Check,
  X,
  Sparkles,
  BookOpen,
  FileCode,
  FileSpreadsheet,
  Link as LinkIcon,
  Copy,
  FolderOpen
} from 'lucide-react';
import { WordDocItem } from '../../types/lessonMaterials';
import { exportWordDocContentToDocx } from '../../lib/lessonWordExporter';
import { useConfirm } from '../../context/ConfirmContext';

interface WordDocsManagerProps {
  docs: WordDocItem[];
  onSaveDocs: (docs: WordDocItem[]) => void;
  isDarkMode?: boolean;
  activeClassName: string;
  schoolName?: string;
  teacherName?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  worksheet: { label: 'សន្លឹកកិច្ចការ', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  summary: { label: 'សង្ខេបមេរៀន', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  exercise: { label: 'លំហាត់អនុវត្ត', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  general: { label: 'ឯកសារទូទៅ', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
};

export default function WordDocsManager({
  docs,
  onSaveDocs,
  isDarkMode = false,
  activeClassName,
  schoolName = 'សាលារៀនសុវណ្ណភូមិ',
  teacherName = 'លោកគ្រូ / អ្នកគ្រូ'
}: WordDocsManagerProps) {
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeViewingDoc, setActiveViewingDoc] = useState<WordDocItem | null>(null);

  // Form states for creating / editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('រូបវិទ្យា');
  const [formChapter, setFormChapter] = useState('');
  const [formGrade, setFormGrade] = useState(activeClassName || 'ថ្នាក់ទី ៩');
  const [formCategory, setFormCategory] = useState<'worksheet' | 'summary' | 'exercise' | 'general'>('worksheet');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = docs.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.subject && d.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setFormSubject('រូបវិទ្យា');
    setFormChapter('');
    setFormGrade(activeClassName || 'ថ្នាក់ទី ៩');
    setFormCategory('worksheet');
    setFormDescription('');
    setFormContent(`# សន្លឹកកិច្ចការអនុវត្ត៖ មេរៀនថ្មី

**មុខវិជ្ជា៖** រូបវិទ្យា | **ថ្នាក់ទី៖** ${activeClassName || '៩'}

### I. ទ្រឹស្តីបទ និងរូបមន្តសំខាន់ៗ
- ចំណុចទី១...
- ចំណុចទី២...

### II. សំណួរ និងលំហាត់
1. ចូរពន្យល់ពីអត្ថន័យ...
2. ចូរគណនា...
`);
    setFormFileUrl('');
    setFormFileName('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (d: WordDocItem) => {
    setEditingId(d.id);
    setFormTitle(d.title);
    setFormSubject(d.subject || 'រូបវិទ្យា');
    setFormChapter(d.chapter || '');
    setFormGrade(d.grade || activeClassName || 'ថ្នាក់ទី ៩');
    setFormCategory(d.category);
    setFormDescription(d.description || '');
    setFormContent(d.content || '');
    setFormFileUrl(d.fileUrl || '');
    setFormFileName(d.fileName || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingId) {
      const updated = docs.map(d => d.id === editingId ? {
        ...d,
        title: formTitle.trim(),
        subject: formSubject.trim(),
        chapter: formChapter.trim(),
        grade: formGrade.trim(),
        category: formCategory,
        description: formDescription.trim(),
        content: formContent,
        fileUrl: formFileUrl,
        fileName: formFileName,
        updatedAt: new Date().toISOString()
      } : d);
      onSaveDocs(updated);
    } else {
      const newDoc: WordDocItem = {
        id: `word-doc-${Date.now()}`,
        title: formTitle.trim(),
        subject: formSubject.trim(),
        chapter: formChapter.trim(),
        grade: formGrade.trim(),
        category: formCategory,
        description: formDescription.trim(),
        content: formContent,
        fileUrl: formFileUrl,
        fileName: formFileName || `${formTitle.trim()}.docx`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSaveDocs([newDoc, ...docs]);
    }

    setIsCreateModalOpen(false);
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'លុបឯកសារ Word',
      message: `តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់លុបឯកសារ "${title}" នេះមែនទេ?`,
      confirmText: 'លុបចេញ',
      cancelText: 'បោះបង់',
      variant: 'danger'
    });
    if (ok) {
      onSaveDocs(docs.filter(d => d.id !== id));
      if (activeViewingDoc?.id === id) {
        setIsViewModalOpen(false);
      }
    }
  };

  // Handle local file upload or drop
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setFormFileUrl(reader.result as string);
      setFormFileName(file.name);
      if (!formTitle) {
        setFormTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadWord = async (docItem: WordDocItem) => {
    if (docItem.fileUrl && docItem.fileUrl.startsWith('data:')) {
      // Download direct base64
      const link = document.createElement('a');
      link.href = docItem.fileUrl;
      link.download = docItem.fileName || `${docItem.title}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (docItem.fileUrl && docItem.fileUrl.startsWith('http')) {
      window.open(docItem.fileUrl, '_blank');
      return;
    }

    // Export generated content via docx
    await exportWordDocContentToDocx(docItem, schoolName, teacherName);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកឯកសារ Word, មុខវិជ្ជា, មាតិកា..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl border text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95 border-none"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតឯកសារ Word ថ្មី</span>
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          ទាំងអស់ ({docs.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, info]) => {
          const count = docs.filter(d => d.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                selectedCategory === key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">មិនទាន់មានឯកសារ Word ឡើយ</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            លោកគ្រូ/អ្នកគ្រូអាចបង្កើតសន្លឹកកិច្ចការ សង្ខេបមេរៀន ឬបញ្ចូលឯកសារ Word សម្រាប់ថ្នាក់រៀននេះបានយ៉ាងងាយស្រួល។
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតឯកសារឥឡូវនេះ</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((docItem) => {
            const catInfo = CATEGORY_LABELS[docItem.category] || CATEGORY_LABELS.general;
            return (
              <div
                key={docItem.id}
                className="group p-5 rounded-3xl border bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${catInfo.color}`}>
                      {catInfo.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(docItem)}
                        title="កែសម្រួល"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(docItem.id, docItem.title)}
                        title="លុបឯកសារ"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2">
                        {docItem.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2">
                        <span>{docItem.subject || 'ទូទៅ'}</span>
                        {docItem.chapter && <span>• {docItem.chapter}</span>}
                      </p>
                    </div>
                  </div>

                  {docItem.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                      {docItem.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(docItem.updatedAt).toLocaleDateString('km-KH')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setActiveViewingDoc(docItem);
                        setIsViewModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border-none"
                    >
                      អាន/មើល
                    </button>
                    <button
                      onClick={() => handleDownloadWord(docItem)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer border-none"
                      title="ទាញយកជា Word (.docx)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Word</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Document Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {editingId ? 'កែសម្រួលឯកសារ Word' : 'បង្កើត / បញ្ចូលឯកសារ Word'}
                    </h3>
                    <p className="text-xs text-slate-400">សម្រាប់ថ្នាក់៖ {activeClassName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDoc} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ចំណងជើងឯកសារ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="ឧ. សន្លឹកកិច្ចការ៖ ច្បាប់អូម និងអគ្គិសនី"
                    className="w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ប្រភេទឯកសារ
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-2xl border text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="worksheet">សន្លឹកកិច្ចការ (Worksheet)</option>
                      <option value="summary">សង្ខេបមេរៀន (Summary)</option>
                      <option value="exercise">លំហាត់អនុវត្ត (Exercise)</option>
                      <option value="general">ឯកសារទូទៅ (General)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      មុខវិជ្ជា
                    </label>
                    <input
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="ឧ. រូបវិទ្យា"
                      className="w-full px-3 py-2.5 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ជំពូក / មេរៀន
                    </label>
                    <input
                      type="text"
                      value={formChapter}
                      onChange={(e) => setFormChapter(e.target.value)}
                      placeholder="ឧ. ជំពូកទី ៣"
                      className="w-full px-3 py-2.5 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    សេចក្តីពិពណ៌នាសង្ខេប
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="ឧ. សន្លឹកកិច្ចការសម្រាប់ចែកសិស្សអនុវត្តក្នុងម៉ោងរៀន"
                    className="w-full px-4 py-2 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Optional File Attachment / Google Drive link */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-blue-500" />
                      <span>ភ្ជាប់ឯកសារ Word (.docx) ឬ Link Google Drive / Docs</span>
                    </span>
                    {formFileName && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                        {formFileName}
                      </span>
                    )}
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      isDraggingFile
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      accept=".docx,.doc,.pdf"
                      className="hidden"
                    />
                    <FolderOpen className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      ចុចដើម្បីជ្រើសរើស ឬទម្លាក់ File Word (.docx) នៅទីនេះ
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">គាំទ្រ Word .docx, .doc ឬ .pdf</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="url"
                      value={formFileUrl.startsWith('data:') ? '' : formFileUrl}
                      onChange={(e) => {
                        setFormFileUrl(e.target.value);
                        if (e.target.value && !formFileName) {
                          setFormFileName('Google Docs Link');
                        }
                      }}
                      placeholder="ឬបិទភ្ជាប់ (Paste) Link Google Docs / Google Drive នៅទីនេះ..."
                      className="w-full px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Content Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ខ្លឹមសារឯកសារ (សម្រាប់ Export ជា Word ស្វ័យប្រវត្តិ)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      អាច Ctrl+V បិទភ្ជាប់ ឬ Drag & Drop រូបភាពបាន
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (items) {
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf('image') !== -1) {
                            const blob = items[i].getAsFile();
                            if (blob) {
                              e.preventDefault();
                              const reader = new FileReader();
                              reader.onload = (rev) => {
                                const dataUrl = rev.target?.result as string;
                                setFormContent(prev => prev + `\n![រូបភាព](${dataUrl})\n`);
                              };
                              reader.readAsDataURL(blob);
                              return;
                            }
                          }
                        }
                      }
                    }}
                    onDrop={(e) => {
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith('image/')) {
                          e.preventDefault();
                          e.stopPropagation();
                          const reader = new FileReader();
                          reader.onload = (rev) => {
                            const dataUrl = rev.target?.result as string;
                            setFormContent(prev => prev + `\n![${file.name}](${dataUrl})\n`);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    placeholder="សរសេរខ្លឹមសារមេរៀន ឬសន្លឹកកិច្ចការនៅទីនេះ (អាចបិទភ្ជាប់ Paste រូបភាពដោយ Ctrl+V)..."
                    className="w-full p-4 rounded-2xl border text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95 border-none"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingId ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតឯកសារ'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Document Modal */}
      <AnimatePresence>
        {isViewModalOpen && activeViewingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                      {activeViewingDoc.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeViewingDoc.subject} • {activeViewingDoc.grade} • {activeViewingDoc.chapter}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadWord(activeViewingDoc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយក Word</span>
                  </button>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {activeViewingDoc.description && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300">ពិពណ៌នា៖ </span>
                    {activeViewingDoc.description}
                  </div>
                )}

                {activeViewingDoc.fileUrl && !activeViewingDoc.fileUrl.startsWith('data:') && (
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                        ឯកសារ Google Docs / External Link
                      </span>
                    </div>
                    <a
                      href={activeViewingDoc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                    >
                      <span>បើកមើលក្នុង Tab ថ្មី</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {activeViewingDoc.content || 'មិនមានខ្លឹមសារសរសេរបន្ថែមឡើយ។'}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
