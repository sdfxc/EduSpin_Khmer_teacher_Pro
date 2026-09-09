import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Search,
  Download,
  Trash2,
  Eye,
  ExternalLink,
  BookOpen,
  FolderOpen,
  X,
  Check,
  Tag,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalPdfDoc } from '../../types/externalDocs';
import VisualPdfViewer from './VisualPdfViewer';
import { saveFileToStorage } from '../../lib/fileStorage';

interface PdfManagerProps {
  docs: ExternalPdfDoc[];
  onSaveDocs: (docs: ExternalPdfDoc[]) => void;
  isDarkMode?: boolean;
  activeClassName?: string;
}

export default function PdfManager({
  docs,
  onSaveDocs,
  isDarkMode = false,
  activeClassName = '',
}: PdfManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeViewingDoc, setActiveViewingDoc] = useState<ExternalPdfDoc | null>(null);

  // Form State for Upload
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('រូបវិទ្យា');
  const [formGrade, setFormGrade] = useState(activeClassName || 'ថ្នាក់ទី៩');
  const [formCategory, setFormCategory] = useState<'curriculum' | 'exam_past' | 'guideline' | 'other'>('curriculum');
  const [formDescription, setFormDescription] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local PDF file selection
  const handleFileProcess = async (file: File) => {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      setErrorMsg('សូមជ្រើសរើស File ដែលមានទម្រង់ជា PDF (.pdf)');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      setFormFileName(file.name);
      setFormFileSize(sizeFormatted);
      if (!formTitle) {
        setFormTitle(file.name.replace(/\.[^/.]+$/, ''));
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setFormFileUrl(dataUrl);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error processing PDF file:', err);
      setErrorMsg('មិនអាចអាន File PDF នេះបានទេ។ សូមព្យាយាមម្តងទៀត។');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleSavePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setErrorMsg('សូមបញ្ចូលចំណងជើងឯកសារ');
      return;
    }

    if (!formFileUrl && !formFileName) {
      setErrorMsg('សូមជ្រើសរើស File PDF ឬបញ្ចូល Link ឯកសារ');
      return;
    }

    const newId = `pdf-${Date.now()}`;

    // If we have a large data URL, save it in IndexedDB file storage
    if (formFileUrl && formFileUrl.startsWith('data:')) {
      await saveFileToStorage(newId, formFileUrl);
    }

    const newDoc: ExternalPdfDoc = {
      id: newId,
      title: formTitle.trim(),
      description: formDescription.trim(),
      subject: formSubject,
      grade: formGrade,
      category: formCategory,
      fileName: formFileName || `${formTitle}.pdf`,
      fileSize: formFileSize || '1.2 MB',
      fileUrl: formFileUrl && formFileUrl.startsWith('data:') ? '' : formFileUrl,
      fileStorageId: newId,
      createdAt: Date.now(),
    };

    onSaveDocs([newDoc, ...docs]);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setFormTitle('');
    setFormSubject('រូបវិទ្យា');
    setFormDescription('');
    setFormFileUrl('');
    setFormFileName('');
    setFormFileSize('');
    setErrorMsg(null);
  };

  const handleDeleteDoc = (id: string, title: string) => {
    if (window.confirm(`តើអ្នកពិតជាចង់លុបឯកសារ "${title}" មែនទេ?`)) {
      onSaveDocs(docs.filter(d => d.id !== id));
    }
  };

  // Filtered docs
  const filteredDocs = docs.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'ទាំងអស់' },
    { id: 'curriculum', label: 'សៀវភៅពុម្ព និងកម្មវិធីសិក្សា' },
    { id: 'exam_past', label: 'វិញ្ញាសាចាស់ៗ' },
    { id: 'guideline', label: 'សៀវភៅណែនាំគ្រូ' },
    { id: 'other', label: 'ឯកសារទូទៅ' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Upload Quick Section */}
      <div className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm ${
        isDarkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>បណ្ណាល័យឯកសារ PDF</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-red-500/10 text-red-600 dark:text-red-400">
                {docs.length} ឯកសារ
              </span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              ផ្ទុកឡើង និងអានឯកសារ PDF សៀវភៅពុម្ពក្រសួង និងវិញ្ញាសាផ្សេងៗដោយផ្ទាល់ក្នុងកម្មវិធី
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer active:scale-95 border-none"
        >
          <Upload className="w-4 h-4" />
          <span>Upload បញ្ចូល PDF ថ្មី</span>
        </button>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ស្វែងរកឯកសារ PDF តាមចំណងជើង ឬមុខវិជ្ជា..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl border text-xs bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
            មិនទាន់មានឯកសារ PDF ឡើយ
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            អ្នកអាច Upload បញ្ចូល File PDF (សៀវភៅពុម្ព កិច្ចការស្រាវជ្រាវ ឬវិញ្ញាសាចាស់ៗ) ឬទម្លាក់ File នៅទីនេះ។
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload ឯកសារដំបូង</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="group p-5 rounded-3xl border bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                      {doc.subject || 'ទូទៅ'}
                    </span>
                    {doc.grade && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {doc.grade}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(doc.id, doc.title)}
                    title="លុបឯកសារ"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Document Icon & Title */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-red-600 transition-colors">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {doc.description || 'មិនមានសេចក្តីពិពណ៌នា'}
                    </p>
                  </div>
                </div>

                {/* Metadata tags */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="font-mono">{doc.fileSize || 'PDF'}</span>
                  <span>•</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString('km-KH')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => setActiveViewingDoc(doc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>បើកអាន PDF</span>
                </button>

                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    download={doc.fileName || `${doc.title}.pdf`}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title="ទាញយក File PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden ${
                isDarkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Upload បញ្ចូលឯកសារ PDF
                    </h3>
                    <p className="text-xs text-slate-400">សម្រាប់ថ្នាក់៖ {activeClassName}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSavePdf} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Drag and Drop Zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    File ឯកសារ PDF <span className="text-red-500">*</span>
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-red-500 bg-red-500/10'
                        : formFileName
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-red-400 bg-slate-50 dark:bg-slate-900/40'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileProcess(e.target.files[0]);
                        }
                      }}
                      accept=".pdf,application/pdf"
                      className="hidden"
                    />

                    {formFileName ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-emerald-500 shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                            {formFileName}
                          </p>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            {formFileSize} • បានជ្រើសរើសជោគជ័យ
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isProcessing ? 'កំពុងអាន File PDF...' : 'ចុចដើម្បីរើស ឬទម្លាក់ File PDF នៅទីនេះ'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          គាំទ្រឯកសារ PDF (សៀវភៅពុម្ព, វិញ្ញាសា, សៀវភៅណែនាំ)
                        </p>
                      </>
                    )}
                  </div>

                  {/* Or External PDF URL */}
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      ឬបិទភ្ជាប់ Link ឯកសារ PDF / Google Drive PDF
                    </label>
                    <input
                      type="url"
                      value={formFileUrl.startsWith('data:') ? '' : formFileUrl}
                      onChange={(e) => {
                        setFormFileUrl(e.target.value);
                        if (e.target.value && !formFileName) {
                          setFormFileName('Online PDF Document');
                        }
                      }}
                      placeholder="https://drive.google.com/file/d/... ឬ https://example.com/doc.pdf"
                      className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Document Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ចំណងជើងឯកសារ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="ឧ. សៀវភៅពុម្ពរូបវិទ្យា ថ្នាក់ទី៩ ក្រសួងអប់រំ"
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      មុខវិជ្ជា
                    </label>
                    <input
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="ឧ. រូបវិទ្យា"
                      className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ប្រភេទឯកសារ
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="curriculum">សៀវភៅពុម្ព និងកម្មវិធី</option>
                      <option value="exam_past">វិញ្ញាសាចាស់ៗ</option>
                      <option value="guideline">សៀវភៅណែនាំគ្រូ</option>
                      <option value="other">ឯកសារទូទៅ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    សេចក្តីពិពណ៌នាសង្ខេប
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="កំណត់ចំណាំ ឬសេចក្តីពិពណ៌នាអំពីឯកសារនេះ..."
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer border-none"
                  >
                    <Check className="w-4 h-4" />
                    <span>រក្សាទុកឯកសារ PDF</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN VISUAL PDF VIEWER */}
      {activeViewingDoc && (
        <VisualPdfViewer
          doc={activeViewingDoc}
          onClose={() => setActiveViewingDoc(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
