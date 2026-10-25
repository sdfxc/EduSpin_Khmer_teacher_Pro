import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Upload, CheckCircle2, AlertCircle, Database, FileJson, RefreshCw, ShieldCheck, Settings, Sparkles, BookOpen } from 'lucide-react';
import { ClassInfo, Student, QuizSubject, QuizCard, QuizChapter, TeacherAccount } from '../types';
import { 
  GRADE_8K1_CLASS_ID, 
  GRADE_8K1_CLASS_NAME, 
  GRADE_8K1_STUDENTS, 
  GRADE_8K1_SUBJECTS, 
  seedGrade8DataToLocalStorage 
} from '../lib/grade8SeedData';
import { useLanguage } from '../context/LanguageContext';
import { calculateSystemStats } from '../lib/systemStats';

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
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const systemStats = React.useMemo(() => {
    return calculateSystemStats({
      classes,
      activeClassId,
      activeStudents: students,
      activeSubjects: subjects,
      activeCards: cards,
      activeChapters: chapters,
      teacher
    });
  }, [classes, activeClassId, students, subjects, cards, chapters, teacher]);

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
          key.startsWith('groupsData_') ||
          key.startsWith('edu_spin_attendance_') ||
          key.startsWith('khmer_exams_') ||
          key.startsWith('edu_spin_')
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
        classes: systemStats.realClasses,
        students: students,
        allStudents: systemStats.allStudents,
        subjects: systemStats.allSubjects,
        cards: systemStats.allCards,
        chapters: systemStats.allChapters,
        storageDump: localStorageDump,
        metadata: {
          totalClasses: systemStats.totalClassesCount,
          totalStudents: systemStats.totalStudentsCount,
          totalSubjects: systemStats.totalSubjectsCount,
          totalCards: systemStats.totalQuestionsCount,
          totalChapters: systemStats.totalChaptersCount,
          classBreakdowns: systemStats.classBreakdowns
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

      onShowToast(language === 'km' 
        ? '✅ បានទាញយកទិន្នន័យបម្រុងទុក (Full Backup 100%) ដោយជោគជ័យ!' 
        : '✅ Full backup exported successfully (100% state)!');
    } catch (err) {
      console.error(err);
      setErrorMessage(language === 'km' ? 'មានបញ្ហាក្នុងការទាញយកទិន្នន័យ!' : 'Failed to export backup file!');
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
          throw new Error('Invalid file format');
        }
        setImportPreview(parsed);
      } catch (err: any) {
        setErrorMessage(language === 'km' 
          ? 'ឯកសារ JSON មិនត្រឹមត្រូវ ឬខូច! សូមជ្រើសរើសឯកសារត្រឹមត្រូវ។' 
          : 'Invalid or corrupt JSON backup file. Please select a valid file.');
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
      onShowToast(language === 'km' 
        ? '🎉 បានស្ដារទិន្នន័យទាំងអស់ត្រឡប់មកវិញ ១០០% ជោគជ័យ!' 
        : '🎉 Restored 100% of data successfully!');
      setTimeout(() => {
        setIsSuccess(false);
        setImportPreview(null);
        setIsRestoring(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage(language === 'km' ? 'បរាជ័យក្នុងការស្ដារទិន្នន័យ!' : 'Failed to restore backup data!');
      setIsRestoring(false);
    }
  };

  // Direct Seed / Backup All for ថ្នាក់ទី៨ក១
  const handleSeedGrade8All = async () => {
    setIsRestoring(true);
    try {
      const seeded = seedGrade8DataToLocalStorage();
      if (seeded) {
        const g8Class: ClassInfo = {
          id: GRADE_8K1_CLASS_ID,
          name: GRADE_8K1_CLASS_NAME,
          order: 1,
          isPinned: true
        };
        
        const allClasses = classes.some(c => c.id === GRADE_8K1_CLASS_ID)
          ? classes
          : [g8Class, ...classes];

        const backupObj = {
          classes: allClasses,
          students: seeded.students,
          subjects: seeded.subjects,
          chapters: seeded.chapters,
          cards: seeded.cards,
          activeClassId: GRADE_8K1_CLASS_ID,
          storageDump: {
            [`students_class_${GRADE_8K1_CLASS_ID}`]: seeded.students,
            [`subjects_class_${GRADE_8K1_CLASS_ID}`]: seeded.subjects,
            [`chapters_class_${GRADE_8K1_CLASS_ID}`]: seeded.chapters,
            [`quiz_cards_class_${GRADE_8K1_CLASS_ID}`]: seeded.cards,
            [`active_subject_id_${GRADE_8K1_CLASS_ID}`]: seeded.activeSubjectId,
            [`active_room_id_${GRADE_8K1_CLASS_ID}`]: seeded.activeRoomId,
            'edu_spin_attendance_records': seeded.attendance,
            'edu_spin_attendance_reasons': seeded.reasons
          }
        };

        await onRestoreData(backupObj);
        setIsSuccess(true);
        onShowToast(language === 'km' 
          ? '🎉 បានបញ្ចូល និងស្ដារទិន្នន័យថ្នាក់ទី៨ក១ (សិស្ស, វត្តមាន, ពិន្ទុ, វិញ្ញាសា) ១០០% ជោគជ័យ!' 
          : '🎉 Grade 8K1 data fully imported (Students, Attendance, Scores, Quizzes)!');
        setTimeout(() => {
          setIsSuccess(false);
          setIsRestoring(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(language === 'km' ? 'បរាជ័យក្នុងការបញ្ចូលទិន្នន័យថ្នាក់ទី៨ក១!' : 'Failed to import Grade 8K1 data!');
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
                <span>{language === 'km' ? 'បម្រុងទុក និងស្ដារទិន្នន័យ ១០០%' : 'Backup & Restore Vault'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Full Vault
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-blue-200/70 font-medium">
                {language === 'km' ? 'ប្រព័ន្ធបម្រុងទុក & ស្ដារទិន្នន័យគ្រប់គម្លៀត ១០០%' : '100% Comprehensive Backup & Restore Engine'}
              </p>
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
                <span>{language === 'km' ? 'ស្ថានភាពទិន្នន័យបច្ចុប្បន្ន (១០០%):' : 'Current System State (100%):'}</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500">Live Ready</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="text-base font-black text-blue-500 dark:text-blue-400">
                  {systemStats.totalClassesCount}
                </div>
                <div className="text-[11px] font-bold text-slate-500">
                  {language === 'km' ? 'ថ្នាក់រៀនជាក់ស្ដែង' : 'Real Classes'}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`} title={language === 'km' ? 'ចំនួនសិស្សសរុបបូកបញ្ចូលគ្រប់ថ្នាក់ទាំងអស់' : 'Total students summed across all classes'}>
                <div className="text-base font-black text-emerald-500 dark:text-emerald-400">
                  {systemStats.totalStudentsCount}
                </div>
                <div className="text-[11px] font-bold text-slate-500">
                  {language === 'km' ? 'សិស្សសរុប (គ្រប់ថ្នាក់)' : 'Total Students (All Classes)'}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`} title={language === 'km' ? 'ចំនួនសំណួរបូកបញ្ចូលគ្រប់ថ្នាក់ និងគ្រប់មុខវិជ្ជាទាំងអស់' : 'Total questions across all classes and subjects'}>
                <div className="text-base font-black text-amber-500 dark:text-amber-400">
                  {systemStats.totalQuestionsCount}
                </div>
                <div className="text-[11px] font-bold text-slate-500">
                  {language === 'km' ? `សំណួរ (${systemStats.totalSubjectsCount} មុខវិជ្ជា)` : `Questions (${systemStats.totalSubjectsCount} Subj)`}
                </div>
              </div>
            </div>

            {/* Breakdown per real class */}
            {systemStats.classBreakdowns.length > 0 && (
              <div className={`mt-2.5 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} text-[10.5px] text-left space-y-1`}>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>{language === 'km' ? '📊 បញ្ជីថ្នាក់ និងទិន្នន័យជាក់ស្ដែង' : '📊 Real Class Breakdown'}</span>
                  <span className="text-emerald-500 font-black">100% Verified</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-24 overflow-y-auto scrollbar-thin">
                  {systemStats.classBreakdowns.map(cb => (
                    <div key={cb.classId} className={`px-2 py-1 rounded-lg border text-[10px] flex items-center justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <span className="font-bold truncate max-w-[90px]">{cb.className}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{cb.studentsCount} សិស្ស • {cb.questionsCount} សំណួរ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-500 dark:text-blue-300 uppercase tracking-wider">
              {language === 'km' ? '១. ទាញយកទិន្នន័យបម្រុងទុក (Backup)' : '1. Download Backup (.json)'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'km' 
                ? <>ទាញយកទិន្នន័យគ្រប់គម្លៀតទាំងអស់ (ថ្នាក់, បញ្ជីសិស្សគ្រប់ថ្នាក់, ពិន្ទុ, កាតសំណួរ, ក្រុម, មេរៀន, និងការកំណត់) ទៅជាឯកសារ <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold">.json</code> លើកុំព្យូទ័រ ដើម្បីការពារការបាត់បង់។</>
                : <>Export all data (classes, student rosters, scores, quiz cards, groups, smart notes, and settings) to a <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold">.json</code> backup file.</>}
            </p>
            <button
              onClick={handleExport}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer border border-blue-400/20 active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'km' ? 'ទាញយកឯកសារបម្រុងទុក (Backup)' : 'Download Full Backup (.json)'}</span>
            </button>
          </div>

          <div className={`h-px ${isDarkMode ? 'bg-blue-500/20' : 'bg-slate-200'}`} />

          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-500 dark:text-blue-300 uppercase tracking-wider">
              {language === 'km' ? '២. ស្ដារទិន្នន័យពីឯកសារ (Restore)' : '2. Restore from Backup File'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {language === 'km' 
                ? <>ជ្រើសរើសឯកសារបម្រុងទុក <code className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold">.json</code> ដែលបានទាញយកពីមុន ដើម្បីស្ដារឡើងវិញ ១០០%។</>
                : <>Select an exported <code className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold">.json</code> backup file to restore all data with 100% fidelity.</>}
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
                  {language === 'km' ? 'ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ Backup .json' : 'Click here to choose Backup .json file'}
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
                      <div className="text-xs font-bold">{language === 'km' ? 'ឯកសារត្រៀមស្ដារ៖' : 'File ready to restore:'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-blue-300">
                        {importPreview.app || 'EduSpin'} — {importPreview.exportedAt ? new Date(importPreview.exportedAt).toLocaleDateString() : (language === 'km' ? 'កាលបរិច្ឆេទមិនស្គាល់' : 'Unknown date')}
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
                    <div className="text-[10px] text-slate-500">{language === 'km' ? 'ថ្នាក់រៀន' : 'Classes'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      {Array.isArray(importPreview.students) ? importPreview.students.length : 0}
                    </div>
                    <div className="text-[10px] text-slate-500">{language === 'km' ? 'សិស្ស' : 'Students'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-black text-amber-600 dark:text-amber-400">
                      {Array.isArray(importPreview.cards) ? importPreview.cards.length : (Array.isArray(importPreview.subjects) ? importPreview.subjects.length : 0)}
                    </div>
                    <div className="text-[10px] text-slate-500">{language === 'km' ? 'សំណួរ' : 'Questions'}</div>
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
                  <span>{isRestoring ? (language === 'km' ? 'កំពុងស្ដារទិន្នន័យ...' : 'Restoring data...') : (language === 'km' ? 'យល់ព្រមស្ដារទិន្នន័យ (Restore Now 100%)' : 'Restore All Data Now (100%)')}</span>
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
                <span>{language === 'km' ? 'បានស្ដារទិន្នន័យជោគជ័យ ១០០%!' : 'Data successfully restored (100%)!'}</span>
              </div>
            )}
          </div>

          <div className={`h-px ${isDarkMode ? 'bg-blue-500/20' : 'bg-slate-200'}`} />

          {/* Special Grade 8k1 Full Seed & Backup Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-500 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'km' ? '៣. ស្ដារ និងបញ្ចូលទិន្នន័យ «ថ្នាក់ទី៨ក១» ពេញលេញ' : '3. Load Sample / Seed Grade 8K1'}</span>
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Grade 8ក១ All-In-One
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'km' 
                ? <>បញ្ចូលទិន្នន័យសិស្សទាំងអស់ (៣០+ នាក់) ព្រមទាំង <strong>បញ្ជីវត្តមាន, ពិន្ទុគ្រប់ខែ/សប្ដាហ៍, មុខវិជ្ជា & សំណួរវិញ្ញាសា</strong> សម្រាប់ថ្នាក់ទី៨ក១ ដោយស្វ័យប្រវត្តក្នុង ១ ចុច។</>
                : <>Load complete roster (30+ students) with attendance, scores, subjects & quiz cards for Grade 8K1 automatically.</>}
            </p>
            <button
              type="button"
              disabled={isRestoring}
              onClick={handleSeedGrade8All}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer border border-amber-300 active:scale-98 disabled:opacity-50"
            >
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <BookOpen className="w-4 h-4 text-slate-950" />
              )}
              <span>{isRestoring ? (language === 'km' ? 'កំពុងបញ្ចូលទិន្នន័យ...' : 'Loading Grade 8K1...') : (language === 'km' ? 'បញ្ចូលទិន្នន័យថ្នាក់ទី៨ក១ ពេញលេញ (Backup All for ថ្នាក់ទី៨ក១)' : 'Load Full Grade 8K1 Dataset')}</span>
            </button>
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
            {language === 'km' ? 'បិទ' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
