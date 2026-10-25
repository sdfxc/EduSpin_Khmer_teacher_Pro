import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Music, Settings, 
  Shuffle, Maximize2, Minimize2, Trophy, Award, Sparkles, X, 
  Check, Star, Users, Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../types';
import { 
  playWhistleSound, playQuackSound, playSplashSound, 
  playWinnerSound, playApplauseSound, startRaceMusic, stopRaceMusic,
  isSoundEnabled, setSoundEnabled 
} from '../lib/soundUtils';
import { useLanguage } from '../context/LanguageContext';

interface DuckRaceGameProps {
  students: Student[];
  pickedIds: string[];
  manualCalledIds?: string[];
  onSetPickedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onAwardActivityPoints?: (studentId: string, points: number) => void;
  onSetExactActivityScore?: (studentId: string, exactScore: number) => void;
  isDarkMode?: boolean;
  className?: string;
  onSelectStudent?: (student: Student) => void;
}

// Duck accessories
type DuckAccessory = 'crown' | 'pirate' | 'wizard' | 'flower' | 'glasses' | 'cap' | 'broom' | 'none';

interface DuckRacer {
  id: string;
  student: Student;
  name: string;
  number: number;
  color: string;
  accessory: DuckAccessory;
  x: number; // 0 to 100 percentage of track
  laneY: number; // Y position in pixels
  speed: number;
  burstTimer: number;
  isBursting: boolean;
  finished: boolean;
  finishTime: number | null;
  rank: number | null;
  phase: number; // For bobbing sine wave
}

const DUCK_COLORS = [
  '#fbc02d', // Classic Yellow
  '#f06292', // Bright Pink
  '#4caf50', // Vibrant Green
  '#29b6f6', // Sky Blue
  '#ff9800', // Cheerful Orange
  '#ab47bc', // Royal Purple
  '#ef5350', // Poppy Red
  '#26a69a', // Mint Teal
  '#ffd54f', // Warm Golden
  '#ba68c8', // Lavender
];

const ACCESSORIES: DuckAccessory[] = ['crown', 'pirate', 'wizard', 'flower', 'glasses', 'cap', 'broom', 'none'];

export default function DuckRaceGame({
  students,
  pickedIds,
  manualCalledIds = [],
  onSetPickedIds,
  onAwardActivityPoints,
  onSetExactActivityScore,
  isDarkMode = false,
  className = 'ថ្នាក់រៀន',
  onSelectStudent
}: DuckRaceGameProps) {
  const { language } = useLanguage();

  // Settings
  const [raceDuration, setRaceDuration] = useState<number>(10); // in seconds
  const [winnerPodiumCount, setWinnerPodiumCount] = useState<1 | 3>(1);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [musicActive, setMusicActive] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Race state
  const [raceStatus, setRaceStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(10); // seconds left
  const [winnerDucks, setWinnerDucks] = useState<DuckRacer[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const riverRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const raceStartTimeRef = useRef<number>(0);

  // Available students (exclude already picked if needed)
  const availableStudents = useMemo(() => {
    const list = students.filter(s => !pickedIds.includes(s.id) && !manualCalledIds.includes(s.id));
    return list.length > 0 ? list : students; // fallback to all students if all called
  }, [students, pickedIds, manualCalledIds]);

  // Generate initial duck racers
  const [racers, setRacers] = useState<DuckRacer[]>([]);

  // Initialize/Reset racers when available students or shuffleSeed changes
  const initRacers = useCallback(() => {
    if (availableStudents.length === 0) {
      setRacers([]);
      return;
    }

    const laneHeight = 72; // pixels per duck lane for comfortable clearance
    const topOffset = 76; // position under top river bank
    const newRacers: DuckRacer[] = availableStudents.map((s, idx) => {
      // Pick color and accessory with pseudorandom variance
      const color = DUCK_COLORS[(idx + shuffleSeed) % DUCK_COLORS.length];
      const accessory = ACCESSORIES[(idx * 3 + shuffleSeed) % ACCESSORIES.length];

      return {
        id: s.id,
        student: s,
        name: s.name,
        number: idx + 1,
        color,
        accessory,
        x: 0, // at starting line
        laneY: idx * laneHeight + topOffset,
        speed: 1.0,
        burstTimer: Math.random() * 2 + 1,
        isBursting: false,
        finished: false,
        finishTime: null,
        rank: null,
        phase: Math.random() * Math.PI * 2,
      };
    });

    setRacers(newRacers);
    setTimeLeft(raceDuration);
    setRaceStatus('idle');
    setWinnerDucks([]);
    setShowWinnerModal(false);
  }, [availableStudents, raceDuration, shuffleSeed]);

  useEffect(() => {
    initRacers();
  }, [initRacers]);

  // Handle start race
  const handleStartRace = () => {
    if (racers.length === 0) return;

    if (raceStatus === 'idle') {
      playWhistleSound();
      if (musicActive) {
        startRaceMusic();
      }
      setRaceStatus('running');
      setTimeLeft(raceDuration);
      lastTimeRef.current = performance.now();
      raceStartTimeRef.current = performance.now();
    } else if (raceStatus === 'paused') {
      if (musicActive) startRaceMusic();
      setRaceStatus('running');
      lastTimeRef.current = performance.now();
    }
  };

  const handlePauseRace = () => {
    setRaceStatus('paused');
    stopRaceMusic();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const handleResetRace = () => {
    stopRaceMusic();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    initRacers();
  };

  const handleShuffleCharacters = () => {
    setShuffleSeed(prev => prev + 1);
    playQuackSound();
  };

  const toggleMusic = () => {
    const next = !musicActive;
    setMusicActive(next);
    if (next && raceStatus === 'running') {
      startRaceMusic();
    } else {
      stopRaceMusic();
    }
  };

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) playQuackSound();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Main physics loop
  useEffect(() => {
    if (raceStatus !== 'running') return;

    let finishedCount = 0;
    const finishDistance = 91.5; // percentage X where ducks cross the checkered line

    const updateLoop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Update timer countdown
      setTimeLeft(prev => {
        const next = Math.max(0, prev - delta);
        return next;
      });

      // Calculate progress factor based on duration
      const baseSpeedRate = (finishDistance / raceDuration) * 0.98; // average speed needed to reach finish

      setRacers(prevRacers => {
        const updated = prevRacers.map(duck => {
          if (duck.finished) return duck;

          // Random quack sound occasionally during surges
          let isBursting = duck.isBursting;
          let burstTimer = duck.burstTimer - delta;
          let speedMultiplier = 1.0;

          if (burstTimer <= 0) {
            if (isBursting) {
              isBursting = false;
              burstTimer = Math.random() * 2.5 + 1.2; // wait before next burst
            } else {
              isBursting = true;
              burstTimer = Math.random() * 0.9 + 0.5; // burst duration
              // Play quack on leading surges occasionally
              if (Math.random() < 0.15 && soundActive) {
                playQuackSound();
              }
            }
          }

          if (isBursting) {
            speedMultiplier = 1.6 + Math.random() * 0.6; // super burst
          } else {
            speedMultiplier = 0.8 + Math.random() * 0.45; // normal wave rhythm
          }

          const moveDelta = baseSpeedRate * speedMultiplier * delta;
          const newX = duck.x + moveDelta;

          // Check if duck crosses finish line
          if (newX >= finishDistance && !duck.finished) {
            finishedCount++;
            return {
              ...duck,
              x: finishDistance + (Math.random() * 2),
              finished: true,
              finishTime: now - raceStartTimeRef.current,
              rank: finishedCount,
              isBursting: false,
              burstTimer: 0,
            };
          }

          return {
            ...duck,
            x: newX,
            isBursting,
            burstTimer,
          };
        });

        return updated;
      });

      // Check if race ends: Either timer hits 0 OR enough ducks have finished
      const allDone = racers.some(d => d.finished && d.rank === 1);
      const isTimeUp = (now - raceStartTimeRef.current) >= (raceDuration * 1000);

      if (allDone || isTimeUp) {
        // Complete the race
        setRacers(finalRacers => {
          // Sort racers by X distance (or finish rank if already finished)
          const sorted = [...finalRacers].sort((a, b) => {
            if (a.rank && b.rank) return a.rank - b.rank;
            if (a.rank) return -1;
            if (b.rank) return 1;
            return b.x - a.x;
          });

          const rankedRacers = sorted.map((d, index) => ({
            ...d,
            rank: index + 1,
            finished: true
          }));

          const winners = rankedRacers.slice(0, winnerPodiumCount);
          setWinnerDucks(winners);
          setRaceStatus('finished');
          stopRaceMusic();

          // Celebration
          playWinnerSound();
          playApplauseSound();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#fbc02d', '#29b6f6', '#ff9800', '#ab47bc', '#4caf50']
          });

          setTimeout(() => {
            setShowWinnerModal(true);
          }, 600);

          return rankedRacers;
        });
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [raceStatus, raceDuration, soundActive, winnerPodiumCount]);

  // Format timer into 00:00:SS or MM:SS:MS
  const formattedTimer = useMemo(() => {
    const totalSecs = Math.max(0, timeLeft);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const tenths = Math.floor((totalSecs % 1) * 10);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `00:${pad(mins)}:${pad(secs)}`;
  }, [timeLeft]);

  // Award activity score to winner
  const handleAwardWinner = (points: number) => {
    if (!winnerDucks[0] || !onAwardActivityPoints) return;
    onAwardActivityPoints(winnerDucks[0].student.id, points);
    playApplauseSound();
  };

  // Exclude / Mark as Called
  const handleExcludeWinner = () => {
    if (!winnerDucks[0]) return;
    const winnerId = winnerDucks[0].student.id;
    onSetPickedIds(prev => [...prev, winnerId]);
    setShowWinnerModal(false);
    initRacers();
  };

  const totalTrackHeight = Math.max(550, racers.length * 72 + 170);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full flex flex-col overflow-hidden select-none font-sans ${
        isDarkMode ? 'bg-[#0d1527] text-white' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* ===================== TOP CONTROL BAR (Like Screenshot) ===================== */}
      <header className="shrink-0 bg-[#000000] border-b-2 border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-30">
        
        {/* Left: Settings, Music, Sound, Shuffle Characters */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="w-10 h-10 rounded-xl bg-[#222226] hover:bg-[#333338] text-white flex items-center justify-center border border-white/15 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="ការកំណត់ប្រណាំង (Settings)"
          >
            <Settings className="w-5 h-5 text-slate-200" />
          </button>

          {/* Music Toggle */}
          <button
            type="button"
            onClick={toggleMusic}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border cursor-pointer transition-all active:scale-95 shadow-sm ${
              musicActive 
                ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-emerald-500/30' 
                : 'bg-[#222226] hover:bg-[#333338] text-slate-300 border-white/15'
            }`}
            title={musicActive ? 'បិទភ្លេងប្រណាំង' : 'ចាក់ភ្លេងប្រណាំង (Race Music)'}
          >
            <Music className="w-5 h-5" />
          </button>

          {/* Sound FX Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border cursor-pointer transition-all active:scale-95 shadow-sm ${
              soundActive 
                ? 'bg-amber-600/90 text-white border-amber-400 shadow-amber-500/30' 
                : 'bg-[#222226] hover:bg-[#333338] text-slate-400 border-white/15'
            }`}
            title={soundActive ? 'បិទសំឡេង (Sound FX)' : 'បើកសំឡេងកូនទា (Sound FX)'}
          >
            {soundActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Shuffle Characters Pill (Like in screenshot) */}
          <button
            type="button"
            onClick={handleShuffleCharacters}
            disabled={raceStatus === 'running'}
            className="px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 border border-emerald-400/40 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="ផ្លាស់ប្តូរពណ៌ និងមួកកូនទាដោយចៃដន្យ"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Characters</span>
          </button>
        </div>

        {/* Center: Start / Pause / Clear & Giant Digital Timer Box */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 items-end">
            {/* Start / Pause Button */}
            {raceStatus === 'running' ? (
              <button
                type="button"
                onClick={handlePauseRace}
                className="text-base sm:text-lg font-black text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1 transition-all active:scale-95 leading-none"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRace}
                className="text-base sm:text-lg font-black text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 transition-all active:scale-95 leading-none"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start</span>
              </button>
            )}

            {/* Clear / Reset Button */}
            <button
              type="button"
              onClick={handleResetRace}
              className="text-xs sm:text-sm font-bold text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95 leading-none"
            >
              Clear
            </button>
          </div>

          {/* Digital Timer Display (Exact look from user's image) */}
          <div className="px-5 py-2 rounded-2xl bg-[#e6e9ff] text-slate-950 border-4 border-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.5)]">
            <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black tracking-widest select-none">
              {formattedTimer}
            </span>
          </div>
        </div>

        {/* Right: Quick presets, counter, and Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Quick Duration Buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-[#1a1a20] p-1 rounded-xl border border-white/10">
            {[10, 15, 20, 30].map(sec => (
              <button
                key={sec}
                type="button"
                disabled={raceStatus === 'running'}
                onClick={() => {
                  setRaceDuration(sec);
                  setTimeLeft(sec);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  raceDuration === sec 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Student Racers Count */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-black">
            <Users className="w-3.5 h-3.5" />
            <span>{racers.length} ទា</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-xl bg-[#222226] hover:bg-[#333338] text-white flex items-center justify-center border border-white/15 cursor-pointer transition-all active:scale-95 shadow-sm"
            title={isFullscreen ? 'បិទពេញអេក្រង់' : 'ពេញអេក្រង់សម្រាប់បញ្ចាំង Projector (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ===================== MAIN RACE TRACK (RIVER & DUCKS) ===================== */}
      <div 
        ref={riverRef}
        className="flex-1 w-full relative overflow-y-auto overflow-x-hidden scrollbar-thin bg-[#0284c7]"
      >
        {/* Full-Height Race River Canvas - Stretches from top down through all ducks to bottom riverbank */}
        <div 
          className="relative w-full min-h-full"
          style={{
            height: `${totalTrackHeight}px`,
            background: 'linear-gradient(180deg, #2e7d32 0px, #388e3c 45px, #6d4c41 54px, #795548 62px, #0284c7 72px, #0369a1 160px, #0284c7 50%, #0369a1 calc(100% - 85px), #795548 calc(100% - 68px), #6d4c41 calc(100% - 58px), #388e3c calc(100% - 45px), #2e7d32 100%)'
          }}
        >
          {/* Animated Water Ripples Layer (ទឹករលក) covering 100% of the entire track down to bottom */}
          <div className="absolute inset-0 pointer-events-none opacity-50 overflow-hidden">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="riverWavesPattern" width="140" height="48" patternUnits="userSpaceOnUse">
                  {/* Primary Wave Crest */}
                  <path d="M 0 24 Q 35 12 70 24 T 140 24" fill="none" stroke="#e0f2fe" strokeWidth="2.6" opacity="0.65" />
                  {/* Secondary Ripple */}
                  <path d="M 0 38 Q 35 28 70 38 T 140 38" fill="none" stroke="#bae6fd" strokeWidth="1.8" opacity="0.5" />
                  {/* Fine Shimmer Ripple */}
                  <path d="M 0 10 Q 35 2 70 10 T 140 10" fill="none" stroke="#7dd3fc" strokeWidth="1.4" opacity="0.35" />
                  {/* Water Sparkles */}
                  <circle cx="28" cy="22" r="1.5" fill="#ffffff" opacity="0.75" />
                  <circle cx="98" cy="36" r="1.5" fill="#ffffff" opacity="0.75" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" y="62" fill="url(#riverWavesPattern)" />
            </svg>
          </div>

          {/* Lane Divider Lines & Buoys for EVERY duck (គន្លងប្រណាំងពេញទាំងអស់គ្រប់ទា) */}
          {racers.map((duck) => {
            const laneBottom = duck.laneY + 70;
            return (
              <div 
                key={`lane-guide-${duck.id}`}
                className="absolute left-0 right-0 pointer-events-none z-10 flex items-center"
                style={{ top: `${laneBottom}px` }}
              >
                <div className="w-full border-b border-sky-200/25 border-dashed relative">
                  {/* Floating lane buoy floats */}
                  <div className="absolute left-[25%] -top-1.5 w-3 h-3 rounded-full bg-amber-400 border border-amber-600/70 shadow-sm opacity-60" />
                  <div className="absolute left-[50%] -top-2 w-4 h-4 rounded-full bg-red-500 border border-white shadow-sm opacity-75 flex items-center justify-center text-[8px] text-white font-black">
                    50%
                  </div>
                  <div className="absolute left-[75%] -top-1.5 w-3 h-3 rounded-full bg-amber-400 border border-amber-600/70 shadow-sm opacity-60" />
                </div>
              </div>
            );
          })}

          {/* Top Grass Bank with Little Bushes, Flowers & Trees */}
          <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-25 flex items-center justify-between px-6 bg-gradient-to-b from-[#2e7d32] to-[#388e3c] border-b-2 border-[#795548] shadow-sm select-none">
            <div className="flex items-center gap-6 opacity-90">
              <span className="text-xl">🌿</span>
              <span className="text-2xl">🌳</span>
              <span className="text-base">🌸</span>
              <span className="text-lg">🌱</span>
              <span className="text-2xl">🌳</span>
              <span className="text-base">🌼</span>
              <span className="text-lg">🌿</span>
            </div>
            <div className="text-white/90 font-black text-xs tracking-wider flex items-center gap-2 drop-shadow-sm">
              <span>🏊‍♂️ ទន្លេប្រណាំងកូនទា (DUCK RIVER RACEWAY)</span>
            </div>
            <div className="flex items-center gap-6 opacity-90">
              <span className="text-xl">🌳</span>
              <span className="text-base">🌸</span>
              <span className="text-lg">🌱</span>
              <span className="text-2xl">🌳</span>
              <span className="text-xl">🌿</span>
            </div>
          </div>

          {/* ===================== CHECKERED STARTING LINE (Straight Vertical Line - Not Skewed) ===================== */}
          <div 
            className="absolute left-[245px] sm:left-[275px] w-7 sm:w-8 pointer-events-none z-30 border-x-2 border-black/40 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            style={{
              top: '0px',
              bottom: '0px',
              transform: 'none',
              background: 'repeating-conic-gradient(#000000 0% 25%, #ffffff 0% 50%) 50% / 16px 16px',
            }}
          >
            {/* Top Sign - High z-index & completely visible above top bank */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-slate-950 text-white text-[11px] sm:text-xs font-black whitespace-nowrap border-2 border-amber-400 shadow-2xl z-35 flex items-center gap-1.5 ring-2 ring-black/60">
              <span className="text-amber-400">🏁</span>
              <span>START</span>
              <span className="text-amber-400">🏁</span>
            </div>

            {/* Mid Track Floating Badges - Ensures START text is NEVER lost or obscured while scrolling */}
            <div className="absolute top-1/4 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-950/90 text-[10px] font-black text-amber-300 border border-amber-400/80 shadow-md whitespace-nowrap z-30">
              🏁 START
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-950/90 text-[10px] font-black text-amber-300 border border-amber-400/80 shadow-md whitespace-nowrap z-30">
              🏁 START
            </div>
            <div className="absolute top-3/4 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-950/90 text-[10px] font-black text-amber-300 border border-amber-400/80 shadow-md whitespace-nowrap z-30">
              🏁 START
            </div>

            {/* Bottom Sign - High z-index & completely visible above bottom bank */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-slate-950 text-white text-[11px] sm:text-xs font-black whitespace-nowrap border-2 border-amber-400 shadow-2xl z-35 flex items-center gap-1.5 ring-2 ring-black/60">
              <span className="text-amber-400">🏁</span>
              <span>START</span>
              <span className="text-amber-400">🏁</span>
            </div>
          </div>

          {/* ===================== CHECKERED FINISH LINE ===================== */}
          <div 
            className="absolute right-8 sm:right-16 w-9 sm:w-10 pointer-events-none z-30 border-x-2 border-black/40 shadow-[0_0_18px_rgba(0,0,0,0.6)]"
            style={{
              top: '0px',
              bottom: '0px',
              transform: 'none',
              background: 'repeating-conic-gradient(#000000 0% 25%, #ffffff 0% 50%) 50% / 18px 18px',
            }}
          >
            {/* Finish Line Top Sign - High z-index & completely visible */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-xs sm:text-sm shadow-2xl whitespace-nowrap border-2 border-white z-35 flex items-center gap-1.5 animate-pulse ring-2 ring-red-950/40">
              <span>🏁</span>
              <span>FINISH</span>
              <span>🏆</span>
            </div>

            {/* Mid Track Floating Badges - Ensures FINISH text is NEVER lost or obscured while scrolling */}
            <div className="absolute top-1/4 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-red-600/90 text-[10px] font-black text-white border border-white/80 shadow-md whitespace-nowrap z-30">
              🏆 FINISH 🏁
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-red-600/90 text-[10px] font-black text-white border border-white/80 shadow-md whitespace-nowrap z-30">
              🏆 FINISH 🏁
            </div>
            <div className="absolute top-3/4 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-red-600/90 text-[10px] font-black text-white border border-white/80 shadow-md whitespace-nowrap z-30">
              🏆 FINISH 🏁
            </div>

            {/* Finish Line Bottom Sign - High z-index & completely visible */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-xs sm:text-sm shadow-2xl whitespace-nowrap border-2 border-white z-35 flex items-center gap-1.5 ring-2 ring-red-950/40">
              <span>🏁</span>
              <span>FINISH</span>
              <span>🏆</span>
            </div>
          </div>

          {/* Bottom Grass Riverbank with Shore, Stones, Flowers & Ducks Nest */}
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-25 flex items-center justify-between px-6 bg-gradient-to-t from-[#2e7d32] to-[#388e3c] border-t-2 border-[#795548] shadow-md select-none">
            <div className="flex items-center gap-6 opacity-90">
              <span className="text-xl">🌾</span>
              <span className="text-xl">🪨</span>
              <span className="text-lg">🌱</span>
              <span className="text-2xl">🌳</span>
              <span className="text-base">🌸</span>
              <span className="text-xl">🌿</span>
            </div>
            <div className="text-white/90 font-bold text-xs flex items-center gap-2 drop-shadow-sm">
              <span>🦆 សរុបបេក្ខជន៖ {racers.length} កូនទា • គន្លងប្រណាំងពេញលេញដល់ក្រោម 🏁</span>
            </div>
            <div className="flex items-center gap-6 opacity-90">
              <span className="text-xl">🌿</span>
              <span className="text-base">🌼</span>
              <span className="text-2xl">🌳</span>
              <span className="text-xl">🪨</span>
              <span className="text-xl">🌾</span>
            </div>
          </div>

          {/* ===================== DUCKS TRACK CONTENT ===================== */}
          {racers.map((duck) => {
            // Calculate bobbing motion
            const bobbingY = raceStatus === 'running' ? Math.sin((timeLeft * 6) + duck.phase) * 5 : 0;
            const tiltRotate = raceStatus === 'running' ? Math.sin((timeLeft * 4) + duck.phase) * 4 : 0;

            return (
              <div
                key={duck.id}
                onClick={() => onSelectStudent && onSelectStudent(duck.student)}
                style={{
                  top: `${duck.laneY}px`,
                  left: `calc(10px + (100% - 240px) * (${duck.x} / 100))`,
                  transform: `translateY(${bobbingY}px) rotate(${tiltRotate}deg)`,
                  transition: raceStatus === 'idle' ? 'all 0.4s ease-out' : 'none'
                }}
                className="absolute flex items-center gap-1.5 cursor-pointer z-20 group"
              >
                {/* Speech Bubble / Name Tag behind duck (Exact style from screenshot) */}
                <div className="relative shrink-0 flex items-center">
                  <div className="bg-white text-slate-950 font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-2xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.9)] whitespace-nowrap max-w-[170px] sm:max-w-[210px] truncate group-hover:scale-105 transition-transform">
                    {duck.name}
                  </div>
                  {/* Little speech tail pointing to duck */}
                  <div className="w-2.5 h-2.5 bg-white border-t-2 border-r-2 border-black rotate-45 -ml-1.5 z-10" />
                </div>

                {/* The Rubber Duck SVG Avatar */}
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 filter drop-shadow-md">
                  {/* Water Ripple circle underneath duck */}
                  <div className="absolute -bottom-1 left-2 w-14 h-4 bg-sky-200/60 rounded-full blur-[1px] animate-pulse pointer-events-none" />

                  {/* Swimming wake foam & ripples when race is running */}
                  {raceStatus === 'running' && (
                    <>
                      <div className="absolute bottom-0 -left-6 w-9 h-3 border-b-2 border-white/70 rounded-full pointer-events-none animate-ping" style={{ animationDuration: '1.2s' }} />
                      <div className="absolute bottom-1 -left-10 w-7 h-2 border-b border-sky-100/60 rounded-full pointer-events-none" />
                      <div className="absolute -bottom-1 -left-3 text-[10px] pointer-events-none opacity-80 select-none">🫧</div>
                    </>
                  )}

                  {/* Duck Hat / Accessory */}
                  <div className="absolute -top-3.5 left-2 z-10 pointer-events-none select-none">
                    {duck.accessory === 'crown' && (
                      <span className="text-xl filter drop-shadow">👑</span>
                    )}
                    {duck.accessory === 'pirate' && (
                      <span className="text-xl filter drop-shadow">🏴‍☠️</span>
                    )}
                    {duck.accessory === 'wizard' && (
                      <span className="text-xl filter drop-shadow">🧙</span>
                    )}
                    {duck.accessory === 'flower' && (
                      <span className="text-xl filter drop-shadow">🌸</span>
                    )}
                    {duck.accessory === 'glasses' && (
                      <span className="text-xl filter drop-shadow">🕶️</span>
                    )}
                    {duck.accessory === 'cap' && (
                      <span className="text-xl filter drop-shadow">🧢</span>
                    )}
                    {duck.accessory === 'broom' && (
                      <span className="text-lg filter drop-shadow">🧹</span>
                    )}
                  </div>

                  {/* High Quality Rubber Duck SVG */}
                  <svg 
                    viewBox="0 0 100 90" 
                    className="w-full h-full select-none"
                  >
                    {/* Duck Body */}
                    <path 
                      d="M 25 55 C 20 65, 30 82, 55 82 C 78 82, 90 70, 85 55 C 80 42, 65 48, 55 48 C 45 48, 32 45, 25 55 Z" 
                      fill={duck.color} 
                      stroke="#000000" 
                      strokeWidth="3.2" 
                    />
                    
                    {/* Duck Wing */}
                    <path 
                      d="M 38 62 C 45 60, 58 64, 52 74 C 44 76, 35 70, 38 62 Z" 
                      fill="#000000" 
                      fillOpacity="0.12" 
                      stroke="#000000" 
                      strokeWidth="2.5" 
                    />

                    {/* Duck Tail Tip */}
                    <path 
                      d="M 18 52 C 22 50, 26 56, 20 62 Z" 
                      fill={duck.color} 
                      stroke="#000000" 
                      strokeWidth="2.5" 
                    />

                    {/* Duck Head */}
                    <circle 
                      cx="66" 
                      cy="36" 
                      r="19" 
                      fill={duck.color} 
                      stroke="#000000" 
                      strokeWidth="3.2" 
                    />

                    {/* Cute Eye */}
                    <circle cx="72" cy="30" r="4.5" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
                    <circle cx="73.5" cy="30" r="2.5" fill="#000000" />
                    <circle cx="74.5" cy="28.5" r="1.2" fill="#ffffff" />

                    {/* Orange Beak / Bill */}
                    <path 
                      d="M 83 36 C 96 36, 97 44, 85 45 C 81 45, 80 40, 83 36 Z" 
                      fill="#ff6d00" 
                      stroke="#000000" 
                      strokeWidth="2.8" 
                    />

                    {/* Number Badge Pill on Duck Side */}
                    <g transform="translate(32, 60)">
                      <rect 
                        width="18" 
                        height="14" 
                        rx="7" 
                        fill="#ffffff" 
                        stroke="#000000" 
                        strokeWidth="1.8" 
                      />
                      <text 
                        x="9" 
                        y="10.5" 
                        textAnchor="middle" 
                        fontSize="9" 
                        fontWeight="900" 
                        fill="#000000" 
                        fontFamily="sans-serif"
                      >
                        {duck.number}
                      </text>
                    </g>
                  </svg>

                  {/* Turbo Quack Splash Sparks during burst */}
                  {duck.isBursting && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      className="absolute -top-3 -right-2 text-xs select-none"
                    >
                      💨⚡
                    </motion.div>
                  )}

                  {/* Rank Flag if finished */}
                  {duck.rank && (
                    <div className="absolute -top-2 right-0 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                      #{duck.rank}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================== WINNER CELEBRATION MODAL ===================== */}
      <AnimatePresence>
        {showWinnerModal && winnerDucks.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative overflow-hidden text-center ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-[#121829] border-white/20 text-white' 
                  : 'bg-gradient-to-b from-white via-white to-amber-50/50 border-slate-200 text-slate-900'
              }`}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:scale-105 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Triumphant Header */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-500 font-black text-xs mb-3">
                <Trophy className="w-4 h-4 animate-bounce" />
                <span>ជ័យលាភីប្រណាំងកូនទា (Duck Race Champion)</span>
              </div>

              {/* Big Champion Display */}
              <div className="my-4 flex flex-col items-center">
                <div className="relative">
                  <span className="text-6xl animate-pulse">🦆</span>
                  <span className="absolute -top-3 -right-2 text-4xl">👑</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black mt-2 text-amber-500 drop-shadow-sm">
                  {winnerDucks[0].name}
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                  ទាលេខ #{winnerDucks[0].number} • ឈ្នះចំណាត់ថ្នាក់លេខ ១!
                </p>
              </div>

              {/* If Top 3 Mode, display 2nd and 3rd runners up */}
              {winnerDucks.length > 1 && (
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  {winnerDucks[1] && (
                    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-900 font-bold">
                      <span className="text-base">🥈</span>
                      <span className="truncate">លេខ ២: {winnerDucks[1].name}</span>
                    </div>
                  )}
                  {winnerDucks[2] && (
                    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-900 font-bold">
                      <span className="text-base">🥉</span>
                      <span className="truncate">លេខ ៣: {winnerDucks[2].name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Award Activity Points Actions */}
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                  🌟 ផ្តល់ពិន្ទុសកម្មភាពដល់ជ័យលាភី៖
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAwardWinner(1)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    +1 ពិន្ទុ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAwardWinner(2)}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    +2 ពិន្ទុ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAwardWinner(5)}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    +5 ពិន្ទុ
                  </button>
                </div>
              </div>

              {/* Next Round Controls */}
              <div className="flex items-center justify-between gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleExcludeWinner}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-600 dark:text-rose-400 font-black text-xs border border-rose-500/30 cursor-pointer transition-all active:scale-95"
                  title="ដកឈ្មោះសិស្សនេះចេញពីការប្រណាំងបន្ទាប់ ដើម្បីឱ្យសិស្សផ្សេងទៀតមានឱកាស"
                >
                  ដកឈ្មោះចេញ (ហៅរួច)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWinnerModal(false);
                    handleResetRace();
                    setTimeout(handleStartRace, 300);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ប្រណាំងម្តងទៀត</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== SETTINGS MODAL ===================== */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl relative ${
                isDarkMode ? 'bg-[#181820] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  <span>ការកំណត់ប្រណាំងកូនទា (Race Settings)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 py-4 text-xs font-bold">
                {/* Race Duration */}
                <div>
                  <label className="block mb-1.5 text-slate-500 dark:text-slate-400">
                    ⏱️ រយៈពេលប្រណាំង (Race Duration):
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20, 30, 45, 60].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setRaceDuration(s);
                          setTimeLeft(s);
                        }}
                        className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          raceDuration === s 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Winners */}
                <div>
                  <label className="block mb-1.5 text-slate-500 dark:text-slate-400">
                    🏆 ចំនួនជ័យលាភី (Podium Winners):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWinnerPodiumCount(1)}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        winnerPodiumCount === 1
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      🥇 លេខ ១ តែមួយ (Single Winner)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWinnerPodiumCount(3)}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        winnerPodiumCount === 3
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      🏆 កំពូលទាំង ៣ (Top 3 Podium)
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all cursor-pointer"
              >
                យល់ព្រម (Save)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
