import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Flag, Timer, Bell, Volume2, VolumeX, Maximize2, 
  Minimize2, Clock, Sparkles, Award, Users, Shuffle, Trophy, CheckCircle, 
  Zap, Plus, Minus, Settings2, HelpCircle, Eye, EyeOff, Volume1, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StopwatchPanelProps {
  isDarkMode?: boolean;
  activeClassId?: string;
  className?: string;
  onNavigateTab?: (tabId: string) => void;
}

interface LapRecord {
  id: number;
  lapNumber: number;
  lapTime: number; // in ms
  overallTime: number; // in ms
}

interface GroupTimerRecord {
  id: number;
  name: string;
  color: string;
  time: number; // in ms
  isRunning: boolean;
  isFinished: boolean;
  rank?: number;
}

// Sound Synthesizer using Web Audio API (Reliable, no network or asset failures)
class SoundFx {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Soft mechanical tick
  tick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {
      console.warn(e);
    }
  }

  // Countdown beep (for 3, 2, 1)
  beep(isFinal: boolean = false) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const freq = isFinal ? 1046.5 : 659.25; // C6 or E5
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isFinal ? 0.35 : 0.15));
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + (isFinal ? 0.35 : 0.15));
    } catch (e) {
      console.warn(e);
    }
  }

  // Rich School Bell chime
  schoolBell() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.12 + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.12);
        osc.stop(this.ctx.currentTime + idx * 0.12 + 1.2);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // Victory arcade chime
  victory() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      chords.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.22, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.8);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // Interval whistle
  whistle() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1600, this.ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(1100, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      console.warn(e);
    }
  }
}

const sfx = new SoundFx();

export default function StopwatchPanel({
  isDarkMode = false,
  activeClassId = '',
  className = 'ថ្នាក់រៀន',
  onNavigateTab
}: StopwatchPanelProps) {
  // Main widget sub-tab
  const [activeWidget, setActiveWidget] = useState<'stopwatch' | 'countdown' | 'intervals' | 'grouprace' | 'mystery'>('stopwatch');

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tickSoundEnabled, setTickSoundEnabled] = useState(false);
  const [soundType, setSoundType] = useState<'bell' | 'victory' | 'beep'>('bell');

  // Fullscreen container ref
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Theme selection
  const [theme, setTheme] = useState<'cyan' | 'emerald' | 'amber' | 'indigo'>('cyan');

  // =========================================================================
  // 1. STOPWATCH STATE & LOGIC
  // =========================================================================
  const [swTime, setSwTime] = useState<number>(0);
  const [swIsRunning, setSwIsRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const swTimerRef = useRef<number | null>(null);
  const swStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (swIsRunning) {
      swStartTimeRef.current = performance.now() - swTime;
      swTimerRef.current = window.setInterval(() => {
        setSwTime(performance.now() - swStartTimeRef.current);
      }, 10);
    } else {
      if (swTimerRef.current) clearInterval(swTimerRef.current);
    }
    return () => {
      if (swTimerRef.current) clearInterval(swTimerRef.current);
    };
  }, [swIsRunning]);

  const handleSwToggle = () => {
    setSwIsRunning(prev => !prev);
  };

  const handleSwReset = () => {
    setSwIsRunning(false);
    setSwTime(0);
    setLaps([]);
  };

  const handleSwLap = () => {
    if (swTime === 0) return;
    const lastLapOverall = laps.length > 0 ? laps[laps.length - 1].overallTime : 0;
    const lapTime = swTime - lastLapOverall;
    const newLap: LapRecord = {
      id: Date.now(),
      lapNumber: laps.length + 1,
      lapTime,
      overallTime: swTime
    };
    setLaps(prev => [newLap, ...prev]);
  };

  // Find fastest and slowest laps
  const fastestLapTime = laps.length > 1 ? Math.min(...laps.map(l => l.lapTime)) : null;
  const slowestLapTime = laps.length > 1 ? Math.max(...laps.map(l => l.lapTime)) : null;

  // =========================================================================
  // 2. COUNTDOWN TIMER STATE & LOGIC
  // =========================================================================
  const [cdInitialSeconds, setCdInitialSeconds] = useState<number>(180); // Default 3 mins
  const [cdRemainingSeconds, setCdRemainingSeconds] = useState<number>(180);
  const [cdIsRunning, setCdIsRunning] = useState<boolean>(false);
  const [cdIsOvertime, setCdIsOvertime] = useState<boolean>(false);
  const cdTimerRef = useRef<number | null>(null);

  // Classroom quick presets
  const presets = [
    { label: '30 វិនាទី', sub: 'សំណួររហ័ស', seconds: 30, icon: '⚡' },
    { label: '1 នាទី', sub: 'គិតរហ័ស', seconds: 60, icon: '💡' },
    { label: '2 នាទី', sub: 'ពិភាក្សាជាគូ', seconds: 120, icon: '💬' },
    { label: '3 នាទី', sub: 'ពិភាក្សាក្រុម', seconds: 180, icon: '👥' },
    { label: '5 នាទី', sub: 'ធ្វើលំហាត់', seconds: 300, icon: '📝' },
    { label: '10 នាទី', sub: 'បទបង្ហាញ', seconds: 600, icon: '📢' },
    { label: '15 នាទី', sub: 'ការងារគម្រោង', seconds: 900, icon: '🔬' },
    { label: '20 នាទី', sub: 'សម្រាកខ្លី', seconds: 1200, icon: '☕' },
  ];

  const handleSelectPreset = (seconds: number) => {
    setCdIsRunning(false);
    setCdIsOvertime(false);
    setCdInitialSeconds(seconds);
    setCdRemainingSeconds(seconds);
  };

  useEffect(() => {
    if (cdIsRunning) {
      cdTimerRef.current = window.setInterval(() => {
        setCdRemainingSeconds(prev => {
          if (prev <= 1 && !cdIsOvertime) {
            // Timer expired!
            if (soundEnabled) {
              if (soundType === 'bell') sfx.schoolBell();
              else if (soundType === 'victory') sfx.victory();
              else sfx.beep(true);
            }
            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
              });
            } catch (e) {
              console.warn(e);
            }
            setCdIsOvertime(true);
            return 0;
          } else if (cdIsOvertime) {
            return prev + 1; // Overtime count up
          } else {
            // Running down
            if (tickSoundEnabled && prev <= 10 && prev > 1 && soundEnabled) {
              sfx.beep(false);
            } else if (tickSoundEnabled && soundEnabled) {
              sfx.tick();
            }
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      if (cdTimerRef.current) clearInterval(cdTimerRef.current);
    }
    return () => {
      if (cdTimerRef.current) clearInterval(cdTimerRef.current);
    };
  }, [cdIsRunning, cdIsOvertime, soundEnabled, tickSoundEnabled, soundType]);

  const handleCdToggle = () => {
    setCdIsRunning(prev => !prev);
  };

  const handleCdReset = () => {
    setCdIsRunning(false);
    setCdIsOvertime(false);
    setCdRemainingSeconds(cdInitialSeconds);
  };

  const handleAdjustCd = (deltaSeconds: number) => {
    setCdRemainingSeconds(prev => Math.max(0, prev + deltaSeconds));
    setCdInitialSeconds(prev => Math.max(0, prev + deltaSeconds));
  };

  // =========================================================================
  // 3. INTERVALS & CLASSROOM ROUNDS LOGIC
  // =========================================================================
  const [intWorkSeconds, setIntWorkSeconds] = useState(180); // 3 mins work
  const [intRestSeconds, setIntRestSeconds] = useState(60);  // 1 min rest
  const [intTotalRounds, setIntTotalRounds] = useState(3);
  const [intCurrentRound, setIntCurrentRound] = useState(1);
  const [intPhase, setIntPhase] = useState<'work' | 'rest'>('work');
  const [intRemainingSeconds, setIntRemainingSeconds] = useState(180);
  const [intIsRunning, setIntIsRunning] = useState(false);
  const intTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (intIsRunning) {
      intTimerRef.current = window.setInterval(() => {
        setIntRemainingSeconds(prev => {
          if (prev <= 1) {
            if (soundEnabled) sfx.whistle();
            if (intPhase === 'work') {
              if (intCurrentRound < intTotalRounds) {
                setIntPhase('rest');
                return intRestSeconds;
              } else {
                // Completed all rounds!
                setIntIsRunning(false);
                if (soundEnabled) sfx.victory();
                try {
                  confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
                } catch (e) {
                  console.warn(e);
                }
                return 0;
              }
            } else {
              setIntCurrentRound(r => r + 1);
              setIntPhase('work');
              return intWorkSeconds;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intTimerRef.current) clearInterval(intTimerRef.current);
    }
    return () => {
      if (intTimerRef.current) clearInterval(intTimerRef.current);
    };
  }, [intIsRunning, intPhase, intCurrentRound, intTotalRounds, intWorkSeconds, intRestSeconds, soundEnabled]);

  const handleIntReset = () => {
    setIntIsRunning(false);
    setIntCurrentRound(1);
    setIntPhase('work');
    setIntRemainingSeconds(intWorkSeconds);
  };

  // =========================================================================
  // 4. GROUP RACE & TIME TRACKER LOGIC (Directly relates to Group Divider!)
  // =========================================================================
  const groupColors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-purple-500 to-violet-600',
    'from-cyan-500 to-blue-600'
  ];

  const [groupTimers, setGroupTimers] = useState<GroupTimerRecord[]>(() => {
    // Attempt to load from localStorage or generate 4 default groups
    return [
      { id: 1, name: 'ក្រុមទី ១', color: groupColors[0], time: 0, isRunning: false, isFinished: false },
      { id: 2, name: 'ក្រុមទី ២', color: groupColors[1], time: 0, isRunning: false, isFinished: false },
      { id: 3, name: 'ក្រុមទី ៣', color: groupColors[2], time: 0, isRunning: false, isFinished: false },
      { id: 4, name: 'ក្រុមទី ៤', color: groupColors[3], time: 0, isRunning: false, isFinished: false },
    ];
  });

  const [groupRaceAllRunning, setGroupRaceAllRunning] = useState(false);
  const groupRaceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const hasRunning = groupTimers.some(g => g.isRunning);
    if (hasRunning) {
      groupRaceTimerRef.current = window.setInterval(() => {
        setGroupTimers(prev => prev.map(g => {
          if (g.isRunning && !g.isFinished) {
            return { ...g, time: g.time + 100 };
          }
          return g;
        }));
      }, 100);
    } else {
      if (groupRaceTimerRef.current) clearInterval(groupRaceTimerRef.current);
    }
    return () => {
      if (groupRaceTimerRef.current) clearInterval(groupRaceTimerRef.current);
    };
  }, [groupTimers]);

  const handleStartAllGroups = () => {
    setGroupRaceAllRunning(true);
    setGroupTimers(prev => prev.map(g => ({ ...g, isRunning: true })));
  };

  const handlePauseAllGroups = () => {
    setGroupRaceAllRunning(false);
    setGroupTimers(prev => prev.map(g => ({ ...g, isRunning: false })));
  };

  const handleFinishGroup = (groupId: number) => {
    if (soundEnabled) sfx.beep(true);
    setGroupTimers(prev => {
      const finishedCount = prev.filter(g => g.isFinished).length;
      const rank = finishedCount + 1;
      const updated = prev.map(g => {
        if (g.id === groupId) {
          return { ...g, isRunning: false, isFinished: true, rank };
        }
        return g;
      });

      if (rank === 1) {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (e) {
          console.warn(e);
        }
      }
      return updated;
    });
  };

  const handleResetGroupRace = () => {
    setGroupRaceAllRunning(false);
    setGroupTimers(prev => prev.map(g => ({ ...g, time: 0, isRunning: false, isFinished: false, rank: undefined })));
  };

  // =========================================================================
  // 5. MYSTERY / SURPRISE TIMER LOGIC (Exciting Game Mode)
  // =========================================================================
  const [mysteryMinSec, setMysteryMinSec] = useState(20);
  const [mysteryMaxSec, setMysteryMaxSec] = useState(60);
  const [mysteryTargetSec, setMysteryTargetSec] = useState(30);
  const [mysteryElapsedSec, setMysteryElapsedSec] = useState(0);
  const [mysteryIsRunning, setMysteryIsRunning] = useState(false);
  const [mysteryExploded, setMysteryExploded] = useState(false);
  const [showMysteryTime, setShowMysteryTime] = useState(false);
  const mysteryTimerRef = useRef<number | null>(null);

  const handleStartMystery = () => {
    const randomSec = Math.floor(Math.random() * (mysteryMaxSec - mysteryMinSec + 1)) + mysteryMinSec;
    setMysteryTargetSec(randomSec);
    setMysteryElapsedSec(0);
    setMysteryExploded(false);
    setMysteryIsRunning(true);
  };

  useEffect(() => {
    if (mysteryIsRunning) {
      mysteryTimerRef.current = window.setInterval(() => {
        setMysteryElapsedSec(prev => {
          const next = prev + 1;
          if (tickSoundEnabled && soundEnabled) {
            sfx.tick();
          }
          if (next >= mysteryTargetSec) {
            // Surprise triggered!
            setMysteryIsRunning(false);
            setMysteryExploded(true);
            if (soundEnabled) sfx.schoolBell();
            try {
              confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
            } catch (e) {
              console.warn(e);
            }
            return next;
          }
          return next;
        });
      }, 1000);
    } else {
      if (mysteryTimerRef.current) clearInterval(mysteryTimerRef.current);
    }
    return () => {
      if (mysteryTimerRef.current) clearInterval(mysteryTimerRef.current);
    };
  }, [mysteryIsRunning, mysteryTargetSec, soundEnabled, tickSoundEnabled]);

  const handleResetMystery = () => {
    setMysteryIsRunning(false);
    setMysteryElapsedSec(0);
    setMysteryExploded(false);
  };

  // =========================================================================
  // FORMATTING HELPERS
  // =========================================================================
  const formatSwTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    const hours = Math.floor(minutes / 60);

    const mStr = String(minutes % 60).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    const msStr = String(milliseconds).padStart(2, '0');

    if (hours > 0) {
      const hStr = String(hours).padStart(2, '0');
      return { hours: hStr, minutes: mStr, seconds: sStr, ms: msStr };
    }
    return { hours: null, minutes: mStr, seconds: sStr, ms: msStr };
  };

  const formatSeconds = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return {
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0')
    };
  };

  const formatGroupMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const tenth = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenth}`;
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error(err));
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Format active stopwatch time
  const swParts = formatSwTime(swTime);
  const cdParts = formatSeconds(cdRemainingSeconds);
  const cdProgressPercent = cdInitialSeconds > 0 ? Math.min(100, Math.max(0, (cdRemainingSeconds / cdInitialSeconds) * 100)) : 0;

  // Visual Theme accent classes
  const themeAccent = {
    cyan: {
      ring: 'stroke-cyan-500',
      text: 'text-cyan-500',
      bgGlow: 'from-cyan-500/10 to-blue-500/10',
      badge: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30'
    },
    emerald: {
      ring: 'stroke-emerald-500',
      text: 'text-emerald-500',
      bgGlow: 'from-emerald-500/10 to-teal-500/10',
      badge: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
    },
    amber: {
      ring: 'stroke-amber-500',
      text: 'text-amber-500',
      bgGlow: 'from-amber-500/10 to-orange-500/10',
      badge: 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    },
    indigo: {
      ring: 'stroke-indigo-500',
      text: 'text-indigo-500',
      bgGlow: 'from-indigo-500/10 to-purple-500/10',
      badge: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30'
    }
  }[theme];

  return (
    <div 
      ref={containerRef}
      className={`min-h-full p-4 md:p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
      } ${isFullscreen ? 'fixed inset-0 z-50 p-8 overflow-y-auto flex flex-col justify-center' : ''}`}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ======================= TOP TOOLBAR ======================= */}
        <div className={`p-4 rounded-3xl border backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-sm ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-slate-200'
        }`}>
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Timer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight">Stopwatch & Classroom Timer</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  EduSpin Pro
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {className ? `ថ្នាក់៖ ${className}` : 'ឧបករណ៍កំណត់ពេលវេលាសកម្មភាពក្នុងថ្នាក់រៀន'}
              </p>
            </div>
          </div>

          {/* Controls: Audio, Themes, Fullscreen */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Link to Group Divider Tab */}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('groups')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="ត្រឡប់ទៅផ្ទាំងបែងចែកក្រុម"
              >
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>បែងចែកក្រុម</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(v => !v)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
              }`}
              title={soundEnabled ? 'បិទសំឡេង (Sound On)' : 'បើកសំឡេង (Sound Off)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Tick Sound Toggle */}
            <button
              type="button"
              onClick={() => setTickSoundEnabled(v => !v)}
              className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                tickSoundEnabled 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' 
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
              }`}
              title="សំឡេងនាឡិកាដើរ Tick-Tock"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Tick-Tock</span>
            </button>

            {/* Sound Tone Selector */}
            <select
              value={soundType}
              onChange={(e) => setSoundType(e.target.value as any)}
              className={`px-2 py-2 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="ប្រភេទសំឡេងកណ្ដឹងពេលចប់ម៉ោង"
            >
              <option value="bell">🔔 កណ្ដឹងសាលា (School Bell)</option>
              <option value="victory">🎉 ជ័យជម្នះ (Victory Chime)</option>
              <option value="beep">⏰ សំឡេងប៊ីប (Digital Beep)</option>
            </select>

            {/* Theme Color Picker */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              {[
                { id: 'cyan', bg: 'bg-cyan-500' },
                { id: 'emerald', bg: 'bg-emerald-500' },
                { id: 'amber', bg: 'bg-amber-500' },
                { id: 'indigo', bg: 'bg-indigo-500' }
              ].map(th => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id as any)}
                  className={`w-5 h-5 rounded-lg ${th.bg} transition-transform cursor-pointer ${
                    theme === th.id ? 'ring-2 ring-white scale-110 shadow-xs' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={`ស្បែកពណ៌៖ ${th.id}`}
                />
              ))}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              title={isFullscreen ? 'ចេញពីទម្រង់ពេញអេក្រង់' : 'បង្ហាញពេញអេក្រង់ (Fullscreen)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ======================= WIDGET SUB-NAV TABS ======================= */}
        <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {[
            { id: 'stopwatch', label: '⏱️ Stopwatch វាស់ស្ទង់', desc: 'វាស់ម៉ោង និងកត់ត្រាជុំ Lap' },
            { id: 'countdown', label: '⏳ នាឡិការាប់ថយក្រោយ', desc: 'កំណត់ម៉ោងធ្វើលំហាត់ & ពិភាក្សា' },
            { id: 'intervals', label: '🔄 កំណត់ជុំឆ្លាស់គ្នា', desc: 'Pomodoro & Activity Rounds' },
            { id: 'grouprace', label: '👥 ប្រកួតតាមក្រុម (Race)', desc: 'វាស់ម៉ោងក្រុមនីមួយៗ និងផ្ដល់ពិន្ទុ' },
            { id: 'mystery', label: '🎲 នាឡិកាអាថ៌កំបាំង', desc: 'Surprise Timer សម្រាប់លេងហ្គេម' },
          ].map(tab => {
            const isActive = activeWidget === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveWidget(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25 scale-[1.02]'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            WIDGET 1: LAP STOPWATCH (នាឡិកាវាស់ស្ទង់)
            ========================================================================= */}
        {activeWidget === 'stopwatch' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden text-center flex flex-col items-center justify-center ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {/* Subtle background glow */}
              <div className={`absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-br ${themeAccent.bgGlow} blur-3xl pointer-events-none`} />

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-6">
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${
                  swIsRunning 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 animate-pulse' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${swIsRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                  <span>{swIsRunning ? 'កំពុងដំណើរការ (RUNNING)' : swTime > 0 ? 'ផ្អាកបណ្តោះអាសន្ន (PAUSED)' : 'ត្រៀមជាស្រេច (READY)'}</span>
                </span>
              </div>

              {/* Massive LED Time Display */}
              <div className="font-mono font-black tracking-tight select-none flex items-baseline justify-center gap-1 sm:gap-2 mb-8">
                {swParts.hours && (
                  <>
                    <span className="text-5xl sm:text-7xl md:text-8xl text-slate-800 dark:text-slate-100 drop-shadow-sm">
                      {swParts.hours}
                    </span>
                    <span className={`text-4xl sm:text-6xl md:text-7xl font-light ${themeAccent.text} animate-pulse`}>:</span>
                  </>
                )}
                <span className="text-6xl sm:text-8xl md:text-9xl text-slate-800 dark:text-slate-100 drop-shadow-sm">
                  {swParts.minutes}
                </span>
                <span className={`text-5xl sm:text-7xl md:text-8xl font-light ${themeAccent.text} animate-pulse`}>:</span>
                <span className="text-6xl sm:text-8xl md:text-9xl text-slate-800 dark:text-slate-100 drop-shadow-sm">
                  {swParts.seconds}
                </span>
                <span className="text-3xl sm:text-5xl md:text-6xl text-indigo-500 dark:text-indigo-400 font-extrabold ml-1">
                  .{swParts.ms}
                </span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Start / Pause */}
                <button
                  type="button"
                  onClick={handleSwToggle}
                  className={`px-8 py-4 rounded-2xl font-black text-base transition-all cursor-pointer flex items-center gap-2.5 shadow-lg active:scale-95 ${
                    swIsRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  }`}
                >
                  {swIsRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  <span>{swIsRunning ? 'ផ្អាក (Pause)' : swTime > 0 ? 'បន្ត (Resume)' : 'ចាប់ផ្តើម (Start)'}</span>
                </button>

                {/* Lap Button */}
                <button
                  type="button"
                  disabled={!swIsRunning}
                  onClick={handleSwLap}
                  className={`px-6 py-4 rounded-2xl font-black text-base transition-all flex items-center gap-2 border ${
                    swIsRunning
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-lg shadow-indigo-600/25 cursor-pointer active:scale-95'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent cursor-not-allowed opacity-50'
                  }`}
                >
                  <Flag className="w-5 h-5" />
                  <span>កត់ត្រាជុំ (Lap)</span>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  disabled={swTime === 0}
                  onClick={handleSwReset}
                  className={`px-6 py-4 rounded-2xl font-black text-base transition-all border flex items-center gap-2 ${
                    swTime > 0
                      ? isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer active:scale-95'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer active:scale-95'
                      : 'opacity-40 cursor-not-allowed border-transparent bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>កំណត់ឡើងវិញ (Reset)</span>
                </button>
              </div>
            </div>

            {/* Laps Record Table */}
            {laps.length > 0 && (
              <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-black">បញ្ជីជុំដែលបានកត់ត្រា (Lap Records)</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600">
                      {laps.length} ជុំ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLaps([])}
                    className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    លុបកំណត់ត្រាទាំងអស់
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-bold">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                        <th className="p-3">ជុំ #</th>
                        <th className="p-3">ពេលវេលាក្នុងជុំ (Lap Time)</th>
                        <th className="p-3">ពេលវេលាសរុប (Overall)</th>
                        <th className="p-3 text-right">ស្ថានភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {laps.map(lap => {
                        const isFastest = fastestLapTime !== null && lap.lapTime === fastestLapTime;
                        const isSlowest = slowestLapTime !== null && lap.lapTime === slowestLapTime;
                        const lapFormatted = formatSwTime(lap.lapTime);
                        const overallFormatted = formatSwTime(lap.overallTime);

                        return (
                          <tr key={lap.id} className={`transition-colors ${
                            isFastest 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : isSlowest 
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                                : ''
                          }`}>
                            <td className="p-3 font-mono font-black">ជុំទី {lap.lapNumber}</td>
                            <td className="p-3 font-mono font-extrabold text-sm">
                              +{lapFormatted.minutes}:{lapFormatted.seconds}.{lapFormatted.ms}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {overallFormatted.minutes}:{overallFormatted.seconds}.{overallFormatted.ms}
                            </td>
                            <td className="p-3 text-right">
                              {isFastest && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                                  ⚡ លឿនបំផុត (Best)
                                </span>
                              )}
                              {isSlowest && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 border border-rose-500/30">
                                  🐢 យឺតបំផុត
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            WIDGET 2: CLASSROOM COUNTDOWN TIMER (នាឡិការាប់ថយក្រោយ)
            ========================================================================= */}
        {activeWidget === 'countdown' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {/* Urgent pulse when time is <= 10s */}
              {cdRemainingSeconds <= 10 && cdIsRunning && !cdIsOvertime && (
                <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none" />
              )}

              {/* Overtime Alert */}
              {cdIsOvertime && (
                <div className="mb-4 px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs animate-bounce shadow-md flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span>ផុតម៉ោងកំណត់ហើយ! (OVERTIME +{cdParts.minutes}:{cdParts.seconds})</span>
                </div>
              )}

              {/* Circular Progress Display */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-4">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background Circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="44%"
                    className={`fill-none stroke-[8] ${isDarkMode ? 'stroke-slate-800' : 'stroke-slate-100'}`}
                  />
                  {/* Animated Progress Circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="44%"
                    className={`fill-none stroke-[10] transition-all duration-1000 ${
                      cdIsOvertime 
                        ? 'stroke-rose-500' 
                        : cdRemainingSeconds <= 10 
                          ? 'stroke-rose-500 animate-pulse' 
                          : cdRemainingSeconds <= 30 
                            ? 'stroke-amber-500' 
                            : themeAccent.ring
                    }`}
                    strokeDasharray={2 * Math.PI * 125}
                    strokeDashoffset={(2 * Math.PI * 125) * (1 - cdProgressPercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Big Digital Text Inside Ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  <div className={`font-mono font-black tracking-tight ${
                    cdIsOvertime 
                      ? 'text-rose-500' 
                      : cdRemainingSeconds <= 10 
                        ? 'text-rose-600 animate-pulse text-6xl sm:text-7xl' 
                        : 'text-slate-800 dark:text-slate-100 text-5xl sm:text-6xl'
                  }`}>
                    {cdParts.minutes}:{cdParts.seconds}
                  </div>
                  <span className="text-xs font-bold text-slate-400 mt-1">
                    {cdIsOvertime ? 'ម៉ោងបន្ថែម' : 'នាទី : វិនាទី'}
                  </span>
                </div>
              </div>

              {/* Quick Adjust Buttons (+30s, +1m, +5m, -1m) */}
              <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAdjustCd(-60)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="បន្ថយ ១ នាទី"
                >
                  -1 នាទី
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustCd(-30)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="បន្ថយ ៣០ វិនាទី"
                >
                  -30 វិ
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustCd(30)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="បន្ថែម ៣០ វិនាទី"
                >
                  +30 វិ
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustCd(60)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="បន្ថែម ១ នាទី"
                >
                  +1 នាទី
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustCd(300)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="បន្ថែម ៥ នាទី"
                >
                  +5 នាទី
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCdToggle}
                  className={`px-8 py-4 rounded-2xl font-black text-base transition-all cursor-pointer flex items-center gap-2.5 shadow-lg active:scale-95 ${
                    cdIsRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                  }`}
                >
                  {cdIsRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  <span>{cdIsRunning ? 'ផ្អាក (Pause)' : 'ចាប់ផ្តើមរាប់ (Start)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCdReset}
                  className={`px-6 py-4 rounded-2xl font-black text-base transition-all border flex items-center gap-2 cursor-pointer active:scale-95 ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>កំណត់ឡើងវិញ</span>
                </button>
              </div>
            </div>

            {/* Classroom Presets Grid */}
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-black">ជម្រើសកំណត់ម៉ោងរហ័ស សម្រាប់សកម្មភាពក្នុងថ្នាក់</h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">ចុចដើម្បីជ្រើសរើសភ្លាមៗ</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {presets.map(p => {
                  const isSelected = cdInitialSeconds === p.seconds && !cdIsOvertime;
                  return (
                    <button
                      key={p.seconds}
                      type="button"
                      onClick={() => handleSelectPreset(p.seconds)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 scale-[1.02]'
                          : isDarkMode
                            ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{p.icon}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {p.seconds < 60 ? `${p.seconds}s` : `${p.seconds / 60}m`}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-black">{p.label}</div>
                        <div className={`text-[11px] font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {p.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            WIDGET 3: INTERVALS & ACTIVITY ROUNDS (Pomodoro / Rotation Stations)
            ========================================================================= */}
        {activeWidget === 'intervals' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {/* Round Indicator */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-4 py-1.5 rounded-full text-xs font-black bg-indigo-600 text-white shadow-md">
                  ជុំទី {intCurrentRound} នៃ {intTotalRounds} (Round {intCurrentRound}/{intTotalRounds})
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                  intPhase === 'work' 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                    : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                }`}>
                  {intPhase === 'work' ? '🚀 ពេលធ្វើសកម្មភាព (Work)' : '💬 ពេលពិភាក្សា/សម្រាក (Rest)'}
                </span>
              </div>

              {/* Big Digital Display */}
              <div className={`font-mono font-black text-7xl sm:text-8xl md:text-9xl mb-6 drop-shadow-sm select-none ${
                intPhase === 'work' ? 'text-emerald-500' : 'text-blue-500'
              }`}>
                {formatSeconds(intRemainingSeconds).minutes}:{formatSeconds(intRemainingSeconds).seconds}
              </div>

              {/* Visual Round Progress Dots */}
              <div className="flex items-center gap-2 mb-8">
                {Array.from({ length: intTotalRounds }).map((_, idx) => {
                  const roundNum = idx + 1;
                  const isDone = roundNum < intCurrentRound;
                  const isCurrent = roundNum === intCurrentRound;
                  return (
                    <div
                      key={roundNum}
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        isDone 
                          ? 'bg-indigo-600 scale-100' 
                          : isCurrent 
                            ? 'bg-emerald-500 ring-4 ring-emerald-500/20 scale-125' 
                            : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIntIsRunning(v => !v)}
                  className={`px-8 py-4 rounded-2xl font-black text-base transition-all cursor-pointer flex items-center gap-2.5 shadow-lg active:scale-95 ${
                    intIsRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                  }`}
                >
                  {intIsRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  <span>{intIsRunning ? 'ផ្អាក (Pause)' : 'ចាប់ផ្តើមជុំ (Start)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleIntReset}
                  className={`px-6 py-4 rounded-2xl font-black text-base transition-all border flex items-center gap-2 cursor-pointer active:scale-95 ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>កំណត់ឡើងវិញ</span>
                </button>
              </div>
            </div>

            {/* Interval Configuration Settings */}
            <div className={`p-6 rounded-3xl border shadow-sm ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-500" />
                <span>កំណត់រចនាសម្ព័ន្ធជុំ (Interval Settings)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs font-bold text-slate-400">ពេលធ្វើសកម្មភាព (Work Time)</span>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIntWorkSeconds(s => Math.max(30, s - 30))}
                      className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-lg flex-1 text-center">
                      {Math.floor(intWorkSeconds / 60)} នាទី {intWorkSeconds % 60 > 0 ? `${intWorkSeconds % 60}វិ` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIntWorkSeconds(s => s + 30)}
                      className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs font-bold text-slate-400">ពេលពិភាក្សា/សម្រាក (Rest Time)</span>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIntRestSeconds(s => Math.max(15, s - 15))}
                      className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-lg flex-1 text-center">
                      {Math.floor(intRestSeconds / 60)} នាទី {intRestSeconds % 60 > 0 ? `${intRestSeconds % 60}វិ` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIntRestSeconds(s => s + 15)}
                      className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs font-bold text-slate-400">ចំនួនជុំសរុប (Total Rounds)</span>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIntTotalRounds(r => Math.max(1, r - 1))}
                      className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-lg flex-1 text-center">
                      {intTotalRounds} ជុំ
                    </span>
                    <button
                      type="button"
                      onClick={() => setIntTotalRounds(r => r + 1)}
                      className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            WIDGET 4: GROUP RACE & TIME TRACKER (Directly linked with Group Divider)
            ========================================================================= */}
        {activeWidget === 'grouprace' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black">ការប្រកួតវាស់ល្បឿន និងម៉ោងតាមក្រុម</h3>
                </div>
                <p className="text-xs text-slate-500">
                  វាស់ពេលវេលាដែលក្រុមនីមួយៗប្រើប្រាស់ដើម្បីដោះស្រាយលំហាត់ ឬធ្វើបទបង្ហាញ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={groupRaceAllRunning ? handlePauseAllGroups : handleStartAllGroups}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md ${
                    groupRaceAllRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  }`}
                >
                  {groupRaceAllRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{groupRaceAllRunning ? 'ផ្អាកទាំងអស់' : 'ចាប់ផ្តើមគ្រប់ក្រុម (Start All)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetGroupRace}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  title="កំណត់ឡើងវិញគ្រប់ក្រុម"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {groupTimers.map(group => {
                return (
                  <div
                    key={group.id}
                    className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      group.rank === 1
                        ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                        : isDarkMode
                          ? 'bg-slate-900/80 border-slate-800'
                          : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Top Group Header */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-extrabold text-sm">{group.name}</span>
                        {group.rank ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black shadow-xs flex items-center gap-1 ${
                            group.rank === 1 
                              ? 'bg-amber-500 text-white' 
                              : group.rank === 2 
                                ? 'bg-slate-400 text-white' 
                                : group.rank === 3 
                                  ? 'bg-amber-700 text-white' 
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}>
                            {group.rank === 1 ? '🥇 លេខ ១' : group.rank === 2 ? '🥈 លេខ ២' : group.rank === 3 ? '🥉 លេខ ៣' : `លេខ ${group.rank}`}
                          </span>
                        ) : (
                          <span className={`w-2.5 h-2.5 rounded-full ${group.isRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                        )}
                      </div>

                      {/* Digital Time Readout */}
                      <div className="font-mono font-black text-3xl sm:text-4xl my-3 text-center text-slate-900 dark:text-white">
                        {formatGroupMs(group.time)}
                      </div>
                    </div>

                    {/* Action Buttons for Group */}
                    <div className="space-y-2 mt-4 pt-3 border-t dark:border-slate-800">
                      {!group.isFinished ? (
                        <button
                          type="button"
                          onClick={() => handleFinishGroup(group.id)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>បានរួចរាល់ (Finished!)</span>
                        </button>
                      ) : (
                        <div className="text-center py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          ✓ បានបញ្ចប់ចំណាត់ថ្នាក់ {group.rank}
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setGroupTimers(prev => prev.map(g => g.id === group.id ? { ...g, isRunning: !g.isRunning } : g));
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {group.isRunning ? 'ផ្អាក' : 'បន្ត'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGroupTimers(prev => prev.map(g => g.id === group.id ? { ...g, time: 0, isRunning: false, isFinished: false, rank: undefined } : g));
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-400'
                          }`}
                          title="កំណត់ឡើងវិញក្រុមនេះ"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            WIDGET 5: MYSTERY / SURPRISE TIMER (Game Mode)
            ========================================================================= */}
        {activeWidget === 'mystery' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-black bg-purple-600 text-white shadow-md">
                  🎲 នាឡិកាអាថ៌កំបាំងរំភើប (Mystery Classroom Challenge)
                </span>
              </div>

              {/* Mystery Box Visual */}
              <div className="relative my-6 select-none">
                <div className={`w-48 h-48 sm:w-56 sm:h-56 rounded-3xl border-4 flex flex-col items-center justify-center transition-all ${
                  mysteryExploded 
                    ? 'border-rose-500 bg-rose-500/20 scale-110 shadow-2xl shadow-rose-500/40 animate-bounce' 
                    : mysteryIsRunning 
                      ? 'border-purple-500 bg-purple-500/10 shadow-xl shadow-purple-500/20 animate-pulse' 
                      : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                }`}>
                  <span className="text-6xl sm:text-7xl mb-2">
                    {mysteryExploded ? '💥' : mysteryIsRunning ? '⏳' : '🎁'}
                  </span>
                  <span className="text-xs font-black uppercase text-slate-500">
                    {mysteryExploded ? 'ផុតម៉ោងហើយ!' : mysteryIsRunning ? 'កំពុងដើរអាថ៌កំបាំង...' : 'ចុចចាប់ផ្តើម'}
                  </span>

                  {/* Peek Mode Toggle */}
                  {showMysteryTime && (
                    <span className="text-xl font-mono font-black mt-2 text-purple-600 dark:text-purple-400">
                      {mysteryElapsedSec}s / {mysteryTargetSec}s
                    </span>
                  )}
                </div>
              </div>

              {/* Peek Button (for teacher only) */}
              <button
                type="button"
                onClick={() => setShowMysteryTime(v => !v)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-6 flex items-center gap-1 cursor-pointer"
              >
                {showMysteryTime ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showMysteryTime ? 'លាក់ពេលវេលា' : 'បង្ហាញម៉ោងជាសម្ងាត់ (សម្រាប់តែគ្រូ)'}</span>
              </button>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartMystery}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-base transition-all cursor-pointer shadow-lg shadow-purple-600/25 active:scale-95 flex items-center gap-2"
                >
                  <Shuffle className="w-5 h-5" />
                  <span>ចាប់ផ្តើមអាថ៌កំបាំងថ្មី</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetMystery}
                  className={`px-6 py-4 rounded-2xl font-black text-base transition-all border flex items-center gap-2 cursor-pointer active:scale-95 ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Range settings */}
              <div className="mt-8 flex items-center justify-center gap-4 text-xs font-bold text-slate-400 flex-wrap">
                <span>ចន្លោះពេលចៃដន្យ៖</span>
                <label className="flex items-center gap-1">
                  <span>ទាបបំផុត៖</span>
                  <input
                    type="number"
                    value={mysteryMinSec}
                    onChange={(e) => setMysteryMinSec(Math.max(5, parseInt(e.target.value) || 5))}
                    className="w-14 py-1 px-2 rounded-lg border text-center font-mono dark:bg-slate-800 dark:border-slate-700"
                  />
                  <span>វិ</span>
                </label>
                <label className="flex items-center gap-1">
                  <span>ខ្ពស់បំផុត៖</span>
                  <input
                    type="number"
                    value={mysteryMaxSec}
                    onChange={(e) => setMysteryMaxSec(Math.max(mysteryMinSec + 5, parseInt(e.target.value) || 60))}
                    className="w-14 py-1 px-2 rounded-lg border text-center font-mono dark:bg-slate-800 dark:border-slate-700"
                  />
                  <span>វិ</span>
                </label>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
