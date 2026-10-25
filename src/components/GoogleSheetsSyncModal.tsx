import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileSpreadsheet, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw, 
  Mail, 
  ShieldCheck, 
  Lock, 
  CheckSquare, 
  Square, 
  AlertCircle,
  Copy,
  Check,
  CloudCheck,
  Sparkles,
  ArrowRight,
  School,
  BookOpen,
  Layers
} from 'lucide-react';
import { Student, ClassInfo, QuizSubject } from '../types';
import { 
  requestGoogleSheetsAccess, 
  syncDataToGoogleSheets, 
  getConnectedGoogleEmail,
  clearGoogleSheetsAuth,
  saveSheetsConfigToCloud,
  subscribeSheetsConfigFromCloud,
  DEFAULT_ATTENDANCE_SHEET_URL,
  DEFAULT_SCORES_SHEET_URL,
  DEFAULT_STATUS_SHEET_URL
} from '../lib/googleSheetsService';
import { auth } from '../lib/firebase';
import confetti from 'canvas-confetti';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  students: Student[];
  selectedMonth: string;
  activeSubjectName: string;
  activeSubjectId?: string;
  attendanceMap?: Record<string, 'present' | 'absent' | 'permission' | 'late'>;
  attendanceReasons?: Record<string, string>;
  attendanceDate?: string;
  initialSyncScores?: boolean;
  initialSyncAttendance?: boolean;
  initialSyncStatus?: boolean;
  allClasses?: ClassInfo[];
  allSubjects?: QuizSubject[];
}

export default function GoogleSheetsSyncModal({
  isOpen,
  onClose,
  className,
  classId,
  students,
  selectedMonth,
  activeSubjectName,
  activeSubjectId,
  attendanceMap = {},
  attendanceReasons = {},
  attendanceDate,
  initialSyncScores,
  initialSyncAttendance,
  initialSyncStatus,
  allClasses = [],
  allSubjects = []
}: GoogleSheetsSyncModalProps) {
  const [gmailInput, setGmailInput] = useState<string>('');
  const [connectedEmail, setConnectedEmail] = useState<string>('');
  const [syncScores, setSyncScores] = useState<boolean>(true);
  const [syncAttendance, setSyncAttendance] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<boolean>(true);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successSpreadsheetUrl, setSuccessSpreadsheetUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  // Class & Subject Selection inside modal
  const [selectedClassId, setSelectedClassId] = useState<string>(classId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(activeSubjectId || '');

  const [scoresUrl, setScoresUrl] = useState<string>('');
  const [attendanceUrl, setAttendanceUrl] = useState<string>('');
  const [statusUrl, setStatusUrl] = useState<string>('');

  // Keep state synced when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedClassId(classId);
      setSelectedSubjectId(activeSubjectId || (allSubjects?.[0]?.id || ''));
      if (initialSyncScores !== undefined) setSyncScores(initialSyncScores);
      if (initialSyncAttendance !== undefined) setSyncAttendance(initialSyncAttendance);
      if (initialSyncStatus !== undefined) setSyncStatus(initialSyncStatus);
    }
  }, [isOpen, classId, activeSubjectId, initialSyncScores, initialSyncAttendance, initialSyncStatus]);

  // Derive active class & subject lists and items
  const effectiveClassList = useMemo(() => {
    if (allClasses && allClasses.length > 0) return allClasses;
    return [{ id: classId, name: className || 'ថ្នាក់រៀន' }];
  }, [allClasses, classId, className]);

  const currentClassObj = effectiveClassList.find(c => c.id === selectedClassId) || effectiveClassList[0];
  const currentClassName = currentClassObj?.name || className || 'ថ្នាក់រៀន';

  const effectiveSubjectList = useMemo(() => {
    if (allSubjects && allSubjects.length > 0) return allSubjects;
    return [{ id: activeSubjectId || 'general', name: activeSubjectName || 'ទូទៅ', chapters: [], createdAt: Date.now() }];
  }, [allSubjects, activeSubjectId, activeSubjectName]);

  const currentSubjectObj = effectiveSubjectList.find(s => s.id === selectedSubjectId) || effectiveSubjectList[0];
  const currentSubjectName = currentSubjectObj?.name || activeSubjectName || 'ទូទៅ';
  const effectiveSubjectId = currentSubjectObj?.id || selectedSubjectId || 'general';

  // Load students for selected class if different from current active class
  const effectiveStudents = useMemo(() => {
    if (selectedClassId === classId) return students;
    try {
      const stored = localStorage.getItem(`students_class_${selectedClassId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return students;
  }, [selectedClassId, classId, students]);

  useEffect(() => {
    if (isOpen) {
      const email = getConnectedGoogleEmail();
      setConnectedEmail(email);
      setGmailInput(email || 'khengkhey835@gmail.com');
      setErrorMessage('');
      setSyncProgress(0);
      setSyncStatusText('');

      const defaultScores = 'https://docs.google.com/spreadsheets/d/1f7eJTiTn-2cH_QRRH2PvfBXHUNjHV-EnZn_bzqdU2Xs/edit?usp=sharing';
      const defaultAttendance = 'https://docs.google.com/spreadsheets/d/1o8FNNmT0NpNl2_BhB-_gntn25qThftcMtev__vbIeiY/edit?usp=sharing';
      const defaultStatus = 'https://docs.google.com/spreadsheets/d/13l52mkHKazDgHuMatpQaIhjyjTiYLjSZRCgliGRfpR8/edit?usp=sharing';

      const scoresKey = `google_sheets_id_scores_${selectedClassId || 'default'}_${effectiveSubjectId || 'general'}`;
      const attKey = `google_sheets_id_attendance_${selectedClassId || 'default'}_${effectiveSubjectId || 'general'}`;
      const statusKey = `google_sheets_id_status_${selectedClassId || 'default'}`;

      const sScores = localStorage.getItem(scoresKey) || defaultScores;
      const sAttendance = localStorage.getItem(attKey) || defaultAttendance;
      const sStatus = localStorage.getItem(statusKey) || defaultStatus;

      setScoresUrl(sScores);
      setAttendanceUrl(sAttendance);
      setStatusUrl(sStatus);
      setSuccessSpreadsheetUrl(sAttendance);
    }
  }, [isOpen, selectedClassId, effectiveSubjectId]);

  // Sync Google Sheets config across devices (Laptop, Phone, iPad) via Firestore
  useEffect(() => {
    if (!isOpen) return;
    const teacherId = auth.currentUser?.email
      ? `email_${auth.currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : 'cloud_default_teacher_sovannaphumi';

    const unsub = subscribeSheetsConfigFromCloud(teacherId, selectedClassId, (cfg) => {
      if (cfg.scoresUrl) setScoresUrl(cfg.scoresUrl);
      if (cfg.attendanceUrl) {
        setAttendanceUrl(cfg.attendanceUrl);
        setSuccessSpreadsheetUrl(cfg.attendanceUrl);
      }
      if (cfg.statusUrl) setStatusUrl(cfg.statusUrl);
    });

    return () => unsub();
  }, [isOpen, selectedClassId]);

  if (!isOpen) return null;

  const handleStartSyncFlow = () => {
    if (!syncScores && !syncAttendance && !syncStatus) {
      setErrorMessage('សូមជ្រើសរើសយ៉ាងហោចណាស់ ១ ជម្រើសដើម្បីរក្សាទុក (ពិន្ទុ, វត្តមាន ឬស្ថានភាពសិស្ស)');
      return;
    }
    setErrorMessage('');
    setShowConfirmDialog(true);
  };

  const extractId = (input: string) => {
    if (!input) return '';
    const trimmed = input.trim();
    if (trimmed.includes('/spreadsheets/d/')) {
      const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  };

  const handleExecuteSync = async () => {
    setShowConfirmDialog(false);
    setIsSyncing(true);
    setErrorMessage('');
    setSyncProgress(5);
    setSyncStatusText('កំពុងរៀបចំការតភ្ជាប់ Google Sheets...');

    const teacherId = auth.currentUser?.email
      ? `email_${auth.currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : 'cloud_default_teacher_sovannaphumi';

    // Save configuration to Cloud Firestore immediately so all devices receive it
    saveSheetsConfigToCloud(teacherId, selectedClassId, {
      scoresUrl,
      attendanceUrl,
      statusUrl,
      autoSyncEnabled: true,
      lastSyncedAt: new Date().toISOString()
    }).catch(e => console.warn('Cloud sheets save note:', e));

    try {
      let lastUrl = '';
      let totalSteps = (syncScores ? 1 : 0) + (syncAttendance ? 1 : 0) + (syncStatus ? 1 : 0);
      if (totalSteps === 0) totalSteps = 1;
      let currentStepCount = 0;

      if (syncScores) {
        currentStepCount++;
        setSyncStatusText(`[១. ពិន្ទុសិស្ស] កំពុងធ្វើសមកាលកម្ម (${currentClassName} - ${currentSubjectName})...`);
        const scoresKey = `google_sheets_id_scores_${selectedClassId || 'default'}_${effectiveSubjectId || 'general'}`;
        const scoresId = extractId(scoresUrl) || '1f7eJTiTn-2cH_QRRH2PvfBXHUNjHV-EnZn_bzqdU2Xs';
        localStorage.setItem(scoresKey, scoresUrl);
        const res = await syncDataToGoogleSheets({
          className: currentClassName,
          classId: selectedClassId,
          students: effectiveStudents,
          selectedMonth,
          activeSubjectName: currentSubjectName,
          activeSubjectId: effectiveSubjectId,
          attendanceMap,
          attendanceReasons,
          attendanceDate,
          syncScores: true,
          syncAttendance: false,
          syncStatus: false,
          overrideSpreadsheetId: scoresId
        }, (step, percent) => {
          setSyncStatusText(`[១. ពិន្ទុសិស្ស] ${step}`);
          setSyncProgress(Math.round(((currentStepCount - 1) / totalSteps) * 100 + (percent / totalSteps)));
        });
        lastUrl = res.spreadsheetUrl;
      }

      if (syncAttendance) {
        currentStepCount++;
        setSyncStatusText(`[២. វត្តមានសិស្ស] កំពុងធ្វើសមកាលកម្ម (${currentClassName} - ${currentSubjectName})...`);
        const attKey = `google_sheets_id_attendance_${selectedClassId || 'default'}_${effectiveSubjectId || 'general'}`;
        const attId = extractId(attendanceUrl) || '1o8FNNmT0NpNl2_BhB-_gntn25qThftcMtev__vbIeiY';
        localStorage.setItem(attKey, attendanceUrl);

        // Resolve attendanceMap accurately for selected class & subject
        let resolvedAttendanceMap = attendanceMap;
        try {
          const allRecsStr = localStorage.getItem('edu_spin_attendance_records');
          if (allRecsStr) {
            const allRecs = JSON.parse(allRecsStr);
            const targetDate = attendanceDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
            const exactKey = `${selectedClassId}_${effectiveSubjectId}_${targetDate}`;
            const legacyKey = `${selectedClassId}_${targetDate}`;
            const foundRec = allRecs[exactKey] || allRecs[legacyKey];
            if (foundRec) {
              resolvedAttendanceMap = { ...(foundRec || {}), ...(resolvedAttendanceMap || {}) };
            }
          }
        } catch {}

        const res = await syncDataToGoogleSheets({
          className: currentClassName,
          classId: selectedClassId,
          students: effectiveStudents,
          selectedMonth: selectedMonth || 'តុលា',
          activeSubjectName: currentSubjectName,
          activeSubjectId: effectiveSubjectId,
          attendanceMap: resolvedAttendanceMap,
          attendanceReasons,
          attendanceDate,
          syncScores: false,
          syncAttendance: true,
          syncStatus: false,
          overrideSpreadsheetId: attId
        }, (step, percent) => {
          setSyncStatusText(`[២. វត្តមានសិស្ស] ${step}`);
          setSyncProgress(Math.round(((currentStepCount - 1) / totalSteps) * 100 + (percent / totalSteps)));
        });
        lastUrl = res.spreadsheetUrl;
      }

      if (syncStatus) {
        currentStepCount++;
        setSyncStatusText(`[៣. ស្ថានភាពសិស្ស] កំពុងធ្វើសមកាលកម្ម (${currentClassName})...`);
        const statusKey = `google_sheets_id_status_${selectedClassId || 'default'}`;
        const statusId = extractId(statusUrl) || '13l52mkHKazDgHuMatpQaIhjyjTiYLjSZRCgliGRfpR8';
        localStorage.setItem(statusKey, statusUrl);
        const res = await syncDataToGoogleSheets({
          className: currentClassName,
          classId: selectedClassId,
          students: effectiveStudents,
          selectedMonth,
          activeSubjectName: currentSubjectName,
          activeSubjectId: effectiveSubjectId,
          attendanceMap,
          attendanceReasons,
          attendanceDate,
          syncScores: false,
          syncAttendance: false,
          syncStatus: true,
          overrideSpreadsheetId: statusId
        }, (step, percent) => {
          setSyncStatusText(`[៣. ស្ថានភាពសិស្ស] ${step}`);
          setSyncProgress(Math.round(((currentStepCount - 1) / totalSteps) * 100 + (percent / totalSteps)));
        });
        lastUrl = res.spreadsheetUrl;
      }

      setSyncProgress(100);
      setSyncStatusText('បានរក្សាទុកក្នុង Google Sheets ទាំងអស់ជោគជ័យ ១០០%!');
      setSuccessSpreadsheetUrl(lastUrl || attendanceUrl);
      setConnectedEmail(getConnectedGoogleEmail() || gmailInput);

      // Save last sync time
      localStorage.setItem(`last_google_sheets_sync_${selectedClassId}`, new Date().toISOString());

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      setErrorMessage(err?.message || 'មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យទៅកាន់ Google Sheets។ សូមព្យាយាមម្ដងទៀត។');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyLink = () => {
    if (successSpreadsheetUrl) {
      navigator.clipboard.writeText(successSpreadsheetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    await clearGoogleSheetsAuth();
    setConnectedEmail('');
    setSuccessSpreadsheetUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                រក្សាទុកទិន្នន័យក្នុង Google Sheets
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-bold mt-0.5">
                សុវត្ថិភាពខ្ពស់ Proffesional មិនបារម្ភរឿងបាត់បង់ទិន្នន័យ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100 text-sm">
          
          {/* Explanation Alert */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3 text-xs sm:text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black text-emerald-800 dark:text-emerald-300">
                រក្សាទុកពិន្ទុ វត្តមាន និងស្ថានភាពសិស្សដោយស្វ័យប្រវត្តទៅ Google Drive
              </p>
              <p className="text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                ទោះបីកម្មវិធី ឬឧបករណ៍របស់អ្នកត្រូវបានប្តូរ ឬខូចថ្ងៃណាមួយ ទិន្នន័យសិស្សទាំងអស់ត្រូវបានរក្សាទុកក្នុង Google Sheets នៃគណនី Gmail របស់អ្នក ១០០% ដោយសុវត្ថិភាព។
              </p>
            </div>
          </div>

          {/* 3-STEP HIERARCHY: CLASS -> SUBJECT -> 3 LINKS */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
            
            {/* LEVEL 1: BY CLASS (តាមថ្នាក់) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>១. ជ្រើសរើសថ្នាក់រៀន (តាមថ្នាក់)៖</span>
                </label>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  កំពុងជ្រើស៖ <strong className="underline decoration-indigo-400">{currentClassName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {effectiveClassList.map(c => {
                  const isSelected = c.id === selectedClassId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClassId(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400 scale-[1.02]'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50'
                      }`}
                    >
                      <span>{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LEVEL 2: IN CLASS, AVAILABLE SUBJECTS (ក្នុងថ្នាក់ មានមុខវិជ្ជាដែលមាន) */}
            <div className="space-y-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/60">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-black text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>២. ជ្រើសរើសមុខវិជ្ជាក្នុង «{currentClassName}»៖</span>
                </label>
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                  មុខវិជ្ជា៖ <strong className="underline decoration-purple-400">{currentSubjectName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {effectiveSubjectList.map(s => {
                  const isSelected = s.id === selectedSubjectId || (s.name === currentSubjectName);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400 scale-[1.02]'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      <span>{s.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LEVEL 3: UNDER THIS SUBJECT -> SCORES, ATTENDANCE, STATUS (ក្នុងមុខវិជ្ជា មាន ១.ពិន្ទុសិស្ស ២.វត្តមានសិស្ស ៣.ស្ថានភាពសិស្ស) */}
            <div className="space-y-3 pt-1 border-t border-indigo-100 dark:border-indigo-900/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>៣. តំណភ្ជាប់ Google Sheets សម្រាប់ «{currentClassName} - {currentSubjectName}»៖</span>
                </label>
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-xs">
                  ខែ {selectedMonth}
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 1. Scores Link */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>១. តំណភ្ជាប់ពិន្ទុសិស្ស (Scores Sheet Link)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {currentClassName} / {currentSubjectName}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={scoresUrl}
                    placeholder={`ដាក់ Link Google Sheets សម្រាប់ពិន្ទុ ${currentClassName} មុខវិជ្ជា ${currentSubjectName}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScoresUrl(val);
                      localStorage.setItem(`google_sheets_id_scores_${selectedClassId || 'default'}_${effectiveSubjectId || 'general'}`, val);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 2. Attendance Link */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>២. តំណភ្ជាប់វត្តមានសិស្ស (Attendance Sheet Link)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {currentClassName} / {currentSubjectName}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={attendanceUrl}
                    placeholder={`ដាក់ Link Google Sheets សម្រាប់វត្តមាន ${currentClassName} មុខវិជ្ជា ${currentSubjectName}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAttendanceUrl(val);
                      localStorage.setItem(`google_sheets_id_attendance_${selectedClassId || 'default'}_${effectiveSubjectId || 'general'}`, val);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 3. Status Link */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>៣. តំណភ្ជាប់ស្ថានភាពសិស្ស (Status Sheet Link)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {currentClassName}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={statusUrl}
                    placeholder={`ដាក់ Link Google Sheets សម្រាប់ស្ថានភាពសិស្ស ${currentClassName}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStatusUrl(val);
                      localStorage.setItem(`google_sheets_id_status_${selectedClassId || 'default'}`, val);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-100/60 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-200 font-bold leading-relaxed">
                * <strong className="text-indigo-950 dark:text-white">ការរៀបចំដាច់ដោយឡែកពីគ្នា៖</strong> លោកគ្រូអ្នកគ្រូអាចចុចប្តូរថ្នាក់ (១) និងប្តូរមុខវិជ្ជា (២) នៅខាងលើ ដើម្បីមើល ឬប្តូរ Link ទាំង ៣ (៣) តាមចិត្ត។ ពេល Sync វានឹងបង្កើត Sheet ថ្មីតាមថ្នាក់ និងមុខវិជ្ជាដែលបានជ្រើសនោះ មិនជាន់គ្នាឡើយ!
              </div>
            </div>

          </div>

          {/* Account Connection Section */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-500" />
              <span>គណនី Gmail សម្រាប់រក្សាទុកទិន្នន័យ (Google Account)៖</span>
            </label>

            {connectedEmail ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {connectedEmail[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{connectedEmail}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        បានភ្ជាប់
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold">Google Sheets & Google Drive API សកម្ម</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all cursor-pointer"
                >
                  ផ្ដាច់គណនី
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  placeholder="បញ្ចូល Gmail របស់អ្នក ឧ. yourname@gmail.com"
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsSyncing(true);
                      setErrorMessage('');
                      const res = await requestGoogleSheetsAccess(gmailInput);
                      setConnectedEmail(res.user.email || gmailInput);
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'ពុំអាចភ្ជាប់ជាមួយ Google Account បានឡើយ');
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>ភ្ជាប់ Gmail</span>
                </button>
              </div>
            )}
          </div>

          {/* Sync Items Selection */}
          <div className="space-y-2.5 pt-2">
            <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              ជ្រើសរើសផ្នែកដែលត្រូវរក្សាទុកទៅ Google Sheets៖
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Scores */}
              <button
                type="button"
                onClick={() => setSyncScores(!syncScores)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  syncScores 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs' 
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {syncScores ? <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" /> : <Square className="w-5 h-5 shrink-0" />}
                <div>
                  <div className="font-black text-xs">១. ពិន្ទុសិស្ស</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">ខែ {selectedMonth} (មុខវិជ្ជា៖ {activeSubjectName})</div>
                </div>
              </button>

              {/* Option 2: Attendance */}
              <button
                type="button"
                onClick={() => setSyncAttendance(!syncAttendance)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  syncAttendance 
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-800 dark:text-blue-200 shadow-xs' 
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {syncAttendance ? <CheckSquare className="w-5 h-5 text-blue-600 shrink-0" /> : <Square className="w-5 h-5 shrink-0" />}
                <div>
                  <div className="font-black text-xs">២. វត្តមានសិស្ស</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">វត្តមាន, ច្បាប់, យឺត, អវត្តមាន</div>
                </div>
              </button>

              {/* Option 3: Status & Profiles */}
              <button
                type="button"
                onClick={() => setSyncStatus(!syncStatus)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  syncStatus 
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-800 dark:text-purple-200 shadow-xs' 
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {syncStatus ? <CheckSquare className="w-5 h-5 text-purple-600 shrink-0" /> : <Square className="w-5 h-5 shrink-0" />}
                <div>
                  <div className="font-black text-xs">៣. ស្ថានភាពសិស្ស</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">ព័ត៌មាន, អាណាព្យាបាល, ឆ្នើម</div>
                </div>
              </button>
            </div>
          </div>

          {/* Sync Progress Bar */}
          {isSyncing && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>{syncStatusText}</span>
                </span>
                <span>{syncProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Result & Spreadsheet Link */}
          {successSpreadsheetUrl && !isSyncing && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-700/60 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs sm:text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>ទិន្នន័យត្រូវបានរក្សាទុកក្នុង Google Sheet រួចរាល់!</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={successSpreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>បើកមើល Google Sheet ក្នុង Drive</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'បានចម្លង Link' : 'ចម្លង Link'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white transition-all cursor-pointer"
          >
            បិទផ្ទាំង
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={handleStartSyncFlow}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>កំពុងរក្សាទុក...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>រក្សាទុកទៅ Google Sheets ឥឡូវនេះ</span>
              </>
            )}
          </button>
        </div>

        {/* Confirmation Modal before mutating data (MANDATORY per Workspace Integration Skill) */}
        {showConfirmDialog && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                បញ្ជាក់ការរក្សាទុកទៅ Google Sheets
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                តើលោកគ្រូអ្នកគ្រូពិតជាចង់រក្សាទុក និងធ្វើបច្ចុប្បន្នភាពទិន្នន័យសិស្ស ({students.length} នាក់) នៃថ្នាក់ «{className}» ទៅកាន់ Google Sheets ក្នុងគណនីរបស់អ្នកមែនទេ?
              </p>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSync}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-xs text-white shadow-md transition-all cursor-pointer active:scale-95"
                >
                  យល់ព្រម រក្សាទុក
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
