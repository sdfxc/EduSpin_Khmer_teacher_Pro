import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Music, Settings, 
  Shuffle, Maximize2, Minimize2, Trophy, Award, Sparkles, X, 
  Check, Star, Users, Flame, Flag, Zap, Clock, Timer, Eye, 
  Filter, Crown, FastForward, Heart, ShieldAlert, FlipHorizontal
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../types';
import { useLanguage } from '../context/LanguageContext';

// High-precision Synthesized Web Audio Sound FX for Race Timers
class RaceSoundEngine {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext | null {
    try {
      if (typeof window === 'undefined') return null;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // 3-2-1 Countdown Beeps
  static playCountdownBeep(isGo: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isGo) {
        // High pitch double-tone celebratory GO!
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Standard F1 / Race start ready tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {}
  }

  // Speed Boost / Cheer sound
  static playBoostSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [587.33, 880, 1174.66]; // D5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.15, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.2);
      });
    } catch {}
  }

  // Theme action sound (Rev, Quack, Gallop, etc.)
  static playThemeSound(themeId: string) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      if (themeId === 'f1cars' || themeId === 'monstertrucks') {
        // Engine Rev
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.6);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (themeId === 'ducks' || themeId === 'swimming') {
        // Water splash / quack
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.setValueAtTime(500, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (themeId === 'rockets' || themeId === 'ufos') {
        // Cosmic sci-fi sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.48);
      } else {
        // General whistle / starting cheer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.setValueAtTime(1250, now + 0.1);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      }
    } catch {}
  }

  // Victory Fanfare Trumpet Chord
  static playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Arpeggiated C-Major victory fanfare: C4, E4, G4, C5, high flourish
      const melody = [
        { f: 523.25, t: 0, d: 0.18 },
        { f: 659.25, t: 0.16, d: 0.18 },
        { f: 783.99, t: 0.32, d: 0.22 },
        { f: 1046.50, t: 0.52, d: 0.65 }
      ];

      melody.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.25, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } catch {}
  }
}

interface RaceTimersGameProps {
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

// 18 Comprehensive Race Themes from Online Stopwatch Race Timers
export type RaceThemeId = 
  | 'ducks' 
  | 'horses' 
  | 'f1cars' 
  | 'swimming'
  | 'athletics'
  | 'rockets' 
  | 'snails' 
  | 'dinosaurs' 
  | 'speedboats' 
  | 'bicycles' 
  | 'ufos' 
  | 'greyhounds'
  | 'trains'
  | 'monstertrucks'
  | 'tortoises'
  | 'ghosts'
  | 'skiers'
  | 'balloons';

export interface RaceThemeConfig {
  id: RaceThemeId;
  nameEn: string;
  nameKm: string;
  category: 'animals' | 'vehicles' | 'sports' | 'fantasy';
  emoji: string;
  bgGradient: string;
  trackBg: string;
  lanePattern: string;
  racerIcon: string;
  unit: string;
  descriptionEn: string;
  descriptionKm: string;
  accentColor: string;
  naturalFacing?: 'left' | 'right';
}

// Helper to determine horizontal flip transform so ALL racers face forward (right 👉 towards finish line)
export function getRacerIconFacing(theme: RaceThemeConfig, faceForward: boolean): string {
  const isNaturalLeft = theme.naturalFacing === 'left';
  if (faceForward) {
    return isNaturalLeft ? '-scale-x-100' : 'scale-x-100';
  } else {
    return isNaturalLeft ? 'scale-x-100' : '-scale-x-100';
  }
}

export const RACE_THEMES: RaceThemeConfig[] = [
  { 
    id: 'ducks', 
    nameEn: 'Rubber Ducks', 
    nameKm: 'កូនទាទឹក', 
    category: 'animals',
    emoji: '🦆', 
    bgGradient: 'from-sky-600 to-blue-900', 
    trackBg: '#0284c7', 
    lanePattern: 'radial-gradient(circle, rgba(255,255,255,0.15) 10%, transparent 11%)',
    racerIcon: '🦆', 
    unit: 'water lane',
    descriptionEn: 'Cute rubber ducks bobbing and floating along a clear pond!',
    descriptionKm: 'កូនទាជ័រអណ្ដែតលើផ្ទៃទឹកស្រះដ៏ត្រជាក់ស្រស់ស្រាយ!',
    accentColor: '#38bdf8',
    naturalFacing: 'left'
  },
  { 
    id: 'f1cars', 
    nameEn: 'F1 Grand Prix Cars', 
    nameKm: 'ឡានប្រណាំង F1', 
    category: 'vehicles',
    emoji: '🏎️', 
    bgGradient: 'from-red-600 via-zinc-900 to-black', 
    trackBg: '#18181b', 
    lanePattern: 'linear-gradient(90deg, rgba(255,255,255,0.1) 50%, transparent 50%)',
    racerIcon: '🏎️', 
    unit: 'asphalt circuit',
    descriptionEn: 'High speed Formula 1 racers drifting around asphalt track curves!',
    descriptionKm: 'រថយន្តប្រណាំងល្បឿនលឿនកប់លើផ្លូវកៅស៊ូ F1!',
    accentColor: '#ef4444'
  },
  { 
    id: 'horses', 
    nameEn: 'Derby Gallop Horses', 
    nameKm: 'សេះប្រណាំង', 
    category: 'animals',
    emoji: '🐎', 
    bgGradient: 'from-amber-700 via-amber-900 to-stone-950', 
    trackBg: '#15803d', 
    lanePattern: 'radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 70%)',
    racerIcon: '🐎', 
    unit: 'turf track',
    descriptionEn: 'Majestic thoroughbreds galloping with turf kicking up!',
    descriptionKm: 'សេះប្រណាំងដ៏អស្ចារ្យរត់បំបោលយ៉ាងស្វាហាប់លើវាលស្មៅ!',
    accentColor: '#f59e0b',
    naturalFacing: 'left'
  },
  { 
    id: 'swimming', 
    nameEn: 'Olympic Swimming', 
    nameKm: 'ហែលទឹកអូឡាំពិក', 
    category: 'sports',
    emoji: '🏊', 
    bgGradient: 'from-cyan-600 via-blue-800 to-indigo-950', 
    trackBg: '#0369a1', 
    lanePattern: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.12) 30px, transparent 30px, transparent 60px)',
    racerIcon: '🏊‍♂️', 
    unit: 'olympic pool',
    descriptionEn: 'Splashing championship swimmers pushing through blue waves!',
    descriptionKm: 'កីឡាករហែលទឹកអូឡាំពិកប្រជែងគ្នាក្នុងអាងទឹកពណ៌ខៀវស្រងាត់!',
    accentColor: '#06b6d4',
    naturalFacing: 'left'
  },
  { 
    id: 'athletics', 
    nameEn: 'Athletics Sprint', 
    nameKm: 'រត់ប្រណាំងអត្តពលកម្ម', 
    category: 'sports',
    emoji: '🏃', 
    bgGradient: 'from-orange-600 via-red-800 to-zinc-950', 
    trackBg: '#991b1b', 
    lanePattern: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 2px, transparent 2px, transparent 72px)',
    racerIcon: '🏃‍♂️', 
    unit: 'stadium lane',
    descriptionEn: '100m sprint runners sprinting toward the finish ribbon!',
    descriptionKm: 'ការប្រកួតរត់ប្រណាំងចម្ងាយខ្លីឆ្ពោះទៅកាន់ខ្សែជ័យជំនះ!',
    accentColor: '#f97316'
  },
  { 
    id: 'rockets', 
    nameEn: 'Cosmic Rockets', 
    nameKm: 'រ៉ុក្កែតអវកាស', 
    category: 'fantasy',
    emoji: '🚀', 
    bgGradient: 'from-indigo-900 via-purple-950 to-black', 
    trackBg: '#09090b', 
    lanePattern: 'radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)',
    racerIcon: '🚀', 
    unit: 'galaxy sector',
    descriptionEn: 'Blasting rockets soaring past twinkling stars and galaxies!',
    descriptionKm: 'យានរ៉ុក្កែតបាញ់ហោះកាត់ផ្កាយរះព្រិចៗក្នុងលំហអវកាស!',
    accentColor: '#8b5cf6'
  },
  { 
    id: 'snails', 
    nameEn: 'Snail Derby', 
    nameKm: 'ខ្យងសប្បាយរំភើប', 
    category: 'animals',
    emoji: '🐌', 
    bgGradient: 'from-emerald-700 via-teal-900 to-zinc-950', 
    trackBg: '#166534', 
    lanePattern: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, transparent 25%)',
    racerIcon: '🐌', 
    unit: 'garden path',
    descriptionEn: 'Hilarious slow and steady snails leaving shiny trails!',
    descriptionKm: 'ខ្យងវារយឺតៗតែគួរឱ្យអស់សំណើចនិងទាក់ទាញខ្លាំង!',
    accentColor: '#10b981'
  },
  { 
    id: 'dinosaurs', 
    nameEn: 'Jurassic Dinosaurs', 
    nameKm: 'ដាយណូស័រព្រៃបុរាណ', 
    category: 'animals',
    emoji: '🦖', 
    bgGradient: 'from-stone-700 via-amber-950 to-zinc-950', 
    trackBg: '#3f6212', 
    lanePattern: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.15) 20%, transparent 21%)',
    racerIcon: '🦖', 
    unit: 'prehistoric jungle',
    descriptionEn: 'Roaring T-Rex and raptors stampeding through prehistoric jungles!',
    descriptionKm: 'ដាយណូស័រដ៏កាចសាហាវរត់ប្រជែងគ្នាក្នុងព្រៃបុរាណ!',
    accentColor: '#84cc16'
  },
  { 
    id: 'speedboats', 
    nameEn: 'Speedboats Regatta', 
    nameKm: 'ទូកល្បឿនលឿនសមុទ្រ', 
    category: 'vehicles',
    emoji: '🛥️', 
    bgGradient: 'from-teal-600 via-blue-900 to-slate-950', 
    trackBg: '#0284c7', 
    lanePattern: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 10px, transparent 10px, transparent 20px)',
    racerIcon: '🛥️', 
    unit: 'ocean bay',
    descriptionEn: 'Motorboats skimming water with high white foam wakes!',
    descriptionKm: 'ទូកម៉ាស៊ីនបាញ់កម្លាំងទឹកហោះលើផ្ទៃសមុទ្រខៀវ!',
    accentColor: '#14b8a6'
  },
  { 
    id: 'bicycles', 
    nameEn: 'Bicycle Grand Tour', 
    nameKm: 'ជិះកង់ប្រណាំង', 
    category: 'sports',
    emoji: '🚴', 
    bgGradient: 'from-lime-600 via-emerald-800 to-zinc-950', 
    trackBg: '#27272a', 
    lanePattern: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 20px, transparent 20px, transparent 40px)',
    racerIcon: '🚴', 
    unit: 'country highway',
    descriptionEn: 'Tour cyclists pedaling furiously along scenic roadways!',
    descriptionKm: 'អ្នកជិះកង់ប្រណាំងធាក់យ៉ាងលឿនលើដងវិថីទេសភាពស្អាត!',
    accentColor: '#84cc16'
  },
  { 
    id: 'ufos', 
    nameEn: 'Alien UFO Saucers', 
    nameKm: 'យានអវកាស UFO ភពផ្កាយ', 
    category: 'fantasy',
    emoji: '🛸', 
    bgGradient: 'from-fuchsia-800 via-purple-950 to-zinc-950', 
    trackBg: '#1e1b4b', 
    lanePattern: 'radial-gradient(circle, rgba(217,70,239,0.2) 2px, transparent 2px)',
    racerIcon: '🛸', 
    unit: 'hyperspace warp',
    descriptionEn: 'Neon glowing UFO saucers warping through hyperspace!',
    descriptionKm: 'យានចម្លែក UFO បញ្ចេញពន្លឺនេអុងហោះកាត់លំហផ្កាយ!',
    accentColor: '#d946ef'
  },
  { 
    id: 'greyhounds', 
    nameEn: 'Greyhound Dogs', 
    nameKm: 'ឆ្កែប្រណាំងស្ទុះលឿន', 
    category: 'animals',
    emoji: '🐕', 
    bgGradient: 'from-amber-600 via-amber-800 to-stone-900', 
    trackBg: '#15803d', 
    lanePattern: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 15px, transparent 15px, transparent 30px)',
    racerIcon: '🐕', 
    unit: 'kennel track',
    descriptionEn: 'Super fast greyhounds sprinting across the stadium ring!',
    descriptionKm: 'ឆ្កែប្រណាំងល្បឿនលឿនស្ទុះយ៉ាងរហ័សទាន់ចិត្ត!',
    accentColor: '#f59e0b'
  },
  { 
    id: 'trains', 
    nameEn: 'Steam Locomotive', 
    nameKm: 'រថភ្លើងចំហុយទឹក', 
    category: 'vehicles',
    emoji: '🚂', 
    bgGradient: 'from-slate-700 via-zinc-900 to-black', 
    trackBg: '#3f3f46', 
    lanePattern: 'repeating-linear-gradient(90deg, #71717a 0px, #71717a 4px, transparent 4px, transparent 24px)',
    racerIcon: '🚂', 
    unit: 'railroad track',
    descriptionEn: 'Vintage iron trains chugging smoke along parallel rails!',
    descriptionKm: 'ក្បួនរថភ្លើងដែកបុរាណបញ្ចេញផ្សែងចំហុយលើផ្លូវដែក!',
    accentColor: '#a1a1aa'
  },
  { 
    id: 'monstertrucks', 
    nameEn: 'Monster Trucks', 
    nameKm: 'ឡានកង់យក្ស Monster', 
    category: 'vehicles',
    emoji: '🛻', 
    bgGradient: 'from-red-700 via-stone-900 to-black', 
    trackBg: '#78350f', 
    lanePattern: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.2) 0, rgba(0,0,0,0.2) 15px, transparent 15px, transparent 30px)',
    racerIcon: '🛻', 
    unit: 'mud dirt arena',
    descriptionEn: 'Massive giant wheels crushing mud in an extreme rally arena!',
    descriptionKm: 'រថយន្តកង់យក្សលោតផ្លោះលើភក់កខ្វក់យ៉ាងកក្រើក!',
    accentColor: '#ef4444'
  },
  { 
    id: 'tortoises', 
    nameEn: 'Tortoise Sprint', 
    nameKm: 'អណ្ដើកប្រណាំង', 
    category: 'animals',
    emoji: '🐢', 
    bgGradient: 'from-teal-700 via-emerald-950 to-zinc-950', 
    trackBg: '#b45309', 
    lanePattern: 'radial-gradient(circle, rgba(255,255,255,0.1) 10%, transparent 11%)',
    racerIcon: '🐢', 
    unit: 'sandy beach',
    descriptionEn: 'Determined little tortoises plodding steadily across the warm sand!',
    descriptionKm: 'អណ្ដើកតូចៗខិតខំវារឆ្ពោះទៅមុខយ៉ាងខ្ជាប់ខ្ជួនលើឆ្នេរខ្សាច់!',
    accentColor: '#10b981'
  },
  { 
    id: 'ghosts', 
    nameEn: 'Spooky Ghosts', 
    nameKm: 'ខ្មោចអណ្ដែតកំប្លែង', 
    category: 'fantasy',
    emoji: '👻', 
    bgGradient: 'from-purple-900 via-slate-950 to-black', 
    trackBg: '#1e1b4b', 
    lanePattern: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.15) 0%, transparent 60%)',
    racerIcon: '👻', 
    unit: 'misty graveyard',
    descriptionEn: 'Playful floating ghosts drifting across a misty night scene!',
    descriptionKm: 'ខ្មោចកំប្លែងអណ្ដែតហោះយ៉ាងរហ័សកាត់អ័ព្ទរាត្រី!',
    accentColor: '#c084fc'
  },
  { 
    id: 'skiers', 
    nameEn: 'Winter Alpine Ski', 
    nameKm: 'ជិះស្គីលើទឹកកក', 
    category: 'sports',
    emoji: '⛷️', 
    bgGradient: 'from-sky-500 via-blue-700 to-indigo-950', 
    trackBg: '#e0f2fe', 
    lanePattern: 'linear-gradient(90deg, rgba(56,189,248,0.2) 2px, transparent 2px)',
    racerIcon: '⛷️', 
    unit: 'snow slope',
    descriptionEn: 'Slalom skiers carving fresh white powder down mountain slopes!',
    descriptionKm: 'កីឡាករជិះស្គីរអិលលើព្រិលទឹកកកភ្នំយ៉ាងស្ទាត់ជំនាញ!',
    accentColor: '#0284c7'
  },
  { 
    id: 'balloons', 
    nameEn: 'Hot Air Balloons', 
    nameKm: 'បាឡុងហោះលើអាកាស', 
    category: 'fantasy',
    emoji: '🎈', 
    bgGradient: 'from-rose-500 via-amber-700 to-indigo-950', 
    trackBg: '#0f172a', 
    lanePattern: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
    racerIcon: '🎈', 
    unit: 'cloud skyway',
    descriptionEn: 'Colorful hot air balloons floating high into sunrise clouds!',
    descriptionKm: 'បាឡុងចម្រុះពណ៌ហោះកាត់ពពកអណ្តែតលើវេហាស៍!',
    accentColor: '#f43f5e'
  }
];

const RACER_PALETTES = [
  '#f59e0b', '#ec4899', '#10b981', '#3b82f6', '#f97316', 
  '#8b5cf6', '#ef4444', '#14b8a6', '#eab308', '#a855f7',
  '#06b6d4', '#84cc16', '#6366f1', '#d946ef', '#0ea5e9'
];

interface RacerItem {
  id: string;
  student: Student;
  name: string;
  number: number;
  color: string;
  x: number; // 0 to 100%
  laneY: number;
  speed: number;
  burstTimer: number;
  isBursting: boolean;
  cheerBoost: number;
  finished: boolean;
  finishTime: number | null;
  rank: number | null;
  phase: number;
}

interface PowerUpItem {
  id: string;
  x: number; // percentage (25% to 75%)
  laneIndex: number;
  type: 'lightning' | 'star' | 'chili';
  icon: string;
  label: string;
  collected: boolean;
}

export default function RaceTimersGame({
  students,
  pickedIds,
  manualCalledIds = [],
  onSetPickedIds,
  onAwardActivityPoints,
  onSetExactActivityScore,
  isDarkMode = false,
  className = 'ថ្នាក់រៀន',
  onSelectStudent
}: RaceTimersGameProps) {
  const { language } = useLanguage();

  // Settings & Display options
  const [selectedTheme, setSelectedTheme] = useState<RaceThemeId>('f1cars');
  const [raceDuration, setRaceDuration] = useState<number>(15); // seconds
  const [winnerPodiumCount, setWinnerPodiumCount] = useState<1 | 3>(3);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showThemeCatalogModal, setShowThemeCatalogModal] = useState<boolean>(false);
  const [themeCatalogFilter, setThemeCatalogFilter] = useState<'all' | 'animals' | 'vehicles' | 'sports' | 'fantasy'>('all');
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);

  // Flip direction state: true = face forward (right toward finish line), false = original
  const [flipDirection, setFlipDirection] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('race_timers_flip_direction');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('race_timers_flip_direction', JSON.stringify(flipDirection));
    } catch {}
  }, [flipDirection]);

  // Racer display option (Real race timers website feature)
  const [avatarMode, setAvatarMode] = useState<'mascot' | 'avatar' | 'combo'>('combo');
  const [laneDensity, setLaneDensity] = useState<'normal' | 'compact'>('normal');
  const [speedPacing, setSpeedPacing] = useState<'normal' | 'fast' | 'turbo'>('normal');

  // Race control state
  const [raceStatus, setRaceStatus] = useState<'idle' | 'countdown' | 'running' | 'paused' | 'finished'>('idle');
  const [countdownStep, setCountdownStep] = useState<number>(3); // 3, 2, 1, 0 (GO!)
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [winnerRacers, setWinnerRacers] = useState<RacerItem[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [cheeredRacerId, setCheeredRacerId] = useState<string | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const raceStartTimeRef = useRef<number>(0);

  const themeConfig = useMemo(() => {
    return RACE_THEMES.find(t => t.id === selectedTheme) || RACE_THEMES[0];
  }, [selectedTheme]);

  // Available students
  const availableStudents = useMemo(() => {
    const list = students.filter(s => !pickedIds.includes(s.id) && !manualCalledIds.includes(s.id));
    return list.length > 0 ? list : students;
  }, [students, pickedIds, manualCalledIds]);

  const [racers, setRacers] = useState<RacerItem[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUpItem[]>([]);

  const laneHeight = laneDensity === 'compact' ? 56 : 74;
  const topOffset = 80;

  // Initialize racers & track powerups
  const initRacers = useCallback(() => {
    if (availableStudents.length === 0) {
      setRacers([]);
      setPowerUps([]);
      return;
    }

    const newRacers: RacerItem[] = availableStudents.map((s, idx) => {
      const color = RACER_PALETTES[(idx + shuffleSeed) % RACER_PALETTES.length];
      return {
        id: s.id,
        student: s,
        name: s.name,
        number: idx + 1,
        color,
        x: 0,
        laneY: idx * laneHeight + topOffset,
        speed: 1.0,
        burstTimer: Math.random() * 2 + 1.2,
        isBursting: false,
        cheerBoost: 0,
        finished: false,
        finishTime: null,
        rank: null,
        phase: Math.random() * Math.PI * 2,
      };
    });

    // Generate thrilling track power-ups
    const newPowerUps: PowerUpItem[] = [];
    newRacers.forEach((_, idx) => {
      if (Math.random() > 0.4) {
        const types: ('lightning' | 'star' | 'chili')[] = ['lightning', 'star', 'chili'];
        const pType = types[Math.floor(Math.random() * types.length)];
        const icons = { lightning: '⚡', star: '⭐', chili: '🌶️' };
        const labels = { lightning: '+TURBO', star: '+STAR', chili: '+SPEED' };
        newPowerUps.push({
          id: `pu-${idx}-${Math.random()}`,
          x: 30 + Math.random() * 45, // between 30% and 75% track
          laneIndex: idx,
          type: pType,
          icon: icons[pType],
          label: labels[pType],
          collected: false
        });
      }
    });

    setRacers(newRacers);
    setPowerUps(newPowerUps);
    setTimeLeft(raceDuration);
    setRaceStatus('idle');
    setWinnerRacers([]);
    setShowWinnerModal(false);
  }, [availableStudents, raceDuration, shuffleSeed, laneHeight, topOffset]);

  useEffect(() => {
    initRacers();
  }, [initRacers, selectedTheme, laneDensity]);

  // Start sequence with authentic 3-2-1-GO! countdown
  const handleStartSequence = () => {
    if (racers.length === 0) return;
    setRaceStatus('countdown');
    setCountdownStep(3);
    if (soundActive) RaceSoundEngine.playCountdownBeep(false);
  };

  // Countdown timer effect
  useEffect(() => {
    if (raceStatus !== 'countdown') return;

    if (countdownStep > 0) {
      const timer = setTimeout(() => {
        setCountdownStep(prev => prev - 1);
        if (soundActive) {
          if (countdownStep === 1) {
            RaceSoundEngine.playCountdownBeep(true);
            RaceSoundEngine.playThemeSound(selectedTheme);
          } else {
            RaceSoundEngine.playCountdownBeep(false);
          }
        }
      }, 900);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished -> Start Race!
      setRaceStatus('running');
      setTimeLeft(raceDuration);
      lastTimeRef.current = performance.now();
      raceStartTimeRef.current = performance.now();
    }
  }, [raceStatus, countdownStep, raceDuration, soundActive, selectedTheme]);

  const handlePauseRace = () => {
    setRaceStatus('paused');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  const handleResumeRace = () => {
    setRaceStatus('running');
    lastTimeRef.current = performance.now();
  };

  const handleResetRace = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    initRacers();
  };

  const handleShuffle = () => {
    setShuffleSeed(prev => prev + 1);
    if (soundActive) RaceSoundEngine.playBoostSound();
  };

  // Interactive Cheer Click: cheering a racer gives an instant speed boost!
  const handleCheerRacer = (racerId: string) => {
    if (raceStatus !== 'running') return;
    setCheeredRacerId(racerId);
    if (soundActive) RaceSoundEngine.playBoostSound();

    setRacers(prev => prev.map(r => {
      if (r.id === racerId && !r.finished) {
        return {
          ...r,
          x: Math.min(90, r.x + 4.5),
          isBursting: true,
          burstTimer: 1.5,
          cheerBoost: r.cheerBoost + 1
        };
      }
      return r;
    }));

    setTimeout(() => {
      setCheeredRacerId(null);
    }, 700);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Physics animation loop
  useEffect(() => {
    if (raceStatus !== 'running') return;

    let finishedCount = 0;
    const finishDistance = 91.5;

    const speedPacingMultiplier = speedPacing === 'turbo' ? 1.4 : speedPacing === 'fast' ? 1.2 : 1.0;

    const updateLoop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setTimeLeft(prev => Math.max(0, prev - delta));

      const baseSpeedRate = (finishDistance / raceDuration) * 0.98 * speedPacingMultiplier;

      setRacers(prevRacers => {
        return prevRacers.map((racer, laneIdx) => {
          if (racer.finished) return racer;

          let isBursting = racer.isBursting;
          let burstTimer = racer.burstTimer - delta;
          let speedMultiplier = 1.0;

          if (burstTimer <= 0) {
            if (isBursting) {
              isBursting = false;
              burstTimer = Math.random() * 2.2 + 1.0;
            } else {
              isBursting = true;
              burstTimer = Math.random() * 0.9 + 0.4;
            }
          }

          if (isBursting) {
            speedMultiplier = 1.65 + Math.random() * 0.7;
          } else {
            speedMultiplier = 0.8 + Math.random() * 0.45;
          }

          // Check if collecting powerup
          powerUps.forEach(pu => {
            if (!pu.collected && pu.laneIndex === laneIdx && Math.abs(racer.x - pu.x) < 3.5) {
              pu.collected = true;
              isBursting = true;
              burstTimer = 1.8;
              speedMultiplier += 1.2;
              if (soundActive) RaceSoundEngine.playBoostSound();
            }
          });

          const moveDelta = baseSpeedRate * speedMultiplier * delta;
          const newX = racer.x + moveDelta;

          if (newX >= finishDistance && !racer.finished) {
            finishedCount++;
            return {
              ...racer,
              x: finishDistance + Math.random() * 2,
              finished: true,
              finishTime: (now - raceStartTimeRef.current) / 1000,
              rank: finishedCount,
              isBursting: false,
              burstTimer: 0,
            };
          }

          return {
            ...racer,
            x: newX,
            isBursting,
            burstTimer,
          };
        });
      });

      const allDone = racers.some(d => d.finished && d.rank === 1);
      const isTimeUp = (now - raceStartTimeRef.current) >= (raceDuration * 1000);

      if (allDone || isTimeUp) {
        setRacers(finalRacers => {
          const sorted = [...finalRacers].sort((a, b) => {
            if (a.rank && b.rank) return a.rank - b.rank;
            if (a.rank) return -1;
            if (b.rank) return 1;
            return b.x - a.x;
          });

          const ranked = sorted.map((d, index) => ({
            ...d,
            rank: index + 1,
            finished: true,
            finishTime: d.finishTime || Number(((now - raceStartTimeRef.current) / 1000).toFixed(2))
          }));

          const winners = ranked.slice(0, winnerPodiumCount);
          setWinnerRacers(winners);
          setRaceStatus('finished');

          if (soundActive) {
            RaceSoundEngine.playVictoryFanfare();
          }

          confetti({
            particleCount: 160,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#ef4444']
          });

          setTimeout(() => setShowWinnerModal(true), 600);

          return ranked;
        });
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [raceStatus, raceDuration, winnerPodiumCount, powerUps, soundActive, speedPacing]);

  // Formatted digital clock: 00:MM:SS
  const formattedTimer = useMemo(() => {
    const totalSecs = Math.max(0, timeLeft);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const ms = Math.floor((totalSecs % 1) * 10);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(mins)}:${pad(secs)}.${ms}`;
  }, [timeLeft]);

  const totalTrackHeight = Math.max(560, racers.length * laneHeight + 180);

  // Filtered themes for catalog
  const filteredThemes = useMemo(() => {
    if (themeCatalogFilter === 'all') return RACE_THEMES;
    return RACE_THEMES.filter(t => t.category === themeCatalogFilter);
  }, [themeCatalogFilter]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full flex flex-col overflow-hidden select-none font-sans ${
        isDarkMode ? 'bg-[#090d16] text-white' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* ================= TOP CONTROL BAR ================= */}
      <header className="shrink-0 bg-slate-950/95 border-b-2 border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg z-30 backdrop-blur-md">
        
        {/* Left: Theme Switcher, Catalog Button & Quick Themes */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Theme Selector Dropdown */}
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value as RaceThemeId)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-black text-xs border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
          >
            {RACE_THEMES.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.emoji} {language === 'km' ? theme.nameKm : theme.nameEn}
              </option>
            ))}
          </select>

          {/* Browse All Themes Catalog Button (Like Online Stopwatch Race Timers) */}
          <button
            type="button"
            onClick={() => setShowThemeCatalogModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            title="Browse all Race Timers catalog"
          >
            <span>🏁</span>
            <span className="hidden md:inline">{language === 'km' ? 'ផ្ទាំងប្រណាំងទាំងអស់' : 'All Race Themes'}</span>
            <span className="px-1 rounded-md bg-black/25 text-white text-[10px] font-black">{RACE_THEMES.length}</span>
          </button>

          {/* Shuffle Racers */}
          <button
            type="button"
            onClick={handleShuffle}
            disabled={raceStatus === 'running' || raceStatus === 'countdown'}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-black flex items-center gap-1.5 border border-white/10 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="Shuffle racer lane order"
          >
            <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">{language === 'km' ? 'ផ្លាស់ប្តូរគន្លង' : 'Shuffle'}</span>
          </button>

          {/* Flip Racers Button (Flip ទាំងអស់) */}
          <button
            type="button"
            onClick={() => setFlipDirection(!flipDirection)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer transition-all active:scale-95 shadow-sm ${
              flipDirection 
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-amber-400/20 shadow-md' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/60 shadow-indigo-500/20 shadow-md'
            }`}
            title={language === 'km' ? 'ត្រឡប់ទិសមុខអ្នកប្រណាំងទាំងអស់ (Flip All Direction)' : 'Flip all racers direction'}
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-current" />
            <span className="font-black">
              {language === 'km' ? (flipDirection ? 'មុខទៅមុខ 👉' : 'ត្រឡប់បញ្ច្រាស 👈') : (flipDirection ? 'Face Forward 👉' : 'Flip 👈')}
            </span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center border border-white/15 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="Race Settings"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Center: Start / Pause / Reset & High-Contrast LED Timer */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            {raceStatus === 'running' || raceStatus === 'countdown' ? (
              <button
                type="button"
                onClick={handlePauseRace}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black cursor-pointer flex items-center gap-1 transition-all active:scale-95 shadow-md"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>
            ) : raceStatus === 'paused' ? (
              <button
                type="button"
                onClick={handleResumeRace}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black cursor-pointer flex items-center gap-1 transition-all active:scale-95 shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartSequence}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs sm:text-sm font-black cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 animate-pulse"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{language === 'km' ? 'ចាប់ផ្តើមប្រណាំង' : 'START RACE'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetRace}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black border border-white/10 cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Digital Timer Display (Arcade / Online Stopwatch Look) */}
          <div className="px-3.5 py-1 rounded-xl bg-[#030712] text-amber-400 border-2 border-amber-500/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_12px_rgba(245,158,11,0.2)]">
            <span className="font-mono text-xl sm:text-2xl md:text-3xl font-black tracking-widest select-none drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
              {formattedTimer}
            </span>
          </div>
        </div>

        {/* Right: Quick Durations, Sound Toggle & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick preset chips */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-white/10">
            {[10, 15, 20, 30].map(sec => (
              <button
                key={sec}
                type="button"
                disabled={raceStatus === 'running' || raceStatus === 'countdown'}
                onClick={() => {
                  setRaceDuration(sec);
                  setTimeLeft(sec);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  raceDuration === sec 
                    ? 'bg-amber-500 text-slate-950 shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundActive(!soundActive)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              soundActive 
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' 
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
            title={soundActive ? 'Sound On' : 'Sound Muted'}
          >
            {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center border border-white/15 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ================= QUICK THEMES PILL TRAY ================= */}
      <div className="shrink-0 bg-slate-950/80 border-b border-white/10 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none z-25">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          <span>{language === 'km' ? 'ស្ទីលប្រណាំង:' : 'RACES:'}</span>
        </span>
        {RACE_THEMES.map(theme => (
          <button
            key={theme.id}
            type="button"
            onClick={() => setSelectedTheme(theme.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
              selectedTheme === theme.id
                ? 'bg-amber-400 text-slate-950 shadow-sm scale-105'
                : 'bg-slate-900/70 hover:bg-slate-850 text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            <span>{theme.emoji}</span>
            <span>{language === 'km' ? theme.nameKm : theme.nameEn}</span>
          </button>
        ))}
      </div>

      {/* ================= COUNTDOWN OVERLAY ================= */}
      {raceStatus === 'countdown' && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center select-none animate-fadeIn">
          <div className="text-white text-xl sm:text-2xl font-black mb-6 uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <span>🏁</span> 
            <span>{language === 'km' ? themeConfig.nameKm : themeConfig.nameEn} Race Starting...</span> 
            <span>🏁</span>
          </div>
          
          {/* F1 Style Starting Lights Rig */}
          <div className="p-4 rounded-3xl bg-zinc-950 border-4 border-zinc-800 shadow-2xl flex items-center gap-3 sm:gap-4 mb-8">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-black flex items-center justify-center text-2xl font-black shadow-2xl transition-all ${countdownStep <= 3 ? 'bg-red-600 text-white scale-110 shadow-red-500/60 shadow-lg' : 'bg-red-950/40 text-red-500/20'}`}>
              🔴
            </div>
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-black flex items-center justify-center text-2xl font-black shadow-2xl transition-all ${countdownStep <= 2 ? 'bg-amber-500 text-slate-950 scale-110 shadow-amber-500/60 shadow-lg' : 'bg-amber-950/40 text-amber-500/20'}`}>
              🟡
            </div>
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-black flex items-center justify-center text-2xl font-black shadow-2xl transition-all ${countdownStep <= 1 ? 'bg-emerald-500 text-slate-950 scale-110 shadow-emerald-500/60 shadow-lg' : 'bg-emerald-950/40 text-emerald-500/20'}`}>
              🟢
            </div>
          </div>

          <div className="text-7xl sm:text-9xl font-black font-mono text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] animate-pulse">
            {countdownStep > 0 ? countdownStep : 'GO!'}
          </div>
          <p className="mt-4 text-xs sm:text-sm text-slate-300 font-bold">
            {language === 'km' ? 'ចុចលើអ្នកប្រណាំងដើម្បីបន្ថែមល្បឿន!' : 'Click any racer during race to cheer & boost them!'}
          </p>
        </div>
      )}

      {/* ================= RACE TRACK CONTAINER ================= */}
      <div className="flex-1 w-full relative overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div 
          className="relative w-full min-h-full"
          style={{
            height: `${totalTrackHeight}px`,
            backgroundColor: themeConfig.trackBg,
            backgroundImage: themeConfig.lanePattern,
            backgroundSize: '40px 40px'
          }}
        >
          {/* Track Lane Separator Dividers */}
          {racers.map((racer) => {
            const laneBottom = racer.laneY + (laneDensity === 'compact' ? 52 : 68);
            return (
              <div 
                key={`lane-divider-${racer.id}`}
                className="absolute left-0 right-0 pointer-events-none z-10 flex items-center"
                style={{ top: `${laneBottom}px` }}
              >
                <div className="w-full border-b border-white/20 border-dashed relative">
                  <div className="absolute left-[30%] -top-1 w-2.5 h-2.5 rounded-full bg-white/40 shadow-xs" />
                  <div className="absolute left-[60%] -top-1 w-2.5 h-2.5 rounded-full bg-white/40 shadow-xs" />
                </div>
              </div>
            );
          })}

          {/* Top Banner Header */}
          <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-25 flex items-center justify-between px-6 bg-black/60 backdrop-blur-xs border-b-2 border-white/20 shadow-md">
            <span className="text-sm font-black text-white/90 flex items-center gap-2">
              <span>{themeConfig.emoji}</span>
              <span className="hidden sm:inline">{themeConfig.unit.toUpperCase()}</span>
            </span>
            <span className="text-white font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow-md">
              {themeConfig.emoji} {language === 'km' ? themeConfig.nameKm : themeConfig.nameEn} Championship 🏁
            </span>
            <span className="text-xs font-bold text-amber-300">
              {racers.length} {language === 'km' ? 'បេក្ខជន' : 'Racers'}
            </span>
          </div>

          {/* Track Power-Ups on Lanes */}
          {powerUps.map(pu => {
            if (pu.collected) return null;
            const topY = pu.laneIndex * laneHeight + topOffset + 14;
            return (
              <div
                key={pu.id}
                style={{
                  top: `${topY}px`,
                  left: `${pu.x}%`
                }}
                className="absolute z-15 -translate-x-1/2 pointer-events-none flex flex-col items-center animate-bounce"
              >
                <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center border-2 border-black shadow-lg">
                  {pu.icon}
                </div>
                <span className="text-[9px] font-black text-white bg-black/80 px-1 rounded-sm mt-0.5">
                  {pu.label}
                </span>
              </div>
            );
          })}

          {/* ================= STARTING LINE ================= */}
          <div 
            className="absolute left-[245px] sm:left-[275px] w-7 sm:w-8 pointer-events-none z-30 border-x-2 border-black/50 shadow-[0_0_15px_rgba(0,0,0,0.6)]"
            style={{
              top: '0px',
              bottom: '0px',
              background: 'repeating-conic-gradient(#000000 0% 25%, #ffffff 0% 50%) 50% / 16px 16px',
            }}
          >
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-950 text-white text-[11px] font-black whitespace-nowrap border-2 border-amber-400 shadow-2xl z-35 flex items-center gap-1">
              <span className="text-amber-400">🏁</span> START
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-950/90 text-[10px] font-black text-amber-300 border border-amber-400/80 z-30 whitespace-nowrap">
              START
            </div>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-950 text-white text-[11px] font-black whitespace-nowrap border-2 border-amber-400 shadow-2xl z-35 flex items-center gap-1">
              <span className="text-amber-400">🏁</span> START
            </div>
          </div>

          {/* ================= FINISH LINE ================= */}
          <div 
            className="absolute right-8 sm:right-16 w-9 sm:w-10 pointer-events-none z-30 border-x-2 border-black/50 shadow-[0_0_20px_rgba(0,0,0,0.7)]"
            style={{
              top: '0px',
              bottom: '0px',
              background: 'repeating-conic-gradient(#000000 0% 25%, #ffffff 0% 50%) 50% / 18px 18px',
            }}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-xs shadow-2xl whitespace-nowrap border-2 border-white z-35 flex items-center gap-1 animate-pulse">
              🏆 FINISH 🏁
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-red-600/90 text-[10px] font-black text-white border border-white/80 z-30 whitespace-nowrap">
              🏆 FINISH
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-xs shadow-2xl whitespace-nowrap border-2 border-white z-35 flex items-center gap-1">
              🏆 FINISH 🏁
            </div>
          </div>

          {/* Bottom Bank Footer */}
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-25 flex items-center justify-between px-6 bg-black/60 backdrop-blur-xs border-t-2 border-white/20 shadow-md">
            <span className="text-xs text-white/80 font-bold">Class: {className}</span>
            <span className="text-xs text-amber-300 font-black">🏁 Online Stopwatch Race Timers Edition 🏁</span>
            <span className="text-xs text-white/80 font-bold">{racers.filter(r => r.finished).length} / {racers.length} Finished</span>
          </div>

          {/* ================= RACER ITEMS ================= */}
          {racers.map((racer) => {
            const bobbingY = raceStatus === 'running' ? Math.sin((timeLeft * 7) + racer.phase) * 4 : 0;
            const isCheered = cheeredRacerId === racer.id;

            return (
              <div
                key={racer.id}
                onClick={() => {
                  if (raceStatus === 'running') {
                    handleCheerRacer(racer.id);
                  } else if (onSelectStudent) {
                    onSelectStudent(racer.student);
                  }
                }}
                style={{
                  top: `${racer.laneY}px`,
                  left: `calc(10px + (100% - 240px) * (${racer.x} / 100))`,
                  transform: `translateY(${bobbingY}px) scale(${isCheered ? 1.15 : 1})`,
                  transition: raceStatus === 'idle' ? 'all 0.4s ease-out' : 'transform 0.15s ease'
                }}
                className={`absolute flex items-center gap-2 cursor-pointer z-20 group ${
                  racer.isBursting ? 'filter drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''
                }`}
                title="Click during race to boost!"
              >
                {/* Name Badge */}
                <div className="relative shrink-0 flex items-center">
                  <div className="bg-white text-slate-950 font-black text-xs sm:text-sm px-3 py-1.5 rounded-2xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.9)] whitespace-nowrap max-w-[190px] truncate group-hover:scale-105 transition-transform flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-500">#{racer.number}</span>
                    <span className="truncate">{racer.name}</span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-white border-t-2 border-r-2 border-black rotate-45 -ml-1.5 z-10" />
                </div>

                {/* Racer Vehicle / Mascot / Avatar Container */}
                <div className="relative">
                  {avatarMode === 'avatar' && racer.student.photo ? (
                    // Real Student Photo (Always un-mirrored/natural)
                    <div 
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-3 border-black shadow-lg overflow-hidden relative group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: racer.color }}
                    >
                      <img 
                        src={racer.student.photo} 
                        alt={racer.name} 
                        className="w-full h-full object-cover transition-transform scale-x-100" 
                      />
                    </div>
                  ) : avatarMode === 'combo' && racer.student.photo ? (
                    // Combo: Vehicle + Rider Photo
                    <div 
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-3 border-black shadow-lg flex items-center justify-center text-3xl sm:text-4xl relative group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: racer.color }}
                    >
                      <span className={`inline-block transform select-none transition-transform duration-200 ${getRacerIconFacing(themeConfig, flipDirection)}`}>
                        {themeConfig.racerIcon}
                      </span>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-900">
                        <img src={racer.student.photo} alt={racer.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ) : (
                    // Themed Mascot Graphic
                    <div 
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-3 border-black shadow-lg flex items-center justify-center text-3xl sm:text-4xl transition-transform group-hover:scale-110 relative"
                      style={{ backgroundColor: racer.color }}
                    >
                      <span className={`inline-block transform select-none transition-transform duration-200 ${getRacerIconFacing(themeConfig, flipDirection)}`}>
                        {themeConfig.racerIcon}
                      </span>
                      {racer.isBursting && (
                        <span className={`absolute -bottom-1 ${flipDirection ? '-left-2' : '-right-1'} text-base animate-ping`}>
                          🔥
                        </span>
                      )}
                    </div>
                  )}

                  {/* Cheered Heart Animation */}
                  {isCheered && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
                      💖
                    </div>
                  )}
                </div>

                {/* Rank Badge if Finished */}
                {racer.rank && (
                  <span className={`px-2.5 py-1 rounded-xl text-slate-950 font-black text-xs border-2 border-black shadow-md animate-bounce ${
                    racer.rank === 1 ? 'bg-amber-400' : racer.rank === 2 ? 'bg-slate-300' : racer.rank === 3 ? 'bg-amber-600 text-white' : 'bg-white'
                  }`}>
                    {racer.rank === 1 ? '🥇 1st' : racer.rank === 2 ? '🥈 2nd' : racer.rank === 3 ? '🥉 3rd' : `#${racer.rank}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= THEMES CATALOG MODAL (ALL IMAGE OPTIONS LIKE ONLINE STOPWATCH) ================= */}
      {showThemeCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl text-white flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-xl shadow-md">
                  🏁
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {language === 'km' ? 'ផ្ទាំងជ្រើសរើសស្ទីលប្រណាំងទាំងអស់' : 'Race Timers Theme Catalog'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'km' ? 'ជ្រើសរើសស្ទីលប្រណាំងដូចគេហទំព័រ Race Timers ពិតៗ' : 'Choose any theme like real online-stopwatch race timers'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowThemeCatalogModal(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 py-3 shrink-0 overflow-x-auto scrollbar-none">
              {[
                { id: 'all', labelEn: 'All Themes', labelKm: 'ទាំងអស់', icon: '🌟' },
                { id: 'vehicles', labelEn: 'Vehicles & Racing', labelKm: 'យានយន្ត', icon: '🏎️' },
                { id: 'animals', labelEn: 'Animals & Nature', labelKm: 'សត្វប្រណាំង', icon: '🐾' },
                { id: 'sports', labelEn: 'Olympic & Sports', labelKm: 'កីឡា', icon: '🏅' },
                { id: 'fantasy', labelEn: 'Space & Fantasy', labelKm: 'លំហនិងស្រមើស្រមៃ', icon: '🚀' },
              ].map(filter => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setThemeCatalogFilter(filter.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                    themeCatalogFilter === filter.id
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{filter.icon}</span>
                  <span>{language === 'km' ? filter.labelKm : filter.labelEn}</span>
                </button>
              ))}
            </div>

            {/* Themes Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredThemes.map(theme => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => {
                      setSelectedTheme(theme.id);
                      setShowThemeCatalogModal(false);
                      if (soundActive) RaceSoundEngine.playThemeSound(theme.id);
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.02] ${
                      isSelected 
                        ? 'bg-gradient-to-br from-amber-500/20 to-slate-900 border-amber-400 shadow-lg shadow-amber-500/20' 
                        : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      {/* Theme Preview Card */}
                      <div 
                        className="w-full h-24 rounded-xl flex items-center justify-center text-5xl mb-2.5 relative overflow-hidden shadow-inner border border-white/10"
                        style={{ backgroundColor: theme.trackBg }}
                      >
                        <span className={`inline-block group-hover:scale-125 transition-transform duration-300 ${getRacerIconFacing(theme, flipDirection)}`}>
                          {theme.racerIcon}
                        </span>
                        <div className="absolute bottom-1 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] font-black text-white uppercase tracking-wider">
                          {theme.unit}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                          <span>{theme.emoji}</span>
                          <span>{language === 'km' ? theme.nameKm : theme.nameEn}</span>
                        </h4>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px]">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {language === 'km' ? theme.descriptionKm : theme.descriptionEn}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`w-full mt-3 py-1.5 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1 ${
                        isSelected 
                          ? 'bg-amber-400 text-slate-950 shadow-sm' 
                          : 'bg-slate-700 group-hover:bg-blue-600 text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isSelected ? (language === 'km' ? 'កំពុងលេង' : 'Current Theme') : (language === 'km' ? 'ជ្រើសរើសលេង' : 'Select Theme')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= SETTINGS MODAL ================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>Race Settings & Options</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Avatar / Racer Display Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  {language === 'km' ? 'ស្ទីលរូបភាពអ្នកប្រណាំង (Racer Image Option)' : 'Racer Image Option'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'combo', label: 'Combo (Both)', icon: '🌟' },
                    { id: 'avatar', label: 'Student Photo', icon: '👤' },
                    { id: 'mascot', label: 'Themed Mascot', icon: themeConfig.emoji },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAvatarMode(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        avatarMode === opt.id
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-[11px] truncate w-full text-center">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Race Duration Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400">
                    {language === 'km' ? 'រយៈពេលប្រណាំង (Duration)' : 'Race Duration'}
                  </label>
                  <span className="text-sm font-black text-amber-400">{raceDuration} Seconds</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={raceDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRaceDuration(val);
                    setTimeLeft(val);
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                  <span>5s</span>
                  <span>15s</span>
                  <span>30s</span>
                  <span>45s</span>
                  <span>60s</span>
                </div>
              </div>

              {/* Speed Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  {language === 'km' ? 'កម្រិតល្បឿន (Speed Pace)' : 'Speed Pace'}
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'normal', label: 'Normal' },
                    { id: 'fast', label: 'Fast ⚡' },
                    { id: 'turbo', label: 'Turbo Nitro 🔥' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSpeedPacing(p.id as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                        speedPacing === p.id
                          ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lane Density */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  {language === 'km' ? 'ទំហំគន្លង (Lane Layout)' : 'Lane Layout'}
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'normal', label: 'Spacious (Standard)' },
                    { id: 'compact', label: 'Compact (Fits More Racers)' },
                  ].map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setLaneDensity(d.id as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                        laneDensity === d.id
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Racer Facing Direction (Flip ទាំងអស់) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  {language === 'km' ? 'ទិសដៅមុខអ្នកប្រណាំង (Racer Facing Direction)' : 'Racer Facing Direction'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFlipDirection(true)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      flipDirection
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    <span>{language === 'km' ? 'បែរមុខទៅមុខជ័យជំនះ 👉 (Face Forward)' : 'Face Forward 👉 (Towards Finish)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipDirection(false)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      !flipDirection
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{language === 'km' ? 'ត្រឡប់បញ្ច្រាស 👈 (Reverse Face)' : 'Reverse Face 👈'}</span>
                  </button>
                </div>
              </div>

              {/* Podium count */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  {language === 'km' ? 'ចំនួនជ័យលាភី (Podium Winners)' : 'Podium Winners Display'}
                </label>
                <div className="flex gap-3">
                  {[1, 3].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setWinnerPodiumCount(count as 1 | 3)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                        winnerPodiumCount === count
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      Top {count} Winner{count > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= WINNER CELEBRATION MODAL ================= */}
      <AnimatePresence>
        {showWinnerModal && winnerRacers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-4 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.35)] text-white text-center relative"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-22 h-22 rounded-full bg-amber-400 border-4 border-slate-900 shadow-2xl flex items-center justify-center text-4xl animate-bounce">
                👑
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mt-6 mb-1">
                {language === 'km' ? 'ជ័យលាភីប្រណាំង!' : 'Race Champions!'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-bold mb-6">
                {themeConfig.emoji} {language === 'km' ? themeConfig.nameKm : themeConfig.nameEn} • {className}
              </p>

              {/* Olympic Winners Podium Display */}
              <div className="space-y-3 mb-6">
                {winnerRacers.map((racer, index) => (
                  <div
                    key={`winner-${racer.id}`}
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-between shadow-md ${
                      index === 0
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : index === 1
                        ? 'bg-slate-300/20 border-slate-300 text-slate-200'
                        : 'bg-amber-700/20 border-amber-600 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/20 flex items-center justify-center text-2xl font-black shadow-inner">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="text-left">
                        <div className="font-black text-sm sm:text-base flex items-center gap-1.5">
                          <span>{racer.name}</span>
                          <span className="text-xs text-amber-400 font-mono">({racer.finishTime}s)</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Racer #{racer.number} • {themeConfig.nameEn}
                        </div>
                      </div>
                    </div>

                    {/* Award Activity Points to Student record */}
                    <div className="flex items-center gap-1.5">
                      {onAwardActivityPoints && (
                        <button
                          type="button"
                          onClick={() => {
                            const pts = index === 0 ? 5 : index === 1 ? 3 : 2;
                            onAwardActivityPoints(racer.student.id, pts);
                            if (soundActive) RaceSoundEngine.playBoostSound();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-sm flex items-center gap-1 transition-transform active:scale-95"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>+{index === 0 ? '5' : index === 1 ? '3' : '2'} Pts</span>
                        </button>
                      )}

                      {/* Mark as Called / Picked button */}
                      <button
                        type="button"
                        onClick={() => {
                          onSetPickedIds(prev => [...prev, racer.student.id]);
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Mark student as called"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowWinnerModal(false);
                    initRacers();
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{language === 'km' ? 'ប្រណាំងម្ដងទៀត' : 'Race Again'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWinnerModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm cursor-pointer transition-transform active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
