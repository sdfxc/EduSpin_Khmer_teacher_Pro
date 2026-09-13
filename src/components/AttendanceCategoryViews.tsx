import React, { useState } from 'react';
import { 
  Copy, Check, UserX, Clock, FileText, Share2, 
  ArrowLeft, Users, RotateCcw
} from 'lucide-react';
import { Student } from '../types';

// Fallback-safe clipboard copy function
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, trying fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    console.error('Copy fallback failed:', e);
    return false;
  }
};

// Convert number to Khmer numeral (1 -> ១, 2 -> ២...)
const toKhmerNum = (num: number): string => {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return num.toString().replace(/[0-9]/g, (d) => khmerDigits[parseInt(d, 10)]);
};

// Sort strictly by Khmer alphabet (ក-អ)
const sortKhmer = (a: Student, b: Student): number => {
  return a.name.trim().localeCompare(b.name.trim(), 'km');
};

const permissionPresets = ['ឈឺ/គ្រុនក្តៅ', 'ធុរៈគ្រួសារ', 'ទៅពេទ្យ', 'ធ្លាក់ភ្លៀងខ្លាំង', 'ច្បាប់ផ្ទាល់មាត់'];
const absentPresets = ['ពុំមានដំណឹង', 'ទាក់ទងមិនបាន', 'អត់ឃើញមក', 'រវល់ផ្ទះ', 'ឈប់រៀន'];
const latePresets = ['ស្ទះចរាចរណ៍', 'បែកកង់/ខូចម៉ូតូ', 'ធ្លាក់ភ្លៀង', 'រវល់ការងារផ្ទះ', 'យឺត ១០ នាទី'];

export type AttendanceCategoryType = 'permission_absent' | 'absent' | 'late' | 'permission' | 'summary';

interface AttendanceCategoryViewsProps {
  students: Student[];
  currentClassAttendance: Record<string, 'present' | 'absent' | 'permission' | 'late'>;
  currentClassReasons: Record<string, string>;
  attendanceDate: string;
  className: string;
  activeCategory: AttendanceCategoryType;
  onBackToAll: () => void;
  onSetAttendance: (studentId: string, status: 'present' | 'absent' | 'permission' | 'late') => void;
  onSetReason: (studentId: string, reason: string) => void;
  isDarkMode?: boolean;
}

export const AttendanceCategoryViews: React.FC<AttendanceCategoryViewsProps> = ({
  students,
  currentClassAttendance,
  currentClassReasons,
  attendanceDate,
  className,
  activeCategory,
  onBackToAll,
  onSetAttendance,
  onSetReason,
  isDarkMode = false,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [useKhmerNumerals, setUseKhmerNumerals] = useState<boolean>(true);
  const [includeHeader, setIncludeHeader] = useState<boolean>(true);
  // Prefix bullet style: '-' (ត្រេ) | '.' (ចុច) | '•' (ចុចមូល) | 'none' (គ្មាន)
  const [bulletStyle, setBulletStyle] = useState<'dash' | 'dot' | 'bullet' | 'none'>('dash');

  // Class student demographic statistics
  const totalStudentsCount = students.length;
  const femaleStudentsCount = students.filter(s => s.gender === 'ស្រី').length;

  // Auto-detect new students from notes (if teacher wrote "ថ្មី" or "សិស្សថ្មី")
  const autoDetectedNewCount = students.filter(
    s => s.notes && (s.notes.includes('សិស្សថ្មី') || s.notes.includes('ថ្មី'))
  ).length;

  // Auto-detect dropped students from notes (if teacher wrote "ឈប់" or "បោះបង់")
  const autoDetectedDroppedCount = students.filter(
    s => s.notes && (s.notes.includes('ឈប់') || s.notes.includes('បោះបង់') || s.notes.includes('ឈប់រៀន'))
  ).length;

  const classKey = className ? className.trim() : 'default';
  const storageKey = `attendance_class_counts_${classKey}`;

  const [customCounts, setCustomCounts] = useState<{ old?: number; new?: number; dropped?: number }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {};
  });

  const effectiveNewCount = typeof customCounts.new === 'number'
    ? customCounts.new
    : autoDetectedNewCount;

  const effectiveDroppedCount = typeof customCounts.dropped === 'number'
    ? customCounts.dropped
    : autoDetectedDroppedCount;

  const effectiveOldCount = typeof customCounts.old === 'number'
    ? customCounts.old
    : Math.max(0, totalStudentsCount - effectiveNewCount - effectiveDroppedCount);

  const handleUpdateCount = (field: 'old' | 'new' | 'dropped', val: number) => {
    const num = Math.max(0, isNaN(val) ? 0 : val);
    const updated = { ...customCounts, [field]: num };
    if (field === 'dropped') {
      if (typeof customCounts.old !== 'number') {
        updated.old = Math.max(0, totalStudentsCount - (updated.new || effectiveNewCount) - num);
      }
    } else if (field === 'new' && typeof customCounts.old !== 'number') {
      updated.old = Math.max(0, totalStudentsCount - num - (updated.dropped || effectiveDroppedCount));
    } else if (field === 'old' && typeof customCounts.new !== 'number') {
      updated.new = Math.max(0, totalStudentsCount - num - (updated.dropped || effectiveDroppedCount));
    }
    setCustomCounts(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleResetCounts = () => {
    setCustomCounts({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  };

  const getPrefix = () => {
    if (bulletStyle === 'dash') return '- ';
    if (bulletStyle === 'dot') return '. ';
    if (bulletStyle === 'bullet') return '• ';
    return '';
  };

  // Filter students based on status and sort strictly by Khmer alphabet (ក-អ)
  const permissionStudents = students
    .filter(s => (currentClassAttendance[s.id] || 'present') === 'permission')
    .sort(sortKhmer);

  const absentStudents = students
    .filter(s => (currentClassAttendance[s.id] || 'present') === 'absent')
    .sort(sortKhmer);

  const lateStudents = students
    .filter(s => (currentClassAttendance[s.id] || 'present') === 'late')
    .sort(sortKhmer);

  // Present students: Result after deducting permission and absent students (and dropped students)
  const combinedAbsenteeCount = permissionStudents.length + absentStudents.length;
  const effectivePresentCount = Math.max(0, totalStudentsCount - effectiveDroppedCount - combinedAbsenteeCount);

  const handleCopyText = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Helper to format student line
  const formatStudentLine = (
    student: Student,
    status: 'absent' | 'late' | 'permission',
    index: number
  ) => {
    const reason = currentClassReasons[student.id]?.trim() || '';
    const numPrefix = useKhmerNumerals ? `${toKhmerNum(index + 1)}. ` : `${index + 1}. `;

    if (status === 'absent') {
      const reasonSuffix = reason ? ` (${reason})` : '';
      return `${numPrefix}${student.name} - អវត្តមាន${reasonSuffix}`;
    }

    if (status === 'late') {
      const reasonSuffix = reason ? ` (${reason})` : '';
      return `${numPrefix}${student.name} - យឺត${reasonSuffix}`;
    }

    if (status === 'permission') {
      const reasonSuffix = reason ? ` (${reason})` : '';
      return `${numPrefix}${student.name} - ច្បាប់${reasonSuffix}`;
    }

    return `${numPrefix}${student.name}`;
  };

  // Generate text for single category (absent, late, permission)
  const generateCategoryText = (category: 'absent' | 'late' | 'permission') => {
    let list: Student[] = [];
    let title = '';
    let statusLabel = '';

    if (category === 'absent') {
      list = absentStudents;
      title = 'បញ្ជីសិស្សអវត្តមាន';
      statusLabel = 'អវត្តមាន';
    } else if (category === 'late') {
      list = lateStudents;
      title = 'បញ្ជីសិស្សមកយឺត';
      statusLabel = 'យឺត';
    } else {
      list = permissionStudents;
      title = 'បញ្ជីសិស្សសុំច្បាប់';
      statusLabel = 'ច្បាប់';
    }

    if (list.length === 0) {
      return `ពុំមានសិស្ស${statusLabel}សម្រាប់ថ្ងៃទី ${attendanceDate} ទេ`;
    }

    const lines = list.map((s, idx) => formatStudentLine(s, category, idx));

    if (!includeHeader) {
      return lines.join('\n');
    }

    const prefix = getPrefix();
    const fmt = (n: number) => (useKhmerNumerals ? toKhmerNum(n) : n.toString());
    const header = [
      `${prefix}${title}`,
      `${prefix}ថ្នាក់៖ ${className || 'មិនបានបញ្ជាក់'}`,
      `${prefix}កាលបរិច្ឆេទ៖ ${attendanceDate}`,
      `${prefix}សិស្សចាស់ ៖ ${fmt(effectiveOldCount)} នាក់`,
      `${prefix}សិស្សថ្មី ៖ ${fmt(effectiveNewCount)} នាក់`,
      `${prefix}សិស្សឈប់ ៖ ${fmt(effectiveDroppedCount)} នាក់`,
      `${prefix}សិស្សសរុប ៖ ${fmt(totalStudentsCount)} នាក់`,
      `${prefix}សិស្សស្រី ៖ ${fmt(femaleStudentsCount)} នាក់`,
      `${prefix}សិស្សមករៀន ៖ ${fmt(effectivePresentCount)} នាក់`,
      `${prefix}ចំនួន${statusLabel}៖ ${fmt(list.length)} នាក់`,
      '---------------------------------',
      ...lines,
    ];

    return header.join('\n');
  };

  // Generate Combined Permission + Absent Text: Permission on TOP (លើ), Absent BELOW (ក្រោម), sorted ก-अ
  const generatePermissionAbsentText = () => {
    const totalCount = permissionStudents.length + absentStudents.length;
    if (totalCount === 0) {
      return `វត្តមានពេញលេញ! គ្មានសិស្សសុំច្បាប់ ឬអវត្តមាន សម្រាប់ថ្ងៃទី ${attendanceDate} ទេ។`;
    }

    const prefix = getPrefix();
    const fmt = (n: number) => (useKhmerNumerals ? toKhmerNum(n) : n.toString());
    const sections: string[] = [];

    if (includeHeader) {
      sections.push(`${prefix}បញ្ជីសិស្សសុំច្បាប់ និងអវត្តមាន`);
      sections.push(`${prefix}ថ្នាក់៖ ${className || 'មិនបានបញ្ជាក់'}`);
      sections.push(`${prefix}កាលបរិច្ឆេទ៖ ${attendanceDate}`);
      sections.push(`${prefix}សិស្សចាស់ ៖ ${fmt(effectiveOldCount)} នាក់`);
      sections.push(`${prefix}សិស្សថ្មី ៖ ${fmt(effectiveNewCount)} នាក់`);
      sections.push(`${prefix}សិស្សឈប់ ៖ ${fmt(effectiveDroppedCount)} នាក់`);
      sections.push(`${prefix}សិស្សសរុប ៖ ${fmt(totalStudentsCount)} នាក់`);
      sections.push(`${prefix}សិស្សស្រី ៖ ${fmt(femaleStudentsCount)} នាក់`);
      sections.push(`${prefix}សិស្សមករៀន ៖ ${fmt(effectivePresentCount)} នាក់`);
      sections.push(
        `${prefix}អវត្តមានសរុប៖ ${fmt(totalCount)} នាក់ (ច្បាប់: ${fmt(permissionStudents.length)} | អវត្តមាន: ${fmt(absentStudents.length)})`
      );
      sections.push('---------------------------------');
    }

    // 1. អ្នកមានច្បាប់លើ (Permission on top)
    if (permissionStudents.length > 0) {
      sections.push(`${prefix}សិស្សសុំច្បាប់ (${useKhmerNumerals ? toKhmerNum(permissionStudents.length) : permissionStudents.length} នាក់)៖`);
      permissionStudents.forEach((s, idx) => {
        sections.push(formatStudentLine(s, 'permission', idx));
      });
    } else {
      sections.push(`${prefix}សិស្សសុំច្បាប់៖ គ្មាន`);
    }

    sections.push(''); // blank line

    // 2. អវត្តមានក្រោម (Absent below)
    if (absentStudents.length > 0) {
      sections.push(`${prefix}សិស្សអវត្តមាន (${useKhmerNumerals ? toKhmerNum(absentStudents.length) : absentStudents.length} នាក់)៖`);
      absentStudents.forEach((s, idx) => {
        sections.push(formatStudentLine(s, 'absent', idx));
      });
    } else {
      sections.push(`${prefix}សិស្សអវត្តមាន៖ គ្មាន`);
    }

    return sections.join('\n');
  };

  // Generate full combined summary text (Permission top -> Absent -> Late)
  const generateSummaryText = () => {
    const totalAbsentee = permissionStudents.length + absentStudents.length + lateStudents.length;
    if (totalAbsentee === 0) {
      return `វត្តមានពេញលេញ ១០០%! គ្មានសិស្សសុំច្បាប់ អវត្តមាន ឬយឺត សម្រាប់ថ្ងៃទី ${attendanceDate} ទេ។`;
    }

    const allRecords: { student: Student; status: 'permission' | 'absent' | 'late' }[] = [
      ...permissionStudents.map(s => ({ student: s, status: 'permission' as const })),
      ...absentStudents.map(s => ({ student: s, status: 'absent' as const })),
      ...lateStudents.map(s => ({ student: s, status: 'late' as const })),
    ];

    const lines = allRecords.map((item, idx) => formatStudentLine(item.student, item.status, idx));

    if (!includeHeader) {
      return lines.join('\n');
    }

    const prefix = getPrefix();
    const fmt = (n: number) => (useKhmerNumerals ? toKhmerNum(n) : n.toString());
    const header = [
      `${prefix}របាយការណ៍អវត្តមានសិស្សប្រចាំថ្ងៃ`,
      `${prefix}ថ្នាក់៖ ${className || 'មិនបានបញ្ជាក់'}`,
      `${prefix}កាលបរិច្ឆេទ៖ ${attendanceDate}`,
      `${prefix}សិស្សចាស់ ៖ ${fmt(effectiveOldCount)} នាក់`,
      `${prefix}សិស្សថ្មី ៖ ${fmt(effectiveNewCount)} នាក់`,
      `${prefix}សិស្សឈប់ ៖ ${fmt(effectiveDroppedCount)} នាក់`,
      `${prefix}សិស្សសរុប ៖ ${fmt(totalStudentsCount)} នាក់`,
      `${prefix}សិស្សស្រី ៖ ${fmt(femaleStudentsCount)} នាក់`,
      `${prefix}សិស្សមករៀន ៖ ${fmt(effectivePresentCount)} នាក់`,
      `${prefix}អវត្តមានសរុប៖ ${fmt(totalAbsentee)} នាក់ (ច្បាប់: ${fmt(permissionStudents.length)} | អវត្តមាន: ${fmt(absentStudents.length)} | យឺត: ${fmt(lateStudents.length)})`,
      '---------------------------------',
      ...lines,
    ];

    return header.join('\n');
  };

  // Category Configuration for single category (Late)
  const categoryConfig = {
    late: {
      title: 'បញ្ជីសិស្សមកយឺត (Late)',
      shortTitle: 'យឺត',
      icon: Clock,
      color: 'amber',
      students: lateStudents,
      emptyMessage: 'ពុំមានសិស្សមកយឺតនៅថ្ងៃនេះទេ (យឺត ០ នាក់)',
      statusText: 'យឺត',
      presets: latePresets,
      reasonPrompt: 'មូលហេតុមកយឺត (ស្រេចចិត្ត)៖',
      reasonPlaceholder: 'ឧ. ស្ទះចរាចរណ៍, បែកកង់, ខូចម៉ូតូ, យឺត ១០ នាទី...',
      headerBg: isDarkMode ? 'bg-amber-950/40 border-amber-900/50' : 'bg-amber-50 border-amber-200',
      badgeBg: 'bg-amber-600 text-white',
      accentColor: 'text-amber-600 dark:text-amber-400',
    },
  };

  // Render Card Component for a Student
  const renderStudentCard = (
    student: Student,
    status: 'permission' | 'absent' | 'late',
    displayIndex: number
  ) => {
    const reason = currentClassReasons[student.id] || '';
    const studentCopyText = formatStudentLine(student, status, displayIndex);
    const isSingleCopied = copiedKey === `single_${student.id}`;

    const isPerm = status === 'permission';
    const isAbs = status === 'absent';

    const accentColor = isPerm ? 'text-blue-600 dark:text-blue-400' : isAbs ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
    const badgeBg = isPerm ? 'bg-blue-600 text-white' : isAbs ? 'bg-red-600 text-white' : 'bg-amber-600 text-white';
    const statusText = isPerm ? 'ច្បាប់' : isAbs ? 'អវត្តមាន' : 'យឺត';
    const presets = isPerm ? permissionPresets : isAbs ? absentPresets : latePresets;
    const reasonPrompt = isPerm ? 'មូលហេតុសុំច្បាប់ (ស្រេចចិត្ត)៖' : isAbs ? 'មូលហេតុអវត្តមាន (ស្រេចចិត្ត)៖' : 'មូលហេតុមកយឺត (ស្រេចចិត្ត)៖';
    const reasonPlaceholder = isPerm ? 'ឧ. ឈឺក្បាល, គ្រួសាររវល់, ទៅពេទ្យ...' : isAbs ? 'ឧ. ពុំមានដំណឹង, ទាក់ទងមិនបាន...' : 'ឧ. ស្ទះចរាចរណ៍, បែកកង់...';

    return (
      <div
        key={student.id}
        className={`p-4 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Number, Avatar, Name, ID, Gender */}
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-xs font-mono font-bold text-slate-400">
              {useKhmerNumerals ? toKhmerNum(displayIndex + 1) : displayIndex + 1}
            </span>

            {/* ID badge */}
            <span className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              ID: {student.studentId || (displayIndex + 1).toString().padStart(3, '0')}
            </span>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-sm shrink-0">
              {student.avatarUrl ? (
                <img src={student.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : student.emoji ? (
                <span>{student.emoji}</span>
              ) : (
                <span>{student.name.charAt(0)}</span>
              )}
            </div>

            {/* Name & Gender */}
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{student.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  student.gender === 'ស្រី'
                    ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                }`}>
                  {student.gender || 'ប្រុស'}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className={`font-bold ${accentColor}`}>
                  ● {statusText}
                </span>
                {reason && (
                  <span className="text-slate-500 dark:text-slate-400 italic">
                    ({reason})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Individual Copy Button & Quick Status Switch */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => handleCopyText(`single_${student.id}`, studentCopyText)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSingleCopied
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : isDarkMode
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 shadow-2xs'
              }`}
              title={`ចម្លង៖ "${studentCopyText}"`}
            >
              {isSingleCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>បានចម្លង!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>ចម្លងឈ្មោះ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSetAttendance(student.id, 'present')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-500/20 cursor-pointer"
              title="ប្តូរមកជាវត្តមានវិញ"
            >
              មកវិញ
            </button>
          </div>
        </div>

        {/* Reason Input & Presets */}
        <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} space-y-2`}>
          <div className="flex items-center justify-between gap-2">
            <label className={`text-[11px] font-bold ${accentColor}`}>
              {reasonPrompt}
            </label>
            {reason && (
              <button
                type="button"
                onClick={() => onSetReason(student.id, '')}
                className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
              >
                លុបហេតុផល
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={reason}
              onChange={(e) => onSetReason(student.id, e.target.value)}
              placeholder={reasonPlaceholder}
              className={`w-full py-1.5 pl-3 pr-8 rounded-xl text-xs font-medium focus:outline-none transition-all border ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white shadow-2xs'
              }`}
            />
            {reason && (
              <button
                type="button"
                onClick={() => onSetReason(student.id, '')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Fast Preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold shrink-0">ជ្រើសរើសរហ័ស៖</span>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSetReason(student.id, preset)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                  reason === preset
                    ? `${badgeBg} border-transparent shadow-xs`
                    : isDarkMode
                      ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Combined Summary Tab
  if (activeCategory === 'summary') {
    const summaryText = generateSummaryText();
    const isCopied = copiedKey === 'summary_all';
    const totalAbsentee = permissionStudents.length + absentStudents.length + lateStudents.length;

    return (
      <div className="space-y-6">
        {/* Header banner */}
        <div className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToAll}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              title="ត្រឡប់ទៅតារាងវត្តមានទាំងអស់"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span>សង្ខេបរបាយការណ៍អវត្តមានរួម</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white">
                  {totalAbsentee} នាក់
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                បង្ហាញបញ្ជីសិស្ស ច្បាប់ អវត្តមាន និងយឺត រួមគ្នា — ងាយស្រួល Copy ផ្ញើចូល Telegram ថ្នាក់
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (bulletStyle === 'dash') setBulletStyle('dot');
                else if (bulletStyle === 'dot') setBulletStyle('bullet');
                else if (bulletStyle === 'bullet') setBulletStyle('none');
                else setBulletStyle('dash');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                bulletStyle !== 'none'
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title="ប្តូរសញ្ញាក្បាលបន្ទាត់ (ត្រេ - ឬ ចុច .)"
            >
              {bulletStyle === 'dash'
                ? 'សញ្ញា៖ ត្រេ (-)'
                : bulletStyle === 'dot'
                  ? 'សញ្ញា៖ ចុច (.)'
                  : bulletStyle === 'bullet'
                    ? 'សញ្ញា៖ ចុចមូល (•)'
                    : 'សញ្ញា៖ គ្មាន'}
            </button>

            <button
              type="button"
              onClick={() => setUseKhmerNumerals(!useKhmerNumerals)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                useKhmerNumerals 
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title="ប្តូរលេខរៀងខ្មែរ (១, ២, ៣) ឬអន្តរជាតិ (1, 2, 3)"
            >
              លេខរៀង៖ {useKhmerNumerals ? 'ខ្មែរ (១, ២)' : 'អន្តរជាតិ (1, 2)'}
            </button>

            <button
              type="button"
              onClick={() => setIncludeHeader(!includeHeader)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                includeHeader 
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title="ភ្ជាប់ក្បាលសារ ឈ្មោះថ្នាក់ និងកាលបរិច្ឆេទ"
            >
              {includeHeader ? '✓ មានក្បាលសារ' : 'តែឈ្មោះសុទ្ធ'}
            </button>

            <button
              type="button"
              onClick={() => handleCopyText('summary_all', summaryText)}
              disabled={totalAbsentee === 0}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                isCopied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : totalAbsentee === 0
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>បានចម្លងរួចរាល់!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>ចម្លងរបាយការណ៍រួម (Copy All)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Class Student Statistics (សិស្សចាស់ / សិស្សថ្មី / សិស្សឈប់ / សរុប / ស្រី / សិស្សមករៀន) */}
        <div className={`p-3.5 md:p-4 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="font-black text-slate-700 dark:text-slate-200">ស្ថិតិសិស្សក្នុងថ្នាក់៖</span>
            <span className="text-slate-500 dark:text-slate-400">
              សរុប <strong className="text-indigo-600 dark:text-indigo-400">{useKhmerNumerals ? toKhmerNum(totalStudentsCount) : totalStudentsCount}</strong> នាក់ 
              (ស្រី <strong className="text-pink-600 dark:text-pink-400">{useKhmerNumerals ? toKhmerNum(femaleStudentsCount) : femaleStudentsCount}</strong> នាក់)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* សិស្សចាស់ */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">សិស្សចាស់៖</span>
              <input
                type="number"
                min="0"
                value={effectiveOldCount}
                onChange={(e) => handleUpdateCount('old', parseInt(e.target.value, 10))}
                className="w-12 text-center font-black text-xs text-indigo-600 dark:text-indigo-400 focus:outline-none"
                title="បញ្ចូលចំនួនសិស្សចាស់"
              />
              <span className="text-[10px] text-slate-400">នាក់</span>
            </div>

            {/* សិស្សថ្មី */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">សិស្សថ្មី៖</span>
              <input
                type="number"
                min="0"
                value={effectiveNewCount}
                onChange={(e) => handleUpdateCount('new', parseInt(e.target.value, 10))}
                className="w-12 text-center font-black text-xs text-emerald-600 dark:text-emerald-400 focus:outline-none"
                title="បញ្ចូលចំនួនសិស្សថ្មី"
              />
              <span className="text-[10px] text-slate-400">នាក់</span>
            </div>

            {/* សិស្សឈប់ (របារកំណត់ចំនួនឈប់) */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">សិស្សឈប់៖</span>
              <input
                type="number"
                min="0"
                value={effectiveDroppedCount}
                onChange={(e) => handleUpdateCount('dropped', parseInt(e.target.value, 10))}
                className="w-12 text-center font-black text-xs text-rose-500 dark:text-rose-400 focus:outline-none"
                title="កំណត់ចំនួនសិស្សឈប់រៀន"
              />
              <span className="text-[10px] text-slate-400">នាក់</span>
            </div>

            {/* សិស្សមករៀន (គណនាស្វ័យប្រវត្ត) */}
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">សិស្សមករៀន៖</span>
              <strong className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                {useKhmerNumerals ? toKhmerNum(effectivePresentCount) : effectivePresentCount}
              </strong>
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">នាក់</span>
            </div>

            {(typeof customCounts.old === 'number' || typeof customCounts.new === 'number' || typeof customCounts.dropped === 'number') && (
              <button
                type="button"
                onClick={handleResetCounts}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="កំណត់ឡើងវិញតាមស្វ័យប្រវត្តិ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Box */}
        <div className={`p-4 rounded-3xl border space-y-2 ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>ទម្រង់អត្ថបទសម្រាប់ចម្លង (Live Preview & Copy)៖</span>
            </span>
            <span className="text-[11px] text-slate-400">ត្រៀមរួចជាស្រេចសម្រាប់បិទភ្ជាប់ (Paste) ក្នុង Telegram / Messenger</span>
          </div>
          <pre className={`p-4 rounded-2xl text-xs font-mono whitespace-pre-wrap select-all border ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
          }`}>
            {summaryText}
          </pre>
        </div>

        {/* Breakdown by sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Permission Card (On Top/Left) */}
          <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/70 border-blue-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-blue-600 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>ច្បាប់ ({permissionStudents.length})</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyText('sum_perm', generateCategoryText('permission'))}
                disabled={permissionStudents.length === 0}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                {copiedKey === 'sum_perm' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'sum_perm' ? 'បានចម្លង!' : 'ចម្លង'}</span>
              </button>
            </div>
            {permissionStudents.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">គ្មានសិស្សសុំច្បាប់</p>
            ) : (
              <ul className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {permissionStudents.map((s, idx) => {
                  const reason = currentClassReasons[s.id]?.trim();
                  return (
                    <li key={s.id} className="flex items-center justify-between py-1 border-b border-blue-200/50 dark:border-blue-900/30">
                      <span>{toKhmerNum(idx + 1)}. {s.name} - ច្បាប់{reason ? ` (${reason})` : ''}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Absent Card */}
          <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50/70 border-red-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-red-600 flex items-center gap-1.5">
                <UserX className="w-4 h-4" />
                <span>អវត្តមាន ({absentStudents.length})</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyText('sum_abs', generateCategoryText('absent'))}
                disabled={absentStudents.length === 0}
                className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                {copiedKey === 'sum_abs' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'sum_abs' ? 'បានចម្លង!' : 'ចម្លង'}</span>
              </button>
            </div>
            {absentStudents.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">គ្មានសិស្សអវត្តមាន</p>
            ) : (
              <ul className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {absentStudents.map((s, idx) => (
                  <li key={s.id} className="flex items-center justify-between py-1 border-b border-red-200/50 dark:border-red-900/30">
                    <span>{toKhmerNum(idx + 1)}. {s.name} - អវត្តមាន</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Late Card */}
          <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/70 border-amber-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-amber-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>យឺត ({lateStudents.length})</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyText('sum_late', generateCategoryText('late'))}
                disabled={lateStudents.length === 0}
                className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                {copiedKey === 'sum_late' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'sum_late' ? 'បានចម្លង!' : 'ចម្លង'}</span>
              </button>
            </div>
            {lateStudents.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">គ្មានសិស្សមកយឺត</p>
            ) : (
              <ul className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lateStudents.map((s, idx) => {
                  const reason = currentClassReasons[s.id]?.trim();
                  return (
                    <li key={s.id} className="flex items-center justify-between py-1 border-b border-amber-200/50 dark:border-amber-900/30">
                      <span>{toKhmerNum(idx + 1)}. {s.name} - យឺត{reason ? ` (${reason})` : ''}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Single Category: 'late'
  if (activeCategory === 'late') {
    const config = categoryConfig.late;
    const list = config.students;
    const CategoryIcon = config.icon;
    const categoryFullText = generateCategoryText('late');
    const isAllCopied = copiedKey === 'cat_late';

    return (
      <div className="space-y-6">
        <div className={`p-4 md:p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToAll}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              title="ត្រឡប់ទៅតារាងវត្តមានទាំងអស់"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black flex items-center gap-2">
                  <span>{config.title}</span>
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${config.badgeBg}`}>
                  {list.length} នាក់
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                សិស្សដែលបានជ្រើសរើសជា «{config.shortTitle}» សម្រាប់កាលបរិច្ឆេទ {attendanceDate} (តម្រៀបតាម ក-អ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (bulletStyle === 'dash') setBulletStyle('dot');
                else if (bulletStyle === 'dot') setBulletStyle('bullet');
                else if (bulletStyle === 'bullet') setBulletStyle('none');
                else setBulletStyle('dash');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                bulletStyle !== 'none'
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title="ប្តូរសញ្ញាក្បាលបន្ទាត់ (ត្រេ - ឬ ចុច .)"
            >
              {bulletStyle === 'dash'
                ? 'សញ្ញា៖ ត្រេ (-)'
                : bulletStyle === 'dot'
                  ? 'សញ្ញា៖ ចុច (.)'
                  : bulletStyle === 'bullet'
                    ? 'សញ្ញា៖ ចុចមូល (•)'
                    : 'សញ្ញា៖ គ្មាន'}
            </button>

            <button
              type="button"
              onClick={() => setUseKhmerNumerals(!useKhmerNumerals)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                useKhmerNumerals 
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title="ប្តូរលេខរៀងខ្មែរ (១, ២, ៣) ឬអន្តរជាតិ (1, 2, 3)"
            >
              {useKhmerNumerals ? 'លេខខ្មែរ (១, ២)' : 'លេខ (1, 2)'}
            </button>

            <button
              type="button"
              onClick={() => setIncludeHeader(!includeHeader)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                includeHeader 
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title="ភ្ជាប់ក្បាលសារ ឈ្មោះថ្នាក់ និងកាលបរិច្ឆេទ"
            >
              {includeHeader ? '✓ មានក្បាលសារ' : 'តែឈ្មោះសុទ្ធ'}
            </button>

            <button
              type="button"
              onClick={() => handleCopyText('cat_late', categoryFullText)}
              disabled={list.length === 0}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                isAllCopied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : list.length === 0
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
              }`}
            >
              {isAllCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>បានចម្លងរួចរាល់!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>ចម្លងបញ្ជី{config.shortTitle} (Copy List)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {list.length > 0 && (
          <div className={`p-4 rounded-3xl border space-y-2 ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>អត្ថបទដែលបានចម្លង ({config.shortTitle})៖</span>
              </span>
              <span className="text-[11px] text-slate-400">តម្រៀបតាមលំដាប់អក្សរ (ក-អ)</span>
            </div>
            <pre className={`p-3.5 rounded-2xl text-xs font-mono whitespace-pre-wrap select-all border ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            }`}>
              {categoryFullText}
            </pre>
          </div>
        )}

        {list.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border flex flex-col items-center justify-center gap-3 ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${config.headerBg}`}>
              <CategoryIcon className={`w-7 h-7 ${config.accentColor}`} />
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-slate-100">{config.emptyMessage}</h4>
            <button
              type="button"
              onClick={onBackToAll}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <span>ទៅកាន់តារាងវត្តមានទាំងអស់</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((student, index) => renderStudentCard(student, 'late', index))}
          </div>
        )}
      </div>
    );
  }

  // DEFAULT & MERGED: 'permission_absent' (or legacy 'absent' | 'permission')
  // Combines Permission on TOP (អ្នកមានច្បាប់លើ) and Absent BELOW (អវត្តមានក្រោម), sorted strictly by ก-अ
  const combinedText = generatePermissionAbsentText();
  const isCopiedAll = copiedKey === 'perm_abs_all';
  const totalCombined = permissionStudents.length + absentStudents.length;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className={`p-4 md:p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToAll}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            title="ត្រឡប់ទៅតារាងវត្តមានទាំងអស់"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <span>បញ្ជីសិស្សសុំច្បាប់ និងអវត្តមាន</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white">
                ច្បាប់ {permissionStudents.length} នាក់
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                អវត្តមាន {absentStudents.length} នាក់
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                សរុប {totalCombined} នាក់
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              អ្នកមានច្បាប់នៅខាងលើ និងអវត្តមាននៅខាងក្រោម — តម្រៀបតាមលំដាប់អក្សរ (ក-អ)
            </p>
          </div>
        </div>

        {/* Copy Options and Big Action Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (bulletStyle === 'dash') setBulletStyle('dot');
              else if (bulletStyle === 'dot') setBulletStyle('bullet');
              else if (bulletStyle === 'bullet') setBulletStyle('none');
              else setBulletStyle('dash');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              bulletStyle !== 'none'
                ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                : 'border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
            title="ប្តូរសញ្ញាក្បាលបន្ទាត់ (ត្រេ - ឬ ចុច .)"
          >
            {bulletStyle === 'dash'
              ? 'សញ្ញា៖ ត្រេ (-)'
              : bulletStyle === 'dot'
                ? 'សញ្ញា៖ ចុច (.)'
                : bulletStyle === 'bullet'
                  ? 'សញ្ញា៖ ចុចមូល (•)'
                  : 'សញ្ញា៖ គ្មាន'}
          </button>

          <button
            type="button"
            onClick={() => setUseKhmerNumerals(!useKhmerNumerals)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              useKhmerNumerals 
                ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                : 'border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
            title="ប្តូរលេខរៀងខ្មែរ (១, ២, ៣) ឬអន្តរជាតិ (1, 2, 3)"
          >
            លេខរៀង៖ {useKhmerNumerals ? 'ខ្មែរ (១, ២)' : 'អន្តរជាតិ (1, 2)'}
          </button>

          <button
            type="button"
            onClick={() => setIncludeHeader(!includeHeader)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              includeHeader 
                ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' 
                : 'border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
            title="ភ្ជាប់ក្បាលសារ ឈ្មោះថ្នាក់ និងកាលបរិច្ឆេទ"
          >
            {includeHeader ? '✓ មានក្បាលសារ' : 'តែឈ្មោះសុទ្ធ'}
          </button>

          <button
            type="button"
            onClick={() => handleCopyText('perm_abs_all', combinedText)}
            disabled={totalCombined === 0}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              isCopiedAll
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : totalCombined === 0
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
            }`}
          >
            {isCopiedAll ? (
              <>
                <Check className="w-4 h-4" />
                <span>បានចម្លងរួចរាល់!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>ចម្លងរបាយការណ៍រួម (Copy)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Class Student Statistics (សិស្សចាស់ / សិស្សថ្មី / សិស្សឈប់ / សរុប / ស្រី / សិស្សមករៀន) */}
      <div className={`p-3.5 md:p-4 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs ${
        isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="font-black text-slate-700 dark:text-slate-200">ស្ថិតិសិស្សក្នុងថ្នាក់៖</span>
          <span className="text-slate-500 dark:text-slate-400">
            សរុប <strong className="text-indigo-600 dark:text-indigo-400">{useKhmerNumerals ? toKhmerNum(totalStudentsCount) : totalStudentsCount}</strong> នាក់ 
            (ស្រី <strong className="text-pink-600 dark:text-pink-400">{useKhmerNumerals ? toKhmerNum(femaleStudentsCount) : femaleStudentsCount}</strong> នាក់)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* សិស្សចាស់ */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">សិស្សចាស់៖</span>
            <input
              type="number"
              min="0"
              value={effectiveOldCount}
              onChange={(e) => handleUpdateCount('old', parseInt(e.target.value, 10))}
              className="w-12 text-center font-black text-xs text-indigo-600 dark:text-indigo-400 focus:outline-none"
              title="បញ្ចូលចំនួនសិស្សចាស់"
            />
            <span className="text-[10px] text-slate-400">នាក់</span>
          </div>

          {/* សិស្សថ្មី */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">សិស្សថ្មី៖</span>
            <input
              type="number"
              min="0"
              value={effectiveNewCount}
              onChange={(e) => handleUpdateCount('new', parseInt(e.target.value, 10))}
              className="w-12 text-center font-black text-xs text-emerald-600 dark:text-emerald-400 focus:outline-none"
              title="បញ្ចូលចំនួនសិស្សថ្មី"
            />
            <span className="text-[10px] text-slate-400">នាក់</span>
          </div>

          {/* សិស្សឈប់ (របារកំណត់ចំនួនឈប់) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">សិស្សឈប់៖</span>
            <input
              type="number"
              min="0"
              value={effectiveDroppedCount}
              onChange={(e) => handleUpdateCount('dropped', parseInt(e.target.value, 10))}
              className="w-12 text-center font-black text-xs text-rose-500 dark:text-rose-400 focus:outline-none"
              title="កំណត់ចំនួនសិស្សឈប់រៀន"
            />
            <span className="text-[10px] text-slate-400">នាក់</span>
          </div>

          {/* សិស្សមករៀន (គណនាស្វ័យប្រវត្ត) */}
          <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">សិស្សមករៀន៖</span>
            <strong className="font-black text-xs text-emerald-600 dark:text-emerald-400">
              {useKhmerNumerals ? toKhmerNum(effectivePresentCount) : effectivePresentCount}
            </strong>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">នាក់</span>
          </div>

          {(typeof customCounts.old === 'number' || typeof customCounts.new === 'number' || typeof customCounts.dropped === 'number') && (
            <button
              type="button"
              onClick={handleResetCounts}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="កំណត់ឡើងវិញតាមស្វ័យប្រវត្តិ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Text Preview Box */}
      {totalCombined > 0 && (
        <div className={`p-4 rounded-3xl border space-y-2 ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>ទម្រង់អត្ថបទសម្រាប់ផ្ញើ Telegram (Live Preview)៖</span>
            </span>
            <span className="text-[11px] text-slate-400">ច្បាប់នៅខាងលើ, អវត្តមាននៅខាងក្រោម — តម្រៀបតាម ក-អ</span>
          </div>
          <pre className={`p-3.5 rounded-2xl text-xs font-mono whitespace-pre-wrap select-all border ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
          }`}>
            {combinedText}
          </pre>
        </div>
      )}

      {/* 1. អ្នកមានច្បាប់លើ (Permission on TOP) — Sorted ก-अ */}
      <div className={`p-5 rounded-3xl border space-y-4 ${
        isDarkMode ? 'bg-blue-950/15 border-blue-900/40' : 'bg-blue-50/40 border-blue-200/80'
      }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-3 border-blue-200/60 dark:border-blue-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-blue-950 dark:text-blue-200 flex items-center gap-2">
                <span>១. បញ្ជីសិស្សសុំច្បាប់ (Permission)</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  ({permissionStudents.length} នាក់)
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                តម្រៀបតាមលំដាប់អក្សរ ក-អ ដោយស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyText('cat_permission', generateCategoryText('permission'))}
            disabled={permissionStudents.length === 0}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
              copiedKey === 'cat_permission'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : permissionStudents.length === 0
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                  : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 shadow-2xs'
            }`}
          >
            {copiedKey === 'cat_permission' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'cat_permission' ? 'បានចម្លង!' : 'ចម្លងតែសិស្សច្បាប់'}</span>
          </button>
        </div>

        {permissionStudents.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs font-medium">
            🎉 ពុំមានសិស្សសុំច្បាប់នៅថ្ងៃនេះទេ (ច្បាប់ ០ នាក់)
          </div>
        ) : (
          <div className="space-y-3">
            {permissionStudents.map((student, index) => renderStudentCard(student, 'permission', index))}
          </div>
        )}
      </div>

      {/* 2. ហើយអវត្តមានក្រោម (Absent BELOW) — Sorted ก-अ */}
      <div className={`p-5 rounded-3xl border space-y-4 ${
        isDarkMode ? 'bg-red-950/15 border-red-900/40' : 'bg-red-50/40 border-red-200/80'
      }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-3 border-red-200/60 dark:border-red-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-red-950 dark:text-red-200 flex items-center gap-2">
                <span>២. បញ្ជីសិស្សអវត្តមាន (Absent)</span>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  ({absentStudents.length} នាក់)
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                តម្រៀបតាមលំដាប់អក្សរ ក-អ ដោយស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyText('cat_absent', generateCategoryText('absent'))}
            disabled={absentStudents.length === 0}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
              copiedKey === 'cat_absent'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : absentStudents.length === 0
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                  : 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 shadow-2xs'
            }`}
          >
            {copiedKey === 'cat_absent' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'cat_absent' ? 'បានចម្លង!' : 'ចម្លងតែអវត្តមាន'}</span>
          </button>
        </div>

        {absentStudents.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs font-medium">
            🎉 ពុំមានសិស្សអវត្តមាននៅថ្ងៃនេះទេ (អវត្តមាន ០ នាក់)
          </div>
        ) : (
          <div className="space-y-3">
            {absentStudents.map((student, index) => renderStudentCard(student, 'absent', index))}
          </div>
        )}
      </div>
    </div>
  );
};
