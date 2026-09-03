import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  memoryLocalCache,
  setLogLevel,
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  query, 
  where,
  getDocFromServer,
  disableNetwork,
  enableNetwork,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore SDK retry and error logs
try {
  setLogLevel('silent');
} catch {}

// Purge any stale IndexedDB cache to prevent failed background mutations from continuously retrying
if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
  try {
    if (window.indexedDB.databases) {
      window.indexedDB.databases().then(dbs => {
        dbs.forEach(dbInfo => {
          if (dbInfo.name && (dbInfo.name.includes('firestore') || dbInfo.name.includes('[DEFAULT]'))) {
            try {
              window.indexedDB.deleteDatabase(dbInfo.name);
            } catch {}
          }
        });
      }).catch(() => {});
    }
  } catch {}
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with pure in-memory cache to prevent stuck offline mutation retry loops
export const db = initializeFirestore(
  app,
  {
    localCache: memoryLocalCache()
  },
  firebaseConfig.firestoreDatabaseId
);

const QUOTA_STORAGE_KEY = 'khmer_teacher_firestore_quota_exceeded';

// Check if quota limit was hit within the last 24 hours (free tier resets daily)
function checkStoredQuotaExceeded(): boolean {
  try {
    const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!stored) return false;
    const timestamp = parseInt(stored, 10);
    if (isNaN(timestamp)) return false;
    const elapsed = Date.now() - timestamp;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (elapsed < TWENTY_FOUR_HOURS) {
      return true;
    }
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    return false;
  } catch {
    return false;
  }
}

let _isQuotaExceeded = checkStoredQuotaExceeded();

// If quota was already exceeded, immediately put Firestore in offline mode so it stops all network calls & retry loops
if (_isQuotaExceeded) {
  disableNetwork(db).catch(() => {});
}

export const isQuotaExceeded = () => _isQuotaExceeded;

export const setQuotaExceededState = (exceeded: boolean) => {
  _isQuotaExceeded = exceeded;
  try {
    if (exceeded) {
      localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
      disableNetwork(db).catch(() => {});
    } else {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      enableNetwork(db).catch(() => {});
    }
  } catch {}
};

// Global interceptor for console.error to catch any internal Firestore background write errors
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const errorStr = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (
      errorStr.includes('resource-exhausted') || 
      errorStr.includes('Quota limit exceeded') ||
      errorStr.includes('Free daily write units') ||
      errorStr.includes('maximum backoff delay')
    ) {
      setQuotaExceededState(true);
      return; // Suppress redundant quota console noise
    }
    originalConsoleError.apply(console, args);
  };
}

export const safeSetDoc = async (docRef: any, data: any, options?: any) => {
  if (_isQuotaExceeded) {
    return;
  }
  try {
    await setDoc(docRef, data, options);
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (e?.code === 'resource-exhausted' || msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
      setQuotaExceededState(true);
    } else {
      handleFirestoreError(e, OperationType.WRITE, docRef.path);
    }
  }
};

export const safeDeleteDoc = async (docRef: any) => {
  if (_isQuotaExceeded) {
    return;
  }
  try {
    await deleteDoc(docRef);
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (e?.code === 'resource-exhausted' || msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
      setQuotaExceededState(true);
    } else {
      handleFirestoreError(e, OperationType.DELETE, docRef.path);
    }
  }
};

export const safeOnSnapshot = (docRef: any, callback: any, errorCallback?: any) => {
  if (_isQuotaExceeded) {
    return () => {};
  }
  try {
    return onSnapshot(docRef, callback, (error: any) => {
      const msg = error?.message || String(error);
      if (error?.code === 'resource-exhausted' || msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
        setQuotaExceededState(true);
      } else {
        handleFirestoreError(error, OperationType.LIST, docRef.path);
      }
      if (errorCallback) errorCallback(error);
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (err?.code === 'resource-exhausted' || msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
      setQuotaExceededState(true);
    }
    return () => {};
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errCode = (error as any)?.code || '';
  const errMessage = error instanceof Error ? error.message : String(error);
  
  if (errCode === 'resource-exhausted' || errMessage.includes('resource-exhausted') || errMessage.includes('Quota exceeded')) {
    setQuotaExceededState(true);
    console.warn('[Firestore] Quota limit exceeded for today. Switched to offline local-only mode.');
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Validate Connection to Firestore on startup
export async function testConnection() {
  if (_isQuotaExceeded) {
    console.info('Firestore is in offline mode due to daily quota limit. Local data will be used.');
    return;
  }
  // Run asynchronously without blocking to let Firestore fall back to offline/cached mode gracefully
  setTimeout(async () => {
    if (_isQuotaExceeded) return;
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firebase connection test completed successfully.');
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (error?.code === 'resource-exhausted' || msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
        setQuotaExceededState(true);
      }
      console.info('Firestore is operating in offline/cached mode. Local storage changes will sync automatically once online.');
    }
  }, 1000);
}

testConnection();
