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
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
export { doc, setDoc, getDoc, getDocs, collection, deleteDoc, query, where, onSnapshot };
import firebaseConfig from '../../firebase-applet-config.json';

// Clear any residual quota block key from past runs
const QUOTA_STORAGE_KEY = 'khmer_teacher_firestore_quota_exceeded_timestamp';
let memoryQuotaExceeded = false;

export const isQuotaExceeded = (): boolean => {
  if (memoryQuotaExceeded) return true;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (stored) {
        const timestamp = parseInt(stored, 10);
        // Quota resets daily (check if within 12 hours)
        if (!isNaN(timestamp) && Date.now() - timestamp < 12 * 3600 * 1000) {
          memoryQuotaExceeded = true;
          return true;
        } else {
          localStorage.removeItem(QUOTA_STORAGE_KEY);
        }
      }
    } catch {}
  }
  return false;
};

export const setQuotaExceeded = (exceeded: boolean = true) => {
  memoryQuotaExceeded = exceeded;
  if (typeof window !== 'undefined') {
    try {
      if (exceeded) {
        localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
          detail: {
            projectId: firebaseConfig.projectId,
            databaseId: firebaseConfig.firestoreDatabaseId
          }
        }));
      } else {
        localStorage.removeItem(QUOTA_STORAGE_KEY);
      }
    } catch {}
  }
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
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
      setTimeout(() => reject(new Error("Backend didn't respond within timeout")), 2500)
    );
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = error?.code || '';
    if (errCode === 'resource-exhausted' || errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted')) {
      setQuotaExceeded(true);
      console.warn(`[Firestore] Notice: Quota limit reached for ${docRef?.path || 'doc'}. Utilizing local state.`);
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
      setTimeout(() => reject(new Error("Backend didn't respond within timeout")), 2500)
    );
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = error?.code || '';
    if (errCode === 'resource-exhausted' || errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted')) {
      setQuotaExceeded(true);
      console.warn('[Firestore] Notice: Quota limit reached for query. Continuing with local data.');
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
    // Quota reached for today: do not call setDoc to avoid queuing mutations and retry log spam
    return;
  }

  // Prevent resurrecting deleted classes
  if (data && !data.isDeleted && docRef?.path && typeof docRef.path === 'string') {
    const pathParts = docRef.path.split('/');
    const classIdx = pathParts.indexOf('classes');
    if (classIdx >= 0 && pathParts.length > classIdx + 1) {
      const classId = pathParts[classIdx + 1];
      if (classId) {
        try {
          let isDeleted = false;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('khmer_teacher_deleted_classes')) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr) && arr.map(String).includes(String(classId))) {
                  isDeleted = true;
                  break;
                }
              }
            }
          }
          if (isDeleted) {
            console.warn(`[Firestore] Intercepted attempt to write to deleted class "${classId}". Operation cancelled.`);
            return;
          }
        } catch {}
      }
    }
  }

  try {
    const sanitized = cleanFirestoreData(data);
    await setDoc(docRef, sanitized, options);
  } catch (e: any) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errCode = e?.code || '';
    if (errCode === 'resource-exhausted' || errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted')) {
      setQuotaExceeded(true);
      console.warn('[Firestore] Notice: Free daily write quota reached. App is safely operating in local offline mode. Quota resets tomorrow.');
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
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 2500));
    await Promise.race([deletePromise, timeoutPromise]);
  } catch (e: any) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errCode = e?.code || '';
    if (errCode === 'resource-exhausted' || errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted')) {
      setQuotaExceeded(true);
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
      const errMsg = error instanceof Error ? error.message : String(error);
      const errCode = error?.code || '';
      if (errCode === 'resource-exhausted' || errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted')) {
        setQuotaExceeded(true);
        if (errorCallback) errorCallback(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, docRef?.path || null);
      if (errorCallback) errorCallback(error);
    });
  } catch (err: any) {
    return () => {};
  }
};

export const LOCAL_ACCOUNTS_KEY = 'khmer_teacher_local_accounts';

export function getLocalTeacherRegistry(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveTeacherToLocalRegistry(teacher: any) {
  if (typeof window === 'undefined' || !teacher) return;
  try {
    const accounts = getLocalTeacherRegistry();
    const existingIndex = accounts.findIndex(
      (a: any) =>
        (a.id && teacher.id && String(a.id).toLowerCase() === String(teacher.id).toLowerCase()) ||
        (a.username && teacher.username && String(a.username).toLowerCase() === String(teacher.username).toLowerCase())
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...teacher };
    } else {
      accounts.push(teacher);
    }
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

export const saveLocalAccount = saveTeacherToLocalRegistry;
export const getLocalAccounts = getLocalTeacherRegistry;

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
    errMessage.includes('Quota limit exceeded') ||
    errMessage.includes('Could not reach Cloud Firestore backend') ||
    errMessage.includes("Backend didn't respond") ||
    errMessage.includes('client is offline') ||
    errMessage.includes('offline')
  ) {
    if (errCode === 'resource-exhausted' || errMessage.includes('Quota exceeded') || errMessage.includes('resource-exhausted')) {
      setQuotaExceeded(true);
    }
    console.warn('[Firestore] Notice: Operating in local offline mode. Data is saved locally in localStorage and will synchronize when quota resets.', errMessage);
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
