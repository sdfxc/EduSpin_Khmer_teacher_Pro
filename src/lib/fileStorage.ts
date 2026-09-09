// IndexedDB Storage Helper for Large Files (PDFs and PPTXs)
// Falls back gracefully to memory cache if IndexedDB is blocked in iframe

const DB_NAME = 'SchoolExternalDocsDB';
const DB_VERSION = 1;
const STORE_NAME = 'files';

let dbInstance: IDBDatabase | null = null;
const memoryStore = new Map<string, string>();

function getIndexedDB(): IDBFactory | null {
  if (typeof window === 'undefined') return null;
  return window.indexedDB || (window as any).mozIndexedDB || (window as any).webkitIndexedDB || (window as any).msIndexedDB || null;
}

export async function initFileDB(): Promise<IDBDatabase | null> {
  if (dbInstance) return dbInstance;
  const idb = getIndexedDB();
  if (!idb) return null;

  return new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = () => {
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB unavailable, using fallback store', err);
      resolve(null);
    }
  });
}

export async function saveFileToStorage(id: string, fileData: string): Promise<boolean> {
  memoryStore.set(id, fileData);

  try {
    const db = await initFileDB();
    if (!db) {
      try {
        localStorage.setItem(`ext_file_${id}`, fileData.slice(0, 1024 * 1024)); // small fallback
      } catch (e) {
        // quota exceeded, memoryStore still has it
      }
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ id, data: fileData, updatedAt: Date.now() });
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  } catch (err) {
    return false;
  }
}

export async function getFileFromStorage(id: string): Promise<string | null> {
  if (memoryStore.has(id)) {
    return memoryStore.get(id) || null;
  }

  try {
    const db = await initFileDB();
    if (!db) {
      const fromLocal = localStorage.getItem(`ext_file_${id}`);
      if (fromLocal) {
        memoryStore.set(id, fromLocal);
        return fromLocal;
      }
      return null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            memoryStore.set(id, req.result.data);
            resolve(req.result.data);
          } else {
            const fromLocal = localStorage.getItem(`ext_file_${id}`);
            resolve(fromLocal || null);
          }
        };
        req.onerror = () => {
          const fromLocal = localStorage.getItem(`ext_file_${id}`);
          resolve(fromLocal || null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  } catch (err) {
    return null;
  }
}

export async function deleteFileFromStorage(id: string): Promise<boolean> {
  memoryStore.delete(id);
  localStorage.removeItem(`ext_file_${id}`);

  try {
    const db = await initFileDB();
    if (!db) return true;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  } catch (err) {
    return false;
  }
}
