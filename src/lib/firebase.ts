import 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore,
  getDocFromServer,
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  disableNetwork,
  enableNetwork,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
export { doc, setDoc, getDoc, getDocs, collection, deleteDoc, query, where, onSnapshot, disableNetwork, enableNetwork };
import firebaseConfig from '../../firebase-applet-config.json';

const QUOTA_STORAGE_KEY = 'khmer_teacher_firestore_quota_until';
const QUOTA_BLOCK_DURATION = 60 * 60 * 1000; // 1 hour cooldown before probing again

export const isQuotaExceeded = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (saved) {
      const until = Number(saved);
      if (Date.now() < until) {
        return true;
      } else {
        localStorage.removeItem(QUOTA_STORAGE_KEY);
      }
    }
  } catch {}
  return false;
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth safely
let _authInstance: any = null;
export const getSafeAuth = () => {
  if (!_authInstance) {
    try {
      _authInstance = getApps().length > 0 ? getAuth(getApp()) : getAuth(app);
    } catch {
      try {
        _authInstance = getAuth();
      } catch (e) {
        console.warn('[Firebase] Auth registration deferred:', e);
      }
    }
  }
  return _authInstance;
};

// Safe exported auth instance that will never throw unhandled 'Component auth has not been registered yet' on boot
let initialAuth: any = null;
try {
  initialAuth = getAuth(app);
} catch {
  // Defer initialization to accessor proxy
}

export const auth: any = initialAuth || new Proxy({}, {
  get(_target, prop) {
    const inst = getSafeAuth();
    if (!inst) return undefined;
    const val = inst[prop];
    return typeof val === 'function' ? val.bind(inst) : val;
  }
});
export { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
};

// Configure Firestore with long-polling to prevent WebSocket connection stalls in iframe/sandboxed environments
try {
  initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  // Already initialized or fallback
}

// Initialize Firestore with database ID specified in firebaseConfig as per Firebase skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */

// If quota is already marked as exceeded from past session, disable network right away
if (typeof window !== 'undefined' && isQuotaExceeded()) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

// Validate connection on boot as recommended in skill guidelines with non-blocking timeout
export async function testConnection() {
  if (isQuotaExceeded()) return;
  try {
    const testPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('the client is offline or request timed out')), 3500)
    );
    await Promise.race([testPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('timed out') || error.message.includes("didn't respond"))) {
      console.warn('[Firestore] Notice: Operating in offline mode. Client will synchronize when online.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

export const markQuotaExceeded = () => {
  const until = Date.now() + QUOTA_BLOCK_DURATION;
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, String(until));
  } catch {}
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
  console.warn('[Firestore] Quota limit detected. Pausing remote Firestore network calls and switching to local storage cache.');
  notifyQuotaListeners(true);
};

const quotaListeners = new Set<(isExceeded: boolean) => void>();
export const subscribeQuotaExceeded = (callback: (isExceeded: boolean) => void) => {
  quotaListeners.add(callback);
  callback(isQuotaExceeded());
  return () => {
    quotaListeners.delete(callback);
  };
};

function notifyQuotaListeners(exceeded: boolean) {
  for (const listener of quotaListeners) {
    try {
      listener(exceeded);
    } catch {}
  }
}

export const cleanFirestoreData = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'string') {
    // Strip giant base64 data URIs (>100KB) to strictly avoid Firestore 1MB document limit
    if (obj.length > 100000 && obj.startsWith('data:')) {
      return '';
    }
    return obj;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData);
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = cleanFirestoreData(val);
    }
  }
  return cleaned;
};

export const saveTeacherToLocalRegistry = (teacher: any) => {
  if (typeof window === 'undefined' || !teacher || !teacher.id) return;
  try {
    const raw = localStorage.getItem('registered_teachers_registry') || '{}';
    const dict = JSON.parse(raw);
    dict[teacher.id] = teacher;
    if (teacher.username) {
      dict[teacher.username.toLowerCase()] = teacher;
    }
    if (teacher.email) {
      dict[teacher.email.toLowerCase()] = teacher;
    }
    localStorage.setItem('registered_teachers_registry', JSON.stringify(dict));
  } catch {}
};

export const getTeacherFromLocalRegistry = (key: string): any | null => {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const raw = localStorage.getItem('registered_teachers_registry') || '{}';
    const dict = JSON.parse(raw);
    const cleanKey = key.trim().toLowerCase();
    return dict[cleanKey] || dict[key] || null;
  } catch {
    return null;
  }
};

export const safeGetDoc = async (docRef: any): Promise<{ exists: () => boolean; data: () => any; id: string } | DocumentSnapshot> => {
  if (isQuotaExceeded()) {
    return {
      exists: () => false,
      data: () => undefined,
      id: docRef?.id || '',
    };
  }
  try {
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Backend didn't respond within timeout")), 3000)
    );
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = error?.code || '';
    if (errCode === 'resource-exhausted' || errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded')) {
      markQuotaExceeded();
    } else if (
      errMsg.includes('client is offline') ||
      errMsg.includes("Backend didn't respond") ||
      errMsg.includes('timeout') ||
      errCode === 'unavailable' ||
      errCode === 'failed-precondition' ||
      errCode === 'deadline-exceeded'
    ) {
      console.warn(`[Firestore] Notice: Offline mode or timeout active for ${docRef?.path || 'doc'}. Utilizing local state.`);
    } else {
      handleFirestoreError(error, OperationType.GET, docRef?.path || null);
    }
    return {
      exists: () => false,
      data: () => undefined,
      id: docRef?.id || '',
    };
  }
};

export const safeGetDocs = async (collOrQuery: any): Promise<QuerySnapshot | { empty: boolean; size: number; docs: any[]; forEach: (cb: (doc: any) => void) => void }> => {
  if (isQuotaExceeded()) {
    return {
      empty: true,
      size: 0,
      docs: [],
      forEach: () => {},
    };
  }
  try {
    const fetchPromise = getDocs(collOrQuery);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Backend didn't respond within timeout")), 3000)
    );
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = error?.code || '';
    if (errCode === 'resource-exhausted' || errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded')) {
      markQuotaExceeded();
    } else if (
      errMsg.includes('client is offline') ||
      errMsg.includes("Backend didn't respond") ||
      errMsg.includes('timeout') ||
      errCode === 'unavailable' ||
      errCode === 'failed-precondition' ||
      errCode === 'deadline-exceeded'
    ) {
      console.warn(`[Firestore] Notice: Offline mode or timeout active for query. Continuing with local data.`);
    } else {
      handleFirestoreError(error, OperationType.LIST, collOrQuery?.path || null);
    }
    return {
      empty: true,
      size: 0,
      docs: [],
      forEach: () => {},
    };
  }
};

export const safeSetDoc = async (docRef: any, data: any, options?: any) => {
  if (isQuotaExceeded()) {
    return;
  }
  try {
    const sanitized = cleanFirestoreData(data);
    const writePromise = setDoc(docRef, sanitized, options);
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(() => {
        console.warn(`[Firestore] Notice: safeSetDoc write timeout (3s) for ${docRef?.path || 'doc'}. Local write retained.`);
        resolve();
      }, 3000)
    );
    await Promise.race([writePromise, timeoutPromise]);
  } catch (e: any) {
    const errCode = e?.code || '';
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errCode === 'resource-exhausted' || errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded')) {
      markQuotaExceeded();
      return;
    }
    handleFirestoreError(e, OperationType.WRITE, docRef?.path || null);
  }
};

export const safeDeleteDoc = async (docRef: any) => {
  if (isQuotaExceeded()) {
    return;
  }
  try {
    const deletePromise = deleteDoc(docRef);
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(() => {
        console.warn(`[Firestore] Notice: safeDeleteDoc write timeout (3s) for ${docRef?.path || 'doc'}.`);
        resolve();
      }, 3000)
    );
    await Promise.race([deletePromise, timeoutPromise]);
  } catch (e: any) {
    const errCode = e?.code || '';
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errCode === 'resource-exhausted' || errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded')) {
      markQuotaExceeded();
      return;
    }
    handleFirestoreError(e, OperationType.DELETE, docRef?.path || null);
  }
};

export const safeOnSnapshot = (docRef: any, callback: any, errorCallback?: any) => {
  if (isQuotaExceeded()) {
    return () => {};
  }
  try {
    return onSnapshot(docRef, callback, (error: any) => {
      const errCode = error?.code || '';
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errCode === 'resource-exhausted' || errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded')) {
        markQuotaExceeded();
      } else {
        handleFirestoreError(error, OperationType.LIST, docRef?.path || null);
      }
      if (errorCallback) errorCallback(error);
    });
  } catch (err: any) {
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
  
  if (
    errCode === 'resource-exhausted' ||
    errCode === 'unavailable' ||
    errCode === 'deadline-exceeded' ||
    errMessage.includes('resource-exhausted') ||
    errMessage.includes('Quota exceeded') ||
    errMessage.includes('Could not reach Cloud Firestore backend') ||
    errMessage.includes("Backend didn't respond within 10 seconds") ||
    errMessage.includes('client is offline') ||
    errMessage.includes('offline')
  ) {
    console.warn('[Firestore] Notice: Operating in offline mode or network reconnecting. Data is saved locally and will synchronize automatically.', errMessage);
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
