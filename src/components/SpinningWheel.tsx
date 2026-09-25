import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { RotateCcw, Shuffle, Plus, Play, UserPlus, X, Sparkles, Users, UserCheck, Star, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../types';
import StudentListCallingModal from './StudentListCallingModal';
import { getCurrentDateScoreSlot, getStudentCurrentWeekActivityScore } from '../lib/scoreUtils';
import { playTickSound, playWinnerSound } from '../lib/soundUtils';

interface SpinningWheelProps {
  students: Student[];
  pickedIds: string[];
  manualCalledIds?: string[];
  onSetPickedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onToggleManualCall?: (studentId: string) => void;
  onSelectStudent: (student: Student) => void;
  onWheelPickStudent?: (student: Student) => void;
  onAwardActivityPoints?: (studentId: string, points: number) => void;
  onSetExactActivityScore?: (studentId: string, exactScore: number) => void;
  selectedStudent: Student | null;
  onAddStudent: (name: string) => void;
  onBulkAddStudents?: (list: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }[]) => void;
  showBulkInput: boolean;
  setShowBulkInput: (val: boolean) => void;
  isDarkMode?: boolean;
  className?: string;
}

const PALETTE = ['#06b6d4', '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444'];
const WINNER_EMOJIS = ['🎉', '🥳', '🌟', '🏆', '👑', '😎', '🚀', '🤩', '🎯', '✨', '👏', '🔥', '🌈', '💯', '🎖️', '🦸‍♂️', '🦸‍♀️'];

export default function SpinningWheel({
  students,
  pickedIds,
  manualCalledIds = [],
  onSetPickedIds,
  onToggleManualCall,
  onSelectStudent,
  onWheelPickStudent,
  onAwardActivityPoints,
  onSetExactActivityScore,
  selectedStudent,
  onAddStudent,
  onBulkAddStudents,
  showBulkInput,
  setShowBulkInput,
  isDarkMode = false,
  className = 'ថ្នាក់រៀន'
}: SpinningWheelProps) {
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [needleColor, setNeedleColor] = useState('#ff4949');
  const [winnerStudent, setWinnerStudent] = useState<Student | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showStudentListModal, setShowStudentListModal] = useState(false);
  const [randomEmoji, setRandomEmoji] = useState('🎉');
  const [displayMode, setDisplayMode] = useState<'profile' | 'emoji'>('profile');
  const controls = useAnimation();
  const [bulkText, setBulkText] = useState('');
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastSegment = useRef<number>(-1);

  // Exclude both wheel-called (pickedIds) and teacher manually called (manualCalledIds)
  const availableStudents = students.filter(s => !pickedIds.includes(s.id) && !manualCalledIds.includes(s.id));

  // Listen to live rotation transformations:
  // 1. Changes needle color to match current active sector at the pointer (12 o'clock)
  // 2. Plays a crisp tick sound whenever transitioning over a slice segment kâm
  useEffect(() => {
    if (!isSpinning) return;

    let active = true;
    lastSegment.current = -1; // reset tracking

    const updateRotationEffects = () => {
      if (!active || !wheelRef.current) return;

      const el = wheelRef.current;
      const st = window.getComputedStyle(el, null);
      const tr = st.getPropertyValue("transform") || st.getPropertyValue("-webkit-transform");

      if (tr && tr !== "none") {
        const values = tr.split('(')[1].split(')')[0].split(',');
        const a = parseFloat(values[0]);
        const b = parseFloat(values[1]);
        let angle = Math.atan2(b, a) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        const N = students.length || 6;
        const sectorAngle = 360 / N;
        // Pointer is static at the very top (270 degrees in CSS angle/rotation coordinates)
        const localAngle = (270 - angle + 360) % 360;
        const currentIdx = Math.floor(localAngle / sectorAngle) % N;
        const currentColor = PALETTE[currentIdx % PALETTE.length];
        if (currentColor) {
          setNeedleColor(currentColor);
        }

        // Sector ticking audio trigger!
        if (currentIdx !== lastSegment.current) {
          playTickSound();
          lastSegment.current = currentIdx;
        }
      }

      requestAnimationFrame(updateRotationEffects);
    };

    updateRotationEffects();
    return () => {
      active = false;
    };
  }, [isSpinning, students.length]);

  const triggerFireworks = () => {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 35, spread: 360, ticks: 75, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const intervalId = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(intervalId);
      }
      const particleCount = 60 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.12, 0.35), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.65, 0.88), y: Math.random() - 0.2 } });
    }, 250);
  };

  const executeSpin = async (excludeId?: string) => {
    if (students.length === 0 || isSpinning) return;

    setShowWinnerModal(false);
    setIsSpinning(true);

    // Filter available pool (excluding both wheel-picked and teacher manually called)
    let activePicked = pickedIds;
    if (excludeId) {
      activePicked = activePicked.filter(id => id !== excludeId);
      onSetPickedIds(prev => prev.filter(id => id !== excludeId));
    }
    let pool = students.filter(s => !activePicked.includes(s.id) && !manualCalledIds.includes(s.id));
    if (excludeId && pool.length > 1) {
      pool = pool.filter(s => s.id !== excludeId);
    }
    if (pool.length === 0) {
      // If all uncalled students have been exhausted, try students not in manualCalledIds
      const notManuallyCalled = students.filter(s => !manualCalledIds.includes(s.id));
      if (notManuallyCalled.length > 0) {
        pool = notManuallyCalled;
      } else {
        pool = [...students];
      }
      onSetPickedIds([]);
    }

    // Choose final student
    const chosenStudent = pool[Math.floor(Math.random() * pool.length)];
    const chosenIndex = students.findIndex(s => s.id === chosenStudent.id);

    const N = students.length;
    const sectorSize = 360 / N;
    // Target angle of chosen index center:
    const sectorCenterAngle = (chosenIndex + 0.5) * sectorSize;

    // target landing rotation aligns chosen student centered at top (270 degrees)
    const targetAngle = 360 - sectorCenterAngle + 270;
    const additionalSpins = 360 * 6; // 6 full aesthetic spins
    const finalRotation = rotationDegrees + additionalSpins + (targetAngle - (rotationDegrees % 360));

    setRotationDegrees(finalRotation);

    await controls.start({
      rotate: finalRotation,
      transition: { duration: 4.2, ease: [0.15, 0.85, 0.35, 1] } 
    });

    // Finished spinning
    setIsSpinning(false);
    onSelectStudent(chosenStudent);
    if (onWheelPickStudent) {
      onWheelPickStudent(chosenStudent);
    }
    onSetPickedIds(prev => {
      if (prev.includes(chosenStudent.id)) return prev;
      return [...prev, chosenStudent.id];
    });

    // Keep final needle color completely synced to correct chosen student sector
    const winningColor = PALETTE[chosenIndex % PALETTE.length];
    setNeedleColor(winningColor);

    // Play real audio!
    playWinnerSound();

    // Fire continuous fireworks confetti
    triggerFireworks();

    // Set winner and show popup
    const pickedEmoji = chosenStudent.emoji || WINNER_EMOJIS[Math.floor(Math.random() * WINNER_EMOJIS.length)];
    setRandomEmoji(pickedEmoji);
    setWinnerStudent(chosenStudent);
    setShowWinnerModal(true);
  };

  const handleSpin = () => executeSpin();

  const handleResetPicked = () => {
    onSetPickedIds([]);
    controls.set({ rotate: 0 });
    setRotationDegrees(0);
    setNeedleColor('#ff4949');
    setShowWinnerModal(false);
    setWinnerStudent(null);
  };

  const handleRepick = () => {
    const exclude = winnerStudent?.id;
    setShowWinnerModal(false);
    setTimeout(() => {
      executeSpin(exclude);
    }, 120);
  };

  const handleCallNext = () => {
    setShowWinnerModal(false);
    setTimeout(() => {
      executeSpin();
    }, 120);
  };

  const handleShuffle = () => {
    handleResetPicked();
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkText.trim()) {
      const names = bulkText.split('\n').filter(n => n.trim());
      if (onBulkAddStudents) {
        onBulkAddStudents(names.map(name => ({
          name: name.trim(),
          gender: 'ប្រុស' as const,
          status: 'សកម្ម' as const
        })));
      } else {
        names.forEach(name => onAddStudent(name.trim()));
      }
      setBulkText('');
      setShowBulkInput(false);
    }
  };

  // Helper to draw SVG slices with vertical spoke text
  const renderSectors = () => {
    const N = students.length;
    if (N === 0) {
      return PALETTE.slice(0, 6).map((color, idx) => {
        const startRad = (idx * 60 * Math.PI) / 180;
        const endRad = ((idx + 1) * 60 * Math.PI) / 180;
        const x1 = 200 + 180 * Math.cos(startRad);
        const y1 = 200 + 180 * Math.sin(startRad);
        const x2 = 200 + 180 * Math.cos(endRad);
        const y2 = 200 + 180 * Math.sin(endRad);
        
        return (
          <path
            key={idx}
            d={`M 200 200 L ${x1} ${y1} A 180 180 0 0 1 ${x2} ${y2} Z`}
            fill={color}
            opacity="0.15"
            stroke="#ffffff20"
            strokeWidth="2"
          />
        );
      });
    }

    if (N === 1) {
      return (
        <g id="single-student-sector">
          <circle cx="200" cy="200" r="180" fill={PALETTE[0]} stroke="#fff" strokeWidth="3.5" />
          <text
            x="200"
            y="200"
            fill="#000000"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-black text-xl select-none"
          >
            {students[0].name}
          </text>
        </g>
      );
    }

    const sectorAngle = 360 / N;
    return students.map((student, idx) => {
      const startAngle = idx * sectorAngle;
      const endAngle = (idx + 1) * sectorAngle;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Inner coords
      const x1 = 200 + 180 * Math.cos(startRad);
      const y1 = 200 + 180 * Math.sin(startRad);
      const x2 = 200 + 180 * Math.cos(endRad);
      const y2 = 200 + 180 * Math.sin(endRad);

      const color = PALETTE[idx % PALETTE.length];
      const midAngle = startAngle + sectorAngle / 2;
      const isPicked = pickedIds.includes(student.id) || manualCalledIds.includes(student.id);

      return (
        <g key={student.id}>
          {/* Slice Path */}
          <path
            d={`M 200 200 L ${x1} ${y1} A 180 180 0 0 1 ${x2} ${y2} Z`}
            fill={color}
            opacity={isPicked ? 0.35 : 1}
            stroke="#ffffff"
            strokeWidth="2.5"
            className="transition-opacity duration-300"
          />
          {/* Student Radial Labels: Written vertically outwards along the spoke (kâm) for maximum fit without truncation */}
          <g transform={`rotate(${midAngle} 200 200)`}>
            <text
              x="245"
              y="200"
              fill="#000000"
              textAnchor="start"
              dominantBaseline="middle"
              className="font-black text-[13px] sm:text-sm select-none tracking-tight"
            >
              {student.name}
            </text>
          </g>
        </g>
      );
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 my-auto w-full">
      {/* Visual Canvas Wheel Area */}
      <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[340px] md:h-[340px] lg:w-[380px] lg:h-[380px] max-w-[95vw] aspect-square flex items-center justify-center mb-6">
        {/* Pointer Pointer (Static at 12 o'clock) with dynamic matched needle color */}
        <div className="absolute top-[-8px] scale-125 z-20 pointer-events-none drop-shadow-md transition-all duration-75 active:scale-110">
          <svg width="24" height="28" viewBox="0 0 24 28" fill="none" className="filter drop-shadow">
            <path d="M12 28L24 4C24 4 18 0 12 0C6 0 0 4 0 4L12 28Z" fill={needleColor} className="transition-colors duration-100" />
          </svg>
        </div>

        {/* The Animated Wheel */}
        <motion.div
          ref={wheelRef}
          animate={controls}
          className="w-full h-full rounded-full shadow-2xl bg-white dark:bg-[#222222] border-8 border-white dark:border-[#333333] p-1 relative overflow-hidden"
          style={{ originX: '50%', originY: '50%' }}
        >
          <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
            {renderSectors()}
          </svg>
        </motion.div>

        {/* Center Controller Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || students.length === 0}
          className="absolute w-16 h-16 bg-white dark:bg-[#2a2a2a] rounded-full border-4 border-indigo-600 dark:border-indigo-500 shadow-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 transition-all z-10 cursor-pointer"
        >
          <Play className="w-8 h-8 fill-indigo-600 text-indigo-600" />
        </button>
      </div>

      {/* របារបញ្ជា៖ Reset (ខាងឆ្វេង) | Re-pick (កណ្ដាល) | ហៅសិស្សបន្ត (ខាងស្ដាំ) */}
      <div className="flex items-center gap-2 sm:gap-3 w-full max-w-sm justify-center mb-3">
        {/* Reset - Left (ខាងឆ្វេង) */}
        <button
          onClick={handleResetPicked}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#383838] text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#333333] transition-all cursor-pointer shadow-2xs active:scale-95"
          title="កំណត់ឡើងវិញ / Reset"
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>Reset</span>
        </button>

        {/* Re-pick - Center (កណ្ដាល) */}
        <button
          onClick={handleRepick}
          disabled={isSpinning || students.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#383838] text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#333333] transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          title="រើសម្តងទៀត / Re-pick"
        >
          <Shuffle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Re-pick</span>
        </button>

        {/* ហៅសិស្សបន្ត - Right (ខាងស្ដាំ) */}
        <button
          onClick={handleCallNext}
          disabled={isSpinning || students.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 whitespace-nowrap"
          title="ហៅសិស្សបន្ត"
        >
          <Play className="w-3.5 h-3.5 fill-white shrink-0" />
          <span>ហៅសិស្សបន្ត</span>
        </button>
      </div>

      {/* កូន tap តូចមួយសម្រាប់ចុចចូលមើលឈ្មោះសិស្សទាំងអស់ និង Profile/Emoji Switch */}
      <div className="w-full max-w-sm flex items-center justify-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setShowStudentListModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95 group"
          title="មើលបញ្ជីឈ្មោះសិស្សទាំងអស់ & កំណត់ស្ថានភាពហៅ"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>បញ្ជីសិស្ស & គ្រូហៅផ្ទាល់</span>
          <span className="px-1.5 py-0.2 bg-indigo-200/70 dark:bg-indigo-800/80 text-indigo-800 dark:text-indigo-200 rounded-full text-[10px] font-black">
            {students.length}
          </span>
          {manualCalledIds.length > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 rounded-full text-[10px] font-black">
              <UserCheck className="w-2.5 h-2.5" />
              {manualCalledIds.length}
            </span>
          )}
        </button>

        {/* Profile / Emoji Toggle Tap */}
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setDisplayMode('profile')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              displayMode === 'profile'
                ? 'text-rose-600 dark:text-rose-400 font-black bg-white dark:bg-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Profile
          </button>
          <span className="text-slate-400 font-bold">/</span>
          <button
            type="button"
            onClick={() => setDisplayMode('emoji')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              displayMode === 'emoji'
                ? 'text-rose-600 dark:text-rose-400 font-black bg-white dark:bg-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Emoji
          </button>
        </div>
      </div>

      {/* Bulk Add trigger link */}
      <div className="text-center w-full max-w-sm">
        {!showBulkInput ? (
          <button
            onClick={() => setShowBulkInput(true)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mx-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>បញ្ចូលឈ្មោះសិស្សបន្ថែម (Bulk Add)</span>
          </button>
        ) : (
          <form onSubmit={handleBulkSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">បញ្ចូលឈ្មោះសិស្សច្រើន (មួយជួរ ឈ្មោះមួយ)</label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="សុខ រីបុល&#10;ចាន់ថា ស្រីលីន&#10;កែវ មករា"
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 font-semibold resize-none mb-2"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowBulkInput(false)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shrink-0"
              >
                យល់ព្រម
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Animated Winner Popup Modal */}
      <AnimatePresence>
        {showWinnerModal && winnerStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-indigo-500/30 dark:border-indigo-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col items-center text-center"
            >
              {/* Background ambient glows */}
              <div className="absolute -top-14 -left-14 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-14 -right-14 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setShowWinnerModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
                title="បិទ"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider mb-4 border border-indigo-500/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>សិស្សដែលបានជ្រើសរើស</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </div>

              {/* Profile / Emoji Toggle Tap */}
              <div className="flex items-center justify-center gap-1.5 mb-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDisplayMode('profile')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    displayMode === 'profile'
                      ? 'text-rose-600 dark:text-rose-400 font-black bg-white dark:bg-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Profile
                </button>
                <span className="text-slate-400 font-bold">/</span>
                <button
                  type="button"
                  onClick={() => setDisplayMode('emoji')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    displayMode === 'emoji'
                      ? 'text-rose-600 dark:text-rose-400 font-black bg-white dark:bg-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Emoji
                </button>
              </div>

              {/* Profile Photo OR Animated Emoji */}
              <div className="relative my-2">
                {displayMode === 'profile' && winnerStudent.avatarUrl ? (
                  <div className="relative">
                    <img
                      src={winnerStudent.avatarUrl}
                      alt={winnerStudent.name}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover ring-4 ring-indigo-500 shadow-2xl mx-auto"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-amber-400 text-slate-950 p-1.5 rounded-xl shadow-lg">
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                    </div>
                  </div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-linear-to-tr from-indigo-500/15 via-purple-500/20 to-pink-500/15 dark:from-indigo-500/25 dark:to-purple-500/25 ring-4 ring-indigo-500/30 flex items-center justify-center text-6xl sm:text-7xl shadow-2xl select-none mx-auto"
                  >
                    {winnerStudent.emoji || randomEmoji}
                  </motion.div>
                )}
              </div>

              {/* ឈ្មោះសិស្សធំៗ ច្បាស់ៗ */}
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">
                {winnerStudent.name}
              </h2>

              {/* Badges / Sub info */}
              <div className="flex items-center gap-2 mt-2">
                {winnerStudent.gender && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    winnerStudent.gender === 'ស្រី'
                      ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  }`}>
                    {winnerStudent.gender}
                  </span>
                )}
                {winnerStudent.studentId && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    ID: {winnerStudent.studentId}
                  </span>
                )}
              </div>

              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                🎉 បានជ្រើសរើសជាសិស្សឡើងឆ្លើយសំណួរ 🎉
              </p>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold mt-2.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>សិស្សនឹងទទួលបាន 5 ពិន្ទុសកម្មភាព នៅពេលឆ្លើយសំណួរត្រូវ</span>
              </div>

              {/* Quick Score Adjustment Bar in Winner Card */}
              {(() => {
                const dateSlot = getCurrentDateScoreSlot();
                const latestStudent = students.find(s => s.id === winnerStudent.id) || winnerStudent;
                const { activityScore } = getStudentCurrentWeekActivityScore(latestStudent);

                return (
                  <div className="w-full mt-3 p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col items-center gap-1.5">
                    <div className="flex items-center justify-between w-full text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>សកម្មភាព {dateSlot.weekLabel} (ខែ{dateSlot.month})</span>
                      </span>
                      <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                        {activityScore} ពិន្ទុ
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 w-full justify-center flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">កែពិន្ទុ៖</span>
                      {[1, 2, 3, 5].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => {
                            if (onAwardActivityPoints) {
                              onAwardActivityPoints(winnerStudent.id, pts);
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg text-xs font-black bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title={`បន្ថែម ${pts} ពិន្ទុ`}
                        >
                          +{pts}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (onAwardActivityPoints && activityScore > 0) {
                            onAwardActivityPoints(winnerStudent.id, -1);
                          }
                        }}
                        disabled={activityScore <= 0}
                        className="px-2 py-0.5 rounded-lg text-xs font-black bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 disabled:opacity-40 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        title="ដក 1 ពិន្ទុ"
                      >
                        -1
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* របារប៊ូតុងបញ្ជាខាងក្នុង Popup: Reset (ឆ្វេង) | Re-pick (កណ្ដាល) | ហៅសិស្សបន្ត (ស្ដាំ) */}
              <div className="flex items-center gap-2 sm:gap-3 w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Reset (ឆ្វេង) */}
                <button
                  onClick={handleResetPicked}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95"
                  title="កំណត់ឡើងវិញ / Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Reset</span>
                </button>

                {/* Re-pick (កណ្ដាល) */}
                <button
                  onClick={handleRepick}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="រើសម្តងទៀត / Re-pick"
                >
                  <Shuffle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Re-pick</span>
                </button>

                {/* ហៅសិស្សបន្ត (ស្ដាំ) */}
                <button
                  onClick={handleCallNext}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-md shadow-indigo-500/25 active:scale-95 whitespace-nowrap"
                  title="ហៅសិស្សបន្ត"
                >
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>ហៅសិស្សបន្ត</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        className={className}
      />
    </div>
  );
}
