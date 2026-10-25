import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Flag, Timer, Bell, Volume2, VolumeX, Maximize2, 
  Minimize2, Clock, Sparkles, Award, Users, Shuffle, Trophy, CheckCircle, 
  Zap, Plus, Minus, Settings2, HelpCircle, Eye, EyeOff, Volume1, ArrowRight,
  GraduationCap, BookOpen, FileText, CheckCircle2, ShieldAlert, Pencil, Check, Droplets,
  CloudCheck, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, doc, onSnapshot, safeSetDoc } from '../lib/firebase';
import { TeacherAccount } from '../types';

interface StopwatchPanelProps {
  isDarkMode?: boolean;
  activeClassId?: string;
  className?: string;
  onNavigateTab?: (tabId: string) => void;
  initialWidget?: 'stopwatch' | 'countdown' | 'intervals' | 'grouprace' | 'mystery' | 'examtimer';
  teacher?: TeacherAccount | null;
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

// ៧ ចំណុចធំៗសង្ខេបពីបទបញ្ជាផ្ទៃក្នុង (Summarized 7 Main Exam Rules)
export const default7ExamRules = [
  '១. ការរៀបចំខ្លួន៖ មកដល់មុខបន្ទប់មុន ១៥ នាទី និងស្លៀកពាក់ឯកសណ្ឋានឱ្យបានត្រឹមត្រូវ',
  '២. សម្ភារអនុញ្ញាត៖ ប៊ិច, ខ្មៅដៃ, បន្ទាត់, ជ័រលុប និងម៉ាស៊ីនគិតលេខ (តាមការកំណត់មុខវិជ្ជា)',
  '៣. សម្ភារហាមឃាត់ដាច់ខាត៖ ទូរស័ព្ទ, នាឡិកាឆ្លាតវៃ, ឧបករណ៍អេឡិចត្រូនិក និងសំណៅឯកសារគ្រប់ប្រភេទ (ទុកក្រៅបន្ទប់)',
  '៤. វិន័យកំឡុងពេលប្រឡង៖ អង្គុយតាមតុដែលបានកំណត់ និងរក្សាភាពស្ងប់ស្ងាត់ដាច់ខាតក្នុងបន្ទប់',
  '៥. ការសាកសួរអនុរក្ស៖ មានចម្ងល់ត្រូវលើកដៃសួរអនុរក្ស (ហាមសួរមិត្ត ឬងាកមើលគេ) និងមិនចេញក្រៅមុនពាក់កណ្តាលម៉ោង',
  '៦. ការបញ្ចប់ម៉ោងប្រឡង៖ ឮសញ្ញាបញ្ចប់ ត្រូវឈប់សរសេរភ្លាម ហើយអង្គុយរង់ចាំអនុរក្សប្រមូលក្រដាសចប់សព្វគ្រប់',
  '៧. ការហាមឃាត់ និងទណ្ឌកម្ម៖ ហាមជជែក លួចមើល ឬលួចចម្លង (ល្មើសនឹងត្រូវដកហូតក្រដាស និងផ្ដល់ពិន្ទុ ០ ដាច់ខាត)'
];

// ខ្លឹមសារបទបញ្ជាផ្ទៃក្នុងពេញលេញ ៤ ជំពូក (Full Exam Regulations)
export const default4ExamRegulations = [
  {
    title: '១. ការរៀបចំខ្លួន និងសម្ភារ',
    icon: '🎒',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100',
    badgeColor: 'bg-blue-600 text-white',
    items: [
      'មកដល់មុខបន្ទប់មុន ១៥ នាទី និងស្លៀកពាក់ឯកសណ្ឋានឱ្យបានត្រឹមត្រូវ។',
      'សម្ភារអនុញ្ញាត៖ ប៊ិច, ខ្មៅដៃ, បន្ទាត់, ជ័រលុប និងម៉ាស៊ីនគិតលេខ (តាមមុខវិជ្ជា)។',
      'សម្ភារហាមឃាត់ដាច់ខាត៖ ទូរស័ព្ទ, នាឡិកាឆ្លាតវៃ, ឧបករណ៍អេឡិចត្រូនិច និង សំណៅឯកសារគ្រប់ប្រភេទ (ត្រូវទុកខាងក្រៅបន្ទប់)។'
    ]
  },
  {
    title: '២. កំឡុងពេលប្រឡង',
    icon: '✍️',
    color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-900 dark:text-indigo-100',
    badgeColor: 'bg-indigo-600 text-white',
    items: [
      'អង្គុយតាមតុដែលបានកំណត់ និងរក្សាភាពស្ងប់ស្ងាត់ដាច់ខាត។',
      'មានចម្ងល់ត្រូវលើកដៃសួរអនុរក្ស (ហាមសួរមិត្តភក្តិ ឬងាកមើលគេ)។',
      'មិនអនុញ្ញាតឱ្យចេញក្រៅបន្ទប់មុន ពាក់កណ្តាលម៉ោង ឡើយ។'
    ]
  },
  {
    title: '៣. ការបញ្ចប់ការប្រឡង',
    icon: '⏳',
    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
    badgeColor: 'bg-emerald-600 text-white',
    items: [
      'ឮសញ្ញាបញ្ចប់ ត្រូវ ឈប់សរសេរភ្លាម ហើយអង្គុយរង់ចាំអនុរក្សប្រមូលក្រដាសចប់សព្វគ្រប់ ទើបអនុញ្ញាតឱ្យចេញ។'
    ]
  },
  {
    title: '៤. ការហាមឃាត់ និងទណ្ឌកម្ម',
    icon: '⚠️',
    color: 'border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100',
    badgeColor: 'bg-red-600 text-white',
    items: [
      'សកម្មភាពល្មើសខាងក្រោមនឹងត្រូវដាក់ទណ្ឌកម្មយ៉ាងតឹងរឹង៖',
      '• និយាយជជែកគ្នា សួរគ្នា ឬប្រាប់ចម្លើយគ្នា៖\n   - លើកទី១៖ ព្រមាន និងកត់ត្រាក្នុងកំណត់ហេតុ។\n   - លើកទី២ ឬករណីធ្ងន់ធ្ងរ៖ ដកហូតក្រដាសប្រឡង និង ដាក់ពិន្ទុ ០ (សូន្យ) ចំពោះមុខវិជ្ជានោះ។',
      '• មើលគ្នា មើលសំណៅឯកសារ ឬប្រើប្រាស់ទូរស័ព្ទ/ឧបករណ៍អេឡិចត្រូនិក៖\n   - ត្រូវ ដកហូតក្រដាសប្រឡងភ្លាមៗ និងផ្ដល់ពិន្ទុ ០ (សូន្យ) ដោយគ្មានការសម្របសម្រួលឡើយ។'
    ]
  }
];

export default function StopwatchPanel({
  isDarkMode = false,
  activeClassId = '',
  className = 'ថ្នាក់រៀន',
  onNavigateTab,
  initialWidget,
  teacher
}: StopwatchPanelProps) {
  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tickSoundEnabled, setTickSoundEnabled] = useState(false);
  const [soundType, setSoundType] = useState<'bell' | 'victory' | 'beep'>('bell');

  // Main widget sub-tab
  const [activeWidget, setActiveWidget] = useState<'stopwatch' | 'countdown' | 'intervals' | 'grouprace' | 'mystery' | 'examtimer'>(initialWidget || 'stopwatch');

  // Persistent Exam Title State
  const [examTitle, setExamTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sovannaphumi_exam_title_v2');
      if (saved && saved.trim()) return saved;
    } catch {}
    return 'ការប្រឡងប្រចាំខែ (Exam In Progress)';
  });
  const [examInitialSeconds, setExamInitialSeconds] = useState<number>(2700); // 45 mins default
  const [examRemainingSeconds, setExamRemainingSeconds] = useState<number>(2700);
  const [examIsRunning, setExamIsRunning] = useState<boolean>(false);
  const [examIsOvertime, setExamIsOvertime] = useState<boolean>(false);
  const [examBgImage, setExamBgImage] = useState<string>('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80');
  const [glassOpacity, setGlassOpacity] = useState<'liquid' | 'crystal' | 'frosted' | 'pure'>('liquid');
  const [examViewMode, setExamViewMode] = useState<'timer' | 'fullRules'>('timer');
  const [showExamRules, setShowExamRules] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('stopwatch_show_exam_rules');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    return true;
  }); // Controlled toggle for rules (រូបទី២)

  const handleToggleExamRules = (forceState?: boolean) => {
    setShowExamRules(prev => {
      const next = forceState !== undefined ? forceState : !prev;
      try {
        localStorage.setItem('stopwatch_show_exam_rules', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const [showCustomRulesSection, setShowCustomRulesSection] = useState<boolean>(true); // Controlled toggle for custom section (រូបទី៣)

  // Persistent state for custom teacher rules (7 items default)
  const [examRules, setExamRules] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sovannaphumi_exam_custom_rules_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return default7ExamRules;
  });

  // Persistent state for 4 chapter regulations
  const [fullExamRegulations, setFullExamRegulations] = useState(() => {
    try {
      const saved = localStorage.getItem('sovannaphumi_exam_regulations_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return default4ExamRegulations;
  });

  // Sync indicator state
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const notifySaved = (msg = 'បានរក្សាទុក និង Sync រួចរាល់ ✓') => {
    setSyncStatus(msg);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => setSyncStatus(null), 3000);
  };

  // Helper to persist to localStorage & Firebase Firestore (sync across refresh / reopen)
  const persistAndSyncExamRules = (
    nextRules: string[],
    nextRegulations: typeof default4ExamRegulations,
    nextTitle: string
  ) => {
    // 1. Immediately save to LocalStorage (Instant, synchronous, survives refresh)
    try {
      localStorage.setItem('sovannaphumi_exam_custom_rules_v2', JSON.stringify(nextRules));
      localStorage.setItem('sovannaphumi_exam_regulations_v2', JSON.stringify(nextRegulations));
      localStorage.setItem('sovannaphumi_exam_title_v2', nextTitle);
      if (activeClassId) {
        localStorage.setItem(`sovannaphumi_exam_custom_rules_${activeClassId}`, JSON.stringify(nextRules));
        localStorage.setItem(`sovannaphumi_exam_regulations_${activeClassId}`, JSON.stringify(nextRegulations));
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // 2. Sync to Firebase Firestore if teacher & class available
    if (teacher?.id && activeClassId) {
      try {
        const docRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'examsData', 'rules_config');
        safeSetDoc(docRef, {
          customRules: nextRules,
          regulations: nextRegulations,
          examTitle: nextTitle,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore sync failed:', e);
      }
    }

    notifySaved();
  };

  // Real-time Firestore subscriber for multi-device sync
  useEffect(() => {
    if (!teacher?.id || !activeClassId) return;

    let isMounted = true;
    const docRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'examsData', 'rules_config');

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!isMounted || !snap.exists()) return;
      const data = snap.data();
      if (data) {
        if (Array.isArray(data.customRules) && data.customRules.length > 0) {
          setExamRules(data.customRules);
          try {
            localStorage.setItem('sovannaphumi_exam_custom_rules_v2', JSON.stringify(data.customRules));
          } catch {}
        }
        if (Array.isArray(data.regulations) && data.regulations.length === 4) {
          setFullExamRegulations(data.regulations);
          try {
            localStorage.setItem('sovannaphumi_exam_regulations_v2', JSON.stringify(data.regulations));
          } catch {}
        }
        if (typeof data.examTitle === 'string' && data.examTitle.trim()) {
          setExamTitle(data.examTitle);
          try {
            localStorage.setItem('sovannaphumi_exam_title_v2', data.examTitle);
          } catch {}
        }
      }
    }, (err) => {
      console.warn('Firestore exam rules listener notice:', err);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [teacher?.id, activeClassId]);

  // Editing state for custom rules list (Screenshot 1)
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [editingRuleText, setEditingRuleText] = useState<string>('');

  // Editing state for 4 chapter regulations (Screenshot 2)
  const [editingChapterIdx, setEditingChapterIdx] = useState<number | null>(null);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemText, setEditingItemText] = useState<string>('');

  const calmingWallpapers = [
    { name: '🌊 សមុទ្រស្ងប់ស្ងាត់', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80' },
    { name: '🌲 ព្រៃបៃតងស្រទន់', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80' },
    { name: '🌅 ថ្ងៃលិចស្ងប់ចិត្ត', url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1920&q=80' },
    { name: '🌸 សួនផ្កាសាគូរ៉ា', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1920&q=80' },
    { name: '🏔️ បឹងភ្នំត្រជាក់ចិត្ត', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80' },
    { name: '🌌 មេឃរាត្រីផ្កាយ', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80' },
  ];

  const calmingGenerations = [
    { label: '🌿 សម្រួលអារម្មណ៍ (Zen Garden)', url: 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=1920&q=80' },
    { label: '☁️ ពពកស្រទន់ (Soft Clouds)', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1920&q=80' },
    { label: '🍃 ព្រៃឬស្សីធម្មជាតិ (Bamboo Forest)', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80' },
    { label: '✨ ទឹកជ្រោះស្ងប់ស្ងាត់ (Serene Waterfall)', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1920&q=80' },
  ];

  const handleExamBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setExamBgImage(String(event.target.result));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [newRuleInput, setNewRuleInput] = useState<string>('');
  const examTimerRef = useRef<number | null>(null);

  // Save edited custom rule (Screenshot 1)
  const handleSaveCustomRule = (idx: number) => {
    if (!editingRuleText.trim()) return;
    const nextRules = examRules.map((r, i) => i === idx ? editingRuleText.trim() : r);
    setExamRules(nextRules);
    persistAndSyncExamRules(nextRules, fullExamRegulations, examTitle);
    setEditingRuleIndex(null);
    setEditingRuleText('');
  };

  // Add new custom rule
  const handleAddCustomRule = () => {
    if (!newRuleInput.trim()) return;
    const nextRules = [...examRules, newRuleInput.trim()];
    setExamRules(nextRules);
    persistAndSyncExamRules(nextRules, fullExamRegulations, examTitle);
    setNewRuleInput('');
  };

  // Delete custom rule
  const handleDeleteCustomRule = (idx: number) => {
    const nextRules = examRules.filter((_, i) => i !== idx);
    setExamRules(nextRules);
    persistAndSyncExamRules(nextRules, fullExamRegulations, examTitle);
  };

  // Save edited chapter rule (Screenshot 2)
  const handleSaveChapterRule = (chapIdx: number, itemIdx: number) => {
    if (!editingItemText.trim()) return;
    const nextRegs = fullExamRegulations.map((chap, cIdx) => {
      if (cIdx !== chapIdx) return chap;
      return {
        ...chap,
        items: chap.items.map((it, iIdx) => iIdx === itemIdx ? editingItemText.trim() : it)
      };
    });
    setFullExamRegulations(nextRegs);
    persistAndSyncExamRules(examRules, nextRegs, examTitle);
    setEditingChapterIdx(null);
    setEditingItemIdx(null);
    setEditingItemText('');
  };

  // Reset regulations to default
  const handleResetRegulations = () => {
    setFullExamRegulations(default4ExamRegulations);
    setExamRules(default7ExamRules);
    persistAndSyncExamRules(default7ExamRules, default4ExamRegulations, examTitle);
    setEditingRuleIndex(null);
    setEditingChapterIdx(null);
    notifySaved('បានកំណត់ឡើងវិញតាមលំនាំដើម ✓');
  };

  // Exam title change handler
  const handleExamTitleChange = (newTitle: string) => {
    setExamTitle(newTitle);
    persistAndSyncExamRules(examRules, fullExamRegulations, newTitle);
  };

  useEffect(() => {
    if (examIsRunning) {
      examTimerRef.current = window.setInterval(() => {
        setExamRemainingSeconds(prev => {
          if (prev <= 1 && !examIsOvertime) {
            if (soundEnabled) {
              if (soundType === 'bell') sfx.schoolBell();
              else if (soundType === 'victory') sfx.victory();
              else sfx.beep(true);
            }
            try {
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
            } catch (e) {
              console.warn(e);
            }
            setExamIsOvertime(true);
            return 0;
          } else if (examIsOvertime) {
            return prev + 1;
          } else {
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    }
    return () => {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    };
  }, [examIsRunning, examIsOvertime, soundEnabled, soundType]);

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
      className={`min-h-full transition-all duration-300 relative ${
        activeWidget === 'examtimer'
          ? 'p-3 sm:p-6 text-white'
          : isDarkMode ? 'bg-[#272525] text-slate-100 p-4 md:p-6' : 'bg-slate-50 text-slate-900 p-4 md:p-6'
      } ${isFullscreen ? 'fixed inset-0 z-50 p-3 sm:p-6 overflow-y-auto flex flex-col justify-center items-center' : ''}`}
      style={activeWidget === 'examtimer' && examBgImage ? {
        backgroundImage: `linear-gradient(rgba(10, 15, 30, 0.40), rgba(10, 15, 30, 0.58)), url("${examBgImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      } : undefined}
    >
      <div className={`space-y-6 w-full ${isFullscreen ? 'max-w-7xl' : 'max-w-5xl mx-auto'}`}>
        
        {/* ======================= TOP TOOLBAR ======================= */}
        {!isFullscreen && (
          <div className={`p-4 rounded-3xl border backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-sm transition-all ${
            activeWidget === 'examtimer'
              ? 'bg-slate-900/85 border-white/20 text-white shadow-2xl'
              : isDarkMode ? 'bg-slate-900/70 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Timer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-black tracking-tight ${
                  activeWidget === 'examtimer' || isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Stopwatch & Classroom Timer
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  activeWidget === 'examtimer'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                    : isDarkMode
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                }`}>
                  EduSpin Pro
                </span>
              </div>
              <p className={`text-xs font-bold ${
                activeWidget === 'examtimer' ? 'text-slate-200' : isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
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
                  activeWidget === 'examtimer'
                    ? 'bg-white/15 hover:bg-white/25 text-white border-white/30'
                    : isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
                title="ត្រឡប់ទៅផ្ទាំងបែងចែកក្រុម"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>បែងចែកក្រុម</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(v => !v)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                  : activeWidget === 'examtimer'
                  ? 'bg-white/10 border-white/20 text-slate-300'
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
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
      )}

        {/* ======================= WIDGET SUB-NAV TABS ======================= */}
        {!isFullscreen && (
          <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {[
              { id: 'stopwatch', label: '⏱️ Stopwatch វាស់ស្ទង់', desc: 'វាស់ម៉ោង និងកត់ត្រាជុំ Lap' },
              { id: 'countdown', label: '⏳ នាឡិការាប់ថយក្រោយ', desc: 'កំណត់ម៉ោងធ្វើលំហាត់ & ពិភាក្សា' },
              { id: 'intervals', label: '🔄 កំណត់ជុំឆ្លាស់គ្នា', desc: 'Pomodoro & Activity Rounds' },
              { id: 'grouprace', label: '👥 ប្រកួតតាមក្រុម (Race)', desc: 'វាស់ម៉ោងក្រុមនីមួយៗ និងផ្ដល់ពិន្ទុ' },
              { id: 'mystery', label: '🎲 នាឡិកាអាថ៌កំបាំង', desc: 'Surprise Timer សម្រាប់លេងហ្គេម' },
              { id: 'examtimer', label: '🎓 នាឡិកាប្រឡង (Exam Timer)', desc: 'ClassroomScreen Exam Timer' },
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
        )}

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

        {/* =========================================================================
            WIDGET 6: EXAM TIMER (ClassroomScreen Style, Transparent Glass & Relaxing Wallpapers)
            ========================================================================= */}
        {activeWidget === 'examtimer' && (
          <div className="space-y-6 w-full">
            
            {/* Top Bar: Wallpaper selection, AI calming themes, PC upload, Transparency & Fullscreen */}
            <div className="p-4 sm:p-5 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5 drop-shadow">
                  <span>🖼️</span>
                  <span>ផ្ទៃខាងក្រោយសម្រួលភាពតានតឹង៖</span>
                </span>
                
                {/* Calming Wallpaper Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {calmingWallpapers.map((wp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setExamBgImage(wp.url)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        examBgImage === wp.url
                          ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/40 scale-105'
                          : 'bg-white/10 hover:bg-white/20 text-white/90 border-white/20'
                      }`}
                    >
                      {wp.name}
                    </button>
                  ))}
                </div>

                {/* AI Calming Scenery Generator */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {calmingGenerations.map((gen, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setExamBgImage(gen.url)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 font-bold text-xs border border-emerald-400/30 transition-all cursor-pointer flex items-center gap-1"
                      title="រូបភាពស្រស់ស្អាតសម្រួលអារម្មណ៍សិស្ស"
                    >
                      <span>✨</span>
                      <span>{gen.label}</span>
                    </button>
                  ))}

                  {/* Upload from PC */}
                  <label className="px-3.5 py-1.5 rounded-xl bg-sky-500/25 hover:bg-sky-500/40 text-sky-200 font-black text-xs border border-sky-400/40 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                    <span>📂</span>
                    <span>ពីកុំព្យូទ័រ (Upload)</span>
                    <input type="file" accept="image/*" onChange={handleExamBgUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Controls: Liquid Glass Style, Rules Toggle & Fullscreen */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Transparency & Liquid Glass Selector */}
                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl border border-white/20 text-xs font-bold backdrop-blur-md">
                  <span className="text-[11px] text-cyan-200 px-1.5 font-black flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    <span>កញ្ចក់៖</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setGlassOpacity('liquid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      glassOpacity === 'liquid'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/40 border border-white/40 scale-105'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title="កញ្ចក់ទឹកថ្លា Liquid Water Style (Apple iOS 27 / Vision Pro)"
                  >
                    <span>💧</span>
                    <span>Liquid Water (iOS 27)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlassOpacity('crystal')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      glassOpacity === 'crystal' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    💎 Crystal
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlassOpacity('frosted')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      glassOpacity === 'frosted' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    🧊 Frosted
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlassOpacity('pure')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      glassOpacity === 'pure' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    🌊 ទឹកថ្លា
                  </button>
                </div>

                {/* Rules Toggle Button (រូបទី២) - Icon Only */}
                <button
                  type="button"
                  onClick={() => handleToggleExamRules()}
                  className={`p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center justify-center shadow-sm ${
                    showExamRules
                      ? 'bg-amber-500/25 text-amber-300 border-amber-400/40 hover:bg-amber-500/35'
                      : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                  }`}
                  title={showExamRules ? 'បិទផ្ទាំងនេះទាំងអស់ (បិទទាំងបទបញ្ជា និងកំណត់ចំណាំ ៧ ចំណុច)' : 'បង្ហាញផ្ទាំងបទបញ្ជា និងកំណត់ចំណាំគ្រូ'}
                >
                  {showExamRules ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-purple-600/30 flex items-center gap-1.5 active:scale-95"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span>{isFullscreen ? 'បង្រួមអេក្រង់' : 'ពង្រីក Full Screen'}</span>
                </button>
              </div>
            </div>

            {/* =========================================================================
                រូបទី៣: MAIN EXAM TIMER CARD (Liquid Water / iPhone iOS 27 Glassmorphism)
                - Specular liquid curvature sheen
                - Pure transparent refraction showing natural background
                - Ultra-large legible typography
                - Editable exam title
                ========================================================================= */}
            <div className={`p-6 sm:p-10 rounded-3xl transition-all relative overflow-hidden flex flex-col items-center justify-center ${
              glassOpacity === 'liquid'
                ? 'bg-white/[0.08] backdrop-blur-3xl backdrop-saturate-[180%] border border-white/40 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(255,255,255,0.15),0_30px_70px_rgba(0,0,0,0.4)] text-white'
                : glassOpacity === 'crystal'
                ? 'bg-black/15 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_20px_45px_rgba(0,0,0,0.3)] text-white'
                : glassOpacity === 'frosted'
                ? 'bg-slate-900/35 backdrop-blur-3xl border border-white/25 shadow-2xl text-white'
                : 'bg-white/[0.02] backdrop-blur-md border border-white/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] text-white'
            }`}>

              {/* Liquid Water Curvature Sheen & Ambient Refractions (iOS 27 Liquid Glass) */}
              {glassOpacity === 'liquid' && (
                <>
                  <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none rounded-t-3xl" />
                  <div className="absolute top-0 left-12 right-12 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
                  <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
                </>
              )}

              {/* Exam Title with Pen Icon Only */}
              <div className="w-full max-w-4xl mb-4 text-center relative group">
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => handleExamTitleChange(e.target.value)}
                  className="w-full text-center text-3xl sm:text-5xl md:text-6xl font-black bg-transparent border-b-2 border-white/30 focus:border-cyan-400 outline-none pb-2 text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] tracking-tight hover:border-white/60 transition-all cursor-text"
                  placeholder="ចំណងជើងការប្រឡង (Exam Title)..."
                />
                <div className="mt-1 flex items-center justify-center">
                  <span className="p-1.5 rounded-lg bg-white/10 text-cyan-300 border border-white/20 drop-shadow inline-flex items-center justify-center" title="កែប្រែចំណងជើង">
                    <Pencil className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Preset Time Buttons (Liquid Water Pills) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 relative z-10">
                {[
                  { label: '១៥ នាទី', secs: 900 },
                  { label: '៣០ នាទី', secs: 1800 },
                  { label: '៤៥ នាទី', secs: 2700 },
                  { label: '៦០ នាទី', secs: 3600 },
                  { label: '៩០ នាទី', secs: 5400 },
                  { label: '១២០ នាទី', secs: 7200 },
                ].map(p => (
                  <button
                    key={p.secs}
                    type="button"
                    onClick={() => {
                      setExamIsRunning(false);
                      setExamIsOvertime(false);
                      setExamInitialSeconds(p.secs);
                      setExamRemainingSeconds(p.secs);
                    }}
                    className={`px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-base font-black transition-all cursor-pointer border shadow-md active:scale-95 ${
                      examInitialSeconds === p.secs && !examIsOvertime
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-white/60 shadow-lg shadow-purple-600/40 scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-md'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Colossal Digital Timer Display (Extra Large for Back-row Students to easily read from 30m away) */}
              <div className="my-6 sm:my-10 text-center relative z-10">
                <div className={`text-8xl sm:text-[11rem] md:text-[14rem] lg:text-[16rem] font-black font-mono tracking-tight leading-none select-none drop-shadow-[0_12px_45px_rgba(0,0,0,0.95)] ${
                  examIsOvertime 
                    ? 'text-red-400 animate-pulse' 
                    : examRemainingSeconds <= 300 
                    ? 'text-amber-400 animate-pulse' 
                    : 'text-white'
                }`}>
                  {examIsOvertime ? '+' : ''}
                  {String(Math.floor(Math.abs(examRemainingSeconds) / 3600)).padStart(2, '0')}:
                  {String(Math.floor((Math.abs(examRemainingSeconds) % 3600) / 60)).padStart(2, '0')}:
                  {String(Math.abs(examRemainingSeconds) % 60).padStart(2, '0')}
                </div>
                <div className="text-base sm:text-2xl md:text-3xl font-black text-amber-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mt-4 tracking-wide uppercase">
                  {examIsOvertime 
                    ? '⏰ ហួសម៉ោងប្រឡងហើយ (Overtime Alert)' 
                    : examRemainingSeconds <= 300 
                    ? '⚠️ ជិតដល់ម៉ោងបញ្ចប់ការប្រឡង (Time is running out)' 
                    : '⏳ ពេលវេលានៅសល់សម្រាប់បេក្ខជនប្រឡង (Time Remaining)'}
                </div>
              </div>

              {/* Big Responsive Liquid Glass Control Buttons */}
              <div className="flex items-center gap-3 sm:gap-5 mb-4 flex-wrap justify-center relative z-10">
                <button
                  type="button"
                  onClick={() => setExamIsRunning(!examIsRunning)}
                  className={`px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-lg sm:text-2xl font-black text-white shadow-2xl transition-all flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 border ${
                    examIsRunning
                      ? 'bg-amber-600/90 hover:bg-amber-600 border-amber-300/50 shadow-amber-600/40'
                      : 'bg-gradient-to-r from-emerald-500/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-600 border-emerald-300/50 shadow-emerald-500/40'
                  } backdrop-blur-xl`}
                >
                  {examIsRunning ? <Pause className="w-7 h-7 sm:w-8 sm:h-8" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8" />}
                  <span>{examIsRunning ? 'ផ្អាក (Pause)' : 'ចាប់ផ្ដើម (Start)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExamIsRunning(false);
                    setExamIsOvertime(false);
                    setExamRemainingSeconds(examInitialSeconds);
                  }}
                  className="px-5 py-4 sm:py-5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/35 text-white font-black text-base sm:text-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-lg backdrop-blur-xl"
                  title="កំណត់ឡើងវិញ (Reset)"
                >
                  <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExamRemainingSeconds(prev => prev + 300)}
                  className="px-5 py-4 sm:py-5 rounded-2xl bg-purple-600/60 hover:bg-purple-600/80 border border-purple-400/50 text-white font-black text-base sm:text-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-lg backdrop-blur-xl"
                  title="បន្ថែម ៥ នាទី (+5 mins)"
                >
                  <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
                  <span>+៥ នាទី</span>
                </button>

                {/* Eye toggle button in image 3 (Icon Only, no words) */}
                <button
                  type="button"
                  onClick={() => handleToggleExamRules()}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-lg backdrop-blur-xl ${
                    showExamRules
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400/50 hover:bg-amber-500/40 shadow-amber-500/20'
                      : 'bg-white/15 text-white border-white/35 hover:bg-white/25'
                  }`}
                  title={showExamRules ? 'បិទផ្ទាំងនេះទាំងអស់ (បិទទាំងបទបញ្ជា និងកំណត់ចំណាំ ៧ ចំណុច)' : 'បង្ហាញផ្ទាំងបទបញ្ជា និងកំណត់ចំណាំគ្រូ'}
                >
                  {showExamRules ? <EyeOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Eye className="w-6 h-6 sm:w-7 sm:h-7" />}
                </button>
              </div>

              {/* In Fullscreen Notice */}
              {isFullscreen && (
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20">
                  <span>ℹ️ របៀប Full Screen ត្រូវបានពង្រីកនាឡិកាជាអតិបរមា</span>
                  <button
                    type="button"
                    onClick={() => handleToggleExamRules()}
                    className="p-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 cursor-pointer ml-1 transition-all"
                    title={showExamRules ? 'បិទផ្ទាំងនេះទាំងអស់' : 'បង្ហាញផ្ទាំងបទបញ្ជា'}
                  >
                    {showExamRules ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

            </div>

            {/* =========================================================================
                Eye Icon placed right after Image 3 (បន្ទាប់ពីអក្សររូបទី៣)
                - No words, just Eye / EyeOff icon
                - Toggles showing and hiding the exam rules (រូបទី២)
                ========================================================================= */}
            <div className="flex items-center justify-center my-4">
              <button
                type="button"
                onClick={() => handleToggleExamRules()}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-xl backdrop-blur-2xl flex items-center justify-center active:scale-95 ${
                  showExamRules
                    ? 'bg-amber-500/25 text-amber-300 border-amber-400/40 hover:bg-amber-500/35 shadow-amber-500/20'
                    : 'bg-white/15 text-white border-white/30 hover:bg-white/25 shadow-black/30'
                }`}
                title={showExamRules ? 'បិទផ្ទាំងនេះទាំងអស់ (បិទទាំងបទបញ្ជា និងកំណត់ចំណាំ ៧ ចំណុច)' : 'បង្ហាញផ្ទាំងបទបញ្ជា និងកំណត់ចំណាំគ្រូ'}
              >
                {showExamRules ? <EyeOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Eye className="w-6 h-6 sm:w-7 sm:h-7" />}
              </button>
            </div>

            {/* =========================================================================
                រូបទី២: បទបញ្ជាផ្ទៃក្នុង និងការណែនាំការប្រឡង (Exam Rules)
                - កន្លែងកែពាក្យ (Pen Icon Only ✏️)
                - 4 Complete Chapters with Extra Large, Sharp Typography
                - Reset to Default feature
                - បិទផ្ទាំងនេះទាំងអស់ បិទទាំងកំណត់ចំណាំ ៧ ចំណុច
                ========================================================================= */}
            {showExamRules && (
              <div className={`p-6 sm:p-10 rounded-3xl border shadow-2xl text-left transition-all ${
                glassOpacity === 'liquid'
                  ? 'bg-white/[0.08] backdrop-blur-3xl backdrop-saturate-[180%] border-white/30 text-white shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.5),0_25px_60px_rgba(0,0,0,0.35)]'
                  : glassOpacity === 'crystal'
                  ? 'bg-black/25 backdrop-blur-2xl border-white/25 text-white'
                  : glassOpacity === 'frosted'
                  ? 'bg-slate-950/50 backdrop-blur-2xl border-white/25 text-white'
                  : 'bg-black/40 backdrop-blur-2xl border-white/30 text-white'
              }`}>
                {/* Rules Section Header */}
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b border-white/20">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl">📋</span>
                    <div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-300 drop-shadow-md tracking-tight">
                        បទបញ្ជាផ្ទៃក្នុង និងការណែនាំការប្រឡង (Exam Rules)
                      </h2>
                      <p className="text-sm sm:text-base text-slate-200 font-bold mt-1">
                        សូមបេក្ខជនទាំងអស់គោរពឱ្យបានម៉ឺងម៉ាត់បំផុតនូវបទបញ្ជាខាងក្រោម
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {syncStatus ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/25 text-emerald-300 border border-emerald-400/35 text-xs font-black flex items-center gap-1.5 shadow-md animate-pulse">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{syncStatus}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-white/10 text-cyan-200 border border-white/20 text-[11px] font-bold flex items-center gap-1 shadow-xs" title="រក្សាទុកស្វ័យប្រវត្តិក្នងម៉ាស៊ីន និង Cloud Firebase">
                        <span>💾</span>
                        <span>Auto-Sync</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleResetRegulations}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-bold text-cyan-200 border border-white/20 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                      title="កំណត់ខ្លឹមសារបទបញ្ជាឡើងវិញតាមលំនាំដើម"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>កំណត់ដូចដើម</span>
                    </button>
                    {/* Close / Hide Eye button without words */}
                    <button
                      type="button"
                      onClick={() => handleToggleExamRules(false)}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/20 cursor-pointer transition-all flex items-center justify-center active:scale-95"
                      title="បិទផ្ទាំងនេះទាំងអស់ (បិទទាំងបទបញ្ជា និងកំណត់ចំណាំ ៧ ចំណុច)"
                    >
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>

                {/* 4 Complete Chapters with Extra Large Typography and Pen Icon Editing */}
                <div className="space-y-6">
                  {fullExamRegulations.map((reg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 sm:p-7 rounded-3xl border transition-all ${
                        idx === 3 
                          ? 'bg-red-950/70 backdrop-blur-2xl border-2 border-red-500/60 text-white shadow-2xl shadow-red-950/40 ring-1 ring-red-400/40' 
                          : 'bg-white/[0.06] backdrop-blur-xl border-white/20 text-white shadow-lg'
                      }`}
                    >
                      {/* Chapter Title */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl sm:text-3xl">{reg.icon}</span>
                        <h3 className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                          idx === 3 
                            ? 'text-red-300 sm:text-red-200 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]' 
                            : 'text-amber-300 drop-shadow'
                        }`}>
                          {reg.title}
                        </h3>
                      </div>

                      {/* Items with Pen-Only Edit Button */}
                      <div className="space-y-3 pl-2 sm:pl-4">
                        {reg.items.map((item, itemIdx) => (
                          <div 
                            key={itemIdx} 
                            className={`p-3.5 sm:p-4 rounded-2xl transition-all shadow-sm ${
                              idx === 3
                                ? 'bg-red-900/40 hover:bg-red-900/60 border border-red-400/30'
                                : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/15'
                            }`}
                          >
                            {editingChapterIdx === idx && editingItemIdx === itemIdx ? (
                              <div className="space-y-2">
                                <div className="text-xs font-black text-amber-300 flex items-center gap-1">
                                  <Pencil className="w-3.5 h-3.5" />
                                </div>
                                <textarea
                                  value={editingItemText}
                                  onChange={(e) => setEditingItemText(e.target.value)}
                                  rows={3}
                                  className="w-full bg-black/60 border-2 border-amber-400 rounded-xl p-3 text-white text-base sm:text-lg font-bold outline-none leading-relaxed"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveChapterRule(idx, itemIdx)}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>រក្សាទុក</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingChapterIdx(null); setEditingItemIdx(null); setEditingItemText(''); }}
                                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm cursor-pointer"
                                  >
                                    បោះបង់
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <div className={`text-base sm:text-lg md:text-xl font-bold leading-relaxed flex items-start gap-3 flex-1 ${
                                  idx === 3 
                                    ? 'text-white font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,1)]' 
                                    : 'text-white/95 drop-shadow'
                                }`}>
                                  <span className={`${idx === 3 ? 'text-red-400 text-2xl font-black' : 'text-amber-400 font-black'} mt-0.5`}>•</span>
                                  <div className="whitespace-pre-line flex-1">
                                    {item}
                                  </div>
                                </div>
                                {/* Pen Icon Only */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChapterIdx(idx);
                                    setEditingItemIdx(itemIdx);
                                    setEditingItemText(item);
                                  }}
                                  className="p-2 sm:p-2.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-400/35 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                                  title="កែសម្រួល"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* =========================================================================
                    Custom Rules Add / Management Section for Teachers (Screenshot 1 / Image 4)
                    - Text colors sharp, high contrast, highly legible
                    - ✏️ Pen Icon Only on every rule item (No text)
                    ========================================================================= */}
                <div className="mt-8 pt-6 border-t border-white/20">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 drop-shadow">
                        <span>➕</span>
                        <span>កំណត់ចំណាំ ឬបទបញ្ជាបន្ថែមរបស់លោកគ្រូអ្នកគ្រូ ({examRules.length} ចំណុច)</span>
                      </span>
                      {syncStatus && (
                        <span className="text-xs font-black text-emerald-300 bg-emerald-500/25 px-2.5 py-1 rounded-full border border-emerald-400/35 flex items-center gap-1 shadow-sm animate-pulse">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{syncStatus}</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleExamRules(false)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/20 cursor-pointer transition-all flex items-center justify-center active:scale-95 shadow-sm"
                      title="បិទផ្ទាំងនេះទាំងអស់ (បិទទាំងបទបញ្ជា និងកំណត់ចំណាំ ៧ ចំណុច)"
                    >
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <ul className="space-y-2.5 mb-4">
                    {examRules.map((rule, idx) => (
                      <li key={idx} className="bg-slate-900/60 hover:bg-slate-900/80 px-4 py-3.5 rounded-2xl border border-white/25 transition-all shadow-md backdrop-blur-xl">
                        {editingRuleIndex === idx ? (
                          <div className="flex items-center gap-2 w-full">
                            <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-md">{idx + 1}</span>
                            <input
                              type="text"
                              value={editingRuleText}
                              onChange={(e) => setEditingRuleText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCustomRule(idx);
                                if (e.key === 'Escape') { setEditingRuleIndex(null); setEditingRuleText(''); }
                              }}
                              autoFocus
                              className="flex-1 bg-black/60 border-2 border-amber-400 rounded-xl px-3.5 py-2 text-white text-base sm:text-lg font-bold outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCustomRule(idx)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-md shrink-0"
                            >
                              <Check className="w-4 h-4" />
                              <span>រក្សាទុក</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingRuleIndex(null); setEditingRuleText(''); }}
                              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0"
                            >
                              បោះបង់
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-md">{idx + 1}</span>
                              <span className="text-white font-extrabold text-base sm:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-relaxed">{rule}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Edit Rule Button - Pen Icon Only */}
                              <button
                                type="button"
                                onClick={() => { setEditingRuleIndex(idx); setEditingRuleText(rule); }}
                                className="p-2 sm:p-2.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-400/40 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                                title="កែសម្រួល"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomRule(idx)}
                                className="p-2 rounded-xl bg-red-500/25 hover:bg-red-500/45 text-red-300 border border-red-400/40 font-black text-xs transition-all cursor-pointer flex items-center justify-center"
                                title="លុបចោល"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Add New Rule input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCustomRule();
                      }}
                      placeholder="សរសេរបន្ថែមការណែនាំ ឬចំណាំជាក់ស្ដែងសម្រាប់ថ្នាក់នេះ..."
                      className="flex-1 px-4 py-3 rounded-xl text-sm sm:text-base bg-white/15 border border-white/25 text-white placeholder-white/50 outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomRule}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm sm:text-base transition-all cursor-pointer shadow-lg shadow-purple-600/30"
                    >
                      បន្ថែម
                    </button>
                  </div>

                  {/* Close all of this panel button at bottom */}
                  <div className="mt-8 pt-5 border-t border-white/15 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleToggleExamRules(false)}
                      className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/25 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2.5 active:scale-95 backdrop-blur-md shadow-lg"
                      title="បិទផ្ទាំងនេះទាំងអស់ (បិទទាំងបទបញ្ជា និងកំណត់ចំណាំ ៧ ចំណុច)"
                    >
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                      <span>បិទផ្ទាំងនេះទាំងអស់</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
