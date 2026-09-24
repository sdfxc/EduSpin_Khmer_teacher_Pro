import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, X, Sparkles, CheckCircle2, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, Group } from '../types';

interface SpinWheelGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  numGroups: number;
  isDarkMode: boolean;
  onCompleteDivision: (resultGroups: Group[], shuffleStats: any) => void;
  onStepProgress?: (currentGroups: Group[]) => void;
  generateBalancedGroups: (students: Student[], numGroups: number) => { groups: Group[]; stats: any };
}

// Colors for wheel slices matching image 2
const WHEEL_COLORS = [
  '#ec4899', // Pink
  '#10b981', // Emerald / Green
  '#f59e0b', // Orange / Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#6366f1', // Indigo / Purple
  '#ef4444', // Red / Coral
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#f97316', // Deep Orange
  '#a855f7', // Purple
  '#059669', // Deep Green
];

// Web Audio Helper for tick and fanfare sounds
const playWebAudioSound = (type: 'tick' | 'win' | 'deal') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 100, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === 'deal') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    }
  } catch (e) {
    // AudioContext might be blocked until user gesture, safe to catch
  }
};

export const SpinWheelGroupModal: React.FC<SpinWheelGroupModalProps> = ({
  isOpen,
  onClose,
  students,
  numGroups,
  isDarkMode,
  onCompleteDivision,
  onStepProgress,
  generateBalancedGroups,
}) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [dealingStatusText, setDealingStatusText] = useState('');
  const [dealtStudentName, setDealtStudentName] = useState<string | null>(null);
  const [dealingGroupTarget, setDealingGroupTarget] = useState<string | null>(null);
  const [hasSpun, setHasSpun] = useState(false);

  const wheelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Filter valid students
  const activeStudents = students && students.length > 0 ? students : [];
  const sliceCount = Math.max(activeStudents.length, 1);
  const sliceAngle = 360 / sliceCount;

  // Draw Canvas Wheel
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 12;

    ctx.clearRect(0, 0, size, size);

    // Draw outer shadow / ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = isDarkMode ? '#1e1b4b' : '#f1f5f9';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Draw Slices
    activeStudents.forEach((student, index) => {
      const startAngle = (index * sliceAngle * Math.PI) / 180;
      const endAngle = ((index + 1) * sliceAngle * Math.PI) / 180;
      const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

      // Draw Sector
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();

      // Draw Text along radius
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + (sliceAngle * Math.PI) / 360);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Kantumruy Pro", "Battambang", sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Truncate long names if slice is small
      let displayName = student.name;
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 14) + '...';
      }
      ctx.fillText(displayName, radius - 20, 5);
      ctx.restore();
    });

    // Draw Inner Center Hub Border
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 42, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6366f1';
    ctx.stroke();
    ctx.restore();
  }, [isOpen, activeStudents, sliceAngle, isDarkMode]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setIsSpinning(false);
      setIsDealing(false);
      setHasSpun(false);
      setDealingStatusText('ចុចប៊ូតុងកណ្ដាល ឬ «បង្វិលកង់» ដើម្បីចាប់ផ្ដើមបែងចែកក្រុម');
      setDealtStudentName(null);
      setDealingGroupTarget(null);
    }
  }, [isOpen]);

  // Handle Wheel Spin
  const handleSpinWheel = () => {
    if (isSpinning || isDealing || activeStudents.length === 0) return;

    setIsSpinning(true);
    setDealingStatusText('កំពុងបង្វិលកង់សំណាង...');

    // Generate calculated groups ready for distribution
    const { groups: finalGroups, stats } = generateBalancedGroups(activeStudents, numGroups);

    // Compute random extra rotations (between 5 and 8 full turns + random degrees)
    const extraTurns = 5 + Math.floor(Math.random() * 4);
    const randomDegree = Math.floor(Math.random() * 360);
    const totalNewRotation = rotation + extraTurns * 360 + randomDegree;

    setRotation(totalNewRotation);

    // Tick sounds during rotation simulation
    let tickCount = 0;
    const maxTicks = 28;
    const tickInterval = setInterval(() => {
      if (tickCount < maxTicks) {
        playWebAudioSound('tick');
        tickCount++;
      } else {
        clearInterval(tickInterval);
      }
    }, 120);

    // After rotation animation ends (3500ms)
    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setHasSpun(true);
      playWebAudioSound('win');

      // Start Dealing Animation round-by-round into groups
      startDealingAnimation(finalGroups, stats);
    }, 3600);
  };

  // Staggered animated deal of students into group cards
  const startDealingAnimation = async (finalGroups: Group[], stats: any) => {
    setIsDealing(true);
    setDealingStatusText('🎉 កំពុងបែងចែកសិស្សចូលក្នុងក្រុមនីមួយៗ...');

    // Initialize temporary empty group shells
    const currentProgressGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `ក្រុមទី${i + 1}`,
      members: [],
    }));

    if (onStepProgress) {
      onStepProgress(currentProgressGroups);
    }

    // Find the max number of members in any group
    const maxMembers = Math.max(...finalGroups.map(g => g.members.length));

    // Deal round-by-round (e.g. member 0 of all groups, then member 1 of all groups...)
    for (let round = 0; round < maxMembers; round++) {
      for (let gIndex = 0; gIndex < finalGroups.length; gIndex++) {
        const targetMember = finalGroups[gIndex].members[round];
        if (targetMember) {
          // Add this member to the progressive groups state
          currentProgressGroups[gIndex].members.push({ ...targetMember });
          
          setDealtStudentName(targetMember.name);
          setDealingGroupTarget(`ក្រុមទី${gIndex + 1}`);
          playWebAudioSound('deal');

          if (onStepProgress) {
            onStepProgress([...currentProgressGroups.map(g => ({ ...g, members: [...g.members] }))]);
          }

          // Small delay between each student placement for smooth visual flow
          await new Promise(resolve => setTimeout(resolve, 140));
        }
      }
    }

    // Finished dealing all students!
    setDealingStatusText('✨ បានបែងចែកសិស្សគ្រប់ក្រុមដោយជោគជ័យ!');
    setDealtStudentName(null);
    setDealingGroupTarget(null);

    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'],
    });

    // Save final groups & close modal after brief celebration
    setTimeout(() => {
      onCompleteDivision(finalGroups, stats);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border transition-all duration-300 relative flex flex-col items-center ${
          isDarkMode ? 'bg-[#0f172a] border-indigo-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSpinning || isDealing}
          className={`absolute top-5 right-5 p-2 rounded-2xl border transition-all cursor-pointer ${
            isDarkMode 
              ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700' 
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-500 mb-2 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>បែងចែកក្រុមស្វ័យប្រវត្តិតាមកង់សំណាង</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans">
            បង្វិលកង់បែងចែកក្រុម
          </h2>
          <p className={`text-xs mt-1 font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            សិស្សសរុប {activeStudents.length} នាក់ • បែងចែកជា {numGroups} ក្រុមស្មើគ្នា
          </p>
        </div>

        {/* Spin Wheel Container */}
        <div className="relative flex items-center justify-center my-2 select-none">
          {/* Top Pointer (Red Triangle Arrow pointing down) */}
          <div 
            className="absolute -top-3 z-30 flex flex-col items-center"
            style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))' }}
          >
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[26px] border-t-rose-500 rounded-xs" />
          </div>

          {/* Rotating Wheel canvas wrapper */}
          <div
            ref={wheelRef}
            className="relative rounded-full shadow-2xl transition-transform duration-[3600ms]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.25, 1.0)',
            }}
          >
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="rounded-full max-w-[290px] max-h-[290px] sm:max-w-[340px] sm:max-h-[340px]"
            />
          </div>

          {/* Center Play Button Overlay */}
          <button
            type="button"
            onClick={handleSpinWheel}
            disabled={isSpinning || isDealing || activeStudents.length === 0}
            className={`absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer active:scale-95 border-4 ${
              isSpinning || isDealing
                ? 'bg-slate-400 border-white text-white opacity-80 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 border-white text-white shadow-indigo-600/40 animate-pulse'
            }`}
            title="ចុចដើម្បីបង្វិល"
          >
            <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
          </button>
        </div>

        {/* Live Status and Dealing Notification */}
        <div className={`mt-5 w-full p-4 rounded-2xl border text-center transition-all ${
          isDealing 
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            : isDarkMode 
              ? 'bg-slate-900/60 border-slate-800 text-slate-300' 
              : 'bg-slate-50 border-slate-100 text-slate-700'
        }`}>
          {isDealing && dealtStudentName ? (
            <div className="flex items-center justify-center gap-3 animate-in fade-in zoom-in-95">
              <span className="text-xl animate-bounce">🎯</span>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-400">កំពុងដាក់សិស្សចូលក្រុម៖</p>
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  <span className="underline decoration-indigo-400">{dealtStudentName}</span> ➔ {dealingGroupTarget}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs font-bold leading-relaxed flex items-center justify-center gap-2">
              {isSpinning && <span className="animate-spin text-indigo-500">⏳</span>}
              {hasSpun && !isDealing && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              <span>{dealingStatusText}</span>
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 w-full flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleSpinWheel}
            disabled={isSpinning || isDealing || activeStudents.length === 0}
            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'កំពុងបង្វិល...' : isDealing ? 'កំពុងបែងចែកសិស្ស...' : 'បង្វិលកង់ (Spin Wheel)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
