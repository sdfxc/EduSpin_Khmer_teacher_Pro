import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Download, Printer, RotateCcw, Plus, Search, Star, 
  Award, Trophy, Table, LayoutGrid, Sparkles, ArrowUpDown, 
  ArrowUpAZ, Hash, ArrowDownUp, RefreshCw
} from 'lucide-react';
import { Student, ClassInfo, MonthlyDetailedScore, WeeklyScoreBreakdown } from '../types';
import * as XLSX from 'xlsx';

interface StudentScoreTableProps {
  students: Student[];
  classes: ClassInfo[];
  activeClassId: string;
  isDarkMode?: boolean;
  onUpdateStudentDetail?: (id: string, fields: Partial<Student>) => void;
}

const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

type SortMode = 'default' | 'id' | 'name' | 'score-desc' | 'score-asc' | 'rank-asc' | 'avg-desc' | 'avg-asc';

export function StudentScoreTable({
  students,
  classes,
  activeClassId,
  isDarkMode = false,
  onUpdateStudentDetail
}: StudentScoreTableProps) {
  // Current active month
  const currentMonthIndex = new Date().getMonth();
  const defaultMonth = KHMER_MONTHS[currentMonthIndex] || 'កញ្ញា';
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [activeViewMode, setActiveViewMode] = useState<'table' | 'cards'>('table');
  const [scoreSearchQuery, setScoreSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');

  // Average divisor state (e.g. ÷2, ÷10, ÷1)
  const [averageDivisor, setAverageDivisor] = useState<number>(() => {
    const saved = localStorage.getItem(`avg_divisor_${activeClassId}`);
    return saved ? parseFloat(saved) || 2 : 2;
  });

  const handleDivisorChange = (newDiv: number) => {
    setAverageDivisor(newDiv);
    localStorage.setItem(`avg_divisor_${activeClassId}`, newDiv.toString());
  };

  // Helper to calculate subtotal WITHOUT monthly exam
  const calculateSubTotalNoExam = (student: Student, month: string): number => {
    const monthData = student.monthlyScores?.[month];
    if (monthData?.manualSubTotalNoExam !== undefined && monthData?.manualSubTotalNoExam !== null) {
      return Number(monthData.manualSubTotalNoExam) || 0;
    }
    if (!monthData) return 0;

    const w1 = (Number(monthData.week1?.activity) || 0) + (Number(monthData.week1?.homework) || 0) + (Number(monthData.week1?.quiz) || 0);
    const w2 = (Number(monthData.week2?.activity) || 0) + (Number(monthData.week2?.homework) || 0) + (Number(monthData.week2?.quiz) || 0);
    const w3 = (Number(monthData.week3?.activity) || 0) + (Number(monthData.week3?.homework) || 0) + (Number(monthData.week3?.quiz) || 0);
    const w4 = (Number(monthData.week4?.activity) || 0) + (Number(monthData.week4?.homework) || 0) + (Number(monthData.week4?.quiz) || 0);
    const quiz = Number(monthData.quiz) || 0;
    const notebook = Number(monthData.notebook) || 0;

    return w1 + w2 + w3 + w4 + quiz + notebook;
  };

  // Helper to calculate grand total for the month (monthly exam + subtotal)
  const calculateStudentMonthTotal = (student: Student, month: string): number => {
    const monthData = student.monthlyScores?.[month];
    if (monthData?.manualTotal !== undefined && monthData?.manualTotal !== null) {
      return Number(monthData.manualTotal) || 0;
    }
    const mExam = Number(monthData?.monthlyExam) || 0;
    const subTotal = calculateSubTotalNoExam(student, month);
    const sum = mExam + subTotal;
    return sum > 0 ? sum : (student.score || 0);
  };

  // Helper to calculate average for the month
  const calculateStudentMonthAverage = (student: Student, month: string): number => {
    const monthData = student.monthlyScores?.[month];
    if (monthData?.manualAverage !== undefined && monthData?.manualAverage !== null) {
      return Number(monthData.manualAverage) || 0;
    }
    const grandTotal = calculateStudentMonthTotal(student, month);
    if (grandTotal === 0) return 0;
    const div = averageDivisor > 0 ? averageDivisor : 1;
    const avg = grandTotal / div;
    return parseFloat(avg.toFixed(2));
  };

  // Calculate automatic competition ranking based on Grand Total
  const studentRanks = useMemo(() => {
    const list = students.map(s => ({
      id: s.id,
      total: calculateStudentMonthTotal(s, selectedMonth)
    }));

    // Sort descending by total score
    list.sort((a, b) => b.total - a.total);

    const ranks: Record<string, number> = {};
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].total === list[i - 1].total) {
        ranks[list[i].id] = ranks[list[i - 1].id];
      } else {
        ranks[list[i].id] = i + 1;
      }
    }
    return ranks;
  }, [students, selectedMonth]);

  // Helper to update specific score sub-field (resets manual total overrides so formula stays sync)
  const handleScoreFieldChange = (
    student: Student,
    fieldPath: string,
    rawVal: string
  ) => {
    if (!onUpdateStudentDetail) return;
    const val = rawVal === '' ? undefined : Math.max(0, parseFloat(rawVal) || 0);

    const currentMonthScores = student.monthlyScores || {};
    const existingMonthData: MonthlyDetailedScore = currentMonthScores[selectedMonth] || {};

    const updatedMonthData: MonthlyDetailedScore = JSON.parse(JSON.stringify(existingMonthData));

    // Clear any manual overrides when modifying underlying sub-fields
    delete updatedMonthData.manualTotal;
    delete updatedMonthData.manualSubTotalNoExam;

    if (fieldPath === 'monthlyExam') {
      updatedMonthData.monthlyExam = val;
    } else if (fieldPath === 'quiz') {
      updatedMonthData.quiz = val;
    } else if (fieldPath === 'notebook') {
      updatedMonthData.notebook = val;
    } else if (fieldPath.startsWith('week1.')) {
      const sub = fieldPath.split('.')[1] as keyof WeeklyScoreBreakdown;
      updatedMonthData.week1 = { ...updatedMonthData.week1, [sub]: val };
    } else if (fieldPath.startsWith('week2.')) {
      const sub = fieldPath.split('.')[1] as keyof WeeklyScoreBreakdown;
      updatedMonthData.week2 = { ...updatedMonthData.week2, [sub]: val };
    } else if (fieldPath.startsWith('week3.')) {
      const sub = fieldPath.split('.')[1] as keyof WeeklyScoreBreakdown;
      updatedMonthData.week3 = { ...updatedMonthData.week3, [sub]: val };
    } else if (fieldPath.startsWith('week4.')) {
      const sub = fieldPath.split('.')[1] as keyof WeeklyScoreBreakdown;
      updatedMonthData.week4 = { ...updatedMonthData.week4, [sub]: val };
    }

    // Recalculate auto total
    const mExam = Number(updatedMonthData.monthlyExam) || 0;
    const w1 = (Number(updatedMonthData.week1?.activity) || 0) + (Number(updatedMonthData.week1?.homework) || 0) + (Number(updatedMonthData.week1?.quiz) || 0);
    const w2 = (Number(updatedMonthData.week2?.activity) || 0) + (Number(updatedMonthData.week2?.homework) || 0) + (Number(updatedMonthData.week2?.quiz) || 0);
    const w3 = (Number(updatedMonthData.week3?.activity) || 0) + (Number(updatedMonthData.week3?.homework) || 0) + (Number(updatedMonthData.week3?.quiz) || 0);
    const w4 = (Number(updatedMonthData.week4?.activity) || 0) + (Number(updatedMonthData.week4?.homework) || 0) + (Number(updatedMonthData.week4?.quiz) || 0);
    const quiz = Number(updatedMonthData.quiz) || 0;
    const notebook = Number(updatedMonthData.notebook) || 0;

    const newTotal = mExam + w1 + w2 + w3 + w4 + quiz + notebook;

    onUpdateStudentDetail(student.id, {
      monthlyScores: {
        ...currentMonthScores,
        [selectedMonth]: updatedMonthData
      },
      score: newTotal
    });
  };

  // Manual direct override for SubTotal without Exam
  const handleManualSubTotalChange = (student: Student, rawVal: string) => {
    if (!onUpdateStudentDetail) return;
    const currentMonthScores = student.monthlyScores || {};
    const existingMonthData: MonthlyDetailedScore = currentMonthScores[selectedMonth] || {};
    const updatedMonthData: MonthlyDetailedScore = { ...existingMonthData };

    if (rawVal === '') {
      delete updatedMonthData.manualSubTotalNoExam;
      delete updatedMonthData.manualTotal;
    } else {
      const parsed = Math.max(0, parseFloat(rawVal) || 0);
      updatedMonthData.manualSubTotalNoExam = parsed;
      const mExam = Number(updatedMonthData.monthlyExam) || 0;
      updatedMonthData.manualTotal = mExam + parsed;
    }

    const calculatedTotal = calculateStudentMonthTotal({ ...student, monthlyScores: { ...currentMonthScores, [selectedMonth]: updatedMonthData } }, selectedMonth);

    onUpdateStudentDetail(student.id, {
      monthlyScores: {
        ...currentMonthScores,
        [selectedMonth]: updatedMonthData
      },
      score: calculatedTotal
    });
  };

  // Manual direct override for Grand Total
  const handleManualGrandTotalChange = (student: Student, rawVal: string) => {
    if (!onUpdateStudentDetail) return;
    const currentMonthScores = student.monthlyScores || {};
    const existingMonthData: MonthlyDetailedScore = currentMonthScores[selectedMonth] || {};
    const updatedMonthData: MonthlyDetailedScore = { ...existingMonthData };

    if (rawVal === '') {
      delete updatedMonthData.manualTotal;
    } else {
      const parsed = Math.max(0, parseFloat(rawVal) || 0);
      updatedMonthData.manualTotal = parsed;
    }

    const calculatedTotal = calculateStudentMonthTotal({ ...student, monthlyScores: { ...currentMonthScores, [selectedMonth]: updatedMonthData } }, selectedMonth);

    onUpdateStudentDetail(student.id, {
      monthlyScores: {
        ...currentMonthScores,
        [selectedMonth]: updatedMonthData
      },
      score: calculatedTotal
    });
  };

  // Manual direct override for Average
  const handleManualAverageChange = (student: Student, rawVal: string) => {
    if (!onUpdateStudentDetail) return;
    const currentMonthScores = student.monthlyScores || {};
    const existingMonthData: MonthlyDetailedScore = currentMonthScores[selectedMonth] || {};
    const updatedMonthData: MonthlyDetailedScore = { ...existingMonthData };

    if (rawVal === '') {
      delete updatedMonthData.manualAverage;
    } else {
      const parsed = Math.max(0, parseFloat(rawVal) || 0);
      updatedMonthData.manualAverage = parsed;
    }

    onUpdateStudentDetail(student.id, {
      monthlyScores: {
        ...currentMonthScores,
        [selectedMonth]: updatedMonthData
      }
    });
  };

  // Update Student ID
  const handleStudentIdChange = (student: Student, newStudentId: string) => {
    if (!onUpdateStudentDetail) return;
    onUpdateStudentDetail(student.id, {
      studentId: newStudentId
    });
  };

  // Filter & Sort Students
  const processedStudents = useMemo(() => {
    let list = students.filter(s => {
      const q = scoreSearchQuery.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = s.name.toLowerCase().includes(q);
      const idMatch = (s.studentId || '').toLowerCase().includes(q);
      return nameMatch || idMatch;
    });

    if (sortMode === 'id') {
      list = [...list].sort((a, b) => {
        const idA = a.studentId || a.id;
        const idB = b.studentId || b.id;
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
    } else if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'km'));
    } else if (sortMode === 'score-desc') {
      list = [...list].sort((a, b) => calculateStudentMonthTotal(b, selectedMonth) - calculateStudentMonthTotal(a, selectedMonth));
    } else if (sortMode === 'score-asc') {
      list = [...list].sort((a, b) => calculateStudentMonthTotal(a, selectedMonth) - calculateStudentMonthTotal(b, selectedMonth));
    } else if (sortMode === 'rank-asc') {
      list = [...list].sort((a, b) => (studentRanks[a.id] || 999) - (studentRanks[b.id] || 999));
    } else if (sortMode === 'avg-desc') {
      list = [...list].sort((a, b) => calculateStudentMonthAverage(b, selectedMonth) - calculateStudentMonthAverage(a, selectedMonth));
    } else if (sortMode === 'avg-asc') {
      list = [...list].sort((a, b) => calculateStudentMonthAverage(a, selectedMonth) - calculateStudentMonthAverage(b, selectedMonth));
    }

    return list;
  }, [students, scoreSearchQuery, sortMode, selectedMonth, studentRanks, averageDivisor]);

  // Statistics
  const currentClassName = classes.find(c => c.id === activeClassId)?.name || 'ថ្នាក់រៀន';
  const totalScoresSum = processedStudents.reduce((acc, s) => acc + calculateStudentMonthTotal(s, selectedMonth), 0);
  const averageScore = processedStudents.length > 0 ? (totalScoresSum / processedStudents.length).toFixed(1) : '0';
  const highestScore = processedStudents.reduce((max, s) => Math.max(max, calculateStudentMonthTotal(s, selectedMonth)), 0);
  const topStudent = processedStudents.find(s => calculateStudentMonthTotal(s, selectedMonth) === highestScore && highestScore > 0);

  // Export Official Excel matching the revised format with ID, 2 Total columns, Average, and Ranking
  const handleExportOfficialExcel = () => {
    if (students.length === 0) return;

    // Header rows matching the official Khmer layout
    const wsData: any[][] = [
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ព្រះរាជាណាចក្រកម្ពុជា', '', '', '', '', '', ''],
      ['', 'Sovannaphumi School', '', '', '', '', '', '', '', '', '', '', '', '', 'ជាតិ សាសនា ព្រះមហាក្សត្រ', '', '', '', '', '', ''],
      ['', '', '', '', `តារាងពិន្ទុសិស្សក្នុងខែ ${selectedMonth} (${currentClassName})`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['ល.រ', 'ID', 'ឈ្មោះសិស្ស', 'ភេទ', 'សរុប (ដក Exam)', 'សរុប ១ខែ', 'មធ្យមភាគ', 'ចំណាត់ថ្នាក់', `ពិន្ទុប្រចាំខែ ${selectedMonth}`, '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', 'Monthly Exam', 'Week1', '', '', 'Week2', '', '', 'Week3', '', '', 'Week4', '', '', 'Quiz', 'ពិនិត្យសៀវភៅ'],
      ['', '', '', '', '', '', '', '', '', 'សកម្មភាព', 'កិច្ចការផ្ទះ', 'Quiz', 'សកម្មភាព', 'កិច្ចការផ្ទះ', 'Quiz', 'សកម្មភាព', 'កិច្ចការផ្ទះ', 'Quiz', 'សកម្មភាព', 'កិច្ចការផ្ទះ', 'Quiz', '', '']
    ];

    // Data rows
    processedStudents.forEach((s, idx) => {
      const monthData = s.monthlyScores?.[selectedMonth] || {};
      const subTotalNoExam = calculateSubTotalNoExam(s, selectedMonth);
      const grandTotal = calculateStudentMonthTotal(s, selectedMonth);
      const avg = calculateStudentMonthAverage(s, selectedMonth);
      const rank = studentRanks[s.id] || (idx + 1);
      const genderShort = s.gender === 'ស្រី' ? 'ស' : 'ប';

      wsData.push([
        idx + 1,
        s.studentId || `STU-${(idx + 1).toString().padStart(3, '0')}`,
        s.name,
        genderShort,
        subTotalNoExam,
        grandTotal,
        avg,
        grandTotal > 0 ? rank : '',
        monthData.monthlyExam ?? '',
        monthData.week1?.activity ?? '',
        monthData.week1?.homework ?? '',
        monthData.week1?.quiz ?? '',
        monthData.week2?.activity ?? '',
        monthData.week2?.homework ?? '',
        monthData.week2?.quiz ?? '',
        monthData.week3?.activity ?? '',
        monthData.week3?.homework ?? '',
        monthData.week3?.quiz ?? '',
        monthData.week4?.activity ?? '',
        monthData.week4?.homework ?? '',
        monthData.week4?.quiz ?? '',
        monthData.quiz ?? '',
        monthData.notebook ?? ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set merged ranges
    ws['!merges'] = [
      { s: { r: 0, c: 14 }, e: { r: 0, c: 20 } }, // ព្រះរាជាណាចក្រកម្ពុជា
      { s: { r: 1, c: 14 }, e: { r: 1, c: 20 } }, // ជាតិ សាសនា ព្រះមហាក្សត្រ
      { s: { r: 2, c: 4 }, e: { r: 2, c: 18 } },  // Title
      { s: { r: 3, c: 0 }, e: { r: 5, c: 0 } },   // ល.រ
      { s: { r: 3, c: 1 }, e: { r: 5, c: 1 } },   // ID
      { s: { r: 3, c: 2 }, e: { r: 5, c: 2 } },   // ឈ្មោះសិស្ស
      { s: { r: 3, c: 3 }, e: { r: 5, c: 3 } },   // ភេទ
      { s: { r: 3, c: 4 }, e: { r: 5, c: 4 } },   // សរុប (ដក Exam)
      { s: { r: 3, c: 5 }, e: { r: 5, c: 5 } },   // សរុប ១ខែ
      { s: { r: 3, c: 6 }, e: { r: 5, c: 6 } },   // មធ្យមភាគ
      { s: { r: 3, c: 7 }, e: { r: 5, c: 7 } },   // ចំណាត់ថ្នាក់
      { s: { r: 3, c: 8 }, e: { r: 3, c: 22 } },  // ពិន្ទុប្រចាំខែ
      { s: { r: 4, c: 8 }, e: { r: 5, c: 8 } },   // Monthly Exam
      { s: { r: 4, c: 9 }, e: { r: 4, c: 11 } },  // Week 1
      { s: { r: 4, c: 12 }, e: { r: 4, c: 14 } }, // Week 2
      { s: { r: 4, c: 15 }, e: { r: 4, c: 17 } }, // Week 3
      { s: { r: 4, c: 18 }, e: { r: 4, c: 20 } }, // Week 4
      { s: { r: 4, c: 21 }, e: { r: 5, c: 21 } }, // Quiz
      { s: { r: 4, c: 22 }, e: { r: 5, c: 22 } }  // ពិនិត្យសៀវភៅ
    ];

    ws['!cols'] = [
      { wch: 6 },  // ល.រ
      { wch: 10 }, // ID
      { wch: 22 }, // ឈ្មោះ
      { wch: 8 },  // ភេទ
      { wch: 14 }, // សរុប (ដក Exam)
      { wch: 12 }, // សរុប ១ខែ
      { wch: 12 }, // មធ្យមភាគ
      { wch: 12 }, // ចំណាត់ថ្នាក់
      { wch: 14 }, // Monthly Exam
      { wch: 10 }, // W1 Act
      { wch: 12 }, // W1 HW
      { wch: 10 }, // W1 Quiz
      { wch: 10 }, // W2 Act
      { wch: 12 }, // W2 HW
      { wch: 10 }, // W2 Quiz
      { wch: 10 }, // W3 Act
      { wch: 12 }, // W3 HW
      { wch: 10 }, // W3 Quiz
      { wch: 10 }, // W4 Act
      { wch: 12 }, // W4 HW
      { wch: 10 }, // W4 Quiz
      { wch: 10 }, // Quiz
      { wch: 14 }  // ពិនិត្យសៀវភៅ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `ពិន្ទុ_${selectedMonth}`);
    XLSX.writeFile(wb, `តារាងពិន្ទុសិស្ស_ខែ${selectedMonth}_${currentClassName}.xlsx`);
  };

  // Reset scores for active month
  const handleResetMonthScores = () => {
    if (!onUpdateStudentDetail || students.length === 0) return;
    if (window.confirm(`តើអ្នកពិតជាចង់កំណត់ពិន្ទុខែ «${selectedMonth}» ទាំងអស់ឡើងវិញទៅ 0 មែនទេ?`)) {
      students.forEach(s => {
        const currentMonthScores = s.monthlyScores || {};
        const updated = { ...currentMonthScores };
        delete updated[selectedMonth];
        onUpdateStudentDetail(s.id, {
          monthlyScores: updated,
          score: 0
        });
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Month Switcher, Sort, Search, View Switcher & Action Tools */}
      <div className={`p-4 rounded-3xl border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        
        {/* Left: Month Selector & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 whitespace-nowrap">
              ខែពិន្ទុ៖
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-black cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {KHMER_MONTHS.map(m => (
                <option key={m} value={m}>ខែ {m}</option>
              ))}
            </select>
          </div>

          {/* Sort Switcher (តាម ID / តាម A-Z / ពិន្ទុ / ចំណាត់ថ្នាក់ / មធ្យមភាគ) */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <ArrowDownUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-slate-400">តម្រៀប៖</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-transparent border-none text-xs font-black text-indigo-600 dark:text-indigo-400 cursor-pointer focus:outline-none pr-1"
              >
                <option value="default" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                  លំនាំដើម (ល.រ)
                </option>
                <option value="id" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                  រៀបតាម ID (0-9 / A-Z)
                </option>
                <option value="name" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                  រៀបតាមឈ្មោះ (A-Z)
                </option>
                <option value="rank-asc" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                  ចំណាត់ថ្នាក់ (លេខ ១ → N)
                </option>
                <option value="avg-desc" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                  មធ្យមភាគ (ខ្ពស់ → ទាប)
                </option>
                <option value="score-desc" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                  ពិន្ទុច្រើន → តិច
                </option>
                <option value="score-asc" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                  ពិន្ទុតិច → ច្រើន
                </option>
              </select>
            </div>
          </div>

          {/* Average Divisor Switcher */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/70 dark:border-blue-800/60 shadow-xs">
            <span className="text-xs font-black text-blue-700 dark:text-blue-300">មធ្យមភាគ៖</span>
            <select
              value={averageDivisor}
              onChange={(e) => handleDivisorChange(parseFloat(e.target.value) || 2)}
              className="bg-transparent border-none text-xs font-black text-blue-700 dark:text-blue-300 cursor-pointer focus:outline-none"
              title="ជ្រើសរើសរូបមន្តចែកមធ្យមភាគ (÷1, ÷2, ÷4, ÷5, ÷10)"
            >
              <option value="1" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">÷ 1 (ពិន្ទុដើម)</option>
              <option value="2" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">÷ 2 (លើ ៥០)</option>
              <option value="4" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">÷ 4 (លើ ២៥)</option>
              <option value="5" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">÷ 5 (លើ ២០)</option>
              <option value="10" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">÷ 10 (លើ ១០)</option>
            </select>
          </div>

          {/* View Mode Toggle: Table Sheet vs Quick Cards (Water Droplet / Liquid Glass) */}
          <div className="p-1 rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-2xl inline-flex items-center select-none relative gap-1">
            {/* Mode 1: Table Sheet */}
            <button
              type="button"
              onClick={() => setActiveViewMode('table')}
              className="relative px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none"
            >
              {activeViewMode === 'table' && (
                <motion.div
                  layoutId="activeScoreViewModeIndicator"
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 22,
                    mass: 0.65
                  }}
                  className={`absolute inset-0 rounded-xl border backdrop-blur-2xl overflow-hidden pointer-events-none ${
                    isDarkMode
                      ? 'bg-white/[0.08] border-white/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(255,255,255,0.1)]'
                      : 'bg-white/80 border-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03),inset_0_2.5px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(255,255,255,0.5)]'
                  }`}
                >
                  {/* Top Specular Glare Dome Reflection (ចំណាំងពន្លឺកោងមូលតំណក់ទឹកថ្លា) */}
                  <div className={`absolute top-0 inset-x-1 h-[48%] bg-gradient-to-b rounded-t-xl pointer-events-none ${
                    isDarkMode 
                      ? 'from-white/50 via-white/12 to-transparent' 
                      : 'from-white/95 via-white/40 to-transparent'
                  }`} />

                  {/* Central Radial Light Core (ស្នូលពន្លឺរលោងខាងក្នុង) */}
                  <div className={`absolute top-0.5 left-1/2 -translate-x-1/2 w-3/4 h-2 pointer-events-none ${
                    isDarkMode
                      ? 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.3)_0%,_transparent_75%)]'
                      : 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.95)_0%,_transparent_75%)]'
                  }`} />

                  {/* Bottom Droplet Meniscus Light Rim (គែមពន្លឺបាតតំណក់ទឹកថ្លា) */}
                  <div className={`absolute bottom-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
                    isDarkMode ? 'via-white/50' : 'via-white/90'
                  }`} />
                </motion.div>
              )}

              <motion.span
                animate={{ 
                  scale: activeViewMode === 'table' ? 1.04 : 1,
                  y: activeViewMode === 'table' ? -0.5 : 0
                }}
                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                className="relative z-10 flex items-center gap-1.5"
              >
                <Table className={`w-3.5 h-3.5 transition-all duration-300 ${
                  activeViewMode === 'table'
                    ? isDarkMode ? 'text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-blue-600 scale-110 drop-shadow-xs'
                    : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`} />
                <span className={
                  activeViewMode === 'table' 
                    ? isDarkMode 
                      ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                      : 'text-blue-600 font-extrabold tracking-wide' 
                    : 'font-bold text-slate-600 dark:text-slate-400'
                }>
                  តារាង Sheet
                </span>
              </motion.span>
            </button>

            {/* Mode 2: Cards & Ranking */}
            <button
              type="button"
              onClick={() => setActiveViewMode('cards')}
              className="relative px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none"
            >
              {activeViewMode === 'cards' && (
                <motion.div
                  layoutId="activeScoreViewModeIndicator"
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 22,
                    mass: 0.65
                  }}
                  className={`absolute inset-0 rounded-xl border backdrop-blur-2xl overflow-hidden pointer-events-none ${
                    isDarkMode
                      ? 'bg-white/[0.08] border-white/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(255,255,255,0.1)]'
                      : 'bg-white/80 border-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03),inset_0_2.5px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(255,255,255,0.5)]'
                  }`}
                >
                  {/* Top Specular Glare Dome Reflection (ចំណាំងពន្លឺកោងមូលតំណក់ទឹកថ្លា) */}
                  <div className={`absolute top-0 inset-x-1 h-[48%] bg-gradient-to-b rounded-t-xl pointer-events-none ${
                    isDarkMode 
                      ? 'from-white/50 via-white/12 to-transparent' 
                      : 'from-white/95 via-white/40 to-transparent'
                  }`} />

                  {/* Central Radial Light Core (ស្នូលពន្លឺរលោងខាងក្នុង) */}
                  <div className={`absolute top-0.5 left-1/2 -translate-x-1/2 w-3/4 h-2 pointer-events-none ${
                    isDarkMode
                      ? 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.3)_0%,_transparent_75%)]'
                    : 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.95)_0%,_transparent_75%)]'
                  }`} />

                  {/* Bottom Droplet Meniscus Light Rim (គែមពន្លឺបាតតំណក់ទឹកថ្លា) */}
                  <div className={`absolute bottom-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
                    isDarkMode ? 'via-white/50' : 'via-white/90'
                  }`} />
                </motion.div>
              )}

              <motion.span
                animate={{ 
                  scale: activeViewMode === 'cards' ? 1.04 : 1,
                  y: activeViewMode === 'cards' ? -0.5 : 0
                }}
                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                className="relative z-10 flex items-center gap-1.5"
              >
                <LayoutGrid className={`w-3.5 h-3.5 transition-all duration-300 ${
                  activeViewMode === 'cards'
                    ? isDarkMode ? 'text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-blue-600 scale-110 drop-shadow-xs'
                    : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`} />
                <span className={
                  activeViewMode === 'cards' 
                    ? isDarkMode 
                      ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                      : 'text-blue-600 font-extrabold tracking-wide' 
                    : 'font-bold text-slate-600 dark:text-slate-400'
                }>
                  កាត & ចំណាត់ថ្នាក់
                </span>
              </motion.span>
            </button>
          </div>
        </div>

        {/* Right: Search & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 justify-end">
          <div className="relative w-full sm:w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរក ID ឬឈ្មោះ..."
              value={scoreSearchQuery}
              onChange={(e) => setScoreSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="button"
            onClick={handleExportOfficialExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="ទាញយកជា Excel តាមគំរូផ្លូវការ"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel ផ្លូវការ</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="បោះពុម្ពតារាងពិន្ទុ"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>បោះពុម្ព</span>
          </button>

          <button
            type="button"
            onClick={handleResetMonthScores}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isDarkMode ? 'bg-amber-950/30 border-amber-900/40 text-amber-300 hover:bg-amber-900/40' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
            title="កំណត់ពិន្ទុខែនេះឡើងវិញ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ===================== VIEW 1: OFFICIAL TABLE SHEET VIEW WITH SCROLL ===================== */}
      {activeViewMode === 'table' && (
        <div className={`border rounded-3xl overflow-hidden shadow-lg flex flex-col ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}>
          
          {/* Official MoEYS / Sovannaphumi School Header Banner */}
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 text-center space-y-1 bg-gradient-to-b from-indigo-50/60 to-transparent dark:from-indigo-950/30 dark:to-transparent shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-600/20 select-none">
                  SPS
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">សាលារៀន សុវណ្ណភូមិ</h4>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Sovannaphumi School</p>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide">ព្រះរាជាណាចក្រកម្ពុជា</h2>
                <h3 className="text-xs font-extrabold text-slate-600 dark:text-slate-300">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
              </div>

              <div className="text-right hidden sm:block">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{currentClassName}</span>
                </span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-center gap-3">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white underline decoration-indigo-500 underline-offset-8">
                តារាងពិន្ទុសិស្សក្នុងខែ {selectedMonth}
              </h1>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 pt-1">
              * ពិន្ទុសរុបត្រូវបានគណនាស្វ័យប្រវត្តិ ហើយលោកគ្រូអ្នកគ្រូអាចចុចកែប្រែដោយផ្ទាល់បានតាមតម្រូវការ
            </p>
          </div>

          {/* Vertically & Horizontally Scrollable Sheet View Container */}
          <div className="overflow-x-auto overflow-y-auto max-h-[620px] scrollbar-thin relative">
            <table className="w-full text-xs text-center border-collapse">
              {/* Sticky Headers for comfortable scrolling */}
              <thead className="sticky top-0 z-20 shadow-xs">
                {/* Header Row 1 */}
                <tr className={`${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'} font-black border-b border-slate-200 dark:border-slate-800`}>
                  {/* ល.រ */}
                  <th rowSpan={3} className="p-2.5 border-r border-slate-200 dark:border-slate-800 min-w-[45px] sticky left-0 z-30 bg-inherit shadow-xs">
                    ល.រ
                  </th>
                  
                  {/* ID Column */}
                  <th 
                    rowSpan={3} 
                    onClick={() => setSortMode(prev => prev === 'id' ? 'default' : 'id')}
                    className="p-2.5 border-r border-slate-200 dark:border-slate-800 min-w-[75px] cursor-pointer hover:bg-indigo-500/10 transition-colors select-none group"
                    title="ចុចដើម្បីតម្រៀបតាម ID"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>ID</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortMode === 'id' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    </div>
                  </th>

                  {/* ឈ្មោះសិស្ស */}
                  <th 
                    rowSpan={3} 
                    onClick={() => setSortMode(prev => prev === 'name' ? 'default' : 'name')}
                    className="p-2.5 border-r border-slate-200 dark:border-slate-800 min-w-[155px] text-left pl-4 cursor-pointer hover:bg-indigo-500/10 transition-colors select-none group"
                    title="ចុចដើម្បីតម្រៀបតាមឈ្មោះ A-Z"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ឈ្មោះសិស្ស</span>
                      <ArrowUpAZ className={`w-3.5 h-3.5 ${sortMode === 'name' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    </div>
                  </th>

                  {/* ភេទ */}
                  <th rowSpan={3} className="p-2.5 border-r border-slate-200 dark:border-slate-800 min-w-[50px]">
                    ភេទ
                  </th>

                  {/* Column 1: សរុប (ដក Exam) */}
                  <th 
                    rowSpan={3} 
                    className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[85px] bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-black text-center"
                    title="ពិន្ទុសរុបនៃសកម្មភាព Weeks, Quiz, និងសៀវភៅ (មិនរាប់បញ្ចូល Monthly Exam)"
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span>សរុប</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">(ដក Exam)</span>
                    </div>
                  </th>

                  {/* Column 2: សរុប ១ខែ */}
                  <th 
                    rowSpan={3} 
                    onClick={() => setSortMode(prev => prev === 'score-desc' ? 'score-asc' : 'score-desc')}
                    className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[85px] bg-amber-500/15 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black text-center cursor-pointer hover:bg-amber-500/25 transition-colors select-none group"
                    title="ពិន្ទុសរុបប្រចាំខែពេញលេញ (ចុចដើម្បីតម្រៀបពិន្ទុ)"
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <div className="flex items-center gap-1">
                        <span>សរុប ១ខែ</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMode.startsWith('score') ? 'text-amber-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">(Grand Total)</span>
                    </div>
                  </th>

                  {/* Column 3: មធ្យមភាគ (Average) */}
                  <th 
                    rowSpan={3} 
                    onClick={() => setSortMode(prev => prev === 'avg-desc' ? 'avg-asc' : 'avg-desc')}
                    className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[85px] bg-blue-500/15 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black text-center cursor-pointer hover:bg-blue-500/25 transition-colors select-none group"
                    title="មធ្យមភាគប្រចាំខែ (ចុចដើម្បីតម្រៀប)"
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <div className="flex items-center gap-1">
                        <span>មធ្យមភាគ</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMode.startsWith('avg') ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">(÷{averageDivisor})</span>
                    </div>
                  </th>

                  {/* Column 4: ចំណាត់ថ្នាក់ (Rank) */}
                  <th 
                    rowSpan={3} 
                    onClick={() => setSortMode(prev => prev === 'rank-asc' ? 'default' : 'rank-asc')}
                    className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[80px] bg-purple-500/15 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-black text-center cursor-pointer hover:bg-purple-500/25 transition-colors select-none group"
                    title="ចំណាត់ថ្នាក់ស្វ័យប្រវត្តិតាមពិន្ទុសរុប (ចុចដើម្បីតម្រៀប)"
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <div className="flex items-center gap-1">
                        <span>ចំណាត់ថ្នាក់</span>
                        <Trophy className={`w-3 h-3 ${sortMode === 'rank-asc' ? 'text-purple-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">(Rank)</span>
                    </div>
                  </th>

                  {/* Header Span for Monthly Details */}
                  <th colSpan={15} className="p-2.5 bg-indigo-600/10 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-b border-slate-200 dark:border-slate-800 font-black tracking-wide">
                    ពិន្ទុប្រចាំខែ {selectedMonth}
                  </th>
                </tr>

                {/* Header Row 2 */}
                <tr className={`${isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-700'} font-extrabold border-b border-slate-200 dark:border-slate-800 text-[11px]`}>
                  <th rowSpan={2} className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[75px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                    Monthly Exam
                  </th>
                  <th colSpan={3} className="p-1.5 border-r border-slate-200 dark:border-slate-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold">
                    Week 1
                  </th>
                  <th colSpan={3} className="p-1.5 border-r border-slate-200 dark:border-slate-800 bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold">
                    Week 2
                  </th>
                  <th colSpan={3} className="p-1.5 border-r border-slate-200 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold">
                    Week 3
                  </th>
                  <th colSpan={3} className="p-1.5 border-r border-slate-200 dark:border-slate-800 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold">
                    Week 4
                  </th>
                  <th rowSpan={2} className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[60px] bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">
                    Quiz
                  </th>
                  <th rowSpan={2} className="p-2 min-w-[85px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                    ពិនិត្យសៀវភៅ
                  </th>
                </tr>

                {/* Header Row 3: Sub-columns for Weeks 1 to 4 */}
                <tr className={`${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100/80 text-slate-600'} text-[10px] font-bold border-b border-slate-200 dark:border-slate-800`}>
                  {/* Week 1 */}
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">សកម្មភាព</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">កិច្ចការផ្ទះ</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[50px]">Quiz</th>

                  {/* Week 2 */}
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">សកម្មភាព</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">កិច្ចការផ្ទះ</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[50px]">Quiz</th>

                  {/* Week 3 */}
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">សកម្មភាព</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">កិច្ចការផ្ទះ</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[50px]">Quiz</th>

                  {/* Week 4 */}
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">សកម្មភាព</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[55px]">កិច្ចការផ្ទះ</th>
                  <th className="p-1.5 border-r border-slate-200 dark:border-slate-800 min-w-[50px]">Quiz</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {processedStudents.length > 0 ? (
                  processedStudents.map((student, idx) => {
                    const monthData = student.monthlyScores?.[selectedMonth] || {};
                    const subTotalNoExam = calculateSubTotalNoExam(student, selectedMonth);
                    const grandTotal = calculateStudentMonthTotal(student, selectedMonth);
                    const average = calculateStudentMonthAverage(student, selectedMonth);
                    const rank = studentRanks[student.id] || (idx + 1);
                    const genderShort = student.gender === 'ស្រី' ? 'ស' : 'ប';
                    const hasManualSub = monthData.manualSubTotalNoExam !== undefined;
                    const hasManualGrand = monthData.manualTotal !== undefined;
                    const hasManualAvg = monthData.manualAverage !== undefined;

                    return (
                      <tr 
                        key={student.id}
                        className={`hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-colors ${
                          idx % 2 === 1 
                            ? isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/50' 
                            : 'bg-transparent'
                        }`}
                      >
                        {/* Index (No.) */}
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-extrabold text-slate-500 sticky left-0 bg-inherit shadow-xs">
                          {idx + 1}
                        </td>

                        {/* ID Column (Editable inline or display) */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="text"
                            value={student.studentId || ''}
                            placeholder={`${(idx + 1).toString().padStart(3, '0')}`}
                            onChange={(e) => handleStudentIdChange(student, e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            title="ចុចដើម្បីកែប្រែ ID សិស្ស"
                          />
                        </td>

                        {/* Name */}
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-left pl-3.5 font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {student.name}
                        </td>

                        {/* Gender */}
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-bold">
                          <span className={student.gender === 'ស្រី' ? 'text-pink-500' : 'text-blue-500'}>
                            {genderShort}
                          </span>
                        </td>

                        {/* Column 1: សរុប (ដក Exam) - Auto-calculated & Teacher Editable */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800 bg-emerald-500/10 dark:bg-emerald-950/30">
                          <div className="relative group">
                            <input
                              type="number"
                              min="0"
                              value={subTotalNoExam}
                              onChange={(e) => handleManualSubTotalChange(student, e.target.value)}
                              className={`w-full text-center py-1 rounded font-black text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                hasManualSub 
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-black' 
                                  : 'bg-transparent hover:bg-white/80 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300'
                              }`}
                              title="ពិន្ទុសរុបដក Monthly Exam (អាចកែប្រែដោយផ្ទាល់)"
                            />
                            {hasManualSub && (
                              <span className="absolute top-0 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" title="កែប្រែដោយផ្ទាល់ (Manual)" />
                            )}
                          </div>
                        </td>

                        {/* Column 2: សរុប ១ខែ - Auto-calculated & Teacher Editable */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800 bg-amber-500/15 dark:bg-amber-950/40">
                          <div className="relative group">
                            <input
                              type="number"
                              min="0"
                              value={grandTotal}
                              onChange={(e) => handleManualGrandTotalChange(student, e.target.value)}
                              className={`w-full text-center py-1 rounded font-black text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                hasManualGrand 
                                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100' 
                                  : 'bg-transparent hover:bg-white/80 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300'
                              }`}
                              title="ពិន្ទុសរុប ១ខែពេញលេញ (អាចកែប្រែដោយផ្ទាល់)"
                            />
                            {hasManualGrand && (
                              <span className="absolute top-0 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" title="កែប្រែដោយផ្ទាល់ (Manual)" />
                            )}
                          </div>
                        </td>

                        {/* Column 3: មធ្យមភាគ (Average) - Auto-calculated & Teacher Editable */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800 bg-blue-500/10 dark:bg-blue-950/30">
                          <div className="relative group">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={average || ''}
                              placeholder="0"
                              onChange={(e) => handleManualAverageChange(student, e.target.value)}
                              className={`w-full text-center py-1 rounded font-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                hasManualAvg 
                                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100 font-black' 
                                  : 'bg-transparent hover:bg-white/80 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-300'
                              }`}
                              title="មធ្យមភាគ (គណនាស្វ័យប្រវត្តិ ឬចុចកែប្រែដោយផ្ទាល់)"
                            />
                            {hasManualAvg && (
                              <span className="absolute top-0 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" title="កែប្រែដោយផ្ទាល់ (Manual)" />
                            )}
                          </div>
                        </td>

                        {/* Column 4: ចំណាត់ថ្នាក់ (Rank) - Auto-calculated based on Grand Total */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800 bg-purple-500/10 dark:bg-purple-950/30 text-center font-black">
                          {grandTotal > 0 ? (
                            <div className="flex items-center justify-center">
                              {rank === 1 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[11px] font-black shadow-xs">
                                  🥇 1
                                </span>
                              ) : rank === 2 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 text-slate-900 text-[11px] font-black shadow-xs">
                                  🥈 2
                                </span>
                              ) : rank === 3 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[11px] font-black shadow-xs">
                                  🥉 3
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-black">
                                  {rank}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">-</span>
                          )}
                        </td>

                        {/* Monthly Exam */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.monthlyExam ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'monthlyExam', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 1: Activity */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week1?.activity ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week1.activity', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 1: Homework */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week1?.homework ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week1.homework', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 1: Quiz */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week1?.quiz ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week1.quiz', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 2: Activity */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week2?.activity ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week2.activity', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 2: Homework */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week2?.homework ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week2.homework', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 2: Quiz */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week2?.quiz ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week2.quiz', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 3: Activity */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week3?.activity ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week3.activity', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 3: Homework */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week3?.homework ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week3.homework', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 3: Quiz */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week3?.quiz ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week3.quiz', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 4: Activity */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week4?.activity ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week4.activity', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 4: Homework */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week4?.homework ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week4.homework', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Week 4: Quiz */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.week4?.quiz ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'week4.quiz', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Quiz Overall */}
                        <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.quiz ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'quiz', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Notebook Check */}
                        <td className="p-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={monthData.notebook ?? ''}
                            onChange={(e) => handleScoreFieldChange(student, 'notebook', e.target.value)}
                            className="w-full text-center py-1 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={23} className="p-8 text-center text-slate-400">
                      មិនមានសិស្សក្នុងថ្នាក់ ឬលក្ខខណ្ឌស្វែងរកនេះឡើយ។
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== VIEW 2: CARDS & RANKING VIEW ===================== */}
      {activeViewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...processedStudents]
            .sort((a, b) => calculateStudentMonthTotal(b, selectedMonth) - calculateStudentMonthTotal(a, selectedMonth))
            .map((student, idx) => {
              const currentScore = calculateStudentMonthTotal(student, selectedMonth);
              const subTotalNoExam = calculateSubTotalNoExam(student, selectedMonth);
              const averageScore = calculateStudentMonthAverage(student, selectedMonth);
              const rankNumber = studentRanks[student.id] || (idx + 1);
              const monthData = student.monthlyScores?.[selectedMonth] || {};

              let rankBadge = (
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  #{rankNumber}
                </span>
              );

              if (rankNumber === 1 && currentScore > 0) {
                rankBadge = (
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-sm shadow-amber-500/20 shrink-0">
                    🥇
                  </span>
                );
              } else if (rankNumber === 2 && currentScore > 0) {
                rankBadge = (
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                    🥈
                  </span>
                );
              } else if (rankNumber === 3 && currentScore > 0) {
                rankBadge = (
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                    🥉
                  </span>
                );
              }

              const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-pink-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
              const badgeBg = colors[student.name.charCodeAt(0) % colors.length];

              return (
                <div
                  key={student.id}
                  className={`border rounded-2xl p-4.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 ${
                    isDarkMode 
                      ? 'bg-[#1e293b] border-slate-800' 
                      : 'bg-white border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {rankBadge}
                      {student.avatarUrl ? (
                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-xs border border-slate-200 dark:border-slate-700">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-full h-full object-cover select-none"
                          />
                        </div>
                      ) : (
                        <div className={`w-9 h-9 rounded-xl ${badgeBg} flex items-center justify-center text-white text-xs font-black select-none shrink-0 shadow-xs`}>
                          {student.name.trim().charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className={`font-black text-sm leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {student.name}
                          </h3>
                          {student.studentId && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              ID: {student.studentId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold ${
                            student.gender === 'ស្រី' ? 'text-pink-500' : 'text-blue-500'
                          }`}>
                            {student.gender || 'ប្រុស'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">• ខែ {selectedMonth}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-center border ${
                      currentScore > 0 
                        ? isDarkMode ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                        : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-1 justify-center">
                        <Star className={`w-3.5 h-3.5 ${currentScore > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                        <span className="text-base font-black tracking-tight">{currentScore}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider block -mt-0.5">សរុប ១ខែ</span>
                    </div>
                  </div>

                  {/* Summary Breakdown Mini Pills */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-center">
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8.5px]">Monthly Exam</span>
                      <span className="text-sky-600 dark:text-sky-400 font-black">{monthData.monthlyExam || 0}</span>
                    </div>
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[8.5px]">ដក Exam</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {subTotalNoExam}
                      </span>
                    </div>
                    <div className="p-1 rounded bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                      <span className="text-blue-500 dark:text-blue-400 block text-[8.5px]">មធ្យមភាគ</span>
                      <span className="text-blue-700 dark:text-blue-300 font-black">
                        {averageScore}
                      </span>
                    </div>
                    <div className="p-1 rounded bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40">
                      <span className="text-purple-500 dark:text-purple-400 block text-[8.5px]">ចំណាត់ថ្នាក់</span>
                      <span className="text-purple-700 dark:text-purple-300 font-black">
                        #{rankNumber}
                      </span>
                    </div>
                  </div>

                  {/* Stepper Buttons for Quick Point Adjustments */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (!onUpdateStudentDetail) return;
                        const newTotal = Math.max(0, currentScore - 1);
                        handleManualGrandTotalChange(student, newTotal.toString());
                      }}
                      disabled={currentScore <= 0}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all active:scale-90 cursor-pointer"
                      title="ដក 1 ពិន្ទុ (-1)"
                    >
                      -1
                    </button>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={currentScore}
                        onChange={(e) => handleManualGrandTotalChange(student, e.target.value)}
                        className="w-14 py-1 text-center font-black text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        title="វាយបញ្ចូលពិន្ទុផ្ទាល់"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!onUpdateStudentDetail) return;
                        const newTotal = currentScore + 1;
                        handleManualGrandTotalChange(student, newTotal.toString());
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all active:scale-90 cursor-pointer flex items-center gap-0.5"
                      title="បន្ថែម 1 ពិន្ទុ (+1)"
                    >
                      <Plus className="w-3 h-3" />
                      <span>1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!onUpdateStudentDetail) return;
                        const newTotal = currentScore + 5;
                        handleManualGrandTotalChange(student, newTotal.toString());
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs shadow-xs transition-all active:scale-90 cursor-pointer flex items-center gap-0.5 ${
                        isDarkMode 
                          ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/50' 
                          : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                      }`}
                      title="បន្ថែម 5 ពិន្ទុ (+5)"
                    >
                      <Plus className="w-3 h-3" />
                      <span>5</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Bottom Score Statistics Summary Bar */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
          isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div>
            <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ពិន្ទុសរុប (ខែ {selectedMonth})</p>
            <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{totalScoresSum}</h4>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-amber-950/35 text-amber-400' : 'bg-amber-50 text-amber-500'
          }`}>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
        </div>

        <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
          isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div>
            <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ពិន្ទុមធ្យម</p>
            <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>{averageScore}</h4>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-sky-950/35 text-sky-400' : 'bg-sky-50 text-sky-500'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
          isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div>
            <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ពិន្ទុខ្ពស់បំផុត</p>
            <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{highestScore}</h4>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-emerald-950/35 text-emerald-400' : 'bg-emerald-50 text-emerald-500'
          }`}>
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
          isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div className="truncate pr-2">
            <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>សិស្សពិន្ទុឆ្នើម</p>
            <h4 className={`text-sm font-black mt-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              {topStudent ? topStudent.name : 'មិនទាន់មាន'}
            </h4>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isDarkMode ? 'bg-yellow-950/35 text-yellow-400' : 'bg-yellow-50 text-yellow-500'
          }`}>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
