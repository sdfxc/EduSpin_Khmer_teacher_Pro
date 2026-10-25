import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Shuffle, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, 
  Check, Award, Plus, Minus, UserCheck, Users, Play, Gift, Wand2, 
  Dices, Flame, Crown, Star, Layers, RefreshCw, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentDateScoreSlot, getStudentCurrentWeekActivityScore } from '../lib/scoreUtils';
import { isSoundEnabled, setSoundEnabled, playWinnerSound, playTickSound } from '../lib/soundUtils';

export type PickerMode = 
  | 'slot' 
  | 'magic-hat' 
  | 'mystery-cards' 
  | 'gift-box' 
  | 'lucky-dice' 
  | 'balloon-pop' 
  | 'neon-marquee' 
  | 'multi-picker';

interface RandomNamePickersProps {
  students: Student[];
  pickedIds: string[];
  manualCalledIds?: string[];
  onSetPickedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onToggleManualCall?: (studentId: string) => void;
  onAwardActivityPoints?: (studentId: string, points: number) => void;
  onSetExactActivityScore?: (studentId: string, exactScore: number) => void;
  isDarkMode?: boolean;
  className?: string;
  onSelectStudent?: (student: Student) => void;
}

// Synthesized sound effects using Web Audio API
function playCustomTone(type: 'magic' | 'pop' | 'dice' | 'card' | 'lever' | 'jackpot') {
  if (!isSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'magic') {
      // Shimmering arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } else if (type === 'pop') {
      // Balloon pop sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'dice') {
      // Wood rattle
      [0, 0.04, 0.09, 0.15].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180 + Math.random() * 80, now + t);
        gain.gain.setValueAtTime(0.2, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.05);
      });
    } else if (type === 'card') {
      // Card swish / flip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'lever') {
      // Mechanical lever clunk
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'jackpot') {
      // Fanfare bells
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      });
    }
  } catch {}
}

const PICKER_MODES_CONFIG: { id: PickerMode; labelKm: string; labelEn: string; icon: string; descKm: string }[] = [
  { id: 'slot', labelKm: 'ម៉ាស៊ីនស្លុត', labelEn: 'Slot Machine', icon: '🎰', descKm: 'បង្វិលម៉ាស៊ីនស្លុតបុរាណ 3 ជួរ' },
  { id: 'magic-hat', labelKm: 'មួកវេទមន្ត', labelEn: 'Magic Hat', icon: '🎩', descKm: 'ទាញឈ្មោះចេញពីមួកមន្តអាគម' },
  { id: 'mystery-cards', labelKm: 'កាតអាថ៌កំបាំង', labelEn: 'Mystery Cards', icon: '🃏', descKm: 'ត្រឡប់កាតអាថ៌កំបាំង 3D' },
  { id: 'gift-box', labelKm: 'ប្រអប់កាដូ', labelEn: 'Gift Box', icon: '🎁', descKm: 'បើកប្រអប់កាដូបាញ់កាំជ្រួច' },
  { id: 'lucky-dice', labelKm: 'គ្រាប់ឡុកឡាក់', labelEn: 'Lucky Dice', icon: '🎲', descKm: 'ក្រឡុកគ្រាប់ឡុកឡាក់សំណាង' },
  { id: 'balloon-pop', labelKm: 'បាញ់ប៉េងប៉ោង', labelEn: 'Balloon Pop', icon: '🎈', descKm: 'បាញ់ទម្លាយប៉េងប៉ោងរើសឈ្មោះ' },
  { id: 'neon-marquee', labelKm: 'ផ្ទាំងឈ្មោះរហ័ស', labelEn: 'Rapid Neon', icon: '⚡', descKm: 'រត់ឈ្មោះល្បឿនលឿនទាក់ភ្នែក' },
  { id: 'multi-picker', labelKm: 'រើសច្រើននាក់', labelEn: 'Multi-Picker', icon: '👥', descKm: 'រើសសិស្ស 2 ទៅ 5 នាក់ក្នុងពេលតែមួយ' },
];

export default function RandomNamePickers({
  students,
  pickedIds,
  manualCalledIds = [],
  onSetPickedIds,
  onToggleManualCall,
  onAwardActivityPoints,
  onSetExactActivityScore,
  isDarkMode = false,
  className = 'ថ្នាក់រៀន',
  onSelectStudent,
}: RandomNamePickersProps) {
  const { language } = useLanguage();
  const isKm = language === 'km';

  // Picker Mode State
  const [activeMode, setActiveMode] = useState<PickerMode>('slot');

  // Animation & Picking States
  const [isPicking, setIsPicking] = useState(false);
  const [winner, setWinner] = useState<Student | null>(null);
  const [multiWinners, setMultiWinners] = useState<Student[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Settings
  const [excludeCalled, setExcludeCalled] = useState(true);
  const [genderFilter, setGenderFilter] = useState<'all' | 'ប្រុស' | 'ស្រី'>('all');
  const [multiCount, setMultiCount] = useState<number>(3);
  const [speed, setSpeed] = useState<'fast' | 'normal' | 'slow'>('normal');

  // Mode-specific visuals
  const [slotItems, setSlotItems] = useState<{ reel1: string; reel2: string; reel3: string }>({ reel1: '?', reel2: '?', reel3: '?' });
  const [isPullingLever, setIsPullingLever] = useState(false);
  const [magicHatShake, setMagicHatShake] = useState(false);
  const [giftBoxPopped, setGiftBoxPopped] = useState(false);
  const [revealedCardIndex, setRevealedCardIndex] = useState<number | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceNumber, setDiceNumber] = useState(6);
  const [balloonPoppedIdx, setBalloonPoppedIdx] = useState<number | null>(null);
  const [marqueeName, setMarqueeName] = useState<string>('???');

  const containerRef = useRef<HTMLDivElement>(null);
  const animIntervalRef = useRef<any>(null);

  // Filter eligible students
  const eligibleStudents = useMemo(() => {
    let list = students.filter(s => s && s.name && s.name.trim() !== '');
    if (genderFilter !== 'all') {
      list = list.filter(s => s.gender === genderFilter);
    }
    if (excludeCalled) {
      list = list.filter(s => !pickedIds.includes(s.id) && !manualCalledIds.includes(s.id));
    }
    return list;
  }, [students, pickedIds, manualCalledIds, excludeCalled, genderFilter]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, []);

  const toggleSound = () => {
    const newVal = !soundActive;
    setSoundActive(newVal);
    setSoundEnabled(newVal);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const getDurationMs = () => {
    if (speed === 'fast') return 1600;
    if (speed === 'slow') return 4800;
    return 3000;
  };

  // Launch confetti fireworks
  const fireWinnerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444']
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
        });
      }, 250);
    } catch {}
  };

  // Main pick trigger
  const handleStartPick = () => {
    if (isPicking) return;
    if (eligibleStudents.length === 0) {
      // If pool empty, prompt or reset
      alert(isKm ? 'សិស្សទាំងអស់ត្រូវបានហៅរួចរាល់ហើយ! សូមចុចកំណត់ឡើងវិញ (Reset) ដើម្បីហៅម្ដងទៀត។' : 'All students have already been picked! Please reset to pick again.');
      return;
    }

    setIsPicking(true);
    setWinner(null);
    setMultiWinners([]);
    setShowWinnerModal(false);
    setRevealedCardIndex(null);
    setBalloonPoppedIdx(null);
    setGiftBoxPopped(false);

    const duration = getDurationMs();

    if (activeMode === 'multi-picker') {
      runMultiPicker(duration);
    } else if (activeMode === 'slot') {
      runSlotMachine(duration);
    } else if (activeMode === 'magic-hat') {
      runMagicHat(duration);
    } else if (activeMode === 'mystery-cards') {
      runMysteryCards(duration);
    } else if (activeMode === 'gift-box') {
      runGiftBox(duration);
    } else if (activeMode === 'lucky-dice') {
      runLuckyDice(duration);
    } else if (activeMode === 'balloon-pop') {
      runBalloonPop(duration);
    } else {
      runNeonMarquee(duration);
    }
  };

  // 1. Slot Machine
  const runSlotMachine = (duration: number) => {
    setIsPullingLever(true);
    playCustomTone('lever');
    setTimeout(() => setIsPullingLever(false), 400);

    const startTime = Date.now();
    let tickCount = 0;

    animIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      tickCount++;

      const r1 = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)]?.name || '✨';
      const r2 = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)]?.name || '🌟';
      const r3 = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)]?.name || '🎉';

      setSlotItems({ reel1: r1, reel2: r2, reel3: r3 });

      if (tickCount % 2 === 0) {
        playTickSound();
      }

      if (progress >= 1) {
        clearInterval(animIntervalRef.current);
        const chosen = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
        setSlotItems({ reel1: chosen.name, reel2: chosen.name, reel3: chosen.name });
        finishPick(chosen);
      }
    }, 80);
  };

  // 2. Magic Hat
  const runMagicHat = (duration: number) => {
    setMagicHatShake(true);
    playCustomTone('magic');

    const startTime = Date.now();
    animIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      const randomS = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
      setMarqueeName(randomS ? randomS.name : '???');

      if (progress >= 1) {
        clearInterval(animIntervalRef.current);
        setMagicHatShake(false);
        const chosen = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
        finishPick(chosen);
      }
    }, 100);
  };

  // 3. Mystery Cards
  const runMysteryCards = (duration: number) => {
    playCustomTone('card');
    const startTime = Date.now();
    let counter = 0;

    animIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      counter++;

      if (counter % 3 === 0) playCustomTone('card');

      if (progress >= 1) {
        clearInterval(animIntervalRef.current);
        const chosen = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
        const cardTarget = Math.floor(Math.random() * 5);
        setRevealedCardIndex(cardTarget);
        setTimeout(() => {
          finishPick(chosen);
        }, 600);
      }
    }, 120);
  };

  // 4. Gift Box
  const runGiftBox = (duration: number) => {
    playCustomTone('pop');
    setGiftBoxPopped(false);

    setTimeout(() => {
      setGiftBoxPopped(true);
      playCustomTone('jackpot');
      const chosen = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
      finishPick(chosen);
    }, duration);
  };

  // 5. Lucky Dice
  const runLuckyDice = (duration: number) => {
    setDiceRolling(true);
    playCustomTone('dice');

    const startTime = Date.now();
    animIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      setDiceNumber(Math.floor(Math.random() * 6) + 1);
      const randomS = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
      setMarqueeName(randomS ? randomS.name : '???');

      if (progress >= 1) {
        clearInterval(animIntervalRef.current);
        setDiceRolling(false);
        const chosen = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
        finishPick(chosen);
      }
    }, 90);
  };

  // 6. Balloon Pop
  const runBalloonPop = (duration: number) => {
    const startTime = Date.now();
    animIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        clearInterval(animIntervalRef.current);
        const targetIdx = Math.floor(Math.random() * 6);
        setBalloonPoppedIdx(targetIdx);
        playCustomTone('pop');
        const chosen = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
        setTimeout(() => {
          finishPick(chosen);
        }, 400);
      }
    }, 100);
  };

  // 7. Neon Marquee
  const runNeonMarquee = (duration: number) => {
    const startTime = Date.now();
    let delay = 50;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      const randomS = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
      setMarqueeName(randomS ? randomS.name : '???');
      playTickSound();

      if (progress < 1) {
        delay = 50 + Math.floor(progress * 260); // Gradually slow down
        setTimeout(tick, delay);
      } else {
        const chosen = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
        setMarqueeName(chosen.name);
        finishPick(chosen);
      }
    };
    tick();
  };

  // 8. Multi-Picker
  const runMultiPicker = (duration: number) => {
    const countToPick = Math.min(multiCount, eligibleStudents.length);
    const startTime = Date.now();

    animIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      playTickSound();

      if (progress >= 1) {
        clearInterval(animIntervalRef.current);
        // Shuffle and pick N unique students
        const shuffled = [...eligibleStudents].sort(() => 0.5 - Math.random());
        const chosenMultiple = shuffled.slice(0, countToPick);
        setMultiWinners(chosenMultiple);
        setIsPicking(false);

        // Record in pickedIds
        onSetPickedIds(prev => {
          const newIds = chosenMultiple.map(s => s.id).filter(id => !prev.includes(id));
          return [...prev, ...newIds];
        });

        playWinnerSound();
        fireWinnerConfetti();
        setShowWinnerModal(true);
      }
    }, 100);
  };

  // Finalize single student pick
  const finishPick = (chosen: Student) => {
    setIsPicking(false);
    setWinner(chosen);
    setShowWinnerModal(true);

    // Record called
    onSetPickedIds(prev => {
      if (prev.includes(chosen.id)) return prev;
      return [...prev, chosen.id];
    });

    playWinnerSound();
    playCustomTone('jackpot');
    fireWinnerConfetti();

    if (onSelectStudent) {
      onSelectStudent(chosen);
    }
  };

  const handleResetAllCalls = () => {
    if (confirm(isKm ? 'តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់កំណត់ប្រវត្តិការហៅឡើងវិញ (Reset) មែនទេ?' : 'Are you sure you want to reset all picked history?')) {
      onSetPickedIds([]);
      setWinner(null);
      setMultiWinners([]);
      setShowWinnerModal(false);
    }
  };

  const handleAwardPoints = (studentId: string, pts: number) => {
    if (onAwardActivityPoints) {
      onAwardActivityPoints(studentId, pts);
      playCustomTone('jackpot');
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex-1 flex flex-col h-full overflow-hidden ${
        isDarkMode ? 'bg-[#18181c] text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Controller Bar */}
      <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDarkMode ? 'bg-[#222228] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        {/* Left: Mode Switcher Pills */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
          {PICKER_MODES_CONFIG.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  if (!isPicking) {
                    setActiveMode(mode.id);
                    setWinner(null);
                    setMultiWinners([]);
                  }
                }}
                disabled={isPicking}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm scale-102 ring-2 ring-indigo-400/40'
                    : isDarkMode
                      ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={mode.descKm}
              >
                <span className="text-sm">{mode.icon}</span>
                <span>{isKm ? mode.labelKm : mode.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Controls (Sound, Fullscreen, Reset, Eligible Count) */}
        <div className="flex items-center gap-2 shrink-0 text-xs font-bold">
          {/* Eligible Pool Count Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
            isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {isKm ? 'នៅសល់៖' : 'Remaining:'} <strong className="text-indigo-500">{eligibleStudents.length}</strong>/{students.length}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              soundActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                : isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={soundActive ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Reset Pool History */}
          <button
            type="button"
            onClick={handleResetAllCalls}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
            title="Reset All Called Students"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKm ? 'កំណត់ឡើងវិញ' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Center / Game Arena */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
          
          {/* Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Mode 1: 🎰 Slot Machine */}
          {activeMode === 'slot' && (
            <div className="flex flex-col items-center max-w-xl w-full">
              {/* Slot Frame */}
              <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 border-4 border-amber-300 shadow-2xl shadow-amber-900/40 w-full max-w-lg">
                {/* Vintage Lights Header */}
                <div className="flex items-center justify-between px-2 mb-4">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} className={`w-3 h-3 rounded-full ${isPicking ? 'animate-ping bg-yellow-300' : 'bg-yellow-400'} shadow-sm`} />
                    ))}
                  </div>
                  <span className="text-xs font-black tracking-widest text-amber-200 uppercase bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/40">
                    🎰 LUCKY CLASS SLOT 🎰
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} className={`w-3 h-3 rounded-full ${isPicking ? 'animate-ping bg-yellow-300' : 'bg-yellow-400'} shadow-sm`} />
                    ))}
                  </div>
                </div>

                {/* Reels Container */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-950 border-2 border-amber-400/60 shadow-inner">
                  {[slotItems.reel1, slotItems.reel2, slotItems.reel3].map((val, idx) => (
                    <div 
                      key={idx}
                      className="h-28 sm:h-36 rounded-xl bg-gradient-to-b from-slate-100 via-white to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-2 text-center border-2 border-slate-300 dark:border-slate-700 overflow-hidden relative shadow-md"
                    >
                      <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                      <motion.span 
                        key={val + idx}
                        initial={isPicking ? { y: -20, opacity: 0.5 } : false}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-base sm:text-lg font-black text-slate-800 dark:text-amber-300 line-clamp-2 leading-tight"
                      >
                        {val}
                      </motion.span>
                    </div>
                  ))}
                </div>

                {/* Right Interactive Lever Arm */}
                <div 
                  onClick={handleStartPick}
                  className="absolute -right-8 sm:-right-10 top-1/2 -translate-y-1/2 cursor-pointer group flex flex-col items-center"
                  title="Pull Lever to Spin!"
                >
                  <motion.div 
                    animate={isPullingLever ? { rotateX: 60, y: 30 } : { rotateX: 0, y: 0 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-red-700 border-2 border-rose-300 shadow-lg group-hover:scale-110 transition-transform" />
                    <div className="w-2.5 h-16 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 rounded-sm shadow-sm" />
                    <div className="w-6 h-6 rounded-md bg-amber-950 border border-amber-600 shadow-md" />
                  </motion.div>
                </div>
              </div>

              {/* Spin Button */}
              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide text-white bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 shadow-xl shadow-orange-500/30 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងបង្វិល...' : 'Spinning...') : (isKm ? 'ទាញកាច់បង្វិលស្លុត (SPIN)' : 'PULL TO SPIN')}</span>
              </button>
            </div>
          )}

          {/* Mode 2: 🎩 Magic Hat */}
          {activeMode === 'magic-hat' && (
            <div className="flex flex-col items-center max-w-md w-full text-center">
              <motion.div
                animate={magicHatShake ? { rotate: [-8, 8, -6, 6, 0], scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.4, repeat: magicHatShake ? Infinity : 0 }}
                className="relative cursor-pointer"
                onClick={handleStartPick}
              >
                {/* Floating Wand */}
                <motion.div
                  animate={isPicking ? { rotate: [-20, 10, -20], x: [0, 15, 0] } : { rotate: -15 }}
                  transition={{ duration: 0.6, repeat: isPicking ? Infinity : 0 }}
                  className="absolute -top-12 -right-8 text-4xl select-none"
                >
                  🪄
                </motion.div>

                {/* Hat SVG / Graphic */}
                <div className="text-8xl select-none filter drop-shadow-2xl">
                  🎩
                </div>

                {isPicking && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-2xl animate-ping">✨</span>
                  </div>
                )}
              </motion.div>

              <div className="mt-4 px-6 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-lg font-black text-indigo-400">
                  {isPicking ? marqueeName : (isKm ? 'ចុចលើមួកដើម្បីទាញឈ្មោះ' : 'Tap the Hat to Draw a Name')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 shadow-xl shadow-purple-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងសូត្រមន្ត...' : 'Casting Spell...') : (isKm ? 'ទាញឈ្មោះពីមួកវេទមន្ត' : 'DRAW FROM MAGIC HAT')}</span>
              </button>
            </div>
          )}

          {/* Mode 3: 🃏 Mystery Cards */}
          {activeMode === 'mystery-cards' && (
            <div className="flex flex-col items-center w-full max-w-2xl">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 w-full">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const isRevealed = revealedCardIndex === idx;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStartPick}
                      className={`h-40 sm:h-48 rounded-2xl border-2 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all relative overflow-hidden shadow-xl ${
                        isRevealed
                          ? 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-200 text-slate-950 font-black'
                          : isDarkMode
                            ? 'bg-gradient-to-b from-indigo-900/60 to-purple-950/80 border-indigo-500/40 text-white'
                            : 'bg-gradient-to-b from-indigo-600 to-purple-700 border-indigo-300 text-white'
                      }`}
                    >
                      <div className="text-3xl sm:text-4xl mb-2">
                        {isRevealed ? '🌟' : '🃏'}
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider">
                        {isRevealed ? (winner ? winner.name : 'WINNER') : `CARD ${idx + 1}`}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-indigo-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Shuffle className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងសាប់កាត...' : 'Shuffling Cards...') : (isKm ? 'សាប់ និងត្រឡប់កាតអាថ៌កំបាំង' : 'SHUFFLE & FLIP CARDS')}</span>
              </button>
            </div>
          )}

          {/* Mode 4: 🎁 Gift Box */}
          {activeMode === 'gift-box' && (
            <div className="flex flex-col items-center max-w-md w-full text-center">
              <motion.div
                animate={isPicking ? { scale: [1, 1.15, 0.95, 1.1, 1], rotate: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.5, repeat: isPicking ? Infinity : 0 }}
                className="cursor-pointer select-none text-8xl filter drop-shadow-2xl relative"
                onClick={handleStartPick}
              >
                {giftBoxPopped ? '🎉' : '🎁'}
                {isPicking && (
                  <span className="absolute -top-4 -right-4 text-3xl animate-bounce">
                    ✨
                  </span>
                )}
              </motion.div>

              <div className="mt-4 px-6 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-base font-black text-amber-400">
                  {giftBoxPopped ? (winner?.name || 'SURPRISE!') : (isKm ? 'ប្រអប់កាដូអាថ៌កំបាំង' : 'Mystery Gift Box')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-xl shadow-rose-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Gift className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងបើកប្រអប់...' : 'Opening Box...') : (isKm ? 'បើកប្រអប់កាដូសំណាង' : 'OPEN MYSTERY BOX')}</span>
              </button>
            </div>
          )}

          {/* Mode 5: 🎲 Lucky Dice */}
          {activeMode === 'lucky-dice' && (
            <div className="flex flex-col items-center max-w-md w-full text-center">
              <motion.div
                animate={diceRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 0.9, 1] } : {}}
                transition={{ duration: 0.3, repeat: diceRolling ? Infinity : 0 }}
                className="text-8xl select-none cursor-pointer filter drop-shadow-2xl"
                onClick={handleStartPick}
              >
                {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceNumber - 1]}
              </motion.div>

              <div className="mt-4 px-6 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-lg font-black text-emerald-400">
                  {diceRolling ? marqueeName : (isKm ? 'ចុចដើម្បីក្រឡុកគ្រាប់ឡុកឡាក់' : 'Roll the Lucky Dice')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-emerald-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Dices className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងក្រឡុក...' : 'Rolling...') : (isKm ? 'ក្រឡុកគ្រាប់ឡុកឡាក់' : 'ROLL LUCKY DICE')}</span>
              </button>
            </div>
          )}

          {/* Mode 6: 🎈 Balloon Pop */}
          {activeMode === 'balloon-pop' && (
            <div className="flex flex-col items-center w-full max-w-xl">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-4">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const isPopped = balloonPoppedIdx === idx;
                  const balloonColors = ['🎈', '🪁', '🎈', '🎈', '🎈', '🎈'];
                  return (
                    <motion.div
                      key={idx}
                      animate={!isPopped ? { y: [-6, 6, -6] } : { scale: 0, opacity: 0 }}
                      transition={{ duration: 2 + idx * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                      onClick={handleStartPick}
                      className="cursor-pointer text-6xl select-none hover:scale-110 transition-transform"
                    >
                      {isPopped ? '💥' : balloonColors[idx]}
                    </motion.div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-xl shadow-blue-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងតម្រង់បាញ់...' : 'Aiming Dart...') : (isKm ? 'បាញ់ទម្លាយប៉េងប៉ោង' : 'POP A BALLOON')}</span>
              </button>
            </div>
          )}

          {/* Mode 7: ⚡ Rapid Neon Marquee */}
          {activeMode === 'neon-marquee' && (
            <div className="flex flex-col items-center max-w-lg w-full">
              <div className="p-8 sm:p-12 rounded-3xl bg-slate-950 border-4 border-indigo-500/80 shadow-2xl shadow-indigo-500/30 w-full text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-500 animate-pulse" />
                <span className="text-xs font-black tracking-widest text-indigo-400 uppercase">
                  ⚡ HIGH-SPEED NEON BOARD ⚡
                </span>
                <div className="mt-4 text-3xl sm:text-5xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-white to-amber-400 truncate py-2">
                  {marqueeName}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 shadow-xl shadow-purple-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Flame className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងរត់ឈ្មោះ...' : 'Cycling Names...') : (isKm ? 'ចាប់ផ្ដើមរត់ឈ្មោះរហ័ស' : 'START RAPID SHUFFLE')}</span>
              </button>
            </div>
          )}

          {/* Mode 8: 👥 Multi-Picker */}
          {activeMode === 'multi-picker' && (
            <div className="flex flex-col items-center max-w-2xl w-full">
              {/* Count Selector */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                  {isKm ? 'ចំនួនសិស្សដែលត្រូវរើស៖' : 'Number to Pick:'}
                </span>
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMultiCount(num)}
                    className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      multiCount === num
                        ? 'bg-indigo-600 text-white shadow-md'
                        : isDarkMode ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Multi-Winners Grid */}
              {multiWinners.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                  {multiWinners.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center shadow-lg ${
                        isDarkMode ? 'bg-white/10 border-indigo-500/40' : 'bg-white border-indigo-200'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-black mb-2 shadow-sm">
                        {idx + 1}
                      </div>
                      <span className="font-black text-sm truncate max-w-full">{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.gender}</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white/5 border border-dashed border-white/20 text-center w-full max-w-md">
                  <Users className="w-12 h-12 text-indigo-400 mx-auto mb-2 opacity-60" />
                  <span className="text-xs font-black text-slate-400">
                    {isKm ? `ចុចខាងក្រោមដើម្បីរើសសិស្សម្ដង ${multiCount} នាក់` : `Click below to randomly pick ${multiCount} students`}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartPick}
                disabled={isPicking || eligibleStudents.length === 0}
                className="mt-6 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 shadow-xl shadow-indigo-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                <span>{isPicking ? (isKm ? 'កំពុងជ្រើសរើស...' : 'Picking Team...') : (isKm ? `រើសសិស្ស ${multiCount} នាក់` : `PICK ${multiCount} STUDENTS`)}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: Rules & Called History */}
        <div className={`w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col shrink-0 ${
          isDarkMode ? 'bg-[#1c1c22] border-white/10' : 'bg-slate-50/80 border-slate-200'
        }`}>
          {/* Settings Section */}
          <div className="p-4 border-b border-inherit space-y-3">
            <span className="text-xs font-black tracking-wider uppercase text-slate-400">
              {isKm ? 'ការកំណត់ការហៅឈ្មោះ' : 'Picker Settings'}
            </span>

            {/* Exclude Called Toggle */}
            <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
              <span>{isKm ? 'មិនរាប់អ្នកដែលបានហៅរួច' : 'Exclude already picked'}</span>
              <input 
                type="checkbox"
                checked={excludeCalled}
                onChange={(e) => setExcludeCalled(e.target.checked)}
                className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
              />
            </label>

            {/* Gender Filter */}
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{isKm ? 'ភេទ៖' : 'Gender:'}</span>
              <div className="flex gap-1">
                {(['all', 'ប្រុស', 'ស្រី'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenderFilter(g)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      genderFilter === g
                        ? 'bg-indigo-600 text-white'
                        : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {g === 'all' ? (isKm ? 'ទាំងអស់' : 'All') : g}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Control */}
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{isKm ? 'ល្បឿន៖' : 'Speed:'}</span>
              <div className="flex gap-1">
                {(['fast', 'normal', 'slow'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${
                      speed === s
                        ? 'bg-purple-600 text-white'
                        : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Called Students List */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {isKm ? 'សិស្សដែលបានហៅរួច' : 'Called Students'} ({pickedIds.length})
              </span>
              {pickedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAllCalls}
                  className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                >
                  {isKm ? 'លុបទាំងអស់' : 'Clear'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {pickedIds.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {isKm ? 'មិនទាន់មានសិស្សណាម្នាក់ត្រូវបានហៅនៅឡើយទេ' : 'No students have been called yet.'}
                </div>
              ) : (
                pickedIds.map((id, index) => {
                  const s = students.find(item => item.id === id);
                  if (!s) return null;
                  const { activityScore } = getStudentCurrentWeekActivityScore(s);
                  return (
                    <div
                      key={id}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                        isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-white border border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] text-slate-400 font-mono">#{index + 1}</span>
                        <span className="truncate">{s.name}</span>
                        <span className="text-[10px] text-slate-400">({s.gender})</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/10 text-amber-500 font-black">
                          {activityScore} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAwardPoints(s.id, 1)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer font-black"
                          title="+1 pt"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Winner Spotlight Popup Modal */}
      <AnimatePresence>
        {showWinnerModal && (winner || multiWinners.length > 0) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className={`max-w-md w-full rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative border-2 ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-[#252530] to-[#181820] border-indigo-500/50 text-white' 
                  : 'bg-gradient-to-b from-white to-slate-50 border-indigo-300 text-slate-900 shadow-indigo-500/20'
              }`}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Winner Trophy Icon */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/30 mb-4 border-4 border-amber-200">
                🏆
              </div>

              {/* Title */}
              <span className="text-xs font-black tracking-widest uppercase text-amber-500 mb-1">
                {isKm ? '🎉 អបអរសាទរ! សិស្សដែលបានជ្រើសរើស 🎉' : '🎉 CONGRATULATIONS! WINNER 🎉'}
              </span>

              {winner && (
                <>
                  <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mt-2 mb-1">
                    {winner.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      {winner.gender}
                    </span>
                    <span className="text-xs text-slate-400">
                      {className}
                    </span>
                  </div>

                  {/* Activity Points Quick Award */}
                  <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>{isKm ? 'ផ្ដល់ពិន្ទុសកម្មភាព៖' : 'Award Activity Points:'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 5].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => handleAwardPoints(winner.id, pts)}
                          className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          +{pts}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowWinnerModal(false);
                    setTimeout(() => handleStartPick(), 200);
                  }}
                  className="flex-1 py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isKm ? 'ហៅបន្ទាប់' : 'Pick Next'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWinnerModal(false)}
                  className={`px-5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                    isDarkMode ? 'bg-white/10 hover:bg-white/20 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {isKm ? 'បិទ' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
