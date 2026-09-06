import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, FileSpreadsheet, Download, Upload, UserPlus, Users, Trash2, 
  Award, ShieldAlert, Sparkles, TrendingUp, HelpCircle, Pencil, ClipboardList,
  UserCheck, Trophy, Medal, Star, Flame, ArrowUpDown, RotateCcw, CheckCircle2, ChevronUp, ChevronDown
} from 'lucide-react';
import { Student, ClassInfo } from '../types';
import * as XLSX from 'xlsx';
import { StudentQuickEditModal } from './StudentQuickEditModal';
import { StudentScoreTable } from './StudentScoreTable';

interface StudentManagerProps {
  students: Student[];
  classes: ClassInfo[];
  activeClassId: string;
  isDarkMode?: boolean;
  onAddStudentDetail: (fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string }) => void;
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
  // Main Sub-Tab: 'status' (ស្ថានភាពសិស្ស) vs 'score' (ពិន្ទុសិស្ស)
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'score'>('status');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>(activeClassId || 'all');
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  
  // Single student form toggle & states
  const [showAddForm, setShowAddForm] = useState(false);
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
        name: newName.trim(),
        gender: newGender,
        status: newStatus,
        classId: newClassId
      });
      // Reset
      setNewName('');
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

  // Filter logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClassId === 'all' || (student.classId || activeClassId) === filterClassId;
    if (!matchesSearch || !matchesClass) return false;

    if (activeSubTab === 'score') {
      const score = student.score || 0;
      if (scoreFilterTier === 'hasScore' && score <= 0) return false;
      if (scoreFilterTier === 'noScore' && score > 0) return false;
    }

    return true;
  });

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
        {/* Modern Segmented Sub-Tab Switcher */}
        <div className={`inline-flex items-center p-1.5 rounded-2xl border ${
          isDarkMode 
            ? 'bg-slate-900/90 border-slate-800 shadow-inner' 
            : 'bg-slate-100 border-slate-200/80 shadow-xs'
        }`}>
          <button
            type="button"
            onClick={() => setActiveSubTab('status')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeSubTab === 'status'
                ? isDarkMode 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black' 
                  : 'bg-white text-indigo-600 shadow-sm font-black'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>ស្ថានភាពសិស្ស</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeSubTab === 'status'
                ? isDarkMode ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-50 text-indigo-700'
                : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
            }`}>
              {students.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('score')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeSubTab === 'score'
                ? isDarkMode 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black' 
                  : 'bg-white text-indigo-600 shadow-sm font-black'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>ពិន្ទុសិស្ស</span>
            {totalScoresSum > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'score'
                  ? isDarkMode ? 'bg-amber-600 text-amber-100' : 'bg-amber-100 text-amber-800'
                  : isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-amber-50 text-amber-600'
              }`}>
                {totalScoresSum} pts
              </span>
            )}
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

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

          {/* Student Cards Listing Directory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
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
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl ${badgeBg} flex items-center justify-center text-white text-base font-black select-none shadow-xs shrink-0`}>
                        {getKhmerInitial(student.name)}
                      </div>
                      <div>
                        <h3 className={`font-extrabold text-sm leading-snug ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {student.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${
                            isDarkMode ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-500 bg-slate-50 border-slate-100'
                          }`}>
                            {studentClass}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            student.gender === 'ស្រី' 
                              ? isDarkMode ? 'bg-pink-950/40 text-pink-300' : 'bg-pink-50 text-pink-700'
                              : isDarkMode ? 'bg-blue-950/40 text-blue-300' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {student.gender || 'ប្រុស'}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusPillColor}`}>
                            {statusKey}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingStudent(student);
                          setEditStudentId(student.studentId || '');
                          setEditName(student.name);
                          setEditGender(student.gender || 'ប្រុស');
                          setEditStatus(student.status || 'សកម្ម');
                          setEditClassId(student.classId || activeClassId);
                          setEditScore(student.score || 0);
                        }}
                        className={`p-2 rounded-xl cursor-pointer transition-all ${
                          isDarkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title="កែប្រែព័ត៌មាន"
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
              })
            ) : (
              <div className="col-span-full py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
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
            )}
          </div>

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
        />
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
    </div>
  );
}
