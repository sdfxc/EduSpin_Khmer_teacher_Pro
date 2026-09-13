import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Plus, FileSpreadsheet, Download, Upload, UserPlus, Users, Trash2, 
  Award, ShieldAlert, Sparkles, TrendingUp, HelpCircle, Pencil, ClipboardList,
  UserCheck, Trophy, Medal, Star, Flame, ArrowUpDown, RotateCcw, CheckCircle2, ChevronUp, ChevronDown,
  Camera, ArrowUpAZ, Hash, UserX, Clock, FileText, Share2
} from 'lucide-react';
import { Student, ClassInfo } from '../types';
import * as XLSX from 'xlsx';
import { StudentQuickEditModal } from './StudentQuickEditModal';
import { StudentScoreTable, SortMode } from './StudentScoreTable';
import { StudentProfileModal } from './StudentProfileModal';
import { GenderBadgePicker } from './GenderBadgePicker';
import { AttendanceCategoryViews } from './AttendanceCategoryViews';

interface StudentManagerProps {
  students: Student[];
  classes: ClassInfo[];
  activeClassId: string;
  isDarkMode?: boolean;
  onAddStudentDetail: (fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string; studentId?: string }) => void;
  onRemoveStudent: (id: string) => void;
  onClearStudents?: () => void;
  onBulkAddStudents: (list: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }[], targetClassId?: string) => void;
  onBatchSyncStudents?: (names: string[], mode: 'replace' | 'append', targetClassId?: string) => void | Promise<void>;
  onUpdateStudentDetail?: (id: string, fields: Partial<Student>) => void;
  onSwitchClass?: (classId: string) => void;
}

export default function StudentManager({
  students,
  classes,
  activeClassId,
  isDarkMode = false,
  onAddStudentDetail,
  onRemoveStudent,
  onClearStudents,
  onBulkAddStudents,
  onBatchSyncStudents,
  onUpdateStudentDetail,
  onSwitchClass
}: StudentManagerProps) {
  // Main Sub-Tab: 'status' (ស្ថានភាពសិស្ស) | 'score' (ពិន្ទុសិស្ស) | 'attendance' (វត្តមានសិស្ស)
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'score' | 'attendance'>('status');

  const handleExportAttendanceExcel = () => {
    const classObj = classes.find(c => c.id === currentClassIdForAttendance);
    const className = classObj ? classObj.name : 'គ្រប់ថ្នាក់';

    const worksheetData: (string | number)[][] = [
      [`បញ្ជីវត្តមានសិស្ស - ថ្នាក់៖ ${className}`],
      [`កាលបរិច្ឆេទ៖ ${attendanceDate}`],
      [],
      ['ល.រ', 'អត្តលេខ', 'ឈ្មោះសិស្ស', 'ភេទ', 'ស្ថានភាពវត្តមាន', 'មូលហេតុ / កំណត់សម្គាល់ (Reason)']
    ];

    filteredStudents.forEach((student, index) => {
      const status = currentClassAttendance[student.id] || 'present';
      const statusKh = status === 'present' ? 'វត្តមាន' : status === 'permission' ? 'មានច្បាប់' : status === 'late' ? 'យឺតយ៉ាវ' : 'អវត្តមាន';
      const reason = (status === 'permission' || status === 'late') ? (currentClassReasons[student.id] || '') : '';
      worksheetData.push([
        index + 1,
        student.studentId || '',
        student.name,
        student.gender || 'ប្រុស',
        statusKh,
        reason
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `attendance_${currentClassIdForAttendance}_${attendanceDate}.xlsx`);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>(activeClassId || 'all');
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);

  // Persistent student sort mode shared across Attendance and Score tabs ('id' | 'name')
  const [studentSortMode, setStudentSortMode] = useState<SortMode>(() => {
    const saved = localStorage.getItem('edu_spin_student_sort_mode');
    return saved === 'id' || saved === 'name' ? saved : 'name';
  });

  const handleSortModeChange = (mode: SortMode) => {
    setStudentSortMode(mode);
    localStorage.setItem('edu_spin_student_sort_mode', mode);
  };

  // Attendance states
  const todayStr = new Date().toISOString().split('T')[0];
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, 'present' | 'absent' | 'permission' | 'late'>>>({});
  // Optional reasons for 'permission' or 'late' students
  const [attendanceReasonMap, setAttendanceReasonMap] = useState<Record<string, Record<string, string>>>({});
  // Sub-tab within Attendance: 'all' | 'permission_absent' | 'absent' | 'late' | 'permission' | 'summary'
  const [attendanceViewTab, setAttendanceViewTab] = useState<'all' | 'permission_absent' | 'absent' | 'late' | 'permission' | 'summary'>('all');
  const [droppedUpdateTick, setDroppedUpdateTick] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem('edu_spin_attendance_records');
    if (saved) {
      try {
        setAttendanceMap(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    const savedReasons = localStorage.getItem('edu_spin_attendance_reasons');
    if (savedReasons) {
      try {
        setAttendanceReasonMap(JSON.parse(savedReasons));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveAttendanceMap = (newMap: typeof attendanceMap) => {
    setAttendanceMap(newMap);
    localStorage.setItem('edu_spin_attendance_records', JSON.stringify(newMap));
  };

  const saveAttendanceReasonMap = (newMap: typeof attendanceReasonMap) => {
    setAttendanceReasonMap(newMap);
    localStorage.setItem('edu_spin_attendance_reasons', JSON.stringify(newMap));
  };

  const currentClassIdForAttendance = filterClassId !== 'all' ? filterClassId : (classes[0]?.id || 'default');
  const classAttendanceKey = `${currentClassIdForAttendance}_${attendanceDate}`;
  const currentClassAttendance = attendanceMap[classAttendanceKey] || {};
  const currentClassReasons = attendanceReasonMap[classAttendanceKey] || {};

  const handleSetStudentAttendance = (studentId: string, status: 'present' | 'absent' | 'permission' | 'late') => {
    const updatedClassAttendance = {
      ...currentClassAttendance,
      [studentId]: status
    };
    const newMap = {
      ...attendanceMap,
      [classAttendanceKey]: updatedClassAttendance
    };
    saveAttendanceMap(newMap);
  };

  const handleSetStudentReason = (studentId: string, reason: string) => {
    const updatedClassReasons = {
      ...currentClassReasons,
      [studentId]: reason
    };
    const newReasonMap = {
      ...attendanceReasonMap,
      [classAttendanceKey]: updatedClassReasons
    };
    saveAttendanceReasonMap(newReasonMap);
  };

  const handleMarkAllAttendance = (status: 'present' | 'absent' | 'permission' | 'late') => {
    const filteredStudents = students.filter(s => filterClassId === 'all' || s.classId === filterClassId);
    const updatedClassAttendance: Record<string, 'present' | 'absent' | 'permission' | 'late'> = {};
    filteredStudents.forEach(s => {
      updatedClassAttendance[s.id] = status;
    });
    const newMap = {
      ...attendanceMap,
      [classAttendanceKey]: updatedClassAttendance
    };
    saveAttendanceMap(newMap);
  };

  // Single student form toggle & states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [newStatus, setNewStatus] = useState<'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'>('សកម្ម');
  const [newClassId, setNewClassId] = useState<string>(activeClassId);

  // Editing student states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [editStatus, setEditStatus] = useState<'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'>('សកម្ម');
  const [editClassId, setEditClassId] = useState('');
  const [editScore, setEditScore] = useState<number>(0);

  // Bulk add toggle
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkTextInput, setBulkTextInput] = useState('');
  const [bulkClassId, setBulkClassId] = useState<string>(activeClassId);
  const [parsedStudents, setParsedStudents] = useState<{ name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }[]>([]);

  // Student Profile & Avatar Modal state
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);

  // Score Tab sorting & filter states
  const [scoreSortOrder, setScoreSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [scoreFilterTier, setScoreFilterTier] = useState<'all' | 'hasScore' | 'noScore'>('all');

  // Automatically keep class selections in sync when activeClassId changes
  useEffect(() => {
    if (activeClassId) {
      setFilterClassId(activeClassId);
      setNewClassId(activeClassId);
      setBulkClassId(activeClassId);
    }
  }, [activeClassId]);

  const handleBulkTextChange = (text: string) => {
    setBulkTextInput(text);
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    setParsedStudents(prev => {
      return lines.map((name, i) => {
        const existing = prev[i];
        if (existing && existing.name === name) {
          return existing;
        }

        const existingByName = prev.find(s => s.name === name);
        if (existingByName) {
          return {
            name,
            gender: existingByName.gender,
            status: existingByName.status
          };
        }

        // Guess gender slightly for better UX
        let defaultGender: 'ប្រុស' | 'ស្រី' = 'ប្រុស';
        const lowerName = name.toLowerCase();
        if (
          lowerName.includes('ស្រី') || 
          lowerName.includes('កញ្ញា') ||
          lowerName.endsWith('ណា') ||
          lowerName.endsWith('នី') ||
          lowerName.endsWith('លាភ') ||
          lowerName.endsWith('លីន') ||
          lowerName.endsWith('ទេវី') ||
          lowerName.endsWith('ម៉ា') ||
          lowerName.endsWith('ផល្លា')
        ) {
          defaultGender = 'ស្រី';
        }
        
        return {
          name,
          gender: defaultGender,
          status: 'សកម្ម' as const
        };
      });
    });
  };

  const handleUpdateParsedStudent = (index: number, fields: Partial<{ name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }>) => {
    setParsedStudents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...fields } as any;
      return updated;
    });
  };

  // Handle excel export
  const exportToExcel = () => {
    if (students.length === 0) return;
    const exportData = students.map((s, idx) => {
      const clsName = classes.find(c => c.id === (s.classId || activeClassId))?.name || 'មិនស្គាល់';
      return {
        'ល.រ': idx + 1,
        'ឈ្មោះសិស្ស': s.name,
        'ភេទ': s.gender || 'ប្រុស',
        'ថ្នាក់': clsName,
        'ស្ថានភាព': s.status || 'សកម្ម',
        'ពិន្ទុសរុប': s.score || 0
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 15 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "គ្រប់គ្រងសិស្ស");
    XLSX.writeFile(wb, `បញ្ជីឈ្មោះសិស្ស_និងពិន្ទុ_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddStudentDetail({
        studentId: newStudentId.trim() || undefined,
        name: newName.trim(),
        gender: newGender,
        status: newStatus,
        classId: newClassId
      });
      // Reset
      setNewName('');
      setNewStudentId('');
      setShowAddForm(false);
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedStudents.length > 0) {
      onBulkAddStudents(parsedStudents, bulkClassId);
      setBulkTextInput('');
      setParsedStudents([]);
      setShowBulkForm(false);
    }
  };

  // Filter & Sort logic (shared across tabs: Score, Attendance, Status)
  const filteredStudents = useMemo(() => {
    let list = students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = filterClassId === 'all' || (student.classId || activeClassId) === filterClassId;
      if (!matchesSearch || !matchesClass) return false;

      if (activeSubTab === 'score') {
        const score = student.score || 0;
        if (scoreFilterTier === 'hasScore' && score <= 0) return false;
        if (scoreFilterTier === 'noScore' && score > 0) return false;
      }

      return true;
    });

    if (studentSortMode === 'id') {
      list = [...list].sort((a, b) => {
        const idA = (a.studentId || a.id || '').trim();
        const idB = (b.studentId || b.id || '').trim();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
    } else if (studentSortMode === 'name') {
      list = [...list].sort((a, b) => a.name.trim().localeCompare(b.name.trim(), 'km'));
    }

    return list;
  }, [students, searchQuery, filterClassId, activeClassId, activeSubTab, scoreFilterTier, studentSortMode]);

  // Sort logic for score tab
  const sortedScoreStudents = [...filteredStudents].sort((a, b) => {
    if (scoreSortOrder === 'desc') {
      return (b.score || 0) - (a.score || 0);
    }
    if (scoreSortOrder === 'asc') {
      return (a.score || 0) - (b.score || 0);
    }
    return a.name.localeCompare(b.name, 'km');
  });

  // Quick Score Stepper Helper
  const handleScoreChange = (studentId: string, currentScore: number, delta: number) => {
    if (!onUpdateStudentDetail) return;
    const newScore = Math.max(0, (currentScore || 0) + delta);
    onUpdateStudentDetail(studentId, { score: newScore });
  };

  const handleDirectScoreSet = (studentId: string, value: number) => {
    if (!onUpdateStudentDetail) return;
    const newScore = Math.max(0, isNaN(value) ? 0 : value);
    onUpdateStudentDetail(studentId, { score: newScore });
  };

  const handleAddPointsToAll = (points: number) => {
    if (!onUpdateStudentDetail || filteredStudents.length === 0) return;
    filteredStudents.forEach(s => {
      const newScore = Math.max(0, (s.score || 0) + points);
      onUpdateStudentDetail(s.id, { score: newScore });
    });
  };

  const handleResetAllScores = () => {
    if (!onUpdateStudentDetail || filteredStudents.length === 0) return;
    if (window.confirm('តើអ្នកពិតជាចង់កំណត់ពិន្ទុសិស្សទាំងអស់ក្នុងបញ្ជីនេះទៅ 0 ឡើងវិញមែនទេ?')) {
      filteredStudents.forEach(s => {
        onUpdateStudentDetail(s.id, { score: 0 });
      });
    }
  };

  // Khmer initials builder helper
  const getKhmerInitial = (name: string) => {
    if (!name) return 'ស';
    return name.trim().charAt(0);
  };

  // Status Stats Counters
  const totalStudentsCount = filteredStudents.length;
  const femaleCount = filteredStudents.filter(s => s.gender === 'ស្រី').length;
  const outstandingCount = filteredStudents.filter(s => s.status === 'ឆ្នើម').length;
  
  const selectedClassName = filterClassId === 'all' 
    ? (classes.find(c => c.id === activeClassId)?.name || 'ថ្នាក់រៀន')
    : (classes.find(c => c.id === filterClassId)?.name || 'ថ្នាក់រៀន');
  const selectedClassCount = filteredStudents.filter(s => {
    const cid = s.classId || activeClassId;
    return filterClassId === 'all' ? cid === activeClassId : cid === filterClassId;
  }).length;

  // Score Tab Stats
  const totalScoresSum = filteredStudents.reduce((acc, s) => acc + (s.score || 0), 0);
  const averageScore = totalStudentsCount > 0 ? (totalScoresSum / totalStudentsCount).toFixed(1) : '0';
  const highestScore = filteredStudents.reduce((max, s) => Math.max(max, s.score || 0), 0);
  const topStudent = filteredStudents.find(s => (s.score || 0) === highestScore && highestScore > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 2 Major Tabs: ស្ថានភាពសិស្ស (Status) and ពិន្ទុសិស្ស (Scores) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        {/* Modern Water Droplet / Glass Sub-Tab Switcher */}
        <div className="p-1 rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-2xl inline-flex items-center select-none relative gap-1">
          {/* Sub-Tab 1: ស្ថានភាពសិស្ស */}
          <button
            type="button"
            onClick={() => setActiveSubTab('status')}
            className="relative px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer focus:outline-none"
          >
            {activeSubTab === 'status' && (
              <motion.div
                layoutId="activeStudentSubTabIndicator"
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
                <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2.5 pointer-events-none ${
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
                scale: activeSubTab === 'status' ? 1.05 : 1,
                y: activeSubTab === 'status' ? -0.5 : 0
              }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
              className="relative z-10 flex items-center gap-2"
            >
              <UserCheck className={`w-4 h-4 transition-all duration-300 ${
                activeSubTab === 'status'
                  ? isDarkMode ? 'text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-blue-600 scale-110 drop-shadow-xs'
                  : isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <span className={
                activeSubTab === 'status' 
                  ? isDarkMode 
                    ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                    : 'text-blue-600 font-extrabold tracking-wide' 
                  : 'font-bold text-slate-600 dark:text-slate-400'
              }>
                ស្ថានភាពសិស្ស
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black transition-colors ${
                activeSubTab === 'status'
                  ? isDarkMode 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-xs' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
              }`}>
                {students.length}
              </span>
            </motion.span>
          </button>

          {/* Sub-Tab 2: ពិន្ទុសិស្ស */}
          <button
            type="button"
            onClick={() => setActiveSubTab('score')}
            className="relative px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer focus:outline-none"
          >
            {activeSubTab === 'score' && (
              <motion.div
                layoutId="activeStudentSubTabIndicator"
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
                <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2.5 pointer-events-none ${
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
                scale: activeSubTab === 'score' ? 1.05 : 1,
                y: activeSubTab === 'score' ? -0.5 : 0
              }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
              className="relative z-10 flex items-center gap-2"
            >
              <Award className={`w-4 h-4 transition-all duration-300 ${
                activeSubTab === 'score'
                  ? isDarkMode ? 'text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-blue-600 scale-110 drop-shadow-xs'
                  : isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <span className={
                activeSubTab === 'score' 
                  ? isDarkMode 
                    ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                    : 'text-blue-600 font-extrabold tracking-wide' 
                  : 'font-bold text-slate-600 dark:text-slate-400'
              }>
                ពិន្ទុសិស្ស
              </span>
              {totalScoresSum > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black transition-colors ${
                  activeSubTab === 'score'
                    ? isDarkMode 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-xs' 
                      : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                    : isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-amber-50 text-amber-600'
                }`}>
                  {totalScoresSum} pts
                </span>
              )}
            </motion.span>
          </button>

          {/* Sub-Tab 3: វត្តមានសិស្ស */}
          <button
            type="button"
            onClick={() => setActiveSubTab('attendance')}
            className="relative px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer focus:outline-none"
          >
            {activeSubTab === 'attendance' && (
              <motion.div
                layoutId="activeStudentSubTabIndicator"
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
                <div className={`absolute top-0 inset-x-1 h-[48%] bg-gradient-to-b rounded-t-xl pointer-events-none ${
                  isDarkMode 
                    ? 'from-white/50 via-white/12 to-transparent' 
                    : 'from-white/95 via-white/40 to-transparent'
                }`} />
                <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2.5 pointer-events-none ${
                  isDarkMode
                    ? 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.3)_0%,_transparent_75%)]'
                    : 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.95)_0%,_transparent_75%)]'
                }`} />
                <div className={`absolute bottom-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
                  isDarkMode ? 'via-white/50' : 'via-white/90'
                }`} />
              </motion.div>
            )}

            <motion.span
              animate={{ 
                scale: activeSubTab === 'attendance' ? 1.05 : 1,
                y: activeSubTab === 'attendance' ? -0.5 : 0
              }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
              className="relative z-10 flex items-center gap-2"
            >
              <ClipboardList className={`w-4 h-4 transition-all duration-300 ${
                activeSubTab === 'attendance'
                  ? isDarkMode ? 'text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-blue-600 scale-110 drop-shadow-xs'
                  : isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <span className={
                activeSubTab === 'attendance' 
                  ? isDarkMode 
                    ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                    : 'text-blue-600 font-extrabold tracking-wide' 
                  : 'font-bold text-slate-600 dark:text-slate-400'
              }>
                វត្តមានសិស្ស
              </span>
            </motion.span>
          </button>
        </div>

        {/* Right Search & Class Filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះសិស្ស..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400 focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>

          {/* Grade Selector Dropdown */}
          <select
            value={filterClassId || activeClassId}
            onChange={(e) => {
              const val = e.target.value;
              setFilterClassId(val);
              if (onSwitchClass) {
                onSwitchClass(val);
              }
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ======================= TAB 1: ស្ថានភាពសិស្ស (STUDENT STATUS) ======================= */}
      {activeSubTab === 'status' && (
        <div className="space-y-6">
          {/* Button Actions Group Bar */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'
          } p-2.5 rounded-2xl border`}>
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setShowBulkForm(false);
                }}
                className="px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer border-none active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ បន្ថែមម្នាក់</span>
              </button>

              <button
                onClick={() => {
                  setShowBulkForm(!showBulkForm);
                  setShowAddForm(false);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer active:scale-95 ${
                  isDarkMode 
                    ? 'bg-indigo-950/40 text-indigo-300 border-indigo-900/50 hover:bg-indigo-900/60' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>+ បន្ថែមច្រើន (Bulk)</span>
              </button>

              {/* View, Copy, Paste, & Quick Edit All Students Button */}
              <button
                type="button"
                onClick={() => setShowQuickEditModal(true)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isDarkMode 
                    ? 'bg-purple-950/40 text-purple-300 border-purple-900/50 hover:bg-purple-900/60' 
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                }`}
                title="មើល ចម្លង (Copy) បិទភ្ជាប់ (Paste) និងកែសម្រួលឈ្មោះសិស្សទាំងអស់"
              >
                <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>មើល & កែឈ្មោះទាំងអស់</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
              {/* Khmer Alphabet Sort Indicator */}
              <div 
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-2xs ${
                  isDarkMode 
                    ? 'bg-slate-900/80 border-slate-800 text-indigo-400' 
                    : 'bg-indigo-50/70 border-indigo-100 text-indigo-700'
                }`}
                title="តម្រៀបឈ្មោះសិស្សតាមលំដាប់អក្សរ ក-អ ដេញពីជួរខាងឆ្វេង រួចទៅជួរខាងស្ដាំ"
              >
                <ArrowUpAZ className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>តម្រៀប៖ ក-អ (ជួរឆ្វេង រួច ស្ដាំ)</span>
              </div>

              {onClearStudents && students.length > 0 && (
                <button
                  onClick={onClearStudents}
                  title="លុបឈ្មោះសិស្សទាំងអស់ក្នុងថ្នាក់នេះ"
                  className={`px-3.5 py-2.5 border rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold ${
                    isDarkMode 
                      ? 'bg-red-950/30 border-red-900/40 text-red-400 hover:bg-red-900/50' 
                      : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>លុបទាំងអស់</span>
                </button>
              )}

              <button
                onClick={exportToExcel}
                title="ទាញយកបញ្ជីឈ្មោះ Excel"
                className={`p-2.5 border rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 ${
                  isDarkMode 
                    ? 'bg-[#1e293b] border-slate-800 text-emerald-400 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-emerald-600 hover:bg-slate-50'
                }`}
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form 1: Single Student Add Form */}
          {showAddForm && (
            <form 
              onSubmit={handleSingleSubmit}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg relative z-10 space-y-4 animate-in fade-in-50 duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  <span>បន្ថែមសិស្សម្នាក់</span>
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="flex flex-col gap-1 sm:col-span-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">ID សិស្ស</label>
                  <input
                    type="text"
                    placeholder="ឧ. 187770"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">ឈ្មោះសិស្ស</label>
                  <input
                    type="text"
                    required
                    placeholder="បញ្ចូលឈ្មោះសិស្ស..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">ភេទ</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as 'ប្រុស' | 'ស្រី')}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">ស្ថានភាព</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ឆ្នើម">ឆ្នើម (Outstanding)</option>
                    <option value="សកម្ម">សកម្ម (Active)</option>
                    <option value="កំពុងរីកចម្រើន">កំពុងរីកចម្រើន (Improving)</option>
                    <option value="គួរឲ្យបារម្ភ">គួរឲ្យបារម្ភ (Needs Attention)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          )}

          {/* Form 2: Bulk Add Form */}
          {showBulkForm && (
            <form 
              onSubmit={handleBulkSubmit}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg relative z-10 space-y-4 animate-in fade-in-50 duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-500" />
                  <span>បន្ថែមសិស្សច្រើននាក់ (Bulk Add)</span>
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowBulkForm(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  បិទភ្ជាប់ (Paste) ឈ្មោះសិស្ស (មួយជួរ មួយឈ្មោះ)៖
                </label>
                <textarea
                  rows={5}
                  value={bulkTextInput}
                  onChange={(e) => handleBulkTextChange(e.target.value)}
                  placeholder="សុខ រីបុល&#10;ចាន់ ថាវី&#10;កែវ សុផល..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {parsedStudents.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
                  <p className="text-[11px] font-bold text-slate-500">មើលលទ្ធផលមុនរក្សាទុក ({parsedStudents.length} នាក់)៖</p>
                  {parsedStudents.map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{idx + 1}. {st.name}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={st.gender}
                          onChange={(e) => handleUpdateParsedStudent(idx, { gender: e.target.value as any })}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        >
                          <option value="ប្រុស">ប្រុស</option>
                          <option value="ស្រី">ស្រី</option>
                        </select>
                        <select
                          value={st.status}
                          onChange={(e) => handleUpdateParsedStudent(idx, { status: e.target.value as any })}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        >
                          <option value="ឆ្នើម">ឆ្នើម</option>
                          <option value="សកម្ម">សកម្ម</option>
                          <option value="កំពុងរីកចម្រើន">កំពុងរីកចម្រើន</option>
                          <option value="គួរឲ្យបារម្ភ">គួរឲ្យបារម្ភ</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkForm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={parsedStudents.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  បញ្ចូល {parsedStudents.length} នាក់
                </button>
              </div>
            </form>
          )}

          {/* Student Cards Listing Directory Grid (Sorted ក-អ, left column then right column) */}
          {(() => {
            // Strictly sort by Khmer alphabet (ក-អ)
            const sortedAlphabetical = [...filteredStudents].sort((a, b) => 
              a.name.trim().localeCompare(b.name.trim(), 'km')
            );

            if (sortedAlphabetical.length === 0) {
              return (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                  <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2 opacity-50" />
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">គ្មានលទ្ធផលសិស្សស្របតាមការស្វែងរករបស់អ្នកឡើយ!</p>
                  <button
                    type="button"
                    onClick={() => setShowQuickEditModal(true)}
                    className="mt-3 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer mx-auto active:scale-95"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>មើល / បិទភ្ជាប់ឈ្មោះសិស្សទាំងអស់</span>
                  </button>
                </div>
              );
            }

            // Split into two balanced columns: ជួរខាងឆ្វេង (1 ដល់ ពាក់កណ្ដាល), ជួរខាងស្ដាំ (ពាក់កណ្ដាល+1 ដល់ ចប់)
            const halfCount = Math.ceil(sortedAlphabetical.length / 2);
            const leftColStudents = sortedAlphabetical.slice(0, halfCount);
            const rightColStudents = sortedAlphabetical.slice(halfCount);

            const renderStudentCard = (student: Student, displayIdx: number) => {
              const studentClass = classes.find(c => c.id === (student.classId || activeClassId))?.name || 'ថ្នាក់ទី៧ក';
              
              let statusPillColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40';
              const statusKey = student.status || 'សកម្ម';
              if (statusKey === 'ឆ្នើម') statusPillColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40';
              else if (statusKey === 'កំពុងរីកចម្រើន') statusPillColor = 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40';
              else if (statusKey === 'គួរឲ្យបារម្ភ') statusPillColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40';

              const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-pink-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
              const badgeBg = colors[student.name.charCodeAt(0) % colors.length];

              return (
                <div
                  key={student.id}
                  className={`border rounded-2xl p-4.5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group ${
                    isDarkMode 
                      ? 'bg-[#1e293b] border-slate-800 hover:border-slate-700' 
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar with image display and camera hover to edit profile */}
                    <div 
                      onClick={() => setProfileStudent(student)}
                      className="relative group/avatar cursor-pointer shrink-0"
                      title="ចុចដើម្បីដាក់រូបភាព & កែប្រែព័ត៌មាន Profile"
                    >
                      {student.avatarUrl ? (
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-full h-full object-cover select-none"
                          />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl ${badgeBg} flex items-center justify-center text-white text-base font-black select-none shadow-xs`}>
                          {getKhmerInitial(student.name)}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-2xl bg-black/45 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white shadow-xs">
                        <Camera className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Numerical Order Badge */}
                        <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/50 shrink-0">
                          {displayIdx}
                        </span>
                        <h3 
                          onClick={() => setProfileStudent(student)}
                          className={`font-extrabold text-sm leading-snug cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}
                          title="ចុចដើម្បីមើលព័ត៌មានលម្អិត"
                        >
                          {student.name}
                        </h3>
                        {student.studentId && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                            #{student.studentId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${
                          isDarkMode ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-500 bg-slate-50 border-slate-100'
                        }`}>
                          {studentClass}
                        </span>
                        <GenderBadgePicker
                          gender={student.gender || 'ប្រុស'}
                          compact={true}
                          onChange={(newGender) => {
                            if (onUpdateStudentDetail) {
                              onUpdateStudentDetail(student.id, { gender: newGender });
                            }
                          }}
                          isDarkMode={isDarkMode}
                        />
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusPillColor}`}>
                          {statusKey}
                        </span>
                        {student.phoneNumber && (
                          <span className="text-[10px] font-medium text-slate-400 hidden sm:inline-block">
                            📞 {student.phoneNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => setProfileStudent(student)}
                      className={`p-2 rounded-xl cursor-pointer transition-all ${
                        isDarkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="កែប្រែព័ត៌មាន & រូបភាព Profile"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveStudent(student.id)}
                      className={`p-2 rounded-xl cursor-pointer transition-all ${
                        isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title="លុបឈ្មោះសិស្ស"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            };

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* ជួរខាងឆ្វេង (Left column: 1 ដល់ halfCount) */}
                <div className="flex flex-col gap-4">
                  {leftColStudents.map((student, idx) => renderStudentCard(student, idx + 1))}
                </div>

                {/* ជួរខាងស្ដាំ (Right column: halfCount+1 ដល់ ចប់) */}
                <div className="flex flex-col gap-4">
                  {rightColStudents.map((student, idx) => renderStudentCard(student, halfCount + idx + 1))}
                </div>
              </div>
            );
          })()}

          {/* Bottom Status Statistics Cards Grid Bar */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>សិស្សសរុប</p>
                <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{totalStudentsCount}</h4>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? 'bg-indigo-950/45 text-indigo-400' : 'bg-indigo-50 text-indigo-500'
              }`}>
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>សិស្សស្រី</p>
                <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>{femaleCount}</h4>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? 'bg-pink-950/35 text-pink-400' : 'bg-pink-50 text-pink-500'
              }`}>
                <Users className="w-5 h-5 text-pink-500" />
              </div>
            </div>

            <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedClassName}</p>
                <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedClassCount}</h4>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? 'bg-emerald-950/35 text-emerald-400' : 'bg-emerald-50 text-emerald-500'
              }`}>
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className={`border p-4 rounded-2xl shadow-xs flex items-center justify-between ${
              isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ឆ្នើម (Outstanding)</p>
                <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{outstandingCount}</h4>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? 'bg-amber-950/35 text-yellow-500' : 'bg-amber-50 text-amber-500'
              }`}>
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 2: ពិន្ទុសិស្ស (STUDENT SCORES) ======================= */}
      {activeSubTab === 'score' && (
        <StudentScoreTable
          students={filteredStudents}
          classes={classes}
          activeClassId={activeClassId}
          isDarkMode={isDarkMode}
          onUpdateStudentDetail={onUpdateStudentDetail}
          currentSortMode={studentSortMode}
          onSortModeChange={handleSortModeChange}
        />
      )}

      {/* ======================= TAB 3: វត្តមានសិស្ស (STUDENT ATTENDANCE) ======================= */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6">
          {/* Header controls for date & batch mark */}
          <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">កត់ត្រា និងគ្រប់គ្រងវត្តមានសិស្ស</h3>
                <p className="text-[11px] text-slate-500">ជ្រើសរើសថ្ងៃខែ និងកត់ត្រាវត្តមានប្រចាំថ្ងៃរបស់សិស្សក្នុងថ្នាក់</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Quick Sort Switcher (តាម ID / តាម ឈ្មោះ ក-អ) */}
              <div className={`flex items-center gap-1 p-1 rounded-2xl border ${
                isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <span className="text-xs font-bold text-slate-400 pl-2 pr-1">តម្រៀប៖</span>
                <button
                  type="button"
                  onClick={() => handleSortModeChange('id')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                    studentSortMode === 'id'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title="តម្រៀបតាមលេខ ID សិស្ស (0-9 / A-Z) — រួមទាំងបញ្ជីពិន្ទុ និងវត្តមាន"
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>តាម ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSortModeChange('name')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                    studentSortMode === 'name'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title="តម្រៀបតាមឈ្មោះអក្ខរក្រមខ្មែរ (ក-អ) — រួមទាំងបញ្ជីពិន្ទុ និងវត្តមាន"
                >
                  <ArrowUpAZ className="w-3.5 h-3.5" />
                  <span>តាម ឈ្មោះ (ក-អ)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">កាលបរិច្ឆេទ៖</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleMarkAllAttendance('present')}
                  className="px-3 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs transition-all cursor-pointer border border-emerald-500/30 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>វត្តមានទាំងអស់</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAllAttendance('absent')}
                  className="px-3 py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-700 dark:text-red-400 font-bold text-xs transition-all cursor-pointer border border-red-500/30"
                >
                  អវត្តមានទាំងអស់
                </button>
                <button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ទាញយក Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Stats Summary Cards */}
          {(() => {
            const classStudents = filteredStudents;
            const total = classStudents.length;
            let presentCount = 0;
            let absentCount = 0;
            let permCount = 0;
            let lateCount = 0;

            classStudents.forEach(s => {
              const status = currentClassAttendance[s.id] || 'present';
              if (status === 'present') presentCount++;
              else if (status === 'absent') absentCount++;
              else if (status === 'permission') permCount++;
              else if (status === 'late') lateCount++;
            });

            // Auto-detect dropped count from notes (e.g. "ឈប់" or "បោះបង់")
            const autoDetectedDropped = classStudents.filter(
              s => s.notes && (s.notes.includes('ឈប់') || s.notes.includes('បោះបង់') || s.notes.includes('ឈប់រៀន'))
            ).length;

            const activeClassObj = classes.find(c => c.id === filterClassId);
            const classCountKey = `attendance_class_counts_${activeClassObj?.name?.trim() || activeClassObj?.id || 'default'}`;
            let storedDropped: number | undefined;
            try {
              const saved = localStorage.getItem(classCountKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.dropped === 'number') storedDropped = parsed.dropped;
              }
            } catch {}

            const effectiveDropped = typeof storedDropped === 'number' ? storedDropped : autoDetectedDropped;
            // សិស្សមករៀន៖ ដោយយកតាមលទ្ធផលបន្ទាប់ពីដកសិស្សច្បាប់ និងអវត្តមានចេញ (និងសិស្សឈប់)
            const combinedAbsentee = permCount + absentCount;
            const attendingCount = Math.max(0, total - effectiveDropped - combinedAbsentee);

            const handleDroppedChange = (newVal: number) => {
              const val = Math.max(0, isNaN(newVal) ? 0 : newVal);
              try {
                const existing = JSON.parse(localStorage.getItem(classCountKey) || '{}');
                existing.dropped = val;
                localStorage.setItem(classCountKey, JSON.stringify(existing));
                setDroppedUpdateTick(prev => prev + 1);
              } catch {}
            };

            return (
              <div className="space-y-4">
                {/* Clickable Attendance Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* 1. សិស្សសរុប */}
                  <div 
                    onClick={() => setAttendanceViewTab('all')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      attendanceViewTab === 'all' 
                        ? 'ring-2 ring-indigo-500 shadow-md' 
                        : 'hover:border-slate-400'
                    } ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}
                    title="ចុចដើម្បីមើលតារាងវត្តមានទាំងអស់"
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase">សិស្សសរុប</span>
                    <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{total} <span className="text-xs font-normal text-slate-400">នាក់</span></div>
                  </div>

                  {/* 2. សិស្សឈប់ (មានរបារកំណត់ចំនួនឈប់) */}
                  <div 
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDarkMode ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50/70 border-rose-200 shadow-xs'
                    }`}
                    title="របារកំណត់ចំនួនសិស្សឈប់រៀន"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">សិស្សឈប់</span>
                      <span className="text-[9px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md">កំណត់</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        min="0"
                        max={total}
                        value={effectiveDropped}
                        onChange={(e) => handleDroppedChange(parseInt(e.target.value, 10))}
                        className="w-14 px-1.5 py-0.5 rounded-lg border border-rose-300 dark:border-rose-800 font-black text-xl text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                        title="កំណត់ចំនួនសិស្សឈប់"
                      />
                      <span className="text-xs font-bold text-rose-500">នាក់</span>
                    </div>
                  </div>

                  {/* 3. សិស្សមករៀន (ដកសិស្សច្បាប់ និងអវត្តមានចេញ) */}
                  <div 
                    onClick={() => setAttendanceViewTab('all')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isDarkMode ? 'bg-emerald-950/25 border-emerald-800/60 hover:border-emerald-600' : 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 shadow-xs'
                    }`}
                    title="សិស្សមករៀន៖ ដោយយកតាមលទ្ធផលបន្ទាប់ពីដកសិស្សច្បាប់និងអវត្តមានចេញ"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">សិស្សមករៀន</span>
                      <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/60 px-1 py-0.5 rounded">ស្វ័យប្រវត្ត</span>
                    </div>
                    <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                      {attendingCount} <span className="text-xs font-normal text-emerald-600/70">នាក់</span>
                    </div>
                  </div>

                  {/* 4. អវត្តមាន (Absent) */}
                  <div 
                    onClick={() => setAttendanceViewTab('permission_absent')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      attendanceViewTab === 'permission_absent' || attendanceViewTab === 'absent' 
                        ? 'ring-2 ring-red-500 shadow-md' 
                        : 'hover:border-red-400'
                    } ${isDarkMode ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border-red-200'}`}
                    title="ចុចដើម្បីបើក Tap ច្បាប់ & អវត្តមាន"
                  >
                    <span className="text-[10px] font-bold text-red-600 uppercase">អវត្តមាន (Absent)</span>
                    <div className="text-2xl font-black mt-1 text-red-600">{absentCount} <span className="text-xs font-normal text-red-400">នាក់</span></div>
                  </div>

                  {/* 5. មានច្បាប់ (Permission) */}
                  <div 
                    onClick={() => setAttendanceViewTab('permission_absent')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      attendanceViewTab === 'permission_absent' || attendanceViewTab === 'permission' 
                        ? 'ring-2 ring-blue-500 shadow-md' 
                        : 'hover:border-blue-400'
                    } ${isDarkMode ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50 border-blue-200'}`}
                    title="ចុចដើម្បីបើក Tap ច្បាប់ & អវត្តមាន"
                  >
                    <span className="text-[10px] font-bold text-blue-600 uppercase">មានច្បាប់</span>
                    <div className="text-2xl font-black mt-1 text-blue-600">{permCount} <span className="text-xs font-normal text-blue-400">នាក់</span></div>
                  </div>

                  {/* 6. យឺតយ៉ាវ (Late) */}
                  <div 
                    onClick={() => setAttendanceViewTab('late')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      attendanceViewTab === 'late' 
                        ? 'ring-2 ring-amber-500 shadow-md' 
                        : 'hover:border-amber-400'
                    } ${isDarkMode ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border-amber-200'}`}
                    title="ចុចដើម្បីបើក Tap យឺត"
                  >
                    <span className="text-[10px] font-bold text-amber-600 uppercase">យឺតយ៉ាវ (Late)</span>
                    <div className="text-2xl font-black mt-1 text-amber-600">{lateCount} <span className="text-xs font-normal text-amber-400">នាក់</span></div>
                  </div>
                </div>

                {/* Sub-Tabs Bar: តារាងទាំងអស់ | Tap ច្បាប់ & អវត្តមាន | Tap យឺត | សង្ខេបរបាយការណ៍រួម */}
                <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 flex-wrap ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  {/* Tab 1: All */}
                  <button
                    type="button"
                    onClick={() => setAttendanceViewTab('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                      attendanceViewTab === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>តារាងវត្តមានទាំងអស់</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      attendanceViewTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {total}
                    </span>
                  </button>

                  {/* Tab 2: Combined Tap ច្បាប់ & អវត្តមាន (ច្បាប់លើ, អវត្តមានក្រោម, តាម ក-អ) */}
                  <button
                    type="button"
                    onClick={() => setAttendanceViewTab('permission_absent')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                      attendanceViewTab === 'permission_absent' || attendanceViewTab === 'absent' || attendanceViewTab === 'permission'
                        ? 'bg-gradient-to-r from-blue-600 to-red-600 text-white border-transparent shadow-md shadow-blue-600/25'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800'
                    }`}
                    title="មើលបញ្ជីសិស្សសុំច្បាប់ (ខាងលើ) និងអវត្តមាន (ខាងក្រោម) តម្រៀបតាម ក-អ"
                  >
                    <div className="flex items-center -space-x-1">
                      <FileText className="w-4 h-4 shrink-0 text-blue-300" />
                      <UserX className="w-4 h-4 shrink-0 text-red-300" />
                    </div>
                    <span>Tap ច្បាប់ & អវត្តមាន</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        attendanceViewTab === 'permission_absent' || attendanceViewTab === 'absent' || attendanceViewTab === 'permission'
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        ច្បាប់ {permCount}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        attendanceViewTab === 'permission_absent' || attendanceViewTab === 'absent' || attendanceViewTab === 'permission'
                          ? 'bg-white/20 text-white'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}>
                        អវត្ត {absentCount}
                      </span>
                    </div>
                  </button>

                  {/* Tab 3: Late */}
                  <button
                    type="button"
                    onClick={() => setAttendanceViewTab('late')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                      attendanceViewTab === 'late'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/25'
                        : 'border-transparent text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Tap យឺត</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      attendanceViewTab === 'late' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                    }`}>
                      {lateCount}
                    </span>
                  </button>

                  {/* Tab 4: Combined Summary Report */}
                  <button
                    type="button"
                    onClick={() => setAttendanceViewTab('summary')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border sm:ml-auto ${
                      attendanceViewTab === 'summary'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                        : 'border-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                    }`}
                    title="ចម្លងរបាយការណ៍សង្ខេប អវត្តមាន ច្បាប់ និងយឺត រួមគ្នាផ្ញើ Telegram"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>សង្ខេបរបាយការណ៍រួម</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      attendanceViewTab === 'summary' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {absentCount + lateCount + permCount}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Attendance Table or Category Views */}
          {attendanceViewTab === 'all' ? (
            <div className={`border rounded-3xl overflow-hidden shadow-sm ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="p-4 w-14 text-center">ល.រ</th>

                    {/* ID Column Sortable */}
                    <th 
                      onClick={() => handleSortModeChange(studentSortMode === 'id' ? 'name' : 'id')}
                      className="p-4 w-28 text-center cursor-pointer hover:bg-indigo-500/10 transition-colors select-none group"
                      title="ចុចដើម្បីតម្រៀបតាម ID (0-9 / A-Z) — ផ្លាស់ប្ដូរទាំងវត្តមាន និងពិន្ទុសិស្ស"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>ID សិស្ស</span>
                        <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${studentSortMode === 'id' ? 'text-indigo-500 font-black scale-110' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                      </div>
                    </th>

                    {/* Name Column Sortable */}
                    <th 
                      onClick={() => handleSortModeChange(studentSortMode === 'name' ? 'id' : 'name')}
                      className="p-4 cursor-pointer hover:bg-indigo-500/10 transition-colors select-none group"
                      title="ចុចដើម្បីតម្រៀបតាមអក្ខរក្រម (ក-អ) — ផ្លាស់ប្ដូរទាំងវត្តមាន និងពិន្ទុសិស្ស"
                    >
                      <div className="flex items-center gap-2">
                        <span>ឈ្មោះសិស្ស</span>
                        <span className="text-[10px] font-bold text-slate-400">(ក-អ)</span>
                        <ArrowUpAZ className={`w-3.5 h-3.5 transition-transform ${studentSortMode === 'name' ? 'text-indigo-500 font-black scale-110' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                      </div>
                    </th>

                    <th className="p-4 w-24 text-center">ភេទ</th>
                    <th className="p-4 text-center">ស្ថានភាពវត្តមានប្រចាំថ្ងៃ</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800 text-xs font-bold">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                        ពុំមានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const currentStatus = currentClassAttendance[student.id] || 'present';
                      const currentReason = currentClassReasons[student.id] || '';
                      return (
                        <tr key={student.id} className={`transition-colors ${
                          isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                        }`}>
                          <td className="p-4 text-center text-slate-400 font-mono font-bold">{index + 1}</td>
                          <td className="p-3 text-center">
                            <input
                              type="text"
                              value={student.studentId || ''}
                              placeholder={`${(index + 1).toString().padStart(3, '0')}`}
                              onChange={(e) => {
                                if (onUpdateStudentDetail) {
                                  onUpdateStudentDetail(student.id, { studentId: e.target.value });
                                }
                              }}
                              className="w-24 text-center py-1.5 px-2 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 rounded-xl font-mono font-black text-slate-800 dark:text-slate-100 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
                              title="កែប្រែ ID សិស្ស (បញ្ចូលតែម្ដង ភ្ជាប់ទាំងពិន្ទុ និងវត្តមាន)"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                                {student.avatarUrl ? (
                                  <img src={student.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                                ) : student.emoji ? (
                                  <span>{student.emoji}</span>
                                ) : (
                                  <span>{student.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <div className="font-extrabold text-sm">{student.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <GenderBadgePicker
                              gender={student.gender || 'ប្រុស'}
                              onChange={(newGender) => {
                                if (onUpdateStudentDetail) {
                                  onUpdateStudentDetail(student.id, { gender: newGender });
                                }
                              }}
                              isDarkMode={isDarkMode}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* រូបទី៣៖ ប៊ូតុងវត្តមានទាំង ៤ */}
                              <div className="flex items-center justify-center gap-1.5 shrink-0">
                                {[
                                  { id: 'present', label: 'វត្តមាន', color: 'emerald' },
                                  { id: 'permission', label: 'ច្បាប់', color: 'blue' },
                                  { id: 'late', label: 'យឺត', color: 'amber' },
                                  { id: 'absent', label: 'អវត្តមាន', color: 'red' },
                                ].map(st => {
                                  const isSelected = currentStatus === st.id;
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={() => handleSetStudentAttendance(student.id, st.id as any)}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                        isSelected
                                          ? st.id === 'present'
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                                            : st.id === 'permission'
                                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                              : st.id === 'late'
                                                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                                                : 'bg-red-600 text-white shadow-md shadow-red-600/25'
                                          : isDarkMode
                                            ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      <span>{st.label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* រូបទី១៖ ប្រអប់បញ្ចូលមូលហេតុ ដាក់នៅបន្ទាប់ពីរូបទី៣ */}
                              <div className="relative shrink-0">
                                <input
                                  type="text"
                                  value={currentReason}
                                  onChange={(e) => handleSetStudentReason(student.id, e.target.value)}
                                  placeholder="មូលហេតុ"
                                  className={`w-36 sm:w-44 py-1.5 pl-3 pr-7 rounded-xl text-xs font-semibold focus:outline-none transition-all border ${
                                    isDarkMode
                                      ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
                                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500 shadow-2xs'
                                  }`}
                                />
                                {currentReason && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetStudentReason(student.id, '')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer p-0.5"
                                    title="លុបហេតុផល"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <AttendanceCategoryViews
            students={filteredStudents}
            currentClassAttendance={currentClassAttendance}
            currentClassReasons={currentClassReasons}
            attendanceDate={attendanceDate}
            className={classes.find(c => c.id === (filterClassId === 'all' ? activeClassId : filterClassId))?.name || 'ថ្នាក់រៀន'}
            activeCategory={attendanceViewTab}
            onBackToAll={() => setAttendanceViewTab('all')}
            onSetAttendance={handleSetStudentAttendance}
            onSetReason={handleSetStudentReason}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    )}

      {/* Edit Student Modal Overlay (Common for both tabs) */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditingStudent(null)}
          />
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editName.trim() && onUpdateStudentDetail) {
                onUpdateStudentDetail(editingStudent.id, {
                  studentId: editStudentId.trim(),
                  name: editName.trim(),
                  gender: editGender,
                  status: editStatus,
                  classId: editClassId,
                  score: editScore
                });
                setEditingStudent(null);
              }
            }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative z-10 p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-500" />
                <span>កែប្រែព័ត៌មានសិស្ស</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* ID & Name field row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ID សិស្ស</label>
                  <input
                    type="text"
                    placeholder="001..."
                    value={editStudentId}
                    onChange={(e) => setEditStudentId(e.target.value)}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ឈ្មោះសិស្ស</label>
                  <input
                    type="text"
                    required
                    placeholder="សុខ រីបុល..."
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 w-full"
                  />
                </div>
              </div>

              {/* Gender & Score field row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ភេទ</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as 'ប្រុស' | 'ស្រី')}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none focus:border-indigo-500 w-full"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ពិន្ទុ (Points)</label>
                  <input
                    type="number"
                    min="0"
                    value={editScore}
                    onChange={(e) => setEditScore(Math.max(0, parseInt(e.target.value) || 0))}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold focus:outline-none focus:border-indigo-500 w-full"
                  />
                </div>
              </div>

              {/* Status field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ស្ថានភាព / កម្រិត</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none focus:border-indigo-500 w-full"
                >
                  <option value="ឆ្នើម">ឆ្នើម (Outstanding)</option>
                  <option value="សកម្ម">សកម្ម (Active)</option>
                  <option value="កំពុងរីកចម្រើន">កំពុងរីកចម្រើន (Improving)</option>
                  <option value="គួរឲ្យបារម្ភ">គួរឲ្យបារម្ភ (Needs Attention)</option>
                </select>
              </div>

              {/* Class field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ថ្នាក់</label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none focus:border-indigo-500 w-full"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pb-1 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                រក្សាទុក
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick View, Edit, Copy & Paste Modal */}
      <StudentQuickEditModal
        isOpen={showQuickEditModal}
        onClose={() => setShowQuickEditModal(false)}
        students={students}
        className={classes.find(c => c.id === (filterClassId === 'all' ? activeClassId : filterClassId))?.name || 'ថ្នាក់រៀន'}
        isDarkMode={isDarkMode}
        onSave={async (names, mode) => {
          const targetId = filterClassId === 'all' ? activeClassId : filterClassId;
          if (onBatchSyncStudents) {
            await onBatchSyncStudents(names, mode, targetId);
          } else {
            onBulkAddStudents(names.map(n => ({ name: n, gender: 'ប្រុស', status: 'សកម្ម' })), targetId);
          }
        }}
      />

      {/* Full Student Profile & Avatar Image Modal */}
      <StudentProfileModal
        isOpen={!!profileStudent}
        onClose={() => setProfileStudent(null)}
        student={profileStudent}
        classes={classes}
        activeClassId={filterClassId === 'all' ? activeClassId : filterClassId}
        isDarkMode={isDarkMode}
        onSaveStudent={async (id, updatedFields) => {
          if (onUpdateStudentDetail) {
            await onUpdateStudentDetail(id, updatedFields);
          }
          setProfileStudent(prev => (prev && prev.id === id ? { ...prev, ...updatedFields } : null));
        }}
        onDeleteStudent={(id) => {
          onRemoveStudent(id);
          setProfileStudent(null);
        }}
      />
    </div>
  );
}
