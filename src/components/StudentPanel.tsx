import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, RotateCw, Trophy, Trash2, Users, FileSpreadsheet, ClipboardList, Star } from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { Student } from '../types';
import { StudentQuickEditModal } from './StudentQuickEditModal';
import StudentListCallingModal from './StudentListCallingModal';
import { getCurrentDateScoreSlot, getStudentCurrentWeekActivityScore } from '../lib/scoreUtils';
import { playTickSound, playWinnerSound } from '../lib/soundUtils';

interface StudentPanelProps {
  students: Student[];
  pickedIds: string[];
  manualCalledIds?: string[];
  onSetPickedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onToggleManualCall?: (studentId: string) => void;
  onAwardActivityPoints?: (studentId: string, points: number) => void;
  onSetExactActivityScore?: (studentId: string, exactScore: number) => void;
  onAddStudent: (name: string) => void;
  onRemoveStudent: (id: string) => void;
  onClearStudents: () => void;
  onSelectStudent: (student: Student) => void;
  selectedStudent: Student | null;
  isDarkMode?: boolean;
  activeClassName?: string;
  onBatchSyncStudents?: (names: string[], mode: 'replace' | 'append') => void | Promise<void>;
}

export default function StudentPanel({ 
  students, 
  pickedIds,
  manualCalledIds = [],
  onSetPickedIds,
  onToggleManualCall,
  onAwardActivityPoints,
  onSetExactActivityScore,
  onAddStudent, 
  onRemoveStudent, 
  onClearStudents,
  onSelectStudent,
  selectedStudent,
  isDarkMode = false,
  activeClassName = 'ថ្នាក់រៀន',
  onBatchSyncStudents
}: StudentPanelProps) {
  const [newName, setNewName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [showStudentListModal, setShowStudentListModal] = useState(false);

  // Reset picked list if students are cleared from external source
  useEffect(() => {
    if (students.length === 0) {
      onSetPickedIds([]);
    }
  }, [students.length, onSetPickedIds]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddStudent(newName.trim());
      setNewName('');
    }
  };

  const handleBulkAdd = (text: string) => {
    const names = text.split('\n').filter(n => n.trim());
    names.forEach(name => onAddStudent(name.trim()));
    setBulkText('');
    setShowBulkInput(false);
  };

  const exportToExcel = () => {
    if (students.length === 0) return;
    
    // Prepare data
    const data = students.map(s => ({
      'ឈ្មោះសិស្ស': s.name,
      'ពិន្ទុសរុប': s.score
    }));

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 15 }  // Score
    ];

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ពិន្ទុសិស្ស");

    // Write file
    XLSX.writeFile(wb, `ពិន្ទុសិស្ស_${new Date().toLocaleDateString()}.xlsx`);
  };

  const spin = () => {
    if (students.length === 0 || isSpinning) return;

    setIsSpinning(true);
    let count = 0;
    
    // Filter out already picked students and teacher manually called students
    let availableStudents = students.filter(s => !pickedIds.includes(s.id) && !manualCalledIds.includes(s.id));
    
    // If everyone has been picked, reset the pool (excluding manualCalledIds if possible)
    if (availableStudents.length === 0) {
      const notManuallyCalled = students.filter(s => !manualCalledIds.includes(s.id));
      if (notManuallyCalled.length > 0) {
        availableStudents = notManuallyCalled;
      } else {
        availableStudents = [...students];
      }
      onSetPickedIds([]);
    }

    const interval = setInterval(() => {
      const displayIndex = Math.floor(Math.random() * students.length);
      onSelectStudent(students[displayIndex]);
      playTickSound();

      count++;
      
      if (count > 20) {
        clearInterval(interval);
        
        // Final selection from available pool
        const finalSelection = availableStudents[Math.floor(Math.random() * availableStudents.length)];
        onSelectStudent(finalSelection);
        onSetPickedIds(prev => {
          if (prev.includes(finalSelection.id)) return prev;
          return [...prev, finalSelection.id];
        });
        setIsSpinning(false);

        // Play celebration audio on final selection
        playWinnerSound();

        // Fire continuous high-intensity fireworks confetti sequence (lasts for 2.5 seconds)
        const duration = 2.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 35, spread: 360, ticks: 75, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const intervalId = setInterval(() => {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) {
            return clearInterval(intervalId);
          }
          const particleCount = 60 * (timeLeft / duration);
          // Shoot multi-angle beautiful color firecracker explosions
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.12, 0.3), y: Math.random() - 0.25 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.88), y: Math.random() - 0.25 } });
        }, 250);
      }
    }, 100);
  };

  return (
    <div className={`flex flex-col h-full border-r p-6 overflow-hidden transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[#222222] border-[#333333] text-white' 
        : 'bg-white border-[#e2e8f0] text-slate-800'
    }`}>
      <div className="flex flex-col mb-6 gap-2">
        <h2 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${
          isDarkMode 
            ? 'from-indigo-400 to-cyan-400' 
            : 'from-indigo-600 to-blue-600'
        }`}>
          បញ្ជីឈ្មោះសិស្ស ({students.length})
        </h2>
        <div className="flex items-center justify-end gap-1.5 overflow-x-auto custom-scrollbar-hide flex-wrap">
          {/* កូន tap សម្រាប់ចុចចូលមើលឈ្មោះសិស្សទាំងអស់ ស្ថានភាព និងគ្រូហៅផ្ទាល់ */}
          <button 
            type="button"
            onClick={() => setShowStudentListModal(true)}
            className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 px-2.5 py-1.5 rounded-full transition-all shadow-xs border border-indigo-200 dark:border-indigo-800/60 cursor-pointer active:scale-95"
            title="មើលបញ្ជីឈ្មោះសិស្សទាំងអស់ បង្ហាញប្រាប់ ហៅរួច / មិនទាន់ហៅ និងគ្រូហៅផ្ទាល់"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>បញ្ជីសិស្ស & ហៅ</span>
            {manualCalledIds.length > 0 && (
              <span className="px-1 py-0.2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full text-[9px] font-black">
                {manualCalledIds.length}
              </span>
            )}
          </button>

          {/* Quick View / Edit / Copy / Paste All button */}
          <button 
            type="button"
            onClick={() => setShowQuickEditModal(true)}
            className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-full transition-all shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
            title="មើល ចម្លង (Copy) បិទភ្ជាប់ (Paste) និងកែសម្រួលឈ្មោះសិស្សទាំងអស់"
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>កែសម្រួល</span>
          </button>

          {students.length > 0 && (
            <button 
              onClick={exportToExcel}
              className="shrink-0 group flex items-center gap-1.5 text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40 px-2.5 py-1.5 rounded-full uppercase transition-all shadow-sm border border-green-100 dark:border-green-900/30 cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3" />
              Excel
            </button>
          )}
          <button 
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 px-2.5 py-1.5 rounded-full uppercase transition-all shadow-sm border border-indigo-100 dark:border-indigo-900/30 cursor-pointer"
          >
            + បន្ថែមច្រើន
          </button>
          {students.length > 0 && (
            <button 
              onClick={onClearStudents}
              className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-full uppercase transition-all shadow-sm border border-red-100 dark:border-red-900/30 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              លុបទាំងអស់
            </button>
          )}
        </div>
        <div className="flex justify-end">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
            isDarkMode ? 'text-slate-300 bg-slate-800' : 'text-slate-500 bg-slate-100'
          }`}>
            នៅសល់ {students.length - pickedIds.length} នាក់
          </span>
        </div>
      </div>

      {/* Bulk Input Overlay */}
      <AnimatePresence>
        {showBulkInput && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-950/30 rounded-2xl p-4 shadow-inner">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">បញ្ចូលឈ្មោះច្រើន (មួយជួរ ឈ្មោះមួយ)</p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full h-32 p-3 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                placeholder="ឈ្មោះសិស្ស ១&#10;ឈ្មោះសិស្ស ២..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleBulkAdd(bulkText);
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setBulkText('');
                    setShowBulkInput(false);
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAdd(bulkText)}
                  className="px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-700 cursor-pointer transition-colors"
                >
                  បញ្ចូល
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Student Banner / Randomizer Button Container */}
      <div className="mb-8 space-y-4">
        <motion.button
          onClick={spin}
          disabled={isSpinning || students.length === 0}
          animate={{
            y: isSpinning ? 0 : [0, -10, 0],
          }}
          transition={{
            y: {
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }
          }}
          className="w-full py-5 bg-yellow-400 text-slate-900 rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-yellow-300 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
          <RotateCw className={`w-6 h-6 ${isSpinning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isSpinning ? 'កំពុងបង្វិល...' : 'បង្វិលរកសិស្ស'}
        </motion.button>

        <AnimatePresence mode="wait">
          {selectedStudent && (
            <motion.div
              key={selectedStudent.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`text-center p-5 rounded-2xl mb-4 shadow-lg border-2 ${
                isDarkMode 
                  ? 'bg-slate-800/80 border-yellow-500/30' 
                  : 'bg-yellow-50 border-yellow-400'
              } ${isSpinning ? 'animate-pulse' : ''}`}
            >
              <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>អ្នកដែលត្រូវឆ្លើយគឺ</p>
              <h3 className={`text-3xl font-black truncate px-2 mb-1 flex items-center justify-center gap-2 ${
                isDarkMode ? 'text-yellow-400' : 'text-red-600'
              }`}>
                {selectedStudent.avatarUrl ? (
                  <img
                    src={selectedStudent.avatarUrl}
                    alt={selectedStudent.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 shadow-md inline-block select-none"
                  />
                ) : (
                  <span className="text-4xl">{selectedStudent.emoji}</span>
                )}
                <span>{selectedStudent.name}</span>
              </h3>
              <div className={`flex items-center justify-center gap-1.5 font-bold text-xs ${
                isDarkMode ? 'text-slate-300' : 'text-red-700/60'
              }`}>
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>ទទួលបាន {selectedStudent.score} ពិន្ទុ</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4 custom-scrollbar">
        {students.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-semibold">សូមបន្ថែមឈ្មោះសិស្សដើម្បីចាប់ផ្ដើម!</p>
            <button
              type="button"
              onClick={() => setShowQuickEditModal(true)}
              className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer mx-auto active:scale-95"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>បញ្ចូល ឬ បិទភ្ជាប់ឈ្មោះទាំងអស់</span>
            </button>
          </div>
        ) : (
          students.map((student) => (
            <motion.div
              layout
              key={student.id}
              className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                selectedStudent?.id === student.id 
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 shadow-sm ring-2 ring-indigo-200 dark:ring-indigo-900' 
                  : manualCalledIds.includes(student.id)
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                    : pickedIds.includes(student.id)
                      ? 'bg-slate-50 dark:bg-[#1f1f1f] border-slate-100 dark:border-[#333333] opacity-40 grayscale'
                      : 'bg-white dark:bg-[#2a2a2a] border-[#e2e8f0] dark:border-[#383838] hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl font-bold transition-transform group-hover:scale-110 overflow-hidden shrink-0 ${
                   selectedStudent?.id === student.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
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
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold leading-none ${selectedStudent?.id === student.id ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>{student.name}</p>
                    {manualCalledIds.includes(student.id) ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded">
                        គ្រូហៅ
                      </span>
                    ) : pickedIds.includes(student.id) && !isSpinning && selectedStudent?.id !== student.id ? (
                      <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{student.score} ពិន្ទុ</p>
                    {(() => {
                      const { activityScore } = getStudentCurrentWeekActivityScore(student);
                      if (activityScore <= 0) return null;
                      return (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          សកម្មភាព: {activityScore}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onAwardActivityPoints && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAwardActivityPoints(student.id, 5);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-all cursor-pointer shadow-2xs"
                    title="បន្ថែម 5 ពិន្ទុ (សកម្មភាព)"
                  >
                    +5
                  </button>
                )}
                <button 
                  onClick={() => onRemoveStudent(student.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-[#333333]">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="បញ្ចូលឈ្មោះសិស្ស..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Quick View, Edit, Copy & Paste Modal */}
      <StudentQuickEditModal
        isOpen={showQuickEditModal}
        onClose={() => setShowQuickEditModal(false)}
        students={students}
        className={activeClassName}
        isDarkMode={isDarkMode}
        onSave={async (names, mode) => {
          if (onBatchSyncStudents) {
            await onBatchSyncStudents(names, mode);
          } else {
            names.forEach(n => onAddStudent(n));
          }
        }}
      />

      {/* កូន tap ផ្ទាំង Modal បង្ហាញបញ្ជីឈ្មោះសិស្សទាំងអស់ ស្ថានភាព និងប៊ូតុងគ្រូហៅផ្ទាល់ */}
      <StudentListCallingModal
        isOpen={showStudentListModal}
        onClose={() => setShowStudentListModal(false)}
        students={students}
        pickedIds={pickedIds}
        manualCalledIds={manualCalledIds}
        onToggleManualCall={onToggleManualCall || (() => {})}
        onAwardActivityPoints={onAwardActivityPoints}
        onSetExactActivityScore={onSetExactActivityScore}
        onResetAllCalls={() => {
          onSetPickedIds([]);
        }}
        className={activeClassName}
      />
    </div>
  );
}
