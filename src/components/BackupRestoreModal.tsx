import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Upload, CheckCircle2, AlertCircle, Database, FileJson, RefreshCw, ShieldCheck, Settings } from 'lucide-react';
import { ClassInfo, Student, QuizSubject, QuizCard, QuizChapter, TeacherAccount } from '../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassInfo[];
  students: Student[];
  subjects: QuizSubject[];
  cards?: QuizCard[];
  chapters?: QuizChapter[];
  activeClassId?: string;
  teacher: TeacherAccount | null;
  onRestoreData: (backupData: any) => void;
  onShowToast: (msg: string) => void;
  isDarkMode?: boolean;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  classes,
  students,
  subjects,
  cards = [],
  chapters = [],
  activeClassId = '',
  teacher,
  onRestoreData,
  onShowToast,
  isDarkMode = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  // Export 100% Comprehensive JSON file
  const handleExport = () => {
    try {
      // 1. Gather all class-specific cached data from localStorage
      const localStorageDump: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('students_class_') ||
          key.startsWith('quiz_cards_class_') ||
          key.startsWith('subjects_class_') ||
          key.startsWith('chapters_class_') ||
          key.startsWith('picked_students_class_') ||
          key.startsWith('manual_called_students_class_') ||
          key.startsWith('active_subject_id_') ||
          key.startsWith('active_room_id_') ||
          key.startsWith('khmer_teacher_classes') ||
          key.startsWith('smart_notes_') ||
          key.startsWith('groupsData_')
        )) {
          try {
            const val = localStorage.getItem(key);
            if (val) {
              localStorageDump[key] = JSON.parse(val);
            }
          } catch {
            localStorageDump[key] = localStorage.getItem(key);
          }
        }
      }

      const backupData = {
        app: 'EduSpin Pro',
        system: 'iOS Backup Engine 100%',
        version: '3.0',
        exportedAt: new Date().toISOString(),
        teacher: teacher ? {
          id: teacher.id,
          name: teacher.name,
          username: teacher.username,
          schoolName: teacher.schoolName,
          email: teacher.email
        } : null,
        activeClassId,
        classes: classes,
        students: students,
        subjects: subjects,
        cards: cards,
        chapters: chapters,
        storageDump: localStorageDump,
        metadata: {
          totalClasses: classes.length,
          totalStudents: students.length,
          totalSubjects: subjects.length,
          totalCards: cards.length,
          totalChapters: chapters.length
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const teacherNameStr = teacher?.name ? teacher.name.replace(/\s+/g, '_') : 'Classroom';
      
      link.href = url;
      link.download = `EduSpin_FULL_BACKUP_${teacherNameStr}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowToast('✅ បានទាញយកទិន្នន័យបម្រុងទុក (Full Backup 100%) ដោយជោគជ័យ!');
    } catch (err) {
      console.error(err);
      setErrorMessage('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ!');
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setIsSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('ឯកសារមិនត្រឹមត្រូវ');
        }
        setImportPreview(parsed);
      } catch (err: any) {
        setErrorMessage('ឯកសារ JSON មិនត្រឹមត្រូវ ឬខូច! សូមជ្រើសរើសឯកសារត្រឹមត្រូវ។');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Confirm restore
  const handleConfirmRestore = async () => {
    if (!importPreview) return;
    setIsRestoring(true);
    try {
      await onRestoreData(importPreview);
      setIsSuccess(true);
      onShowToast('🎉 បានស្ដារទិន្នន័យទាំងអស់ត្រឡប់មកវិញ ១០០% ជោគជ័យ!');
      setTimeout(() => {
        setIsSuccess(false);
        setImportPreview(null);
        setIsRestoring(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage('បរាជ័យក្នុងការស្ដារទិន្នន័យ!');
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-[#151824] border-blue-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* iOS Style Header */}
        <div className={`px-6 py-4.5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-blue-500/20 bg-blue-950/40' : 'border-slate-100 bg-blue-50/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 border border-blue-400/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                <span>បម្រុងទុក និងស្ដារទិន្នន័យ ១០០%</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Full Vault
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-blue-200/70 font-medium">100% Comprehensive Backup & Restore Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Quick Metrics */}
          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-blue-950/30 border-blue-500/20' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-blue-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ស្ថានភាពទិន្នន័យបច្ចុប្បន្ន (១០០%):</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500">Live Ready</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-base font-black text-blue-500 dark:text-blue-400">{classes.length}</div>
                <div className="text-[11px] font-bold text-slate-500">ថ្នាក់រៀន</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-base font-black text-emerald-500 dark:text-emerald-400">{students.length}</div>
                <div className="text-[11px] font-bold text-slate-500">សិស្សសរុប</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-base font-black text-amber-500 dark:text-amber-400">{cards.length || subjects.length}</div>
                <div className="text-[11px] font-bold text-slate-500">សំណួរ/មុខវិជ្ជា</div>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-500 dark:text-blue-300 uppercase tracking-wider">
              ១. ទាញយកទិន្នន័យបម្រុងទុក (Backup)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ទាញយកទិន្នន័យគ្រប់គម្លៀតទាំងអស់ (ថ្នាក់, បញ្ជីសិស្សគ្រប់ថ្នាក់, ពិន្ទុ, កាតសំណួរ, ក្រុម, មេរៀន, និងការកំណត់) ទៅជាឯកសារ <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold">.json</code> លើកុំព្យូទ័រ ដើម្បីការពារការបាត់បង់។
            </p>
            <button
              onClick={handleExport}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer border border-blue-400/20 active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>ទាញយកឯកសារបម្រុងទុក (Backup)</span>
            </button>
          </div>

          <div className={`h-px ${isDarkMode ? 'bg-blue-500/20' : 'bg-slate-200'}`} />

          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-500 dark:text-blue-300 uppercase tracking-wider">
              ២. ស្ដារទិន្នន័យពីឯកសារ (Restore)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              ជ្រើសរើសឯកសារបម្រុងទុក <code className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold">.json</code> ដែលបានទាញយកពីមុន ដើម្បីស្ដារឡើងវិញ ១០០%។
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            {!importPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-6 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-blue-400/30 hover:border-blue-400 bg-blue-950/20 hover:bg-blue-950/40' 
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-blue-200">
                  ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ Backup .json
                </span>
              </button>
            ) : (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-blue-950/60 border-blue-400/40' : 'bg-blue-50/50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-xs font-bold">ឯកសារត្រៀមស្ដារ៖</div>
                      <div className="text-[11px] text-slate-500 dark:text-blue-300">
                        {importPreview.app || 'EduSpin'} — {importPreview.exportedAt ? new Date(importPreview.exportedAt).toLocaleDateString() : 'កាលបរិច្ឆេទមិនស្គាល់'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setImportPreview(null)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-black text-blue-600 dark:text-blue-400">
                      {Array.isArray(importPreview.classes) ? importPreview.classes.length : 0}
                    </div>
                    <div className="text-[10px] text-slate-500">ថ្នាក់រៀន</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      {Array.isArray(importPreview.students) ? importPreview.students.length : 0}
                    </div>
                    <div className="text-[10px] text-slate-500">សិស្ស</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-black text-amber-600 dark:text-amber-400">
                      {Array.isArray(importPreview.cards) ? importPreview.cards.length : (Array.isArray(importPreview.subjects) ? importPreview.subjects.length : 0)}
                    </div>
                    <div className="text-[10px] text-slate-500">សំណួរ</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleConfirmRestore}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRestoring ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>{isRestoring ? 'កំពុងស្ដារទិន្នន័យ...' : 'យល់ព្រមស្ដារទិន្នន័យ (Restore Now 100%)'}</span>
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>បានស្ដារទិន្នន័យជោគជ័យ ១០០%!</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex justify-end ${
          isDarkMode ? 'border-blue-500/20 bg-blue-950/20' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            បិទ
          </button>
        </div>
      </motion.div>
    </div>
  );
};
