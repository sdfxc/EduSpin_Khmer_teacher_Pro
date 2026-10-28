export type AppLanguage = 'km' | 'en';

export const LANGUAGE_STORAGE_KEY = 'edu_spin_app_language';

export function getSavedLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'km';
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'km') return saved;
  } catch {}
  return 'km';
}

export function saveLanguage(lang: AppLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('app-language-changed', { detail: lang }));
  } catch {}
}

export const translations: Record<AppLanguage, Record<string, string>> = {
  km: {
    // General & Header
    settingsAndMenu: 'ការកំណត់ & Menu',
    controlCenterSubtitle: 'ផ្ទាំងបញ្ជាប្រព័ន្ធ & ការពារទិន្នន័យ',
    language: 'ភាសា / Language',
    languageKhmer: 'ភាសាខ្មែរ',
    languageEnglish: 'English',
    languageSwitched: 'បានប្ដូរភាសាទៅជា ភាសាខ្មែរ',
    systemControls: 'ការកំណត់ប្រព័ន្ធ (Controls)',
    backupAndRestore: 'បម្រុងទុក & ស្ដារ (Backup)',
    notLoggedIn: 'មិនទាន់ចូលគណនី',
    runningOnLocal: 'ដំណើរការលើ Local Storage',
    signIn: 'ចូលគណនី',
    profile: 'Profile',
    logout: 'ចាកចេញ',
    lightDarkTheme: 'ពន្លឺ / ងងឹត',
    switchTheme: 'ប្ដូរ Theme កម្មវិធី',
    darkOn: 'Dark ON',
    lightOn: 'Light',
    gameSound: 'សំឡេងហ្គេម',
    sfxChimes: 'SFX & Chimes',
    soundOn: 'បើក (M)',
    soundOff: 'បិទ',
    fullscreen: 'ពេញអេក្រង់ (F)',
    forTvProjector: 'សម្រាប់ TV/Projector',
    full: 'Full',
    window: 'Window',
    shortcuts: 'គ្រាប់ចុចកាត់',
    shortcutsList: 'Shortcuts List',
    pressQuestion: 'ចុច ?',
    aiQuestions: 'បង្កើតសំណួរ AI',
    aiQuestionsSubtitle: 'ទាញយកសំណួរពីមេរៀនស្វ័យប្រវត្តិ',
    resetAllData: 'កំណត់កម្មវិធីឡើងវិញ (Reset All Data)',
    systemData100: 'ទិន្នន័យក្នុងប្រព័ន្ធ (100% Full State)',
    liveReady: '● Live Ready',
    classrooms: 'ថ្នាក់រៀន',
    totalStudents: 'សិស្សសរុប',
    quizQuestions: 'សំណួរ/មុខវិជ្ជា',
    exportBackupTitle: 'ទាញយកទិន្នន័យបម្រុងទុក (Backup)',
    exportBackupDesc: 'ទាញយកទិន្នន័យគ្រប់គម្លៀតទាំងអស់ (ថ្នាក់, បញ្ជីសិស្សគ្រប់ថ្នាក់, ពិន្ទុ, កាតសំណួរ, ក្រុម, មេរៀន, និងការកំណត់) ទៅជាឯកសារ .json ទុកលើទូរស័ព្ទ ឬកុំព្យូទ័រ។',
    downloadBackupBtn: 'ទាញយកឯកសារបម្រុងទុក (Backup)',
    restoreBackupTitle: 'ស្ដារទិន្នន័យឡើងវិញ (Restore)',
    restoreBackupDesc: 'ជ្រើសរើសឯកសារ .json ដែលបានទាញយក ដើម្បីស្ដារអ្វីៗគ្រប់យ៉ាងឱ្យត្រឡប់មកដូចដើមវិញ ១០០%។',
    chooseBackupFile: 'ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ Backup .json',
    fileReadyToRestore: 'ឯកសារត្រៀមស្ដារ៖',
    restoreNowBtn: 'យល់ព្រមស្ដារទិន្នន័យ (Restore Now)',
    restoring: 'កំពុងស្ដារទិន្នន័យ...',
    restoreSuccess: 'បានស្ដារទិន្នន័យឡើងវិញ ១០០% ជោគជ័យ!',
    done: 'រួចរាល់ (Done)',
    systemMenuFooter: 'EduSpin Pro • iOS System Menu',

    // Main App Navigation
    tabWheel: 'កងបង្វិល',
    tabQuiz: 'ឆ្លើយសំណួរ',
    tabGroups: 'បែងចែកក្រុម',
    tabStopwatch: 'នាឡិកា',
    tabStudents: 'គ្រប់គ្រងសិស្ស',
    tabStudentLobby: 'បន្ទប់សិស្ស',
    tabExamsRoom: 'បន្ទប់ប្រឡង',
    tabSmartNotes: 'កំណត់ត្រា',
    studyGame: 'Study Game',
    registerTeacher: 'ចុះឈ្មោះគ្រូ',
    studentsUnit: 'សិស្ស',
    questionsUnit: 'សំណួរ',
    fileDate: 'កាលបរិច្ឆេទ',
    cancel: 'បោះបង់',
    confirmLogoutTitle: 'ចាកចេញពីគណនី',
    confirmLogoutDesc: 'តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់ចាកចេញពីគណនីមែនទេ? (រាល់ទិន្នន័យដែលបានរក្សាទុកក្នុង Cloud នឹងមិនបាត់បង់ឡើយ)',
    profileTooltip: 'ចុចដើម្បីមើល ឬកែប្រែព័ត៌មាន Profile',
    changeAvatarTooltip: 'ចុចដើម្បីប្ដូររូបភាព Profile ពីទូរស័ព្ទ ឬកុំព្យូទ័រ',
    settingsTooltip: 'ការកំណត់ & បម្រុងទុកទិន្នន័យ (Settings & Backup)'
  },
  en: {
    // General & Header
    settingsAndMenu: 'Settings & Menu',
    controlCenterSubtitle: 'Control Center & Data Vault',
    language: 'Language / ភាសា',
    languageKhmer: 'Khmer',
    languageEnglish: 'English',
    languageSwitched: 'Language switched to English',
    systemControls: 'System Controls',
    backupAndRestore: 'Backup & Restore',
    notLoggedIn: 'Not Logged In',
    runningOnLocal: 'Running on Local Storage',
    signIn: 'Sign In',
    profile: 'Profile',
    logout: 'Log Out',
    lightDarkTheme: 'Light / Dark',
    switchTheme: 'Toggle App Theme',
    darkOn: 'Dark ON',
    lightOn: 'Light',
    gameSound: 'Game Sound',
    sfxChimes: 'SFX & Chimes',
    soundOn: 'On (M)',
    soundOff: 'Muted',
    fullscreen: 'Fullscreen (F)',
    forTvProjector: 'For TV / Projector',
    full: 'Full',
    window: 'Window',
    shortcuts: 'Shortcuts',
    shortcutsList: 'Shortcuts Guide',
    pressQuestion: 'Press ?',
    aiQuestions: 'AI Question Creator',
    aiQuestionsSubtitle: 'Auto-extract quiz from lessons',
    resetAllData: 'Factory Reset All Data',
    systemData100: 'System Data Vault (100% Full State)',
    liveReady: '● Live Ready',
    classrooms: 'Classes',
    totalStudents: 'Total Students',
    quizQuestions: 'Questions/Subjects',
    exportBackupTitle: 'Export Backup File',
    exportBackupDesc: 'Download complete application data (classes, student rosters, scores, quiz cards, groups, lesson notes, and preferences) as a .json backup file.',
    downloadBackupBtn: 'Download Full Backup (.json)',
    restoreBackupTitle: 'Restore From Backup',
    restoreBackupDesc: 'Select an exported .json backup file to restore all classes, students, and quiz rooms with 100% fidelity.',
    chooseBackupFile: 'Click here to choose a Backup .json file',
    fileReadyToRestore: 'File ready for restore:',
    restoreNowBtn: 'Restore All Data Now',
    restoring: 'Restoring data...',
    restoreSuccess: 'Successfully restored 100% of data!',
    done: 'Done',
    systemMenuFooter: 'EduSpin Pro • iOS System Menu',

    // Main App Navigation
    tabWheel: 'Wheel Spin',
    tabQuiz: 'Quiz Board',
    tabGroups: 'Groups',
    tabStopwatch: 'Stopwatch',
    tabStudents: 'Students',
    tabStudentLobby: 'Study Game',
    tabExamsRoom: 'Exams Room',
    tabSmartNotes: 'Smart Notes',
    studyGame: 'Study Game',
    registerTeacher: 'Register',
    studentsUnit: 'Students',
    questionsUnit: 'Questions',
    fileDate: 'Date',
    cancel: 'Cancel',
    confirmLogoutTitle: 'Log Out',
    confirmLogoutDesc: 'Are you sure you want to log out? (All your data stored in Cloud will remain safe)',
    profileTooltip: 'Click to view or edit profile',
    changeAvatarTooltip: 'Click to change profile avatar',
    settingsTooltip: 'Settings & Data Backup'
  }
};

export function t(key: string, lang: AppLanguage = 'km'): string {
  return translations[lang]?.[key] || translations['km']?.[key] || key;
}
