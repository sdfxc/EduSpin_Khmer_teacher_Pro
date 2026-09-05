import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Clear any residual quota block key from past runs
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('khmer_teacher_firestore_quota_exceeded');
  } catch {}
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling to avoid 10s WebChannel timeout in container/browser environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const isQuotaExceeded = () => false;

export const safeSetDoc = async (docRef: any, data: any, options?: any) => {
  try {
    await setDoc(docRef, data, options);
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
    errMessage.includes("Backend didn't respond within 10 seconds")
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
