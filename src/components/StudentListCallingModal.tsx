import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  CheckCircle2, 
  Circle, 
  UserCheck, 
  RotateCcw,
  Sparkles,
  Check,
  Compass,
  Users,
  Star,
  Plus,
  Edit2
} from 'lucide-react';
import { Student } from '../types';
import { getCurrentDateScoreSlot, getStudentCurrentWeekActivityScore } from '../lib/scoreUtils';

interface StudentListCallingModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  pickedIds: string[];
  manualCalledIds: string[];
  onToggleManualCall: (studentId: string) => void;
  onAwardActivityPoints?: (studentId: string, points: number) => void;
  onSetExactActivityScore?: (studentId: string, exactScore: number) => void;
  onResetCalls?: () => void;
  onResetAllCalls?: () => void;
  className?: string;
  isDarkMode?: boolean;
}

export const StudentListCallingModal: React.FC<StudentListCallingModalProps> = ({
  isOpen,
  onClose,
  students,
  pickedIds,
  manualCalledIds,
  onToggleManualCall,
  onAwardActivityPoints,
  onSetExactActivityScore,
  onResetCalls,
  onResetAllCalls,
  className = 'ថ្នាក់រៀន',
  isDarkMode = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'uncalled' | 'called' | 'teacher_called'>('all');
  const [editingScoreStudentId, setEditingScoreStudentId] = useState<string | null>(null);
  const [tempScoreInput, setTempScoreInput] = useState<string>('');
  const [recentlyAwardedStudentId, setRecentlyAwardedStudentId] = useState<string | null>(null);

  const dateSlot = useMemo(() => getCurrentDateScoreSlot(), []);

  const pickedSet = useMemo(() => new Set(pickedIds), [pickedIds]);
  const manualCalledSet = useMemo(() => new Set(manualCalledIds), [manualCalledIds]);

  // Statistics
  const totalStudents = students.length;
  const wheelCalledCount = useMemo(() => {
    return students.filter(s => pickedSet.has(s.id) && !manualCalledSet.has(s.id)).length;
  }, [students, pickedSet, manualCalledSet]);

  const teacherCalledCount = useMemo(() => {
    return students.filter(s => manualCalledSet.has(s.id)).length;
  }, [students, manualCalledSet]);

  const allCalledCount = useMemo(() => {
    return students.filter(s => pickedSet.has(s.id) || manualCalledSet.has(s.id)).length;
  }, [students, pickedSet, manualCalledSet]);

  const uncalledCount = Math.max(0, totalStudents - allCalledCount);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        s.name.toLowerCase().includes(q) || 
        (s.studentId && s.studentId.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const isManual = manualCalledSet.has(s.id);
      const isWheel = pickedSet.has(s.id);
      const isAnyCalled = isManual || isWheel;

      if (filterTab === 'uncalled') return !isAnyCalled;
      if (filterTab === 'called') return isAnyCalled;
      if (filterTab === 'teacher_called') return isManual;
      return true;
    });
  }, [students, searchQuery, filterTab, pickedSet, manualCalledSet]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="student-list-calling-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
            isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-white/90'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>បញ្ជីឈ្មោះសិស្សទាំងអស់ ({totalStudents})</span>
                  {className && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {className}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ពិនិត្យមើលស្ថានភាពហៅឈ្មោះ និងជ្រើសរើស «គ្រូហៅផ្ទាល់» ដើម្បីលើកលែងពីការបង្វិល
                </p>
              </div>
            </div>

            <button
              id="close-student-list-calling-modal"
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="បិទផ្ទាំង"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metrics summary chips */}
          <div className={`px-4 sm:px-5 py-3 border-b flex items-center gap-2 overflow-x-auto text-xs font-bold shrink-0 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
          }`}>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <span>ទាំងអស់</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 dark:bg-white/20">
                {totalStudents}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('uncalled')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                filterTab === 'uncalled'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>មិនទាន់ហៅ</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                {uncalledCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('called')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                filterTab === 'called'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ហៅរួច</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                {allCalledCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('teacher_called')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                filterTab === 'teacher_called'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40 hover:bg-purple-50 dark:hover:bg-purple-950/40'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>គ្រូហៅផ្ទាល់</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300">
                {teacherCalledCount}
              </span>
            </button>

            {onResetCalls && (allCalledCount > 0) && (
              <button
                type="button"
                onClick={onResetCalls}
                className="ml-auto px-2.5 py-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                title="កំណត់ការហៅឈ្មោះទាំងអស់ឡើងវិញ"
              >
                <RotateCcw className="w-3 h-3" />
                <span>កំណត់ឡើងវិញ</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="p-3 sm:p-4 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខសិស្ស..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                  isDarkMode 
                    ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  សម្អាត
                </button>
              )}
            </div>
          </div>

          {/* Student items list */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-2 space-y-2 custom-scrollbar">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs sm:text-sm font-semibold">មិនមានសិស្សតាមលក្ខខណ្ឌស្វែងរកនេះទេ</p>
              </div>
            ) : (
              filteredStudents.map((student, index) => {
                const isManual = manualCalledSet.has(student.id);
                const isWheel = pickedSet.has(student.id);
                const isCalled = isManual || isWheel;

                return (
                  <div
                    key={student.id}
                    id={`student-calling-row-${student.id}`}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
                      isManual
                        ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50'
                        : isWheel
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                          : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Avatar & Name */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                        {index + 1}
                      </span>

                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 overflow-hidden ${
                        isManual 
                          ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                          : isWheel
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}>
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-full h-full object-cover select-none"
                          />
                        ) : (
                          student.emoji || student.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-bold text-xs sm:text-sm truncate ${
                            isCalled 
                              ? 'text-slate-800 dark:text-slate-100' 
                              : 'text-slate-900 dark:text-white'
                          }`}>
                            {student.name}
                          </p>

                          {student.gender && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                              student.gender === 'ស្រី'
                                ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}>
                              {student.gender}
                            </span>
                          )}
                        </div>

                        {student.studentId && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            ID: {student.studentId}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Score Entry Tap (មុខ tap មិនទាន់ហៅ), Status badge & "គ្រូហៅផ្ទាល់" toggle button */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {/* កូន tap តូចមួយសម្រាប់គ្រូបញ្ចូលពិន្ទុ (Activity score for current date week) */}
                      {(() => {
                        const { activityScore } = getStudentCurrentWeekActivityScore(student);
                        const isEditing = editingScoreStudentId === student.id;
                        const isRecentlyAwarded = recentlyAwardedStudentId === student.id;

                        if (isEditing) {
                          return (
                            <div 
                              id={`score-editor-${student.id}`}
                              className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-1 rounded-xl shadow-xs"
                            >
                              <input
                                type="number"
                                min="0"
                                max="100"
                                autoFocus
                                value={tempScoreInput}
                                onChange={(e) => setTempScoreInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = Math.max(0, parseFloat(tempScoreInput) || 0);
                                    if (onSetExactActivityScore) {
                                      onSetExactActivityScore(student.id, val);
                                    } else if (onAwardActivityPoints) {
                                      onAwardActivityPoints(student.id, val - activityScore);
                                    }
                                    setEditingScoreStudentId(null);
                                    setRecentlyAwardedStudentId(student.id);
                                    setTimeout(() => setRecentlyAwardedStudentId(null), 1500);
                                  } else if (e.key === 'Escape') {
                                    setEditingScoreStudentId(null);
                                  }
                                }}
                                className="w-12 px-1.5 py-0.5 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-amber-400 rounded-lg text-amber-900 dark:text-amber-200 focus:outline-hidden"
                                placeholder="ពិន្ទុ"
                              />

                              {/* Quick +5 button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const currentVal = parseFloat(tempScoreInput) || activityScore || 0;
                                  setTempScoreInput(String(currentVal + 5));
                                }}
                                className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md cursor-pointer"
                                title="បន្ថែម 5 ពិន្ទុ"
                              >
                                +5
                              </button>

                              {/* Save button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const val = Math.max(0, parseFloat(tempScoreInput) || 0);
                                  if (onSetExactActivityScore) {
                                    onSetExactActivityScore(student.id, val);
                                  } else if (onAwardActivityPoints) {
                                    onAwardActivityPoints(student.id, val - activityScore);
                                  }
                                  setEditingScoreStudentId(null);
                                  setRecentlyAwardedStudentId(student.id);
                                  setTimeout(() => setRecentlyAwardedStudentId(null), 1500);
                                }}
                                className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs cursor-pointer"
                                title="រក្សាទុកពិន្ទុ"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>

                              {/* Cancel button */}
                              <button
                                type="button"
                                onClick={() => setEditingScoreStudentId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg text-xs cursor-pointer"
                                title="បោះបង់"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1">
                            {/* Tap បង្ហាញ & កែប្រែពិន្ទុ */}
                            <button
                              type="button"
                              id={`score-tap-${student.id}`}
                              onClick={() => {
                                setEditingScoreStudentId(student.id);
                                setTempScoreInput(String(activityScore || ''));
                              }}
                              className={`px-2 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border shadow-2xs ${
                                isRecentlyAwarded
                                  ? 'bg-amber-400 text-slate-950 border-amber-500 scale-105 animate-pulse'
                                  : activityScore > 0
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-300'
                              }`}
                              title={`ពិន្ទុសកម្មភាព (${dateSlot.weekLabel} ខែ${dateSlot.month})៖ ${activityScore} ពិន្ទុ។ ចុចដើម្បីកែប្រែ ឬបញ្ចូលពិន្ទុ`}
                            >
                              <Star className={`w-3.5 h-3.5 ${activityScore > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                              <span className="whitespace-nowrap">
                                {activityScore > 0 ? `${activityScore} ពិន្ទុ` : '+ពិន្ទុ'}
                              </span>
                            </button>

                            {/* កូនប៊ូតុង +5 រហ័ស */}
                            <button
                              type="button"
                              id={`quick-plus-5-${student.id}`}
                              onClick={() => {
                                if (onAwardActivityPoints) {
                                  onAwardActivityPoints(student.id, 5);
                                }
                                setRecentlyAwardedStudentId(student.id);
                                setTimeout(() => setRecentlyAwardedStudentId(null), 1500);
                              }}
                              className="px-1.5 py-1 rounded-lg text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
                              title={`ចុចដើម្បីបន្ថែម 5 ពិន្ទុ (សកម្មភាព ${dateSlot.weekLabel} ខែ${dateSlot.month})`}
                            >
                              +5
                            </button>
                          </div>
                        );
                      })()}

                      {/* Status badge: ហៅរួច or មិនទាន់ហៅ */}
                      {isCalled ? (
                        <div className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-2xs ${
                          isManual
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="whitespace-nowrap">
                            {isManual ? 'ហៅរួច (គ្រូ)' : 'ហៅរួច (កង)'}
                          </span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                          <Circle className="w-3 h-3 text-slate-400" />
                          <span className="whitespace-nowrap">មិនទាន់ហៅ</span>
                        </div>
                      )}

                      {/* "គ្រូហៅផ្ទាល់" Toggle Tap */}
                      <button
                        type="button"
                        id={`btn-manual-call-${student.id}`}
                        onClick={() => onToggleManualCall(student.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shadow-2xs ${
                          isManual
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-300'
                        }`}
                        title={isManual ? 'ចុចដើម្បីដកការហៅផ្ទាល់ចេញ' : 'ចុចដើម្បីកំណត់ថាគ្រូបានហៅផ្ទាល់ (បន្ថែម ៥ ពិន្ទុសកម្មភាពស្វ័យប្រវត្តិ)'}
                      >
                        <UserCheck className={`w-3.5 h-3.5 ${isManual ? 'text-white' : 'text-purple-500'}`} />
                        <span>{isManual ? 'គ្រូបានហៅ (+៥)' : 'គ្រូហៅផ្ទាល់ (+៥)'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note & Close button */}
          <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs ${
            isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/90'
          }`}>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>សិស្សដែល <strong>ហៅរួច</strong> ឬ <strong>គ្រូហៅផ្ទាល់</strong> នឹងត្រូវលើកលែងដោយស្វ័យប្រវត្តពីកងបង្វិល</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer text-center"
            >
              យល់ព្រម
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default StudentListCallingModal;
