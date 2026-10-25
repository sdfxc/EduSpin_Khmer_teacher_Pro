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

// =================== DUCK RACE AUDIO GENERATORS (Web Audio Synth) ===================

export function playWhistleSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Carrier oscillator (high pitch whistle)
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(2400, now);

    // Modulator for the whistle trill / peas inside whistle
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(32, now);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(150, now);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    masterGain.gain.setValueAtTime(0.35, now + 0.45);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    carrier.connect(masterGain);
    masterGain.connect(ctx.destination);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.7);
    carrier.stop(now + 0.7);
  } catch {}
}

export function playQuackSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    // Classic quack formant pitch drop
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch {}
}

export function playSplashSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Buffer noise
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.22);
  } catch {}
}

let raceMusicInterval: number | null = null;
let raceMusicGain: GainNode | null = null;

export function startRaceMusic() {
  if (!isSoundEnabled()) return;
  stopRaceMusic();

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    raceMusicGain = ctx.createGain();
    raceMusicGain.gain.setValueAtTime(0.12, ctx.currentTime);
    raceMusicGain.connect(ctx.destination);

    const notes = [
      261.63, 329.63, 392.00, 523.25, // C E G C
      293.66, 349.23, 440.00, 587.33, // D F A D
      329.63, 392.00, 493.88, 659.25, // E G B E
      392.00, 493.88, 587.33, 783.99  // G B D G
    ];

    let step = 0;
    raceMusicInterval = window.setInterval(() => {
      try {
        if (!raceMusicGain || ctx.state !== 'running') return;
        const now = ctx.currentTime;
        const note = notes[step % notes.length];
        step++;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note, now);

        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0.08, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(noteGain);
        noteGain.connect(raceMusicGain);

        osc.start(now);
        osc.stop(now + 0.14);
      } catch {}
    }, 130);
  } catch {}
}

export function stopRaceMusic() {
  if (raceMusicInterval !== null) {
    clearInterval(raceMusicInterval);
    raceMusicInterval = null;
  }
  if (raceMusicGain) {
    try {
      const ctx = getSharedAudioContext();
      if (ctx) {
        raceMusicGain.gain.setValueAtTime(0, ctx.currentTime);
      }
    } catch {}
    raceMusicGain = null;
  }
}
