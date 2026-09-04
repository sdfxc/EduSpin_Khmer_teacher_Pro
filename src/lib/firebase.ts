import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  query, 
  where,
  getDocFromServer,
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

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  
  if (errCode === 'resource-exhausted' || errMessage.includes('resource-exhausted') || errMessage.includes('Quota exceeded')) {
    console.warn('[Firestore] Notice: Request limit reached or offline. Data will continue to save locally.');
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
  setTimeout(async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firebase connection test completed successfully.');
    } catch (error: any) {
      // Non-blocking connection check
    }
  }, 1000);
}

testConnection();
