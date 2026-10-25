import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth, db, doc, safeSetDoc, safeOnSnapshot } from './firebase';
import { Student, ClassInfo } from '../types';
import { KHMER_MONTHS } from './scoreUtils';

// In-memory & session cache for OAuth access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

export const DEFAULT_ATTENDANCE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1o8FNNmT0NpNl2_BhB-_gntn25qThftcMtev__vbIeiY/edit?usp=sharing';
export const DEFAULT_ATTENDANCE_SHEET_ID = '1o8FNNmT0NpNl2_BhB-_gntn25qThftcMtev__vbIeiY';
export const DEFAULT_SCORES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1f7eJTiTn-2cH_QRRH2PvfBXHUNjHV-EnZn_bzqdU2Xs/edit?usp=sharing';
export const DEFAULT_SCORES_SHEET_ID = '1f7eJTiTn-2cH_QRRH2PvfBXHUNjHV-EnZn_bzqdU2Xs';
export const DEFAULT_STATUS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/13l52mkHKazDgHuMatpQaIhjyjTiYLjSZRCgliGRfpR8/edit?usp=sharing';
export const DEFAULT_STATUS_SHEET_ID = '13l52mkHKazDgHuMatpQaIhjyjTiYLjSZRCgliGRfpR8';

export const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.includes('/spreadsheets/d/')) {
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  }
  return trimmed;
};

/**
 * Initialize Firebase Auth listener to keep access token state in memory
 */
export const initGoogleSheetsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getGoogleSheetsAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google to get the OAuth Access Token for Google Sheets & Drive APIs
 */
export const requestGoogleSheetsAccess = async (hintEmail?: string): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    SCOPES.forEach(scope => provider.addScope(scope));
    
    // Set custom parameters such as login hint or account select
    const customParams: Record<string, string> = { prompt: 'select_account' };
    if (hintEmail && hintEmail.includes('@')) {
      customParams.login_hint = hintEmail.trim();
    }
    provider.setCustomParameters(customParams);

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('ពុំអាចទទួលយក Access Token ពី Google បានឡើយ។ សូមព្យាយាមម្ដងទៀត។');
    }

    cachedAccessToken = credential.accessToken;
    setGoogleSheetsAccessToken(credential.accessToken);
    
    // Save connected email hint for quick reconnection
    if (result.user.email) {
      localStorage.setItem('google_sheets_connected_email', result.user.email);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sheets sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleSheetsAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const s = sessionStorage.getItem('google_sheets_token');
    if (s) {
      cachedAccessToken = s;
      return s;
    }
    const localToken = localStorage.getItem('google_sheets_token');
    const localTimestamp = localStorage.getItem('google_sheets_token_timestamp');
    if (localToken && localTimestamp) {
      const age = Date.now() - parseInt(localTimestamp, 10);
      // Valid for up to 55 minutes
      if (age < 55 * 60 * 1000) {
        cachedAccessToken = localToken;
        sessionStorage.setItem('google_sheets_token', localToken);
        return localToken;
      }
    }
  } catch {}
  return null;
};

export const setGoogleSheetsAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem('google_sheets_token', token);
      localStorage.setItem('google_sheets_token', token);
      localStorage.setItem('google_sheets_token_timestamp', Date.now().toString());
    } else {
      sessionStorage.removeItem('google_sheets_token');
      localStorage.removeItem('google_sheets_token');
      localStorage.removeItem('google_sheets_token_timestamp');
    }
  } catch {}
};

export const getConnectedGoogleEmail = (): string => {
  if (auth.currentUser?.email) return auth.currentUser.email;
  return localStorage.getItem('google_sheets_connected_email') || '';
};

export const clearGoogleSheetsAuth = async () => {
  setGoogleSheetsAccessToken(null);
  localStorage.removeItem('google_sheets_connected_email');
};

export interface ClassSheetsConfig {
  scoresUrl?: string;
  attendanceUrl?: string;
  statusUrl?: string;
  scoresId?: string;
  attendanceId?: string;
  statusId?: string;
  autoSyncEnabled?: boolean;
  lastSyncedAt?: string;
  lastSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error' | 'needs_auth';
}

/**
 * Persists Google Sheet URLs to Firestore so that all devices (Laptop, Phone, iPad)
 * share the exact same linked Google Sheets in real-time.
 */
export const saveSheetsConfigToCloud = async (
  teacherId: string,
  classId: string,
  config: Partial<ClassSheetsConfig>
) => {
  if (!teacherId || !classId) return;
  try {
    const cfgDoc = doc(db, 'teachers', teacherId, 'classes', classId, 'settings', 'google_sheets');
    const cleanConfig: Record<string, any> = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    if (config.scoresUrl) cleanConfig.scoresId = extractSpreadsheetId(config.scoresUrl);
    if (config.attendanceUrl) cleanConfig.attendanceId = extractSpreadsheetId(config.attendanceUrl);
    if (config.statusUrl) cleanConfig.statusId = extractSpreadsheetId(config.statusUrl);

    await safeSetDoc(cfgDoc, cleanConfig, { merge: true });

    // Cache locally as well
    if (cleanConfig.scoresUrl) {
      localStorage.setItem(`google_sheets_id_scores_${classId}_general`, cleanConfig.scoresUrl);
    }
    if (cleanConfig.attendanceUrl) {
      localStorage.setItem(`google_sheets_id_attendance_${classId}_general`, cleanConfig.attendanceUrl);
      localStorage.setItem(`google_sheets_id_class_${classId}`, cleanConfig.attendanceUrl);
    }
    if (cleanConfig.statusUrl) {
      localStorage.setItem(`google_sheets_id_status_${classId}`, cleanConfig.statusUrl);
    }
    window.dispatchEvent(new CustomEvent('sheets-config-updated', { detail: cleanConfig }));
  } catch (err) {
    console.error('Failed to save sheets config to cloud:', err);
  }
};

/**
 * Subscribes to real-time Google Sheets configuration changes across devices.
 */
export const subscribeSheetsConfigFromCloud = (
  teacherId: string,
  classId: string,
  callback: (config: ClassSheetsConfig) => void
): (() => void) => {
  if (!teacherId || !classId) return () => {};
  try {
    const cfgDoc = doc(db, 'teachers', teacherId, 'classes', classId, 'settings', 'google_sheets');
    return safeOnSnapshot(cfgDoc, (snapshot: any) => {
      if (snapshot && snapshot.exists()) {
        const data = snapshot.data() as ClassSheetsConfig;
        if (data.scoresUrl) {
          localStorage.setItem(`google_sheets_id_scores_${classId}_general`, data.scoresUrl);
        }
        if (data.attendanceUrl) {
          localStorage.setItem(`google_sheets_id_attendance_${classId}_general`, data.attendanceUrl);
          localStorage.setItem(`google_sheets_id_class_${classId}`, data.attendanceUrl);
        }
        if (data.statusUrl) {
          localStorage.setItem(`google_sheets_id_status_${classId}`, data.statusUrl);
        }
        callback(data);
        window.dispatchEvent(new CustomEvent('sheets-config-updated', { detail: data }));
      }
    }, (err: any) => {
      console.warn('Sheets config snapshot note:', err);
    });
  } catch (e) {
    return () => {};
  }
};

export interface SyncDataPayload {
  className: string;
  classId: string;
  students: Student[];
  selectedMonth: string;
  activeSubjectName: string;
  activeSubjectId?: string;
  attendanceMap?: Record<string, 'present' | 'absent' | 'permission' | 'late'>;
  attendanceReasons?: Record<string, string>;
  attendanceDate?: string;
  syncScores?: boolean;
  syncAttendance?: boolean;
  syncStatus?: boolean;
  overrideSpreadsheetId?: string;
}

let autoSyncTimer: any = null;
let latestPayload: SyncDataPayload | null = null;

/**
 * Debounced background auto-sync triggered on student, score, or attendance updates.
 */
export const triggerDebouncedSheetsAutoSync = (
  payload: SyncDataPayload,
  delayMs = 1800
) => {
  latestPayload = { ...payload };
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
  }

  return new Promise<void>((resolve) => {
    autoSyncTimer = setTimeout(async () => {
      if (!latestPayload) return resolve();
      const p = latestPayload;
      latestPayload = null;

      const token = getGoogleSheetsAccessToken();
      if (!token) {
        window.dispatchEvent(new CustomEvent('sheets-auto-sync-status', {
          detail: { status: 'needs_auth', classId: p.classId }
        }));
        return resolve();
      }

      window.dispatchEvent(new CustomEvent('sheets-auto-sync-status', {
        detail: { status: 'syncing', classId: p.classId }
      }));

      try {
        const res = await syncDataToGoogleSheets(p, undefined, true);
        const nowStr = new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
        window.dispatchEvent(new CustomEvent('sheets-auto-sync-status', {
          detail: { 
            status: 'synced', 
            classId: p.classId, 
            time: nowStr,
            spreadsheetUrl: res.spreadsheetUrl 
          }
        }));
        localStorage.setItem(`sheets_last_sync_time_${p.classId}`, nowStr);
        localStorage.setItem(`sheets_last_sync_url_${p.classId}`, res.spreadsheetUrl);
        resolve();
      } catch (err: any) {
        console.warn('Auto-sync notice:', err);
        window.dispatchEvent(new CustomEvent('sheets-auto-sync-status', {
          detail: { status: 'error', classId: p.classId, error: err?.message }
        }));
        resolve();
      }
    }, delayMs);
  });
};

/**
 * Creates or updates a Google Spreadsheet in the teacher's Google Drive with professional formatting:
 * 1. Sheet "តារាងពិន្ទុ (Scores)"
 * 2. Sheet "វត្តមានសិស្ស (Attendance)"
 * 3. Sheet "ស្ថានភាពសិស្ស (Student Status)"
 */
export async function syncDataToGoogleSheets(
  payload: SyncDataPayload,
  onProgress?: (step: string, percent: number) => void,
  isBackgroundSync: boolean = false
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  let token = getGoogleSheetsAccessToken();
  
  if (!token) {
    if (isBackgroundSync) {
      throw new Error('ត្រូវការភ្ជាប់ Google Sheets ម្តងដើម្បី Auto-Sync');
    }
    onProgress?.('កំពុងស្នើសុំការអនុញ្ញាតពី Google Account...', 10);
    const res = await requestGoogleSheetsAccess(getConnectedGoogleEmail());
    token = res.accessToken;
  }

  const {
    className,
    classId,
    students,
    selectedMonth,
    activeSubjectName,
    activeSubjectId,
    attendanceMap = {},
    attendanceReasons = {},
    attendanceDate,
    syncScores = true,
    syncAttendance = true,
    syncStatus = true,
    overrideSpreadsheetId
  } = payload;

  const now = new Date();
  const defaultLocalToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const effectiveAttendanceDate = attendanceDate || defaultLocalToday;

  const storageKey = `google_sheets_id_class_${classId || 'default'}`;
  let existingSpreadsheetId = overrideSpreadsheetId;
  
  if (!existingSpreadsheetId) {
    if (syncAttendance && !syncScores) {
      existingSpreadsheetId = 
        localStorage.getItem(`google_sheets_id_attendance_${classId || 'default'}_${activeSubjectId || 'general'}`) ||
        localStorage.getItem(`google_sheets_id_attendance_${classId || 'default'}_general`) ||
        localStorage.getItem(storageKey) ||
        DEFAULT_ATTENDANCE_SHEET_ID;
    } else if (syncScores && !syncAttendance) {
      existingSpreadsheetId = 
        localStorage.getItem(`google_sheets_id_scores_${classId || 'default'}_${activeSubjectId || 'general'}`) ||
        localStorage.getItem(`google_sheets_id_scores_${classId || 'default'}_general`) ||
        localStorage.getItem(storageKey) ||
        DEFAULT_SCORES_SHEET_ID;
    } else if (syncStatus && !syncScores && !syncAttendance) {
      existingSpreadsheetId = 
        localStorage.getItem(`google_sheets_id_status_${classId || 'default'}`) ||
        localStorage.getItem(storageKey) ||
        DEFAULT_STATUS_SHEET_ID;
    } else {
      existingSpreadsheetId = localStorage.getItem(storageKey) || DEFAULT_ATTENDANCE_SHEET_ID;
    }
  }

  // If user stored a full Google Sheets URL, extract ID automatically
  existingSpreadsheetId = extractSpreadsheetId(existingSpreadsheetId);

  // 1. Check if existing spreadsheet is valid and accessible
  let spreadsheetId = existingSpreadsheetId;
  let isExistingValid = false;

  if (spreadsheetId) {
    onProgress?.('កំពុងពិនិត្យមើល Google Sheet ដែលមានស្រាប់...', 25);
    try {
      const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (checkRes.status === 401) {
        setGoogleSheetsAccessToken(null);
        throw new Error('Google Sheets authentication expired (401). Please reconnect your Google account.');
      }
      if (checkRes.ok) {
        isExistingValid = true;
      } else {
        spreadsheetId = null;
      }
    } catch (err: any) {
      if (err?.message?.includes('authentication credentials') || err?.message?.includes('401') || err?.message?.includes('expired')) {
        setGoogleSheetsAccessToken(null);
        throw new Error('បញ្ហាអត្តសញ្ញាណ Google Sheets (Invalid/Expired Credentials). សូមភ្ជាប់ Google Sheets ម្ដងទៀត។');
      }
      spreadsheetId = null;
    }
  }

  const cleanTitle = (str: string) => str.replace(/[:\/?*\[\]']/g, '_').trim().slice(0, 95);

  let currentYear = now.getFullYear();
  if (effectiveAttendanceDate && effectiveAttendanceDate.includes('-')) {
    const y = parseInt(effectiveAttendanceDate.split('-')[0], 10);
    if (!isNaN(y)) currentYear = y;
  }

  // Dynamic distinct tab titles per class, subject and month so they NEVER collide:
  const scoreSheetTitle = cleanTitle(
    activeSubjectName && activeSubjectName !== 'ទូទៅ'
      ? `ពិន្ទុ_${className ? className + '_' : ''}${activeSubjectName}_${selectedMonth}`
      : `ពិន្ទុ_${className ? className + '_' : ''}${selectedMonth}`
  );

  const monthSheetTitle = cleanTitle(
    activeSubjectName && activeSubjectName !== 'ទូទៅ'
      ? `វត្តមាន_${className ? className + '_' : ''}${activeSubjectName}_${selectedMonth}_${currentYear}`
      : `វត្តមាន_${className ? className + '_' : ''}${selectedMonth}_${currentYear}`
  );

  const statusSheetTitle = cleanTitle(`ស្ថានភាព_${className || 'សិស្ស'}`);

  let existingTitles: string[] = [];

  // 2. Create new spreadsheet if needed
  if (!spreadsheetId || !isExistingValid) {
    onProgress?.('កំពុងបង្កើត Google Sheet ថ្មីក្នុង Google Drive របស់អ្នក...', 40);
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `សាលារៀនសុវណ្ណភូមិ - ពិន្ទុ_វត្តមាន_ស្ថានភាពសិស្ស (${className || 'ថ្នាក់រៀន'})`,
          timeZone: 'Asia/Phnom_Penh'
        },
        sheets: [
          { properties: { title: scoreSheetTitle } },
          { properties: { title: monthSheetTitle } },
          { properties: { title: statusSheetTitle } }
        ]
      })
    });

    if (createRes.status === 401) {
      setGoogleSheetsAccessToken(null);
      throw new Error('Request had invalid authentication credentials. OAuth token expired or invalid. Please reconnect Google Sheets.');
    }

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'ពុំអាចបង្កើត Google Sheet បានឡើយ');
    }

    const createdData = await createRes.json();
    spreadsheetId = createdData.spreadsheetId;
    existingTitles = [scoreSheetTitle, monthSheetTitle, statusSheetTitle];
    if (!overrideSpreadsheetId) {
      localStorage.setItem(storageKey, spreadsheetId);
    }
  } else if (spreadsheetId) {
    // Check if required sheets (Scores, Attendance, Status, Month sheet) exist, if not create them dynamically!
    try {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        const existingSheets = metaData.sheets || [];
        existingTitles = existingSheets.map((s: any) => s.properties?.title);

        const requiredSheets = [
          { name: scoreSheetTitle, sync: syncScores },
          { name: monthSheetTitle, sync: syncAttendance },
          { name: statusSheetTitle, sync: syncStatus }
        ];

        const missingSheets = requiredSheets.filter(r => r.sync && !existingTitles.includes(r.name));

        if (missingSheets.length > 0) {
          onProgress?.('កំពុងបង្កើតផ្ទាំងសន្លឹក (sheets) ថ្មីតាមមុខវិជ្ជា និងថ្នាក់...', 45);
          const addSheetRequests = missingSheets.map(m => ({
            addSheet: {
              properties: {
                title: m.name
              }
            }
          }));

          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: addSheetRequests
            })
          });

          missingSheets.forEach(m => existingTitles.push(m.name));
        }
      }
    } catch (e) {
      console.warn('Failed to auto-create missing sheets in Google Sheets:', e);
    }
  }

  // 3. Prepare Batch Data Updates for Google Sheets
  const valueUpdates: Array<{ range: string; values: any[][] }> = [];

  // --- SHEET 1: SCORES (ពិន្ទុសិស្ស) ---
  if (syncScores) {
    onProgress?.('កំពុងរៀបចំទិន្នន័យពិន្ទុសិស្ស...', 60);
    
    // Sort students by name (ក-អ)
    const sortedStudents = [...students].sort((a, b) => 
      a.name.trim().localeCompare(b.name.trim(), 'km')
    );

    const scoresRows: any[][] = [
      ['សាលារៀន សុវណ្ណភូមិ (Sovannaphumi School)'],
      [`តារាងពិន្ទុសិស្សប្រចាំខែ ${selectedMonth} - មុខវិជ្ជា៖ ${activeSubjectName || 'ទូទៅ'} - ថ្នាក់៖ ${className}`],
      [`កាលបរិច្ឆេទធ្វើសមកាលកម្ម៖ ${new Date().toLocaleString('km-KH')}`],
      [], // Empty row
      [
        'ល.រ', 
        'ID សិស្ស', 
        'ឈ្មោះសិស្ស', 
        'ភេទ', 
        'សរុប (ដក Exam)', 
        'សរុប ១ខែ (Grand Total)', 
        'មធ្យមភាគ', 
        'ចំណាត់ថ្នាក់',
        'Monthly Exam',
        'W1 សកម្មភាព',
        'W1 កិច្ចការ',
        'W1 Quiz',
        'W2 សកម្មភាព',
        'W2 កិច្ចការ',
        'W2 Quiz',
        'W3 សកម្មភាព',
        'W3 កិច្ចការ',
        'W3 Quiz',
        'W4 សកម្មភាព',
        'W4 កិច្ចការ',
        'W4 Quiz'
      ]
    ];

    sortedStudents.forEach((st, idx) => {
      const monthScores = (st as any).monthlyScores?.[selectedMonth] || {};
      const subTotal = (st as any).score || 0;
      const grandTotal = monthScores.grandTotal !== undefined ? monthScores.grandTotal : subTotal;
      const average = monthScores.average !== undefined ? monthScores.average : Math.round(grandTotal / 2);
      const rank = monthScores.rank || '-';
      const monthlyExam = monthScores.monthlyExam || 0;

      const w1 = monthScores.week1 || {};
      const w2 = monthScores.week2 || {};
      const w3 = monthScores.week3 || {};
      const w4 = monthScores.week4 || {};

      scoresRows.push([
        idx + 1,
        st.studentId || st.id,
        st.name,
        st.gender || 'មិនបញ្ជាក់',
        subTotal,
        grandTotal,
        average,
        rank,
        monthlyExam,
        w1.activity || 0,
        w1.homework || 0,
        w1.quiz || 0,
        w2.activity || 0,
        w2.homework || 0,
        w2.quiz || 0,
        w3.activity || 0,
        w3.homework || 0,
        w3.quiz || 0,
        w4.activity || 0,
        w4.homework || 0,
        w4.quiz || 0
      ]);
    });

    valueUpdates.push({
      range: `'${scoreSheetTitle}'!A1`,
      values: scoresRows
    });
    if (existingTitles.includes('តារាងពិន្ទុ') && scoreSheetTitle !== 'តារាងពិន្ទុ') {
      valueUpdates.push({
        range: "'តារាងពិន្ទុ'!A1",
        values: scoresRows
      });
    }
  }

  // --- SHEET 2: ATTENDANCE (វត្តមានសិស្ស) ---
  if (syncAttendance) {
    onProgress?.('កំពុងរៀបចំទិន្នន័យវត្តមានសិស្ស...', 75);

    const sortedStudents = [...students].sort((a, b) => 
      a.name.trim().localeCompare(b.name.trim(), 'km')
    );

    // Determine year, targetMonth, and daysInMonth safely without timezone shifts
    let year = now.getFullYear();
    let targetMonth = now.getMonth();

    if (effectiveAttendanceDate && effectiveAttendanceDate.includes('-')) {
      const parts = effectiveAttendanceDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y)) year = y;
      if (!isNaN(m) && m >= 0 && m <= 11) targetMonth = m;
    }

    if (selectedMonth) {
      const monthIndex = KHMER_MONTHS.indexOf(selectedMonth);
      if (monthIndex !== -1) targetMonth = monthIndex;
    }

    const daysInMonth = new Date(year, targetMonth + 1, 0).getDate(); // 28, 29, 30, or 31

    // Build header row 1: Days 1 to 31 + summary headers
    const headerRow: any[] = ['ល.រ', 'ID សិស្ស', 'គោតនាម', 'នាម', 'ភេទ'];
    for (let d = 1; d <= 31; d++) {
      headerRow.push(d <= daysInMonth ? d : '');
    }
    headerRow.push('ចំនួនអវត្តមាន', '', '', ''); // 4 summary columns: យឺត (L), ច្ប (P), អ.ច្ប (A), សរុប

    const subHeaderRow: any[] = ['', '', '', '', ''];
    for (let d = 1; d <= 31; d++) {
      subHeaderRow.push('');
    }
    subHeaderRow.push('យឺត', 'ច្ប', 'អ.ច្ប', 'សរុប');

    const attendanceRows: any[][] = [
      ['សាលារៀន សុវណ្ណភូមិ (Sovannaphumi School)'],
      [`តារាងកត់ត្រាវត្តមានសិស្សប្រចាំខែ ${selectedMonth} ឆ្នាំ ${year} - ថ្នាក់៖ ${className}`],
      [],
      headerRow,
      subHeaderRow
    ];

    // Load full attendance records from local storage for multi-day lookup
    let allRecs: Record<string, Record<string, 'present' | 'absent' | 'permission' | 'late'>> = {};
    const allRecordsStr = localStorage.getItem('edu_spin_attendance_records');
    if (allRecordsStr) {
      try {
        allRecs = JSON.parse(allRecordsStr);
      } catch {}
    }

    sortedStudents.forEach((st, idx) => {
      const studentDays: any[] = [];
      let totalLate = 0;
      let totalPermission = 0;
      let totalAbsent = 0;

      for (let d = 1; d <= 31; d++) {
        if (d > daysInMonth) {
          studentDays.push('');
          continue;
        }
        const dayStr = String(d).padStart(2, '0');
        const monthStr = String(targetMonth + 1).padStart(2, '0');
        const formattedDateKey = `${year}-${monthStr}-${dayStr}`;

        // Look for stored records for this date
        const exactKey = `${classId || 'default'}_${activeSubjectId || ''}_${formattedDateKey}`;
        const legacyKey = `${classId || 'default'}_${formattedDateKey}`;

        let storedDayRec = allRecs[exactKey] || allRecs[legacyKey] || null;
        if (!storedDayRec) {
          const matchingKey = Object.keys(allRecs).find(k => 
            (k.includes(classId) || !classId) && k.endsWith(formattedDateKey)
          );
          if (matchingKey) {
            storedDayRec = allRecs[matchingKey];
          }
        }

        const isCurrentActiveDate = (formattedDateKey === effectiveAttendanceDate);

        // Merge stored record with live active attendanceMap if this is currentActiveDate
        const dayRec: Record<string, 'present' | 'absent' | 'permission' | 'late'> = {
          ...(storedDayRec || {}),
          ...(isCurrentActiveDate ? (attendanceMap || {}) : {})
        };

        const hasAnyAttendance = Object.keys(dayRec).length > 0;

        // If no attendance was taken on this day and it's not the active date being saved
        if (!hasAnyAttendance && !isCurrentActiveDate) {
          studentDays.push('');
          continue;
        }

        // Determine student's status:
        // Priority:
        // 1. Explicit status in dayRec (absent / permission / late / present)
        // 2. If attendance was taken on this day, students not marked absent/permission/late are present ('✓')
        const rawStatus = dayRec[st.id] || (isCurrentActiveDate || hasAnyAttendance ? 'present' : '');

        if (rawStatus === 'absent') {
          studentDays.push('A');
          totalAbsent++;
        } else if (rawStatus === 'permission') {
          studentDays.push('P');
          totalPermission++;
        } else if (rawStatus === 'late') {
          studentDays.push('L');
          totalLate++;
        } else if (rawStatus === 'present') {
          studentDays.push('✓');
        } else {
          studentDays.push('');
        }
      }

      // Split student name into គោតនាម (family name) and នាម (given name) roughly by last space
      const nameParts = st.name.trim().split(' ');
      const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
      const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : st.name.trim();

      const totalSummary = totalLate + totalPermission + totalAbsent;

      attendanceRows.push([
        idx + 1,
        st.studentId || st.id,
        lastName,
        firstName,
        st.gender || 'ប្រុស',
        ...studentDays,
        totalLate,
        totalPermission,
        totalAbsent,
        totalSummary
      ]);
    });

    valueUpdates.push({
      range: `'${monthSheetTitle}'!A1`,
      values: attendanceRows
    });
    if (existingTitles.includes('វត្តមានសិស្ស') && monthSheetTitle !== 'វត្តមានសិស្ស') {
      valueUpdates.push({
        range: "'វត្តមានសិស្ស'!A1",
        values: attendanceRows
      });
    }
  }

  // --- SHEET 3: STUDENT STATUS / PROFILES (ស្ថានភាពសិស្ស) ---
  if (syncStatus) {
    onProgress?.('កំពុងរៀបចំស្ថានភាពសិស្ស និងព័ត៌មានលម្អិត...', 85);

    const sortedStudents = [...students].sort((a, b) => 
      a.name.trim().localeCompare(b.name.trim(), 'km')
    );

    const statusRows: any[][] = [
      ['សាលារៀន សុវណ្ណភូមិ (Sovannaphumi School)'],
      [`បញ្ជីឈ្មោះ និងស្ថានភាពសិស្ស - ថ្នាក់៖ ${className}`],
      [`ចំនួនសិស្សសរុប៖ ${sortedStudents.length} នាក់ | ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ${new Date().toLocaleDateString('km-KH')}`],
      [],
      [
        'ល.រ', 
        'ID សិស្ស', 
        'ឈ្មោះសិស្ស', 
        'ភេទ', 
        'ថ្នាក់', 
        'ស្ថានភាពទូទៅ', 
        'ពិន្ទុសរុប', 
        'លេខទូរស័ព្ទ', 
        'ឈ្មោះអាណាព្យាបាល', 
        'ទូរស័ព្ទអាណាព្យាបាល', 
        'កំណត់ចំណាំ / បទបញ្ជា'
      ]
    ];

    sortedStudents.forEach((st, idx) => {
      statusRows.push([
        idx + 1,
        st.studentId || st.id,
        st.name,
        st.gender || 'មិនបញ្ជាក់',
        className,
        st.status || 'សកម្ម',
        st.score || 0,
        st.phoneNumber || '-',
        '-',
        '-',
        st.notes || ''
      ]);
    });

    valueUpdates.push({
      range: `'${statusSheetTitle}'!A1`,
      values: statusRows
    });
    if (existingTitles.includes('ស្ថានភាពសិស្ស') && statusSheetTitle !== 'ស្ថានភាពសិស្ស') {
      valueUpdates.push({
        range: "'ស្ថានភាពសិស្ស'!A1",
        values: statusRows
      });
    }
  }

  // 4. Send Batch Update to Google Sheets API
  onProgress?.('កំពុងបញ្ជូនទិន្នន័យ និងរក្សាទុកទៅ Google Sheets...', 92);
  
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueUpdates
      })
    }
  );

  if (updateRes.status === 401) {
    setGoogleSheetsAccessToken(null);
    throw new Error('Request had invalid authentication credentials. OAuth token expired or invalid. Please reconnect Google Sheets.');
  }

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'ពុំអាចរក្សាទុកទិន្នន័យក្នុង Google Sheet បានឡើយ');
  }

  onProgress?.('បានរក្សាទុកក្នុង Google Sheets ជោគជ័យ ១០០%!', 100);

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, spreadsheetUrl };
}
