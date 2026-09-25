/**
 * safeStorage.ts
 * 
 * Provides fail-safe LocalStorage and SessionStorage wrappers that prevent
 * QuotaExceededError and stack overflow recursion from ever crashing the application.
 * 
 * When storage limits are hit:
 * 1. Automatically cleans up expendable cache keys (old quiz card caches, exam previews, etc.).
 * 2. Compresses/strips bloated base64 data URLs from student list caches if necessary.
 * 3. Falls back seamlessly to an in-memory Map so reads and writes continue working smoothly.
 */

const memoryFallback = new Map<string, string>();

// Capture native, unpatched Storage methods ONCE on module load
const nativeStorage = typeof window !== 'undefined' && typeof Storage !== 'undefined' ? {
  setItem: Storage.prototype.setItem,
  getItem: Storage.prototype.getItem,
  removeItem: Storage.prototype.removeItem,
} : null;

/**
 * Checks if a string looks like base64 or heavy media payload
 */
function stripHeavyBase64FromStudentsJson(jsonStr: string): string {
  try {
    const data = JSON.parse(jsonStr);
    if (Array.isArray(data)) {
      const stripped = data.map((item: any) => {
        if (item && typeof item === 'object') {
          // If avatarUrl is a giant data URL (> 20KB), remove it from the cached copy to preserve student record
          if (typeof item.avatarUrl === 'string' && item.avatarUrl.startsWith('data:image/') && item.avatarUrl.length > 20000) {
            const { avatarUrl, ...rest } = item;
            return rest;
          }
        }
        return item;
      });
      return JSON.stringify(stripped);
    }
  } catch {
    // If not parseable JSON array, return original
  }
  return jsonStr;
}

/**
 * Attempt to free up storage space by clearing expendable caches
 */
export function evictExpendableStorage(): number {
  let freedCount = 0;
  if (typeof window === 'undefined' || !nativeStorage) return freedCount;

  try {
    const keysToRemove: string[] = [];
    const studentKeysToCompact: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Protected keys that should never be evicted during auto-cleanup
      if (
        key === 'logged_in_teacher' ||
        key.startsWith('khmer_teacher_classes') ||
        key.startsWith('khmer_teacher_active_class_id')
      ) {
        continue;
      }

      // Expendable temporary or derivative cache keys
      if (
        key.startsWith('quiz_cards_class_') ||
        key.startsWith('khmer_exams_') ||
        key.startsWith('chapters_class_') ||
        key.startsWith('external_docs_') ||
        key.startsWith('pdf_preview_') ||
        key.includes('_temp_')
      ) {
        keysToRemove.push(key);
      } else if (key.startsWith('students_class_')) {
        studentKeysToCompact.push(key);
      }
    }

    // Remove expendable caches first
    for (const key of keysToRemove) {
      try {
        nativeStorage.removeItem.call(localStorage, key);
        freedCount++;
      } catch {}
    }

    // If needed, compact students caches by stripping oversized base64 images
    for (const key of studentKeysToCompact) {
      try {
        const val = nativeStorage.getItem.call(localStorage, key);
        if (val && val.includes('data:image/')) {
          const compacted = stripHeavyBase64FromStudentsJson(val);
          nativeStorage.setItem.call(localStorage, key, compacted);
          freedCount++;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[SafeStorage] Warning during cache eviction:', err);
  }

  return freedCount;
}

/**
 * Safe setItem implementation that will NEVER throw QuotaExceededError or RangeError
 */
export function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined' || !nativeStorage) {
    memoryFallback.set(key, value);
    return;
  }

  try {
    nativeStorage.setItem.call(localStorage, key, value);
    memoryFallback.set(key, value);
  } catch (err: any) {
    const isQuotaError = 
      err instanceof Error && 
      (err.name === 'QuotaExceededError' || 
       err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
       err.message.includes('quota') ||
       err.message.includes('exceeded'));

    if (isQuotaError) {
      console.warn(`[SafeStorage] LocalStorage quota exceeded while setting key: "${key}". Attempting auto-cleanup...`);
      
      // Step 1: Evict expendable caches
      evictExpendableStorage();

      try {
        // Step 2: Try again after eviction
        nativeStorage.setItem.call(localStorage, key, value);
        memoryFallback.set(key, value);
        console.info(`[SafeStorage] Successfully saved "${key}" after storage cleanup.`);
        return;
      } catch {
        // Step 3: If it's a student cache, strip heavy base64 and try saving
        if (key.startsWith('students_class_')) {
          try {
            const compacted = stripHeavyBase64FromStudentsJson(value);
            nativeStorage.setItem.call(localStorage, key, compacted);
            memoryFallback.set(key, value);
            console.info(`[SafeStorage] Successfully saved compacted student data for "${key}".`);
            return;
          } catch {}
        }

        // Step 4: Fallback to in-memory store so the application does not crash
        memoryFallback.set(key, value);
        console.warn(`[SafeStorage] Storage still full. Stored "${key}" in session memory fallback.`);
      }
    } else {
      // Non-quota error (e.g. security disabled in private browsing)
      memoryFallback.set(key, value);
    }
  }
}

/**
 * Safe getItem implementation checking memory fallback if not in localStorage
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined' || !nativeStorage) {
    return memoryFallback.get(key) ?? null;
  }

  try {
    const val = nativeStorage.getItem.call(localStorage, key);
    if (val !== null) return val;
  } catch {}

  return memoryFallback.get(key) ?? null;
}

/**
 * Safe removeItem
 */
export function safeLocalStorageRemove(key: string): void {
  memoryFallback.delete(key);
  if (typeof window !== 'undefined' && nativeStorage) {
    try {
      nativeStorage.removeItem.call(localStorage, key);
    } catch {}
  }
}

let isPatched = false;

/**
 * Install global monkey-patch on Storage.prototype so ANY code calling
 * localStorage.setItem or sessionStorage.setItem is automatically protected!
 */
export function installSafeStoragePatch(): void {
  if (typeof window === 'undefined' || !nativeStorage || isPatched) return;

  try {
    isPatched = true;

    Storage.prototype.setItem = function (key: string, value: string) {
      if (this === window.localStorage) {
        safeLocalStorageSet(key, String(value));
      } else {
        try {
          nativeStorage.setItem.call(this, key, String(value));
        } catch (err: any) {
          console.warn(`[SafeStorage] SessionStorage setItem quota exceeded for "${key}". Retaining in memory.`);
          memoryFallback.set(`session_${key}`, String(value));
        }
      }
    };

    Storage.prototype.getItem = function (key: string) {
      if (this === window.localStorage) {
        return safeLocalStorageGet(key);
      } else {
        try {
          const val = nativeStorage.getItem.call(this, key);
          if (val !== null) return val;
        } catch {}
        return memoryFallback.get(`session_${key}`) ?? null;
      }
    };

    Storage.prototype.removeItem = function (key: string) {
      if (this === window.localStorage) {
        safeLocalStorageRemove(key);
      } else {
        memoryFallback.delete(`session_${key}`);
        try {
          nativeStorage.removeItem.call(this, key);
        } catch {}
      }
    };

    console.info('[SafeStorage] Storage quota protection installed successfully.');
  } catch (e) {
    console.warn('[SafeStorage] Failed to install prototype patch:', e);
  }
}

// Auto-run patch immediately on module load
if (typeof window !== 'undefined') {
  installSafeStoragePatch();
  // Clean up any old bloat on initial boot
  setTimeout(() => {
    evictExpendableStorage();
  }, 1000);
}
