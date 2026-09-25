/**
 * Resilient Storage Utilities
 * Handles browser localStorage quota limits gracefully, evicts stale caches,
 * and prevents QuotaExceededError from crashing the application.
 */

// Keys that are critical and should not be evicted during auto-cleanup
const PROTECTED_PREFIXES = [
  'logged_in_teacher',
  'khmer_teacher_dark_mode',
  'khmer_teacher_classes',
  'khmer_teacher_active_class_id',
  'students_class_',
  'quiz_cards_class_',
  'subjects_class_',
  'chapters_class_',
  'active_subject_id_',
  'active_room_id_',
  'picked_students_class_',
  'manual_called_students_class_',
  'khmer_exams_',
];

/**
 * Strips huge base64 image strings from cached student objects to keep
 * localStorage footprint under 50KB instead of multiple megabytes.
 */
function sanitizeStudentsForCache(students: any[]): any[] {
  if (!Array.isArray(students)) return students;
  return students.map((s) => {
    if (!s || typeof s !== 'object') return s;
    // If avatarUrl is a massive base64 string (>1KB), strip it for local cache
    // The live student object in memory and Firestore preserves the full image!
    if (typeof s.avatarUrl === 'string' && s.avatarUrl.startsWith('data:image') && s.avatarUrl.length > 1024) {
      return { ...s, avatarUrl: '', _avatarCachedLocally: false };
    }
    return s;
  });
}

/**
 * Evicts non-essential or stale items from localStorage when quota is near/exceeded
 */
function evictStaleCaches(currentKeyToPreserve?: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Don't evict the key we are currently trying to save
      if (currentKeyToPreserve && key === currentKeyToPreserve) continue;

      // Don't evict protected user auth, class data, or core config keys
      if (PROTECTED_PREFIXES.some((p) => key.startsWith(p))) continue;

      // Prioritize evicting large external file blobs, temporary data, and cached documents
      if (key.startsWith('ext_file_') || key.startsWith('pdf_') || key.startsWith('pptx_') || key.startsWith('temp_') || key.startsWith('cache_')) {
        keysToRemove.push(key);
        continue;
      }
    }

    for (const k of keysToRemove) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
  } catch {}
}

/**
 * Safely sets an item in localStorage with automatic quota recovery
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuota =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014 ||
        (err.message && err.message.toLowerCase().includes('quota')));

    if (!isQuota) {
      console.warn(`[Storage] Failed to save key "${key}":`, err);
      return false;
    }

    // Step 1: Evict stale caches and retry
    evictStaleCaches(key);
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {}

    // Step 2: If setting students_class_*, sanitize heavy base64 images and retry
    if (key.startsWith('students_class_')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeStudentsForCache(parsed);
          localStorage.setItem(key, JSON.stringify(sanitized));
          return true;
        }
      } catch {}
    }

    // Step 3: Evict any remaining non-protected caches and retry one last time
    try {
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !PROTECTED_PREFIXES.some((p) => k.startsWith(p)) && k !== key) {
          keysToClear.push(k);
        }
      }
      for (const k of keysToClear) {
        localStorage.removeItem(k);
      }
      localStorage.setItem(key, value);
      return true;
    } catch (finalErr) {
      // Step 4: Graceful degrade — do not throw and crash the app!
      console.warn(`[Storage] LocalStorage quota exceeded for "${key}". Live state is preserved in memory and Firestore.`);
      return false;
    }
  }
}

/**
 * Safely stores JSON data in localStorage, automatically sanitizing student avatars if needed
 */
export function safeSetJSON(key: string, value: any): boolean {
  try {
    let payload = value;
    if (key.startsWith('students_class_') && Array.isArray(value)) {
      payload = sanitizeStudentsForCache(value);
    }
    const serialized = JSON.stringify(payload);
    return safeSetItem(key, serialized);
  } catch (err) {
    console.warn(`[Storage] Failed to serialize JSON for key "${key}":`, err);
    return false;
  }
}

/**
 * Safely gets and parses JSON from localStorage
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely removes an item from localStorage
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Runs once at startup to clean any bloated keys previously stored
 * that may be causing QuotaExceededError right now.
 */
export function cleanBloatedStorageOnStartup(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keysToCheck.push(k);
    }

    for (const key of keysToCheck) {
      if (key.startsWith('students_class_')) {
        const val = localStorage.getItem(key);
        // If the key is larger than 100KB or contains large base64 data, sanitize it
        if (val && (val.length > 100 * 1024 || val.includes('data:image'))) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              const cleaned = sanitizeStudentsForCache(parsed);
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      } else if (key.startsWith('ext_file_')) {
        const val = localStorage.getItem(key);
        if (val && val.length > 500 * 1024) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Startup storage cleanup notice:', err);
  }
}

// Run cleanup immediately on module import
if (typeof window !== 'undefined') {
  cleanBloatedStorageOnStartup();
}
