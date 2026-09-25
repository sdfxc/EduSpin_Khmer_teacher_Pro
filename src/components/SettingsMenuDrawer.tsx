import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Settings, 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileJson, 
  RefreshCw, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Keyboard, 
  RotateCcw, 
  Sparkles, 
  User, 
  LogOut, 
  Layers
} from 'lucide-react';
import { ClassInfo, Student, QuizSubject, QuizCard, QuizChapter, TeacherAccount } from '../types';
import { GlassLiquidOverlay } from './GlassLiquidCapsule';

interface SettingsMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenShortcuts: () => void;
  onOpenLessonModal: () => void;
  onResetAll: () => void;
  teacher: TeacherAccount | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  // Full Data context for 100% Backup & Restore
  classes: ClassInfo[];
  students: Student[];
  subjects: QuizSubject[];
  cards: QuizCard[];
  chapters: QuizChapter[];
  activeClassId: string;
  onRestoreFullData: (backupData: any) => Promise<void> | void;
  onShowToast: (msg: string) => void;
}

export const SettingsMenuDrawer: React.FC<SettingsMenuDrawerProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  soundOn,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onOpenShortcuts,
  onOpenLessonModal,
  onResetAll,
  teacher,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  classes,
  students,
  subjects,
  cards,
  chapters,
  activeClassId,
  onRestoreFullData,
  onShowToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'backup'>('settings');

  // Collect 100% of all data from state and localStorage
  const handleExportFullBackup = () => {
    try {
      // Gather all class-specific cached data from localStorage
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

      const fullBackupPayload = {
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
        classes,
        students,
        subjects,
        cards,
        chapters,
        storageDump: localStorageDump,
        metadata: {
          totalClasses: classes.length,
          totalStudents: students.length,
          totalSubjects: subjects.length,
          totalCards: cards.length,
          totalChapters: chapters.length
        }
      };

      const jsonStr = JSON.stringify(fullBackupPayload, null, 2);
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
      console.error('Export backup failed:', err);
      setErrorMessage('មានបញ្ហាក្នុងការទាញយកទិន្នន័យបម្រុងទុក!');
    }
  };

  // Handle file select for restore
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
      } catch (err) {
        setErrorMessage('ឯកសារ JSON មិនត្រឹមត្រូវ ឬខូច! សូមជ្រើសរើសឯកសារត្រឹមត្រូវ។');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute 100% full restore
  const handleConfirmRestore = async () => {
    if (!importPreview) return;
    setIsRestoring(true);
    setErrorMessage(null);
    try {
      await onRestoreFullData(importPreview);
      setIsSuccess(true);
      onShowToast('🎉 បានស្ដារទិន្នន័យទាំងអស់ត្រឡប់មកវិញ ១០០% ជោគជ័យ!');
      setTimeout(() => {
        setIsSuccess(false);
        setImportPreview(null);
        setIsRestoring(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Restore failed:', err);
      setErrorMessage('បរាជ័យក្នុងការស្ដារទិន្នន័យ! ' + (err?.message || ''));
      setIsRestoring(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className={`absolute inset-0 cursor-pointer ${
              isDarkMode ? 'bg-black/65 backdrop-blur-sm' : 'bg-black/25 backdrop-blur-xs'
            }`}
          />

          {/* Liquid Glass Sliding Drawer: Pure White in Light mode, Soft Gray in Dark mode */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative z-10 w-full max-w-md h-full flex flex-col backdrop-blur-3xl select-none overflow-hidden transition-colors ${
              isDarkMode 
                ? 'bg-neutral-900/90 text-neutral-100 border-l border-neutral-800 shadow-[-20px_0_60px_rgba(0,0,0,0.6)]' 
                : 'bg-white/90 text-neutral-900 border-l border-neutral-200/80 shadow-[-20px_0_60px_rgba(0,0,0,0.12)]'
            }`}
          >
            {/* Liquid Light Stream Top Arc */}
            <div className={`absolute top-0 inset-x-0 h-1 pointer-events-none ${
              isDarkMode ? 'bg-gradient-to-r from-transparent via-neutral-400/40 to-transparent' : 'bg-gradient-to-r from-transparent via-neutral-900/10 to-transparent'
            }`} />

            {/* iOS Liquid Glass Header */}
            <div className={`p-5 border-b flex items-center justify-between backdrop-blur-2xl shrink-0 relative z-10 ${
              isDarkMode ? 'border-neutral-800 bg-neutral-900/80' : 'border-neutral-200/80 bg-white/90'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 text-white shadow-md shadow-blue-500/25 border border-white/30">
                  <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                      ការកំណត់ & Menu
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase tracking-wide">
                      iOS Style
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Control Center & 100% Data Vault
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border backdrop-blur-xl ${
                  isDarkMode 
                    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/60 shadow-xs' 
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 border-neutral-200 shadow-xs'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub Tabs: Liquid Glass Segmented Bar (Controls on Left, Backup on Right) */}
            <div className="px-5 pt-4 pb-2 shrink-0 relative z-10">
              <div className={`p-1.5 rounded-2xl border backdrop-blur-2xl flex items-center gap-1.5 shadow-xs ${
                isDarkMode ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-100/90 border-neutral-200/90'
              }`}>
                {/* Tab 1 (Left): Controls (Clean 3D Liquid Glass Capsule) */}
                <button
                  type="button"
                  onClick={() => setActiveSubTab('settings')}
                  className={`relative flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer overflow-hidden isolate ${
                    activeSubTab === 'settings'
                      ? (isDarkMode ? 'text-white shadow-[0_6px_20px_rgba(0,0,0,0.4)]' : 'text-neutral-900 shadow-[0_4px_16px_rgba(0,0,0,0.08)]')
                      : (isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50' : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80')
                  }`}
                >
                  {activeSubTab === 'settings' && (
                    <GlassLiquidOverlay isDarkMode={isDarkMode} variant="liquid-glass" />
                  )}
                  <Layers className={`w-3.5 h-3.5 relative z-10 ${activeSubTab === 'settings' ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : 'text-neutral-400'}`} />
                  <span className="relative z-10">ការកំណត់ប្រព័ន្ធ (Controls)</span>
                </button>

                {/* Tab 2 (Right): Backup & Restore (Clean 3D Liquid Glass Capsule) */}
                <button
                  type="button"
                  onClick={() => setActiveSubTab('backup')}
                  className={`relative flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer overflow-hidden isolate ${
                    activeSubTab === 'backup'
                      ? (isDarkMode ? 'text-white shadow-[0_6px_20px_rgba(0,0,0,0.4)]' : 'text-neutral-900 shadow-[0_4px_16px_rgba(0,0,0,0.08)]')
                      : (isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50' : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80')
                  }`}
                >
                  {activeSubTab === 'backup' && (
                    <GlassLiquidOverlay isDarkMode={isDarkMode} variant="liquid-glass" />
                  )}
                  <Database className={`w-3.5 h-3.5 relative z-10 ${activeSubTab === 'backup' ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : 'text-neutral-400'}`} />
                  <span className="relative z-10">បម្រុងទុក & ស្ដារ (Backup)</span>
                </button>
              </div>
            </div>

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 relative z-10">
              {activeSubTab === 'settings' ? (
                <>
                  {/* Control Center Tiles */}
                  <div className="space-y-3.5">
                    {/* Account Section Card (Soft, Elegant, Beautiful Colors) */}
                    <div className={`p-4 rounded-3xl border backdrop-blur-2xl transition-all shadow-xs ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-neutral-800/90 via-neutral-800/70 to-neutral-800/90 border-neutral-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
                        : 'bg-gradient-to-br from-sky-50/70 via-indigo-50/40 to-blue-50/60 border-indigo-100/90 shadow-[0_4px_20px_rgba(99,102,241,0.06)]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black shadow-xs shrink-0 transition-all ${
                            teacher?.avatarUrl
                              ? 'overflow-hidden border-2 border-emerald-500/40 bg-emerald-500'
                              : isDarkMode
                                ? 'bg-gradient-to-tr from-indigo-400/25 via-sky-400/25 to-blue-400/25 text-sky-300 border border-indigo-500/30'
                                : 'bg-gradient-to-tr from-indigo-500/15 via-sky-500/15 to-blue-500/20 text-indigo-600 border border-indigo-200/80'
                          }`}>
                            {teacher?.avatarUrl ? (
                              <img src={teacher.avatarUrl} alt={teacher.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {teacher ? teacher.name : 'មិនទាន់ចូលគណនី'}
                            </h4>
                            <p className={`text-[10.5px] font-semibold flex items-center gap-1.5 mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                              <span>{teacher ? (teacher.schoolName || 'គ្រូបង្រៀន') : 'ដំណើរការលើ Local Storage'}</span>
                            </p>
                          </div>
                        </div>

                        {teacher ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={onOpenProfile}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-2xs ${
                                isDarkMode 
                                  ? 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800/60' 
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              Profile
                            </button>
                            <button
                              type="button"
                              onClick={onLogout}
                              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                isDarkMode 
                                  ? 'bg-red-950/30 hover:bg-red-950/60 text-red-400 border-red-900/50' 
                                  : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                              }`}
                              title="ចាកចេញ"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => { onClose(); onOpenAuth('login'); }}
                              className={`relative px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer overflow-hidden isolate border active:scale-95 shadow-xs ${
                                isDarkMode 
                                  ? 'text-sky-300 bg-neutral-800/90 hover:bg-neutral-700/90 border-neutral-700 hover:border-sky-500/40' 
                                  : 'text-indigo-600 bg-white hover:bg-indigo-50/60 border-indigo-200/90 hover:border-indigo-300 shadow-[0_2px_8px_rgba(99,102,241,0.12)]'
                              }`}
                            >
                              <GlassLiquidOverlay isDarkMode={isDarkMode} variant="liquid-glass" />
                              <span className="relative z-10">ចូលគណនី</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick System Controls Grid: 2x2 Vibrant Tiles */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Theme Toggle Tile */}
                      <button
                        type="button"
                        onClick={onToggleDarkMode}
                        className={`p-4 rounded-3xl border backdrop-blur-2xl flex flex-col justify-between h-28 text-left transition-all cursor-pointer shadow-xs group ${
                          isDarkMode 
                            ? 'bg-neutral-800/50 hover:bg-neutral-800/80 border-neutral-700/60 hover:border-neutral-500' 
                            : 'bg-white hover:bg-neutral-50 border-neutral-200/90 hover:border-neutral-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30 shadow-2xs">
                            {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {isDarkMode ? 'Dark ON' : 'Light'}
                          </span>
                        </div>
                        <div>
                          <div className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>ពន្លឺ / ងងឹត</div>
                          <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>ប្ដូរ Theme កម្មវិធី</div>
                        </div>
                      </button>

                      {/* Sound Toggle Tile */}
                      <button
                        type="button"
                        onClick={onToggleSound}
                        className={`p-4 rounded-3xl border backdrop-blur-2xl flex flex-col justify-between h-28 text-left transition-all cursor-pointer shadow-xs group ${
                          isDarkMode 
                            ? 'bg-neutral-800/50 hover:bg-neutral-800/80 border-neutral-700/60 hover:border-neutral-500' 
                            : 'bg-white hover:bg-neutral-50 border-neutral-200/90 hover:border-neutral-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/30 shadow-2xs">
                            {soundOn ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5 text-neutral-400" />}
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            {soundOn ? 'បើក (M)' : 'បិទ'}
                          </span>
                        </div>
                        <div>
                          <div className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>សំឡេងហ្គេម</div>
                          <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>SFX & Chimes</div>
                        </div>
                      </button>

                      {/* Fullscreen Tile */}
                      <button
                        type="button"
                        onClick={onToggleFullscreen}
                        className={`p-4 rounded-3xl border backdrop-blur-2xl flex flex-col justify-between h-28 text-left transition-all cursor-pointer shadow-xs group ${
                          isDarkMode 
                            ? 'bg-neutral-800/50 hover:bg-neutral-800/80 border-neutral-700/60 hover:border-neutral-500' 
                            : 'bg-white hover:bg-neutral-50 border-neutral-200/90 hover:border-neutral-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500 border border-blue-500/30 shadow-2xs">
                            {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                            {isFullscreen ? 'Full' : 'Window'}
                          </span>
                        </div>
                        <div>
                          <div className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>ពេញអេក្រង់ (F)</div>
                          <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>សម្រាប់ TV/Projector</div>
                        </div>
                      </button>

                      {/* Shortcuts Guide Tile */}
                      <button
                        type="button"
                        onClick={() => { onClose(); onOpenShortcuts(); }}
                        className={`p-4 rounded-3xl border backdrop-blur-2xl flex flex-col justify-between h-28 text-left transition-all cursor-pointer shadow-xs group ${
                          isDarkMode 
                            ? 'bg-neutral-800/50 hover:bg-neutral-800/80 border-neutral-700/60 hover:border-neutral-500' 
                            : 'bg-white hover:bg-neutral-50 border-neutral-200/90 hover:border-neutral-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-500 border border-purple-500/30 shadow-2xs">
                            <Keyboard className="w-4.5 h-4.5" />
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            ចុច ?
                          </span>
                        </div>
                        <div>
                          <div className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>គ្រាប់ចុចកាត់</div>
                          <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Shortcuts List</div>
                        </div>
                      </button>
                    </div>

                    {/* AI Question Creator */}
                    <button
                      type="button"
                      onClick={() => { onClose(); onOpenLessonModal(); }}
                      className={`w-full p-4 rounded-3xl border backdrop-blur-2xl flex items-center justify-between shadow-xs transition-all cursor-pointer group ${
                        isDarkMode 
                          ? 'bg-neutral-800/50 hover:bg-neutral-800/80 border-neutral-700/60 hover:border-neutral-500' 
                          : 'bg-white hover:bg-neutral-50 border-neutral-200/90 hover:border-neutral-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </div>
                        <div className="text-left">
                          <div className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                            បង្កើតសំណួរ AI (Lesson Modal)
                          </div>
                          <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                            ទាញយកសំណួរពីមេរៀនស្វ័យប្រវត្ត
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-black text-neutral-400 group-hover:translate-x-1 transition-transform">➔</span>
                    </button>

                    {/* Factory Reset App */}
                    <button
                      type="button"
                      onClick={() => { onClose(); onResetAll(); }}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer backdrop-blur-xl ${
                        isDarkMode 
                          ? 'bg-red-950/20 hover:bg-red-950/50 border-red-900/40 hover:border-red-800 text-red-400' 
                          : 'bg-red-50/60 hover:bg-red-100/80 border-red-200 hover:border-red-300 text-red-600'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                      <span>កំណត់កម្មវិធីឡើងវិញ (Reset All Data)</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* 100% Full Data Snapshot Card */}
                  <div className={`p-4.5 rounded-3xl border backdrop-blur-2xl shadow-xs space-y-3 ${
                    isDarkMode 
                      ? 'bg-neutral-800/50 border-neutral-700/60' 
                      : 'bg-white border-neutral-200/90 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 text-xs font-black ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span>ទិន្នន័យក្នុងប្រព័ន្ធ (100% Full State)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        ● Live Ready
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-neutral-900/80 border-neutral-700/80' : 'bg-neutral-50 border-neutral-200/80'
                      }`}>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">{classes.length}</div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} mt-0.5`}>ថ្នាក់រៀន</div>
                      </div>
                      <div className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-neutral-900/80 border-neutral-700/80' : 'bg-neutral-50 border-neutral-200/80'
                      }`}>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{students.length}</div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} mt-0.5`}>សិស្សសរុប</div>
                      </div>
                      <div className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-neutral-900/80 border-neutral-700/80' : 'bg-neutral-50 border-neutral-200/80'
                      }`}>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">{cards.length || subjects.length}</div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} mt-0.5`}>សំណួរ/មុខវិជ្ជា</div>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Export Backup Card */}
                  <div className={`p-5 rounded-3xl border backdrop-blur-2xl shadow-xs space-y-3 ${
                    isDarkMode 
                      ? 'bg-neutral-800/50 border-neutral-700/60' 
                      : 'bg-white border-neutral-200/90 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        ១
                      </div>
                      <h3 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                        ទាញយកទិន្នន័យបម្រុងទុក (Backup)
                      </h3>
                    </div>
                    
                    <p className={`text-[11.5px] leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                      ទាញយកទិន្នន័យគ្រប់គម្លៀតទាំងអស់ (ថ្នាក់, បញ្ជីសិស្សគ្រប់ថ្នាក់, ពិន្ទុ, កាតសំណួរ, ក្រុម, មេរៀន, និងការកំណត់) ទៅជាឯកសារ <code className="px-1.5 py-0.5 rounded font-bold bg-neutral-100 dark:bg-neutral-900 text-blue-600 dark:text-blue-400 border border-neutral-200 dark:border-neutral-700">.json</code> ទុកលើទូរស័ព្ទ ឬកុំព្យូទ័រ។
                    </p>

                    <button
                      type="button"
                      onClick={handleExportFullBackup}
                      className={`relative w-full py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 overflow-hidden isolate border ${
                        isDarkMode 
                          ? 'text-white border-white/20' 
                          : 'text-neutral-900 border-neutral-200 shadow-xs'
                      }`}
                    >
                      <GlassLiquidOverlay isDarkMode={isDarkMode} variant="liquid-glass" />
                      <Download className={`w-4 h-4 relative z-10 group-hover:-translate-y-0.5 transition-transform ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className="relative z-10">ទាញយកឯកសារបម្រុងទុក (Backup)</span>
                    </button>
                  </div>

                  {/* Section 2: Restore Backup Card */}
                  <div className={`p-5 rounded-3xl border backdrop-blur-2xl shadow-xs space-y-3 ${
                    isDarkMode 
                      ? 'bg-neutral-800/50 border-neutral-700/60' 
                      : 'bg-white border-neutral-200/90 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        ២
                      </div>
                      <h3 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                        ស្ដារទិន្នន័យឡើងវិញ (Restore)
                      </h3>
                    </div>

                    <p className={`text-[11.5px] leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                      ជ្រើសរើសឯកសារ <code className="px-1.5 py-0.5 rounded font-bold bg-neutral-100 dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 border border-neutral-200 dark:border-neutral-700">.json</code> ដែលបានទាញយក ដើម្បីស្ដារអ្វីៗគ្រប់យ៉ាងឱ្យត្រឡប់មកដូចដើមវិញ ១០០%។
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
                        className={`w-full py-5 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group ${
                          isDarkMode 
                            ? 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/30 hover:bg-neutral-800/60' 
                            : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/70 hover:bg-neutral-100/70'
                        }`}
                      >
                        <Upload className={`w-6 h-6 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} group-hover:scale-110 transition-transform`} />
                        <span className={`text-xs font-black ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>
                          ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ Backup .json
                        </span>
                      </button>
                    ) : (
                      <div className={`p-4 rounded-2xl border backdrop-blur-2xl space-y-3 ${
                        isDarkMode ? 'bg-neutral-900/90 border-neutral-700' : 'bg-neutral-50 border-neutral-200 shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                              <FileJson className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>ឯកសារត្រៀមស្ដារ៖</div>
                              <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                {importPreview.app || 'EduSpin'} • {importPreview.exportedAt ? new Date(importPreview.exportedAt).toLocaleDateString() : 'កាលបរិច្ឆេទ'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setImportPreview(null)}
                            className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900'}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-800/80 border-neutral-700' : 'bg-white border-neutral-200 shadow-2xs'}`}>
                            <div className="font-black text-blue-600 dark:text-blue-400">
                              {Array.isArray(importPreview.classes) ? importPreview.classes.length : 0}
                            </div>
                            <div className={`text-[9.5px] font-bold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>ថ្នាក់រៀន</div>
                          </div>
                          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-800/80 border-neutral-700' : 'bg-white border-neutral-200 shadow-2xs'}`}>
                            <div className="font-black text-emerald-600 dark:text-emerald-400">
                              {Array.isArray(importPreview.students) ? importPreview.students.length : 0}
                            </div>
                            <div className={`text-[9.5px] font-bold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>សិស្ស</div>
                          </div>
                          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-800/80 border-neutral-700' : 'bg-white border-neutral-200 shadow-2xs'}`}>
                            <div className="font-black text-purple-600 dark:text-purple-400">
                              {Array.isArray(importPreview.cards) ? importPreview.cards.length : (Array.isArray(importPreview.subjects) ? importPreview.subjects.length : 0)}
                            </div>
                            <div className={`text-[9.5px] font-bold ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>សំណួរ</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isRestoring}
                          onClick={handleConfirmRestore}
                          className={`relative w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 overflow-hidden isolate border ${
                            isDarkMode 
                              ? 'text-white border-white/20' 
                              : 'text-neutral-900 border-neutral-200 shadow-xs'
                          }`}
                        >
                          <GlassLiquidOverlay isDarkMode={isDarkMode} variant="liquid-glass" />
                          {isRestoring ? (
                            <RefreshCw className={`w-4 h-4 animate-spin relative z-10 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          ) : (
                            <RefreshCw className={`w-4 h-4 relative z-10 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          )}
                          <span className="relative z-10">{isRestoring ? 'កំពុងស្ដារទិន្នន័យ...' : 'យល់ព្រមស្ដារទិន្នន័យ (Restore Now)'}</span>
                        </button>
                      </div>
                    )}

                    {errorMessage && (
                      <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {isSuccess && (
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>បានស្ដារទិន្នន័យឡើងវិញ ១០០% ជោគជ័យ!</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* iOS Liquid Glass Bottom Footer */}
            <div className={`p-4 border-t backdrop-blur-2xl flex items-center justify-between text-[11px] font-semibold shrink-0 relative z-10 ${
              isDarkMode 
                ? 'border-neutral-800 bg-neutral-900/90 text-neutral-400' 
                : 'border-neutral-200/80 bg-white/90 text-neutral-500'
            }`}>
              <span>EduSpin Pro • iOS System Menu</span>
              <button
                type="button"
                onClick={onClose}
                className={`relative px-5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer overflow-hidden isolate border ${
                  isDarkMode ? 'text-white border-white/20' : 'text-neutral-900 border-neutral-300 shadow-xs'
                }`}
              >
                <GlassLiquidOverlay isDarkMode={isDarkMode} variant="liquid-glass" />
                <span className="relative z-10">រួចរាល់ (Done)</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
