// High-Performance Audio Engine for Classroom Game & Quiz Sounds

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

const SOUND_STORAGE_KEY = 'khmer_app_sound_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(SOUND_STORAGE_KEY);
    return val !== 'false'; // default true
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('app-sound-changed', { detail: { enabled } }));
  } catch {}
}

// Pre-cached audio assets
const TICK_URL = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
const FIREWORK_URL = 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3';
const APPLAUSE_URL = 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3';
const CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';

let tickAudio: HTMLAudioElement | null = null;
let fireworkAudio: HTMLAudioElement | null = null;
let applauseAudio: HTMLAudioElement | null = null;
let chimeAudio: HTMLAudioElement | null = null;

function initAudioElements() {
  if (typeof window === 'undefined') return;
  try {
    if (!tickAudio) {
      tickAudio = new Audio(TICK_URL);
      tickAudio.volume = 0.8;
      tickAudio.load();
    }
    if (!fireworkAudio) {
      fireworkAudio = new Audio(FIREWORK_URL);
      fireworkAudio.volume = 0.9;
      fireworkAudio.load();
    }
    if (!applauseAudio) {
      applauseAudio = new Audio(APPLAUSE_URL);
      applauseAudio.volume = 0.8;
      applauseAudio.load();
    }
    if (!chimeAudio) {
      chimeAudio = new Audio(CHIME_URL);
      chimeAudio.volume = 0.7;
      chimeAudio.load();
    }
  } catch {}
}

export function playTickSound() {
  if (!isSoundEnabled()) return;
  
  // 1. First attempt WebAudio physical woody tick (instant, zero network latency)
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'running') {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(850, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.03);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(480, ctx.currentTime);
      filter.Q.value = 1.8;

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
      return;
    }
  } catch {}

  // 2. Fallback to HTMLAudio
  try {
    initAudioElements();
    if (tickAudio) {
      tickAudio.currentTime = 0;
      tickAudio.play().catch(() => {});
    }
  } catch {}
}

export function playWinnerSound() {
  if (!isSoundEnabled()) return;
  try {
    initAudioElements();
    if (fireworkAudio) {
      fireworkAudio.currentTime = 0;
      fireworkAudio.play().catch(() => {});
    }
    // Also trigger fanfare chime
    if (applauseAudio) {
      setTimeout(() => {
        if (!isSoundEnabled()) return;
        applauseAudio!.currentTime = 0;
        applauseAudio!.play().catch(() => {});
      }, 300);
    }
  } catch {}
}

export function playApplauseSound() {
  if (!isSoundEnabled()) return;
  try {
    initAudioElements();
    if (applauseAudio) {
      applauseAudio.currentTime = 0;
      applauseAudio.play().catch(() => {});
    }
  } catch {}
}

export function playChimeSound() {
  if (!isSoundEnabled()) return;
  try {
    initAudioElements();
    if (chimeAudio) {
      chimeAudio.currentTime = 0;
      chimeAudio.play().catch(() => {});
    }
  } catch {}
}
