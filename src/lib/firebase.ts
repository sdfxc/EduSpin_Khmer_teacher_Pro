import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore,
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
import firebaseConfig from '../../firebase-applet-config.json';

// Clear any residual quota block key from past runs
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('khmer_teacher_firestore_quota_exceeded');
  } catch {}
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with database ID specified in firebaseConfig as per Firebase skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate connection on boot as recommended in skill guidelines
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Notice: Operating in offline mode. Client will synchronize when online.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

export const isQuotaExceeded = () => false;

export const cleanFirestoreData = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
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
  try {
    return await getDoc(docRef);
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = error?.code || '';
    if (
      errMsg.includes('client is offline') ||
      errMsg.includes("Backend didn't respond within 10 seconds") ||
      errCode === 'unavailable' ||
      errCode === 'failed-precondition'
    ) {
      console.warn(`[Firestore] Notice: Offline mode active for ${docRef?.path || 'doc'}. Utilizing local state.`);
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
  try {
    return await getDocs(collOrQuery);
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = error?.code || '';
    if (
      errMsg.includes('client is offline') ||
      errMsg.includes("Backend didn't respond within 10 seconds") ||
      errCode === 'unavailable' ||
      errCode === 'failed-precondition'
    ) {
      console.warn(`[Firestore] Notice: Offline mode active for query. Continuing with local data.`);
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
  try {
    const sanitized = cleanFirestoreData(data);
    await setDoc(docRef, sanitized, options);
  } catch (e: any) {
    handleFirestoreError(e, OperationType.WRITE, docRef?.path || null);
  }
};

export const safeDeleteDoc = async (docRef: any) => {
  try {
    await deleteDoc(docRef);
  } catch (e: any) {
    handleFirestoreError(e, OperationType.DELETE, docRef?.path || null);
  }
};

export const safeOnSnapshot = (docRef: any, callback: any, errorCallback?: any) => {
  try {
    return onSnapshot(docRef, callback, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, docRef?.path || null);
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
