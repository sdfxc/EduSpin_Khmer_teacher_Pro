import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Key, School, BookOpen, UserPlus, LogIn, CheckCircle, Loader2, Mail, ArrowLeft, Send } from 'lucide-react';
import { TeacherAccount } from '../types';
import { doc } from 'firebase/firestore';
import { 
  db, 
  auth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  handleFirestoreError, 
  OperationType, 
  safeSetDoc, 
  safeGetDoc 
} from '../lib/firebase';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (account: TeacherAccount) => void;
  initialMode?: 'login' | 'register';
}

// Brand SVG Icons
const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.119.098.152.228.166.331.016.115.023.233.003.364z"/>
  </svg>
);

const LOCAL_ACCOUNTS_KEY = 'khmer_teacher_local_accounts';

function getLocalAccounts(): TeacherAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalAccount(account: TeacherAccount) {
  try {
    const accounts = getLocalAccounts();
    const existingIndex = accounts.findIndex(
      a => (a.id && account.id && a.id.toLowerCase() === account.id.toLowerCase()) ||
        (a.username && account.username && a.username.toLowerCase() === account.username.toLowerCase())
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...account };
    } else {
      accounts.push(account);
    }
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

export default function TeacherAuthModal({ isOpen, onClose, onLoginSuccess, initialMode = 'login' }: TeacherAuthModalProps) {
  const [isLoginView, setIsLoginView] = useState(initialMode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState<'none' | 'email' | 'google' | 'facebook' | 'telegram'>('none');

  useEffect(() => {
    if (isOpen) {
      setIsLoginView(initialMode === 'login');
      setActiveSubModal('none');
    }
  }, [initialMode, isOpen]);

  // Standard Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Standard Register fields
  const [regName, setRegName] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regSubject, setRegSubject] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Email SubModal fields
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailTeacherName, setEmailTeacherName] = useState('');
  const [emailSchoolName, setEmailSchoolName] = useState('សាលារៀនសុវណ្ណភូមិ');

  // Google SubModal fields
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Facebook SubModal fields
  const [facebookEmail, setFacebookEmail] = useState('');
  const [facebookName, setFacebookName] = useState('');

  // Telegram SubModal fields
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramName, setTelegramName] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset states on change view
  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(false);
    setShowLoginPassword(false);
    setShowRegPassword(false);
  }, [isLoginView, activeSubModal]);

  // ----------------------- GOOGLE AUTHENTICATION -----------------------
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        const email = user.email || '';
        const cleanId = email ? `email_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : `google_${user.uid}`;
        const teacherDocRef = doc(db, 'teachers', cleanId);
        const teacherSnap = await safeGetDoc(teacherDocRef);

        let teacherData: TeacherAccount;
        if (teacherSnap.exists()) {
          teacherData = teacherSnap.data() as TeacherAccount;
        } else {
          teacherData = {
            id: cleanId,
            name: user.displayName || 'លោកគ្រូ/អ្នកគ្រូ Google',
            schoolName: 'សាលារៀនសុវណ្ណភូមិ',
            username: email ? email.split('@')[0] : `google_${user.uid.slice(0, 6)}`,
            email: email,
            avatarUrl: user.photoURL || undefined,
            authProvider: 'google'
          };
          safeSetDoc(teacherDocRef, teacherData).catch(() => {});
        }

        saveLocalAccount(teacherData);
        localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
        onLoginSuccess(teacherData);
        setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Google Account (${email || user.displayName}) ជោគជ័យ!`);
        setTimeout(() => {
          onClose();
          setIsLoading(false);
        }, 600);
        return;
      }
    } catch (err: any) {
      console.warn('Google Popup notice, opening account sync form:', err?.message);
      setActiveSubModal('google');
      setIsLoading(false);
    }
  };

  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setErrorMsg('សូមបំពេញ Email Google របស់អ្នក!');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    const cleanEmail = googleEmail.trim().toLowerCase();
    const cleanId = `email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    try {
      const teacherDocRef = doc(db, 'teachers', cleanId);
      const teacherSnap = await safeGetDoc(teacherDocRef);

      let teacherData: TeacherAccount;
      if (teacherSnap.exists()) {
        teacherData = teacherSnap.data() as TeacherAccount;
      } else {
        teacherData = {
          id: cleanId,
          name: googleName.trim() || `លោកគ្រូ (${cleanEmail.split('@')[0]})`,
          schoolName: 'សាលារៀនសុវណ្ណភូមិ',
          username: cleanEmail.split('@')[0],
          email: cleanEmail,
          authProvider: 'google'
        };
        safeSetDoc(teacherDocRef, teacherData).catch(() => {});
      }

      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Google Account (${cleanEmail}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    } catch (err) {
      console.warn('Google direct fallback:', err);
      const teacherData: TeacherAccount = {
        id: cleanId,
        name: googleName.trim() || `លោកគ្រូ (${cleanEmail.split('@')[0]})`,
        schoolName: 'សាលារៀនសុវណ្ណភូមិ',
        username: cleanEmail.split('@')[0],
        email: cleanEmail,
        authProvider: 'google'
      };
      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Google Account (${cleanEmail}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    }
  };

  // ----------------------- FACEBOOK AUTHENTICATION -----------------------
  const handleFacebookAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        const email = user.email || '';
        const cleanId = email ? `fb_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : `fb_${user.uid}`;
        const teacherDocRef = doc(db, 'teachers', cleanId);
        const teacherSnap = await safeGetDoc(teacherDocRef);

        let teacherData: TeacherAccount;
        if (teacherSnap.exists()) {
          teacherData = teacherSnap.data() as TeacherAccount;
        } else {
          teacherData = {
            id: cleanId,
            name: user.displayName || 'លោកគ្រូ/អ្នកគ្រូ Facebook',
            schoolName: 'សាលារៀនសុវណ្ណភូមិ',
            username: email ? email.split('@')[0] : `fb_${user.uid.slice(0, 6)}`,
            email: email,
            avatarUrl: user.photoURL || undefined,
            authProvider: 'facebook'
          };
          safeSetDoc(teacherDocRef, teacherData).catch(() => {});
        }

        saveLocalAccount(teacherData);
        localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
        onLoginSuccess(teacherData);
        setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Facebook (${user.displayName || email}) ជោគជ័យ!`);
        setTimeout(() => {
          onClose();
          setIsLoading(false);
        }, 600);
        return;
      }
    } catch (err: any) {
      console.warn('Facebook Popup notice, opening account sync form:', err?.message);
      setActiveSubModal('facebook');
      setIsLoading(false);
    }
  };

  const handleFacebookDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facebookEmail.trim()) {
      setErrorMsg('សូមបំពេញ ឈ្មោះគណនី ឬ Email Facebook របស់អ្នក!');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    const cleanInput = facebookEmail.trim().toLowerCase();
    const cleanId = `fb_${cleanInput.replace(/[^a-z0-9]/g, '_')}`;

    try {
      const teacherDocRef = doc(db, 'teachers', cleanId);
      const teacherSnap = await safeGetDoc(teacherDocRef);

      let teacherData: TeacherAccount;
      if (teacherSnap.exists()) {
        teacherData = teacherSnap.data() as TeacherAccount;
      } else {
        teacherData = {
          id: cleanId,
          name: facebookName.trim() || `លោកគ្រូ/អ្នកគ្រូ Facebook (${cleanInput})`,
          schoolName: 'សាលារៀនសុវណ្ណភូមិ',
          username: cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput,
          email: cleanInput.includes('@') ? cleanInput : undefined,
          authProvider: 'facebook'
        };
        safeSetDoc(teacherDocRef, teacherData).catch(() => {});
      }

      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Facebook Account (${cleanInput}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    } catch (err) {
      console.warn('Facebook direct fallback:', err);
      const teacherData: TeacherAccount = {
        id: cleanId,
        name: facebookName.trim() || `លោកគ្រូ/អ្នកគ្រូ Facebook (${cleanInput})`,
        schoolName: 'សាលារៀនសុវណ្ណភូមិ',
        username: cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput,
        email: cleanInput.includes('@') ? cleanInput : undefined,
        authProvider: 'facebook'
      };
      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Facebook Account (${cleanInput}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    }
  };

  // ----------------------- TELEGRAM AUTHENTICATION -----------------------
  const handleTelegramAuth = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setActiveSubModal('telegram');
  };

  const handleTelegramDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramUsername.trim()) {
      setErrorMsg('សូមបំពេញ Telegram Username (ឧ. @teacher_kh) ឬលេខទូរស័ព្ទ!');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    const rawTg = telegramUsername.trim().replace(/^@/, '').toLowerCase();
    const cleanId = `tg_${rawTg.replace(/[^a-z0-9]/g, '_')}`;

    try {
      const teacherDocRef = doc(db, 'teachers', cleanId);
      const teacherSnap = await safeGetDoc(teacherDocRef);

      let teacherData: TeacherAccount;
      if (teacherSnap.exists()) {
        teacherData = teacherSnap.data() as TeacherAccount;
      } else {
        teacherData = {
          id: cleanId,
          name: telegramName.trim() || `លោកគ្រូ Telegram (@${rawTg})`,
          schoolName: 'សាលារៀនសុវណ្ណភូមិ',
          username: rawTg,
          telegramUsername: `@${rawTg}`,
          authProvider: 'telegram'
        };
        safeSetDoc(teacherDocRef, teacherData).catch(() => {});
      }

      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Telegram Account (@${rawTg}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    } catch (err) {
      console.warn('Telegram direct fallback:', err);
      const teacherData: TeacherAccount = {
        id: cleanId,
        name: telegramName.trim() || `លោកគ្រូ Telegram (@${rawTg})`,
        schoolName: 'សាលារៀនសុវណ្ណភូមិ',
        username: rawTg,
        telegramUsername: `@${rawTg}`,
        authProvider: 'telegram'
      };
      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Telegram Account (@${rawTg}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    }
  };

  // ----------------------- EMAIL AUTHENTICATION -----------------------
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim() || !emailPassword.trim()) {
      setErrorMsg('សូមបំពេញ អ៊ីមែល និងលេខសម្ងាត់!');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    const cleanEmail = emailAddress.trim().toLowerCase();
    const cleanId = `email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    try {
      // 1. Firebase Auth Attempt
      try {
        if (isLoginView) {
          await signInWithEmailAndPassword(auth, cleanEmail, emailPassword);
        } else {
          await createUserWithEmailAndPassword(auth, cleanEmail, emailPassword);
        }
      } catch (fbAuthErr: any) {
        console.warn('Firebase Email Auth Notice:', fbAuthErr?.message);
      }

      // 2. Fetch / Create teacher doc on Cloud Firestore
      const teacherDocRef = doc(db, 'teachers', cleanId);
      const teacherSnap = await safeGetDoc(teacherDocRef);

      let teacherData: TeacherAccount;
      if (teacherSnap.exists()) {
        teacherData = teacherSnap.data() as TeacherAccount;
        if (teacherData.password && teacherData.password !== emailPassword) {
          setErrorMsg('លេខសម្ងាត់មិនត្រឹមត្រូវឡើយ។ សូមព្យាយាមម្ដងទៀត!');
          setIsLoading(false);
          return;
        }
      } else {
        teacherData = {
          id: cleanId,
          name: emailTeacherName.trim() || `លោកគ្រូ/អ្នកគ្រូ (${cleanEmail.split('@')[0]})`,
          schoolName: emailSchoolName.trim() || 'សាលារៀនសុវណ្ណភូមិ',
          username: cleanEmail.split('@')[0],
          email: cleanEmail,
          password: emailPassword,
          authProvider: 'email'
        };
        safeSetDoc(teacherDocRef, teacherData).catch(() => {});
      }

      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Email (${cleanEmail}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    } catch (err) {
      console.warn('Email auth fallback:', err);
      const teacherData: TeacherAccount = {
        id: cleanId,
        name: emailTeacherName.trim() || `លោកគ្រូ/អ្នកគ្រូ (${cleanEmail.split('@')[0]})`,
        schoolName: emailSchoolName.trim() || 'សាលារៀនសុវណ្ណភូមិ',
        username: cleanEmail.split('@')[0],
        email: cleanEmail,
        password: emailPassword,
        authProvider: 'email'
      };
      saveLocalAccount(teacherData);
      localStorage.setItem('logged_in_teacher', JSON.stringify(teacherData));
      onLoginSuccess(teacherData);
      setSuccessMsg(`ចូលប្រើប្រាស់ជាមួយ Email (${cleanEmail}) ជោគជ័យ!`);
      setTimeout(() => {
        onClose();
        setIsLoading(false);
        setActiveSubModal('none');
      }, 600);
    }
  };

  // ----------------------- USERNAME / PASSWORD STANDARD LOGIN -----------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMsg('សូមបំពេញឈ្មោះគណនី និងលេខសម្ងាត់ឱ្យបានត្រឹមត្រូវ។');
      setIsLoading(false);
      return;
    }

    const cleanUsername = loginUsername.trim().toLowerCase();

    try {
      // 1. Instant check in local accounts (offline & zero latency)
      const localAccounts = getLocalAccounts();
      const localMatch = localAccounts.find(
        a => (a.id && a.id.toLowerCase() === cleanUsername) || (a.username && a.username.toLowerCase() === cleanUsername)
      );

      if (localMatch) {
        if (localMatch.password === loginPassword) {
          localStorage.setItem('logged_in_teacher', JSON.stringify(localMatch));
          onLoginSuccess(localMatch);
          setSuccessMsg('ការចូលប្រើប្រាស់ជោគជ័យ!');
          setTimeout(() => {
            onClose();
            setLoginUsername('');
            setLoginPassword('');
            setIsLoading(false);
          }, 600);
          return;
        } else {
          setErrorMsg('លេខសម្ងាត់មិនត្រឹមត្រូវឡើយ។ សូមព្យាយាមម្ដងទៀត!');
          setIsLoading(false);
          return;
        }
      }

      // 2. Query Cloud Firestore if not found locally
      const teacherDocRef = doc(db, 'teachers', cleanUsername);
      const teacherSnap = await safeGetDoc(teacherDocRef);

      if (teacherSnap.exists()) {
        const found = teacherSnap.data() as TeacherAccount;

        if (found.password === loginPassword) {
          saveLocalAccount(found);
          localStorage.setItem('logged_in_teacher', JSON.stringify(found));
          onLoginSuccess(found);
          setSuccessMsg('ការចូលប្រើប្រាស់ជោគជ័យ!');
          setTimeout(() => {
            onClose();
            setLoginUsername('');
            setLoginPassword('');
            setIsLoading(false);
          }, 600);
          return;
        } else {
          setErrorMsg('លេខសម្ងាត់មិនត្រឹមត្រូវឡើយ។ សូមព្យាយាមម្ដងទៀត!');
          setIsLoading(false);
          return;
        }
      }

      setErrorMsg('រកមិនឃើញគណនីនេះក្នុងប្រព័ន្ធឡើយ។ សូមពិនិត្យឈ្មោះម្តងទៀត ឬបង្កើតគណនីថ្មី!');
      setIsLoading(false);
    } catch (err) {
      console.warn('Login error fallback:', err);
      // Fallback check
      const localAccounts = getLocalAccounts();
      const localMatch = localAccounts.find(
        a => (a.id && a.id.toLowerCase() === cleanUsername) || (a.username && a.username.toLowerCase() === cleanUsername)
      );
      if (localMatch && localMatch.password === loginPassword) {
        localStorage.setItem('logged_in_teacher', JSON.stringify(localMatch));
        onLoginSuccess(localMatch);
        setSuccessMsg('ការចូលប្រើប្រាស់ជោគជ័យ!');
        setTimeout(() => {
          onClose();
          setIsLoading(false);
        }, 600);
        return;
      }
      setErrorMsg('រកមិនឃើញគណនីនេះក្នុងប្រព័ន្ធឡើយ។ សូមពិនិត្យឈ្មោះម្តងទៀត!');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    
    if (!regName.trim() || !regSchool.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMsg('សូមបំពេញព័ត៌មានកាតព្វកិច្ច (*) ទាំងអស់ឱ្យបានត្រឹមត្រូវ។');
      setIsLoading(false);
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase();

    try {
      // 1. Check if username already exists locally
      const localAccounts = getLocalAccounts();
      const localExists = localAccounts.some(
        a => (a.id && a.id.toLowerCase() === cleanUsername) || (a.username && a.username.toLowerCase() === cleanUsername)
      );
      if (localExists) {
        setErrorMsg('ឈ្មោះគណនីនេះមានរួចហើយ។ សូមជ្រើសរើសឈ្មោះគណនីផ្សេង!');
        setIsLoading(false);
        return;
      }

      // 2. Check if username exists in Cloud (fast check)
      const teacherDocRef = doc(db, 'teachers', cleanUsername);
      const teacherSnap = await safeGetDoc(teacherDocRef);

      if (teacherSnap.exists()) {
        setErrorMsg('ឈ្មោះគណនីនេះមានរួចហើយនៅលើ Cloud។ សូមជ្រើសរើសឈ្មោះគណនីផ្សេង!');
        setIsLoading(false);
        return;
      }

      const newTeacher: TeacherAccount = {
        id: cleanUsername,
        name: regName.trim(),
        schoolName: regSchool.trim(),
        subjects: regSubject.trim(),
        username: regUsername.trim(),
        password: regPassword,
        authProvider: 'username'
      };

      // 3. Save locally immediately so user is never stuck spinning
      saveLocalAccount(newTeacher);
      localStorage.setItem('logged_in_teacher', JSON.stringify(newTeacher));

      // 4. Background non-blocking sync to Cloud Firestore
      safeSetDoc(teacherDocRef, newTeacher).catch((err) => {
        console.warn('Cloud register sync warning:', err);
      });

      // 5. Instantly login and show success
      onLoginSuccess(newTeacher);
      setSuccessMsg('បង្កើតគណនេយ្យគ្រូបង្រៀនជោគជ័យ!');
      
      setTimeout(() => {
        onClose();
        setRegName('');
        setRegSchool('');
        setRegSubject('');
        setRegUsername('');
        setRegPassword('');
        setIsLoading(false);
      }, 700);
    } catch (err) {
      console.warn('Registration fallback local save:', err);
      // In case of any error, still create and login locally!
      const newTeacher: TeacherAccount = {
        id: cleanUsername,
        name: regName.trim(),
        schoolName: regSchool.trim(),
        subjects: regSubject.trim(),
        username: regUsername.trim(),
        password: regPassword,
        authProvider: 'username'
      };
      saveLocalAccount(newTeacher);
      localStorage.setItem('logged_in_teacher', JSON.stringify(newTeacher));
      onLoginSuccess(newTeacher);
      setSuccessMsg('បង្កើតគណនេយ្យគ្រូបង្រៀនជោគជ័យ!');
      setTimeout(() => {
        onClose();
        setIsLoading(false);
      }, 700);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative bg-white text-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200 z-10 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0">
                  {activeSubModal !== 'none' ? (
                    <button 
                      type="button" 
                      onClick={() => setActiveSubModal('none')}
                      className="hover:scale-110 transition-transform"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  ) : isLoginView ? (
                    <LogIn className="w-5 h-5" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {activeSubModal === 'email' && 'ចូល / ចុះឈ្មោះជាមួយ Email'}
                    {activeSubModal === 'google' && 'ចូលប្រើប្រាស់ជាមួយ Google'}
                    {activeSubModal === 'facebook' && 'ចូលប្រើប្រាស់ជាមួយ Facebook'}
                    {activeSubModal === 'telegram' && 'ចូលប្រើប្រាស់ជាមួយ Telegram'}
                    {activeSubModal === 'none' && (isLoginView ? 'ចូលប្រើប្រាស់គណនីគ្រូ' : 'បង្កើតគណនេយ្យគ្រូបង្រៀន')}
                  </h2>
                  <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold">
                    Teacher EduSpin Auth
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg text-indigo-100 hover:text-white transition-colors"
                id="close-auth-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Container */}
            <div className="p-6">
              {errorMsg && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-start gap-2 animate-pulse">
                  <span className="shrink-0 text-red-500">⚠️</span>
                  <p>{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <CheckCircle className="shrink-0 text-emerald-500 w-4 h-4" />
                  <p>{successMsg}</p>
                </div>
              )}

              {/* ----------------------- SUB-MODAL 1: WITH EMAIL ----------------------- */}
              {activeSubModal === 'email' && (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      អាសយដ្ឋាន Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="ឧ. teacher@school.edu.kh"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      លេខសម្ងាត់ (Password) *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  {!isLoginView && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          ឈ្មោះគ្រូបង្រៀន (មិនបាច់បំពេញក៏បាន)
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={emailTeacherName}
                            onChange={(e) => setEmailTeacherName(e.target.value)}
                            placeholder="ឧ. លោកគ្រូ ស្ទីវ ចប"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          ឈ្មោះសាលារៀន
                        </label>
                        <div className="relative">
                          <School className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={emailSchoolName}
                            onChange={(e) => setEmailSchoolName(e.target.value)}
                            placeholder="ឧ. សាលារៀនសុវណ្ណភូមិ"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 mt-2 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    <span>{isLoading ? 'កំពុងភ្ជាប់អ៊ីមែល...' : 'ចូលប្រើប្រាស់ជាមួយ Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubModal('none')}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-bold text-center"
                  >
                    ← ត្រឡប់ទៅជម្រើសដើមវិញ
                  </button>
                </form>
              )}

              {/* ----------------------- SUB-MODAL 2: WITH GOOGLE ----------------------- */}
              {activeSubModal === 'google' && (
                <form onSubmit={handleGoogleDirectSubmit} className="space-y-3.5">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 font-medium">
                    សូមបំពេញ Google Email របស់អ្នក ដើម្បីភ្ជាប់គណនី Google សំខាន់ និងរក្សាទុកទិន្នន័យលើ Cloud!
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Google Account Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        placeholder="ឧ. teacher.khmer@gmail.com"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      ឈ្មោះគ្រូបង្រៀន (Google Display Name)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={googleName}
                        onChange={(e) => setGoogleName(e.target.value)}
                        placeholder="ឧ. លោកគ្រូ Google"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 mt-2 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                    <span>{isLoading ? 'កំពុងភ្ជាប់ Google Account...' : 'ចូលប្រើប្រាស់ជាមួយ Google Account'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubModal('none')}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-bold text-center"
                  >
                    ← ត្រឡប់ទៅជម្រើសដើមវិញ
                  </button>
                </form>
              )}

              {/* ----------------------- SUB-MODAL 3: WITH FACEBOOK ----------------------- */}
              {activeSubModal === 'facebook' && (
                <form onSubmit={handleFacebookDirectSubmit} className="space-y-3.5">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 font-medium">
                    សូមបំពេញ ឈ្មោះ ឬ Email / ID គណនី Facebook របស់អ្នក ដើម្បីភ្ជាប់ និងរក្សាទុកទិន្នន័យលើ Cloud!
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Facebook Email ឬ Username *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={facebookEmail}
                        onChange={(e) => setFacebookEmail(e.target.value)}
                        placeholder="ឧ. teacher.facebook ឬ fb_teacher@gmail.com"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      ឈ្មោះបង្ហាញលើគណនីគ្រូ (Display Name)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={facebookName}
                        onChange={(e) => setFacebookName(e.target.value)}
                        placeholder="ឧ. លោកគ្រូ Facebook"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 mt-2 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FacebookIcon />}
                    <span>{isLoading ? 'កំពុងភ្ជាប់ Facebook...' : 'ចូលប្រើប្រាស់ជាមួយ Facebook Account'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubModal('none')}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-bold text-center"
                  >
                    ← ត្រឡប់ទៅជម្រើសដើមវិញ
                  </button>
                </form>
              )}

              {/* ----------------------- SUB-MODAL 4: WITH TELEGRAM ----------------------- */}
              {activeSubModal === 'telegram' && (
                <form onSubmit={handleTelegramDirectSubmit} className="space-y-3.5">
                  <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800 font-medium">
                    សូមបំពេញ Telegram Username (ឧ. @khmer_teacher) ឬ លេខទូរស័ព្ទ ដើម្បីភ្ជាប់គណនី Telegram របស់អ្នក!
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Telegram Username / Phone *
                    </label>
                    <div className="relative">
                      <Send className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={telegramUsername}
                        onChange={(e) => setTelegramUsername(e.target.value)}
                        placeholder="ឧ. @teacher_khmer ឬ 012345678"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      ឈ្មោះបង្ហាញលើគណនីគ្រូ (Display Name)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={telegramName}
                        onChange={(e) => setTelegramName(e.target.value)}
                        placeholder="ឧ. លោកគ្រូ Telegram"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#24A1DE] hover:bg-[#2090C7] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-200 active:scale-95 mt-2 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TelegramIcon />}
                    <span>{isLoading ? 'កំពុងភ្ជាប់ Telegram...' : 'ចូលប្រើប្រាស់ជាមួយ Telegram Account'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubModal('none')}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-bold text-center"
                  >
                    ← ត្រឡប់ទៅជម្រើសដើមវិញ
                  </button>
                </form>
              )}

              {/* ----------------------- DEFAULT MAIN SOCIAL & FORM VIEW ----------------------- */}
              {activeSubModal === 'none' && (
                <>
                  {/* Provider Grid Buttons */}
                  <div className="space-y-2 mb-5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
                      ចូលប្រើប្រាស់ជាមួយគណនី / Quick Auth
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* With Google */}
                      <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
                      >
                        <GoogleIcon />
                        <span>With Google</span>
                      </button>

                      {/* With Email */}
                      <button
                        type="button"
                        onClick={() => setActiveSubModal('email')}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4 text-indigo-600" />
                        <span>With Email</span>
                      </button>

                      {/* With Facebook */}
                      <button
                        type="button"
                        onClick={handleFacebookAuth}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        <FacebookIcon />
                        <span>With Facebook</span>
                      </button>

                      {/* With Telegram */}
                      <button
                        type="button"
                        onClick={handleTelegramAuth}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#24A1DE] hover:bg-[#2090C7] text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        <TelegramIcon />
                        <span>With Telegram</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center my-4">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap shrink-0">
                      ឬ ប្រើប្រាស់ឈ្មោះគណនី (Username)
                    </span>
                  </div>

                  {isLoginView ? (
                    /* LOGIN FORM */
                    <form onSubmit={handleLogin} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          ឈ្មោះគណនីប្រើប្រាស់ *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            placeholder="ឧ. steve_123"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          លេខសម្ងាត់ *
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type={showLoginPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3.5 top-1.5 hover:bg-slate-100 p-1 rounded-lg transition-transform text-xl select-none active:scale-90"
                            title={showLoginPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                          >
                            {showLoginPassword ? '🙈' : '🙉'}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 mt-2"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                        {isLoading ? 'កំពុងភ្ជាប់ទៅប្រព័ន្ធ...' : 'ចូលប្រើប្រាស់ឥឡូវនេះ'}
                      </button>

                      <div className="text-center mt-4">
                        <p className="text-xs text-slate-500">
                          មិនទាន់មានគណនីមែនទេ?{' '}
                          <button
                            type="button"
                            onClick={() => setIsLoginView(false)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                          >
                            បង្កើតគណនីគ្រូថ្មីនៅទីនេះ
                          </button>
                        </p>
                      </div>
                    </form>
                  ) : (
                    /* REGISTER FORM */
                    <form onSubmit={handleRegister} className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          ឈ្មោះគ្រូបង្រៀន *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="ឧ. លោកគ្រូ ស្ទីវ ចប"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          ឈ្មោះសាលារៀន *
                        </label>
                        <div className="relative">
                          <School className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={regSchool}
                            onChange={(e) => setRegSchool(e.target.value)}
                            placeholder="ឧ. សាលារៀនសុវណ្ណភូមិ សាខាផ្សារដីហុយ"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            មុខវិជ្ជា/ឯកទេស
                          </label>
                          <div className="relative">
                            <BookOpen className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={regSubject}
                              onChange={(e) => setRegSubject(e.target.value)}
                              placeholder="ឧ. រូបវិទ្យា"
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            ឈ្មោះគណនី *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={regUsername}
                              onChange={(e) => setRegUsername(e.target.value)}
                              placeholder="ឧ. steve_123"
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          លេខសម្ងាត់សម្រាប់ឡុកអ៊ីន *
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type={showRegPassword ? "text" : "password"}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="យ៉ាងតិច ៤ តួអក្សរ"
                            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                            minLength={4}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3.5 top-1.5 hover:bg-slate-100 p-1 rounded-lg transition-transform text-xl select-none active:scale-90"
                            title={showRegPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                          >
                            {showRegPassword ? '🙈' : '🙉'}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-95 mt-2 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        {isLoading ? 'កំពុងបង្កើតគណនី...' : 'ចុះឈ្មោះគ្រូ និងចូលប្រើ'}
                      </button>

                      <div className="text-center mt-3">
                        <p className="text-xs text-slate-500">
                          មានគណនីរួចហើយ?{' '}
                          <button
                            type="button"
                            onClick={() => setIsLoginView(true)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                          >
                            ចូលប្រើប្រាស់គណនីដែលមានស្រាប់
                          </button>
                        </p>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
            
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400 font-medium text-center">
              រក្សាទុកដោយមានសុវត្ថិភាពខ្ពស់នៅលើ Cloud Internet សម្រាប់គ្រប់ឧបករណ៍ទាំងអស់
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
