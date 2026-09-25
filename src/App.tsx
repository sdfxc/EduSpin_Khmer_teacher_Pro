/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, LayoutGrid, RotateCcw, User, LogIn, LogOut, Plus, Moon, Sun, Trash2, GraduationCap, Compass, Users as UsersIcon, UserCog, Check, Cloud, Loader2, Pencil, ChevronLeft, ChevronRight, GripVertical, Camera, Pin, PinOff, Maximize, Minimize, Volume2, VolumeX, Database, Keyboard, HelpCircle, Settings } from 'lucide-react';
import StudentPanel from './components/StudentPanel';
import QuizPanel from './components/QuizPanel';
import LessonModal from './components/LessonModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { SettingsMenuDrawer } from './components/SettingsMenuDrawer';
import { GlassLiquidOverlay } from './components/GlassLiquidCapsule';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { isSoundEnabled, setSoundEnabled, playChimeSound } from './lib/soundUtils';
import SpinningWheel from './components/SpinningWheel';
import GroupDivider from './components/GroupDivider';
import StopwatchPanel from './components/StopwatchPanel';
import StudentManager from './components/StudentManager';
import { Student, Question, QuizCard, ClassInfo, TeacherAccount, QuizRoom, QuizChapter, QuizSubject, isStudentInClass, DEFAULT_CLOUD_TEACHER } from './types';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, safeSetDoc, safeDeleteDoc, safeOnSnapshot, safeGetDoc, safeGetDocs, isQuotaExceeded } from './lib/firebase';
import StudentPlayView from './components/StudentPlayView';
import StudentLobby from './components/StudentLobby';
import ExamsPanel from './components/ExamsPanel';
import SovannaphumiLogo from './components/SovannaphumiLogo';
import { useConfirm } from './context/ConfirmContext.tsx';
import { ClassModal } from './components/ClassModal';
import SmartNotesApp from './components/smart-notes/SmartNotesApp';
import { BookOpen } from 'lucide-react';
import { addActivityPointsToStudent, setActivityScoreForStudent, addGroupWorkPointsToStudent, getCurrentDateScoreSlot } from './lib/scoreUtils';

// Globally patch localStorage.setItem to gracefully handle QuotaExceededError and auto-sanitize
function cleanupLocalStorageQuota() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key === 'khmer_teacher_classes' || key.startsWith('khmer_teacher_classes_')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              const sanitized = parsed.map((c: any) => ({
                id: String(c?.id || ''),
                name: String(c?.name || '').trim(),
                order: typeof c?.order === 'number' ? c.order : 0,
                isPinned: !!c?.isPinned
              })).filter(c => c.id && c.name);
              localStorage.setItem(key, JSON.stringify(sanitized));
            }
          } catch (err) {
            console.error(`Failed to sanitize key ${key}:`, err);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error during localStorage quota cleanup:', e);
  }
}

const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key, value) {
  try {
    originalSetItem.call(localStorage, key, value);
  } catch (error: any) {
    console.error(`[LocalStorage Overwrite] Error writing key "${key}":`, error);
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      cleanupLocalStorageQuota();
      try {
        originalSetItem.call(localStorage, key, value);
      } catch (retryError) {
        console.error(`[LocalStorage Overwrite] Retry failed for key "${key}":`, retryError);
      }
    }
  }
};

const EMOJIS = ["🥰", "😂", "😩", "🥳", "🥺", "😇", "😎", "🤩", "🤔", "🤗", "🤭", "🫠", "😤", "😮💨", "🫡", "😬", "🙄", "🤒", "😵💫", "😳", "🤪", "😜", "🤫", "🫣", "☹️", "😕"];

function getMigratedSubjects(loadedChapters: QuizChapter[]): { subjects: QuizSubject[], activeSubjectId: string } {
  const chaptersToUse = loadedChapters.length > 0 ? loadedChapters : [
    {
      id: `chapter-default-${Date.now()}`,
      name: 'ជំពូកទី១',
      rooms: [
        {
          id: `room-default-${Date.now()}`,
          name: 'មេរៀនទី១',
          cards: [],
          pickedIds: [],
          createdAt: Date.now()
        }
      ],
      createdAt: Date.now()
    }
  ];

  const defaultSubjects: QuizSubject[] = [
    {
      id: 'subj-physics',
      name: 'រូបវិទ្យា',
      chapters: chaptersToUse,
      createdAt: Date.now()
    }
  ];
  return { subjects: defaultSubjects, activeSubjectId: 'subj-physics' };
}

const SAMPLE_STUDENTS: Record<string, Student[]> = {};

const DEFAULT_CLASSES: ClassInfo[] = [];

const sortClasses = (classList: ClassInfo[]): ClassInfo[] => {
  const clean = (classList || [])
    .filter(c => c && c.name && c.name.trim() !== '')
    .map(c => ({
      id: String(c.id),
      name: String(c.name).trim(),
      order: typeof c.order === 'number' ? c.order : 999,
      isPinned: !!c.isPinned
    }));

  const uniqueIds = new Set<string>();
  const uniqueNames = new Set<string>();
  const filtered = clean.filter(c => {
    const trimmedName = c.name.trim();
    if (uniqueIds.has(c.id) || uniqueNames.has(trimmedName)) return false;
    uniqueIds.add(c.id);
    uniqueNames.add(trimmedName);
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const pinA = a.isPinned ? 1 : 0;
    const pinB = b.isPinned ? 1 : 0;
    if (pinA !== pinB) {
      return pinB - pinA; // Pinned items stay at the front
    }
    return a.order - b.order;
  });

  return sorted.map((c, idx) => ({
    id: c.id,
    name: c.name,
    order: idx,
    isPinned: c.isPinned
  }));
};

function getInitialActiveTeacherAndClass() {
  const savedTeacherObj = localStorage.getItem('logged_in_teacher');
  let teacherObj: TeacherAccount | null = null;
  let teacherId = '';
  if (savedTeacherObj) {
    try {
      teacherObj = JSON.parse(savedTeacherObj);
      teacherId = teacherObj?.id || '';
    } catch {}
  }
  const savedActiveId = (teacherId ? localStorage.getItem(`khmer_teacher_active_class_id_${teacherId}`) : null)
    || localStorage.getItem('khmer_teacher_active_class_id')
    || '';
  const savedClassesRaw = (teacherId ? localStorage.getItem(`khmer_teacher_classes_${teacherId}`) : null)
    || localStorage.getItem('khmer_teacher_classes');
  let effectiveClassId = savedActiveId;
  let parsedClasses: ClassInfo[] = [];
  if (savedClassesRaw) {
    try {
      const raw = JSON.parse(savedClassesRaw) as ClassInfo[];
      parsedClasses = (raw || [])
        .filter(c => c && c.name && c.name.trim() !== '')
        .map(c => ({
          id: String(c.id),
          name: String(c.name).trim(),
          order: typeof c.order === 'number' ? c.order : 0,
          isPinned: !!c.isPinned
        }));
      if (savedActiveId && parsedClasses.some(c => c.id === savedActiveId)) {
        effectiveClassId = savedActiveId;
      } else if (parsedClasses.length > 0) {
        effectiveClassId = parsedClasses[0].id;
      }
    } catch {}
  }
  if (!effectiveClassId && parsedClasses.length > 0) {
    effectiveClassId = parsedClasses[0].id;
  }
  return {
    teacher: teacherObj,
    activeClassId: effectiveClassId,
    classes: parsedClasses
  };
}

function shrinkBase64Image(base64: string, maxDim = 128, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (!base64 || !base64.startsWith('data:image/')) {
      resolve(base64);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(base64);
        return;
      }
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

async function healOversizedLocalStorageAvatars() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('students_class_')) continue;

      const value = localStorage.getItem(key);
      if (!value) continue;

      try {
        const students = JSON.parse(value);
        if (Array.isArray(students)) {
          let updated = false;
          const healedStudents = await Promise.all(
            students.map(async (student: any) => {
              if (student?.avatarUrl && student.avatarUrl.startsWith('data:image/') && student.avatarUrl.length > 25000) {
                try {
                  const shrunk = await shrinkBase64Image(student.avatarUrl, 128, 0.6);
                  if (shrunk.length < student.avatarUrl.length) {
                    student.avatarUrl = shrunk;
                    updated = true;
                  }
                } catch {}
              }
              return student;
            })
          );

          if (updated) {
            localStorage.setItem(key, JSON.stringify(healedStudents));
            console.log(`[Self-Healing] Successfully shrunk oversized avatars for key ${key}`);
          }
        }
      } catch (e) {
        console.error(`Failed to parse/heal key ${key}:`, e);
      }
    }
  } catch (e) {
    console.warn('Error during avatar storage healing:', e);
  }
}

export default function App() {
  const [studentMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'student';
  });

  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    healOversizedLocalStorageAvatars();
  }, []);

  if (studentMode) {
    return <StudentPlayView />;
  }

  const { confirmAction } = useConfirm();

  const [activeTab, setActiveTab] = useState<'wheel' | 'quiz' | 'groups' | 'stopwatch' | 'students' | 'student-lobby' | 'exams-room' | 'smart-notes'>('wheel');
  const [showWheelBulk, setShowWheelBulk] = useState(false);
  const [quizLeftView, setQuizLeftView] = useState<'wheel' | 'list'>('wheel');
  const [loadingCloudData, setLoadingCloudData] = useState(false);
  const [quotaExceeded, setQuotaExceededState] = useState<boolean>(() => isQuotaExceeded());
  const [quotaBannerDismissed, setQuotaBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setQuotaExceededState(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('khmer_teacher_dark_mode');
    return saved === 'true';
  });

  const initialClassState = getInitialActiveTeacherAndClass();
  const lastLoadedClassId = useRef<string>(initialClassState.activeClassId);

  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const init = getInitialActiveTeacherAndClass();
    if (init.classes.length > 0) {
      return sortClasses(init.classes);
    }
    return [];
  });

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    return getInitialActiveTeacherAndClass().activeClassId;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const { activeClassId: currentActiveId } = getInitialActiveTeacherAndClass();
    if (!currentActiveId) return [];
    try {
      const raw = localStorage.getItem(`students_class_${currentActiveId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: any) => s && s.id && !s.id.startsWith('sim-') && isStudentInClass(s, currentActiveId));
        }
      }
    } catch (e) {}
    return [];
  });
  
  const [cards, setCards] = useState<QuizCard[]>(() => {
    const { teacher, activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!teacher || !activeId) return [];
    try {
      // 1. Direct class card cache
      const saved = localStorage.getItem(`quiz_cards_class_${activeId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // 2. Room cards in subjects cache
      const savedSub = localStorage.getItem(`subjects_class_${activeId}`);
      const savedRoomId = localStorage.getItem(`active_room_id_${activeId}`);
      if (savedSub) {
        const parsedSub = JSON.parse(savedSub) as QuizSubject[];
        if (Array.isArray(parsedSub)) {
          for (const s of parsedSub) {
            for (const ch of (s.chapters || [])) {
              for (const rm of (ch.rooms || [])) {
                if (savedRoomId ? rm.id === savedRoomId : true) {
                  if (Array.isArray(rm.cards) && rm.cards.length > 0) {
                    return rm.cards;
                  }
                }
              }
            }
          }
        }
      }
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [pickedIds, setPickedIds] = useState<string[]>(() => {
    const { activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!activeId) return [];
    try {
      const saved = localStorage.getItem(`picked_students_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // State សម្រាប់សិស្សដែលគ្រូបានហៅផ្ទាល់ (Teacher manually called)
  const [manualCalledIds, setManualCalledIds] = useState<string[]>(() => {
    const { activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!activeId) return [];
    try {
      const saved = localStorage.getItem(`manual_called_students_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [subjects, setSubjects] = useState<QuizSubject[]>(() => {
    const { activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!activeId) return [];
    try {
      const saved = localStorage.getItem(`subjects_class_${activeId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(() => {
    const { activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!activeId) return null;
    try {
      return localStorage.getItem(`active_subject_id_${activeId}`);
    } catch {
      return null;
    }
  });

  const [chapters, setChapters] = useState<QuizChapter[]>(() => {
    const { activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!activeId) return [];
    try {
      const saved = localStorage.getItem(`chapters_class_${activeId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      const savedSub = localStorage.getItem(`subjects_class_${activeId}`);
      const savedSubId = localStorage.getItem(`active_subject_id_${activeId}`);
      if (savedSub) {
        const parsedSub = JSON.parse(savedSub) as QuizSubject[];
        const targetSub = parsedSub.find(s => s.id === savedSubId) || parsedSub[0];
        if (targetSub?.chapters) return targetSub.chapters;
      }
    } catch (e) {}
    return [];
  });

  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    const { activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!activeId) return null;
    try {
      return localStorage.getItem(`active_room_id_${activeId}`);
    } catch {
      return null;
    }
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeCardState, setActiveCardState] = useState<'answering' | 'revealed'>('answering');

  useEffect(() => {
    if (activeCardState !== 'answering') {
      setActiveCardState('answering');
    }
  }, [activeCardId]);

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [classModalState, setClassModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'rename';
    classId?: string;
    currentName?: string;
  }>({
    isOpen: false,
    mode: 'add',
    classId: undefined,
    currentName: ''
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const [teacher, setTeacher] = useState<TeacherAccount | null>(() => {
    const saved = localStorage.getItem('logged_in_teacher');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const lastSubjectsStrRef = useRef<string>('');
  const lastChaptersStrRef = useRef<string>('');
  const lastCardsStrRef = useRef<string>('');
  const activeSubjectIdRef = useRef<string | null>(activeSubjectId);
  const activeRoomIdRef = useRef<string | null>(activeRoomId);
  const lastPickedStrRef = useRef<string>('');
  const activeCardIdRef = useRef<string | null>(activeCardId);
  const activeCardStateRef = useRef<'answering' | 'revealed'>(activeCardState);

  const lastSyncedQuizRef = useRef<{
    activeCardId: string | null;
    activeRoomId: string | null;
    activeTab: string;
    activeCardState: 'answering' | 'revealed';
    activeCardIdOfCard: string | null;
    activeSubjectId: string | null;
    subjectsStr: string;
    pickedIdsStr: string;
  }>({
    activeCardId: null,
    activeRoomId: null,
    activeTab: 'wheel',
    activeCardState: 'answering',
    activeCardIdOfCard: null,
    activeSubjectId: null,
    subjectsStr: '',
    pickedIdsStr: '',
  });

  const lastWriteTimeRef = useRef<number>(0);

  useEffect(() => {
    activeSubjectIdRef.current = activeSubjectId;
  }, [activeSubjectId]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    activeCardIdRef.current = activeCardId;
  }, [activeCardId]);

  useEffect(() => {
    activeCardStateRef.current = activeCardState;
  }, [activeCardState]);

  // Dark mode Sync effect
  useEffect(() => {
    localStorage.setItem('khmer_teacher_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [draggedClassIndex, setDraggedClassIndex] = useState<number | null>(null);
  const [canDrag, setCanDrag] = useState<boolean>(false);

  const handleClassDragStart = (e: React.DragEvent, index: number) => {
    if (classes[index]?.isPinned) {
      e.preventDefault();
      return;
    }
    setDraggedClassIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleClassDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedClassIndex === null || draggedClassIndex === index) return;
    // Cannot reorder onto or from a pinned class
    if (classes[draggedClassIndex]?.isPinned || classes[index]?.isPinned) return;
    
    const updated = [...classes];
    const draggedItem = updated[draggedClassIndex];
    updated.splice(draggedClassIndex, 1);
    updated.splice(index, 0, draggedItem);
    
    const reordered = updated.map((c, idx) => ({ ...c, order: idx }));
    setDraggedClassIndex(index);
    setClasses(reordered);
  };

  const handleClassDragEnd = async () => {
    setDraggedClassIndex(null);
    setCanDrag(false);

    setClasses(prevClasses => {
      const finalizedClasses = prevClasses.map((c, idx) => ({ ...c, order: idx }));
      const currentTeacherId = teacher?.id || null;
      if (currentTeacherId) {
        localStorage.setItem(`khmer_teacher_classes_${currentTeacherId}`, JSON.stringify(finalizedClasses));
        (async () => {
          try {
            for (let i = 0; i < finalizedClasses.length; i++) {
              const cls = finalizedClasses[i];
              await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', cls.id), {
                order: i,
                isPinned: !!cls.isPinned
              }, { merge: true });
            }
          } catch (err) {
            console.error("Failed to save reordered classes to Firestore:", err);
          }
        })();
      } else {
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(finalizedClasses));
      }
      return finalizedClasses;
    });
  };

  const handleTogglePinClass = async (e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    const targetClass = classes.find(c => c.id === classId);
    if (!targetClass) return;

    const newPinnedState = !targetClass.isPinned;

    setClasses(prevClasses => {
      const updated = prevClasses.map(c => 
        c.id === classId ? { ...c, isPinned: newPinnedState } : c
      );
      const finalizedClasses = sortClasses(updated);
      const currentTeacherId = teacher?.id || null;
      if (currentTeacherId) {
        localStorage.setItem(`khmer_teacher_classes_${currentTeacherId}`, JSON.stringify(finalizedClasses));
        (async () => {
          try {
            await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', classId), {
              isPinned: newPinnedState
            }, { merge: true });
          } catch (err) {
            console.error("Failed to save pinned class state to Firestore:", err);
          }
        })();
      } else {
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(finalizedClasses));
      }
      return finalizedClasses;
    });
  };

  const handleMoveClass = async (e: React.MouseEvent, index: number, direction: 'left' | 'right') => {
    e.stopPropagation();
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;
    // Strictly prevent moving if either the moving class or target position is pinned
    if (classes[index]?.isPinned || classes[targetIndex]?.isPinned) return;

    setClasses(prevClasses => {
      const updated = [...prevClasses];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      const finalizedClasses = updated.map((c, idx) => ({ ...c, order: idx }));
      const currentTeacherId = teacher?.id || null;
      if (currentTeacherId) {
        localStorage.setItem(`khmer_teacher_classes_${currentTeacherId}`, JSON.stringify(finalizedClasses));
        (async () => {
          try {
            await Promise.all([
              safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', temp.id), {
                order: targetIndex
              }, { merge: true }),
              safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', updated[index].id), {
                order: index
              }, { merge: true })
            ]);
          } catch (err) {
            console.error("Failed to save reordered classes to Firestore:", err);
          }
        })();
      } else {
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(finalizedClasses));
      }
      return finalizedClasses;
    });
  };

  // Real-Time Cross-Device Synchronization for Teacher Profile and Classes
  useEffect(() => {
    if (!teacher) {
      setClasses([]);
      setActiveClassId('');
      setStudents([]);
      setSubjects([]);
      setChapters([]);
      setCards([]);
      setPickedIds([]);
      setLoadingCloudData(false);
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('quiz_cards_class_') || key.startsWith('picked_students_class_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
      return;
    }

    let unsubTeacher: (() => void) | null = null;
    let unsubClasses: (() => void) | null = null;

    try {
      setLoadingCloudData(true);

      // 1. Real-time Teacher Profile sync across devices
      const teacherDocRef = doc(db, 'teachers', teacher.id);
      unsubTeacher = safeOnSnapshot(teacherDocRef, (teacherSnap: any) => {
        if (teacherSnap && teacherSnap.exists && teacherSnap.exists()) {
          const cloudTeacher = teacherSnap.data() as TeacherAccount;
          if (cloudTeacher) {
            setTeacher(prev => {
              if (!prev) return cloudTeacher;
              if (
                prev.schoolName === cloudTeacher.schoolName && 
                prev.name === cloudTeacher.name && 
                prev.avatarUrl === cloudTeacher.avatarUrl && 
                prev.id === cloudTeacher.id
              ) {
                return prev;
              }
              const updated = { ...prev, ...cloudTeacher };
              localStorage.setItem('logged_in_teacher', JSON.stringify(updated));
              return updated;
            });
          }
        }
      }, (err: any) => {
        console.warn("Notice: Cloud teacher profile sync deferred while offline:", err);
      });

      // 2. Real-time Classes List sync across devices
      const classesCollRef = collection(db, 'teachers', teacher.id, 'classes');
      unsubClasses = safeOnSnapshot(classesCollRef, (classesSnap: any) => {
        if (!classesSnap) return;

        let fetchedClasses: ClassInfo[] = [];
        const seenIds = new Set<string>();

        classesSnap.forEach((docSnap: any) => {
          const clsData = docSnap.data();
          if (!clsData) return;
          const id = clsData.id || docSnap.id;
          if (clsData.name && String(clsData.name).trim() !== '') {
            if (!seenIds.has(id)) {
              seenIds.add(id);
              fetchedClasses.push({
                id: id,
                name: String(clsData.name).trim(),
                order: typeof clsData.order === 'number' ? clsData.order : 999,
                isPinned: !!clsData.isPinned
              });
            }
          }
        });

        const sortedCloudClasses = sortClasses(fetchedClasses);
        setClasses(prev => {
          const isSame = prev.length === sortedCloudClasses.length &&
            prev.every((c, i) => c.id === sortedCloudClasses[i].id && c.name === sortedCloudClasses[i].name && c.order === sortedCloudClasses[i].order && c.isPinned === sortedCloudClasses[i].isPinned);
          if (isSame) return prev;
          return sortedCloudClasses;
        });

        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedCloudClasses));

        if (sortedCloudClasses.length > 0) {
          setActiveClassId(curr => {
            if (curr && sortedCloudClasses.some(c => c.id === curr)) return curr;
            const lastActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacher.id}`) || sortedCloudClasses[0].id;
            const exists = sortedCloudClasses.some(c => c.id === lastActiveId);
            return exists && lastActiveId ? lastActiveId : sortedCloudClasses[0].id;
          });
        } else {
          setActiveClassId('');
          setStudents([]);
          setCards([]);
          setSubjects([]);
          setChapters([]);
          setPickedIds([]);
          setManualCalledIds([]);
        }
        setLoadingCloudData(false);
      }, (err: any) => {
        console.warn('Notice: Operating with local class data while cloud sync is reconnecting:', err);
        const localClassesStr = localStorage.getItem(`khmer_teacher_classes_${teacher.id}`);
        if (localClassesStr) {
          try {
            const parsedLocals = (JSON.parse(localClassesStr) as ClassInfo[])
              .filter(c => c && c.name && String(c.name).trim() !== '');
            setClasses(sortClasses(parsedLocals));
          } catch {}
        }
        setLoadingCloudData(false);
      });

    } catch (err) {
      console.warn('Notice: Failed setting up real-time class listeners:', err);
      setLoadingCloudData(false);
    }

    return () => {
      if (typeof unsubTeacher === 'function') unsubTeacher();
      if (typeof unsubClasses === 'function') unsubClasses();
    };
  }, [teacher?.id]);

  // Load students, cards, and picked status when activeClassId shifts
  useEffect(() => {
    if (!activeClassId) return;
    
    if (teacher) {
      localStorage.setItem(`khmer_teacher_active_class_id_${teacher.id}`, activeClassId);
    } else {
      localStorage.setItem('khmer_teacher_active_class_id', activeClassId);
    }

    if (!teacher) {
      if (activeClassId) {
        const localSubStr = localStorage.getItem(`subjects_class_${activeClassId}`);
        const localCardsStr = localStorage.getItem(`quiz_cards_class_${activeClassId}`);
        const localStudentsStr = localStorage.getItem(`students_class_${activeClassId}`);
        const localPickedStr = localStorage.getItem(`picked_students_class_${activeClassId}`);
        const localSubjectId = localStorage.getItem(`active_subject_id_${activeClassId}`);
        const localRoomId = localStorage.getItem(`active_room_id_${activeClassId}`);

        let loadedSub: QuizSubject[] = [];
        if (localSubStr) {
          try { loadedSub = JSON.parse(localSubStr); } catch {}
        }
        if (loadedSub.length === 0) {
          const mig = getMigratedSubjects([]);
          loadedSub = mig.subjects;
        }
        setSubjects(loadedSub);
        const subId = localSubjectId || loadedSub[0]?.id || null;
        setActiveSubjectId(subId);
        const activeSub = loadedSub.find(s => s.id === subId) || loadedSub[0];
        const loadedChaps = activeSub?.chapters || [];
        setChapters(loadedChaps);
        const rmId = localRoomId || loadedChaps[0]?.rooms[0]?.id || null;
        setActiveRoomId(rmId);

        // Without a teacher account, do not load or show demo quiz questions
        setCards([]);
        try {
          localStorage.removeItem(`quiz_cards_class_${activeClassId}`);
        } catch {}

        if (localStudentsStr) {
          try { setStudents(JSON.parse(localStudentsStr)); } catch {}
        }
        if (localPickedStr) {
          try { setPickedIds(JSON.parse(localPickedStr)); } catch {}
        }
        lastLoadedClassId.current = activeClassId;
      }
      return;
    }

    const loadClassDetails = async () => {
      try {
        setLoadingCloudData(true);
        
        // 1. Fetch class doc
        const classDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId);
        const classSnap = await safeGetDoc(classDocRef);
        
        let loadedSubjects: QuizSubject[] = [];
        let loadedActiveSubjectId: string | null = null;
        let loadedChapters: QuizChapter[] = [];
        let loadedActiveRoomId: string | null = null;

        if (classSnap.exists()) {
          const classData = classSnap.data();
          if (classData.subjects && classData.subjects.length > 0) {
            loadedSubjects = classData.subjects;
            loadedActiveSubjectId = classData.activeSubjectId || (loadedSubjects[0]?.id || null);
          } else {
            // First migrate chapters/rooms/legacy content
            let tempChapters: QuizChapter[] = [];
            if (classData.chapters && classData.chapters.length > 0) {
              tempChapters = classData.chapters;
            } else if (classData.rooms && classData.rooms.length > 0) {
              tempChapters = [{
                id: `chapter-default-${Date.now()}`,
                name: 'ជំពូកទី១',
                rooms: classData.rooms,
                createdAt: Date.now()
              }];
            } else {
              const legacyCards = classData.cards || [];
              const legacyPicked = classData.pickedIds || [];
              const defaultRoom: QuizRoom = {
                id: `room-default-${Date.now()}`,
                name: 'មេរៀនទី១',
                cards: legacyCards,
                pickedIds: legacyPicked,
                createdAt: Date.now()
              };
              tempChapters = [{
                id: `chapter-default-${Date.now()}`,
                name: 'ជំពូកទី១',
                rooms: [defaultRoom],
                createdAt: Date.now()
              }];
            }
            
            const migration = getMigratedSubjects(tempChapters);
            loadedSubjects = migration.subjects;
            loadedActiveSubjectId = migration.activeSubjectId;
            
            // Sync the migrated subjects back to cloud!
            await safeSetDoc(classDocRef, {
              subjects: loadedSubjects,
              activeSubjectId: loadedActiveSubjectId
            }, { merge: true });
          }
          loadedActiveRoomId = classData.activeRoomId || null;
        } else {
          // Empty or new class in cloud – check local storage fallback first to prevent overwriting local guest data
          const localSubjectsStr = localStorage.getItem(`subjects_class_${activeClassId}`);
          if (localSubjectsStr) {
            try {
              loadedSubjects = JSON.parse(localSubjectsStr);
              loadedActiveSubjectId = localStorage.getItem(`active_subject_id_${activeClassId}`) || (loadedSubjects[0]?.id || null);
              loadedActiveRoomId = localStorage.getItem(`active_room_id_${activeClassId}`);
            } catch (err) {
              console.error('Failed to parse local subjects fallback:', err);
              const migration = getMigratedSubjects([]);
              loadedSubjects = migration.subjects;
              loadedActiveSubjectId = migration.activeSubjectId;
            }
          } else {
            const migration = getMigratedSubjects([]);
            loadedSubjects = migration.subjects;
            loadedActiveSubjectId = migration.activeSubjectId;
          }
          
          const localClassObj = classes.find(c => c.id === activeClassId);
          const classNameToSave = localClassObj?.name || 'ថ្នាក់ថ្មី';
          
          await safeSetDoc(classDocRef, {
            id: activeClassId,
            name: classNameToSave,
            subjects: loadedSubjects,
            activeSubjectId: loadedActiveSubjectId,
            activeRoomId: loadedActiveRoomId,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        const activeSub = loadedSubjects.find(s => s.id === loadedActiveSubjectId) || loadedSubjects[0];
        loadedChapters = activeSub?.chapters || [];

        // Determine active roomId
        let activeRoom: QuizRoom | undefined;
        for (const ch of loadedChapters) {
          activeRoom = ch.rooms.find(r => r.id === loadedActiveRoomId);
          if (activeRoom) break;
        }
        if (!activeRoom && loadedChapters.length > 0) {
          activeRoom = loadedChapters[0].rooms[0];
          loadedActiveRoomId = activeRoom?.id || null;
        }

        setSubjects(loadedSubjects);
        setActiveSubjectId(loadedActiveSubjectId);
        setChapters(loadedChapters);
        setActiveRoomId(loadedActiveRoomId);

        // Resolve cards with class-specific local cache protection:
        let resolvedCards: QuizCard[] = activeRoom?.cards || [];
        if ((!resolvedCards || resolvedCards.length === 0) && classSnap.exists()) {
          const classData = classSnap.data();
          if (Array.isArray(classData.cards) && classData.cards.length > 0) {
            resolvedCards = classData.cards;
            if (activeRoom) activeRoom.cards = resolvedCards;
          }
        }
        const localCardsStr = localStorage.getItem(`quiz_cards_class_${activeClassId}`);
        if ((!resolvedCards || resolvedCards.length === 0) && localCardsStr) {
          try {
            const parsedLocals = JSON.parse(localCardsStr);
            if (Array.isArray(parsedLocals) && parsedLocals.length > 0) {
              resolvedCards = parsedLocals;
              if (activeRoom) {
                activeRoom.cards = resolvedCards;
              }
              // Removed redundant safeSetDoc here to avoid write spam during loading.
            }
          } catch {}
        }

        setCards(resolvedCards);
        setPickedIds(activeRoom?.pickedIds || []);
        lastLoadedClassId.current = activeClassId;

        // Immediately cache to localStorage so refresh and tab switches retain the exact cloud data
        localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(loadedSubjects));
        localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(loadedChapters));
        if (loadedActiveSubjectId) {
          localStorage.setItem(`active_subject_id_${activeClassId}`, loadedActiveSubjectId);
        }
        if (loadedActiveRoomId) {
          localStorage.setItem(`active_room_id_${activeClassId}`, loadedActiveRoomId);
        }
        localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(resolvedCards));
        localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(activeRoom?.pickedIds || []));

        if (classSnap.exists()) {
          const cData = classSnap.data();
          if (Array.isArray(cData.exams) && cData.exams.length > 0) {
            localStorage.setItem(`khmer_exams_${activeClassId}`, JSON.stringify(cData.exams));
          }
        }

        // 2. Fetch students
        const studentsCollRef = collection(db, 'teachers', teacher.id, 'classes', activeClassId, 'students');
        const studentsSnap = await safeGetDocs(studentsCollRef);
        
        const activeCls = classes.find(c => c.id === activeClassId);
        const activeClassName = activeCls?.name;

        let loadedStudents: Student[] = [];
        const foreignStudentsToDelete: string[] = [];

        studentsSnap.forEach(docSnap => {
          const data = docSnap.data() as Student;
          if (data && data.id && !data.id.startsWith('sim-')) {
            if (isStudentInClass(data, activeClassId, activeClassName)) {
              loadedStudents.push(data.classId ? data : { ...data, classId: activeClassId });
            } else {
              // Only delete if we are CERTAIN it belongs elsewhere, but let's avoid auto-delete during load too for now
              // safeDeleteDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', data.id)).catch(() => {});
            }
          }
        });

        // Merge locally saved students in case any were added before sync or offline
        // WE ONLY READ from local storage here to populate UI. 
        // WE DO NOT auto-write missing students back to cloud here to avoid write spam.
        const localStudentsStr = localStorage.getItem(`students_class_${activeClassId}`);
        if (localStudentsStr) {
          try {
            const parsedLocals = JSON.parse(localStudentsStr) as Student[];
            if (Array.isArray(parsedLocals)) {
              for (const std of parsedLocals) {
                if (std && std.id && !std.id.startsWith('sim-')) {
                  if (isStudentInClass(std, activeClassId, activeClassName)) {
                    if (!loadedStudents.some(s => s.id === std.id)) {
                      loadedStudents.push(std.classId ? std : { ...std, classId: activeClassId });
                    }
                  }
                }
              }
            }
          } catch (e) {}
        }
        
        setStudents(loadedStudents);
        if (activeClassId) {
          localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(loadedSubjects));
          localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(loadedChapters));
          if (loadedActiveSubjectId) {
            localStorage.setItem(`active_subject_id_${activeClassId}`, loadedActiveSubjectId);
          }
          if (loadedActiveRoomId) {
            localStorage.setItem(`active_room_id_${activeClassId}`, loadedActiveRoomId);
          }
          localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(loadedStudents));
        }
        lastLoadedClassId.current = activeClassId;
      } catch (err) {
        console.error('Failed to load class details from Firestore:', err);
      } finally {
        setLoadingCloudData(false);
      }
    };

    loadClassDetails();
  }, [activeClassId, teacher?.id]);

  // Real-time Student Synchronization across all devices (PC, Mac, iPhone, Android, iPad)
  useEffect(() => {
    const effectiveTeacherId = teacher?.id || DEFAULT_CLOUD_TEACHER.id;
    if (!activeClassId || !effectiveTeacherId) return;

    const studentsCollRef = collection(db, 'teachers', effectiveTeacherId, 'classes', activeClassId, 'students');
    const unsubscribe = safeOnSnapshot(studentsCollRef, (snapshot: any) => {
      const activeCls = classes.find(c => c.id === activeClassId);
      const activeClassName = activeCls?.name;

      if (snapshot.empty) {
        setStudents([]);
        return;
      }

      let loadedStudents: Student[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Student;
        if (data && data.id && !data.id.startsWith('sim-')) {
          if (isStudentInClass(data, activeClassId, activeClassName)) {
            loadedStudents.push(data.classId ? data : { ...data, classId: activeClassId });
          } else {
            safeDeleteDoc(doc(db, 'teachers', effectiveTeacherId, 'classes', activeClassId, 'students', data.id)).catch(() => {});
          }
        }
      });
      setStudents(loadedStudents);
      localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(loadedStudents));
    }, (err) => {
      console.error("Real-time snapshot error for students collection:", err);
    });

    return () => unsubscribe();
  }, [activeClassId, teacher?.id, classes]);

  // Real-time Class Document Synchronization (Subjects, Rooms, Quiz Cards, Picked IDs) across devices
  useEffect(() => {
    if (!activeClassId || !teacher?.id) return;

    const classDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId);
    const unsubscribe = safeOnSnapshot(classDocRef, (snap: any) => {
      if (!snap || !snap.exists()) return;
      const classData = snap.data();
      if (!classData) return;

      // 1. Subjects and Rooms
      if (Array.isArray(classData.subjects) && classData.subjects.length > 0) {
        const incomingSubjectsStr = JSON.stringify(classData.subjects);
        if (incomingSubjectsStr !== lastSubjectsStrRef.current) {
          lastSubjectsStrRef.current = incomingSubjectsStr;
          setSubjects(classData.subjects);
          localStorage.setItem(`subjects_class_${activeClassId}`, incomingSubjectsStr);

          // Update active subject and chapters
          const activeSubId = classData.activeSubjectId || activeSubjectIdRef.current || classData.subjects[0].id;
          if (activeSubId !== activeSubjectIdRef.current) {
            activeSubjectIdRef.current = activeSubId;
            setActiveSubjectId(activeSubId);
            localStorage.setItem(`active_subject_id_${activeClassId}`, activeSubId);
          }

          const currentSub = classData.subjects.find((s: QuizSubject) => s.id === activeSubId) || classData.subjects[0];
          const currChapters = currentSub?.chapters || [];
          const incomingChaptersStr = JSON.stringify(currChapters);
          if (incomingChaptersStr !== lastChaptersStrRef.current) {
            lastChaptersStrRef.current = incomingChaptersStr;
            setChapters(currChapters);
            localStorage.setItem(`chapters_class_${activeClassId}`, incomingChaptersStr);
          }

          // Find active room
          const targetRoomId = classData.activeRoomId || activeRoomIdRef.current;
          let targetRoom: QuizRoom | undefined;
          for (const ch of currChapters) {
            targetRoom = ch.rooms.find(r => r.id === targetRoomId);
            if (targetRoom) break;
          }
          if (!targetRoom && currChapters.length > 0 && currChapters[0].rooms.length > 0) {
            targetRoom = currChapters[0].rooms[0];
          }

          if (targetRoom) {
            if (targetRoom.id !== activeRoomIdRef.current) {
              activeRoomIdRef.current = targetRoom.id;
              setActiveRoomId(targetRoom.id);
              localStorage.setItem(`active_room_id_${activeClassId}`, targetRoom.id);
            }
            let roomCards = targetRoom.cards || [];
            if (roomCards.length === 0 && Array.isArray(classData.cards) && classData.cards.length > 0) {
              roomCards = classData.cards;
            }
            if (roomCards.length === 0) {
              const localCardsStr = localStorage.getItem(`quiz_cards_class_${activeClassId}`);
              if (localCardsStr) {
                try {
                  const parsedLocal = JSON.parse(localCardsStr);
                  if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                    roomCards = parsedLocal;
                  }
                } catch {}
              }
            }
            
            const incomingCardsStr = JSON.stringify(roomCards);
            if (incomingCardsStr !== lastCardsStrRef.current) {
              lastCardsStrRef.current = incomingCardsStr;
              setCards(roomCards);
              localStorage.setItem(`quiz_cards_class_${activeClassId}`, incomingCardsStr);
            }

            const roomPickedIds = targetRoom.pickedIds || classData.pickedIds || [];
            const incomingRoomPickedStr = JSON.stringify(roomPickedIds);
            if (incomingRoomPickedStr !== lastPickedStrRef.current) {
              lastPickedStrRef.current = incomingRoomPickedStr;
              setPickedIds(roomPickedIds);
              localStorage.setItem(`picked_students_class_${activeClassId}`, incomingRoomPickedStr);
            }
          }
        }
      }

      // 2. Picked IDs on the wheel/quiz (when someone calls a student or spins)
      if (Array.isArray(classData.pickedIds)) {
        const incomingPickedStr = JSON.stringify(classData.pickedIds);
        if (incomingPickedStr !== lastPickedStrRef.current) {
          lastPickedStrRef.current = incomingPickedStr;
          setPickedIds(classData.pickedIds);
          localStorage.setItem(`picked_students_class_${activeClassId}`, incomingPickedStr);
        }
      }

      // 3. Active card & card state (answering/revealed)
      if (classData.activeCardId !== undefined && classData.activeCardId !== activeCardIdRef.current) {
        activeCardIdRef.current = classData.activeCardId;
        setActiveCardId(classData.activeCardId);
      }
      if (classData.activeCardState && classData.activeCardState !== activeCardStateRef.current) {
        activeCardStateRef.current = classData.activeCardState;
        setActiveCardState(classData.activeCardState);
      }

      // Update ref to prevent infinite loop feedback
      lastSyncedQuizRef.current = {
        activeCardId: classData.activeCardId || null,
        activeRoomId: classData.activeRoomId || null,
        activeTab: classData.activeTab || 'wheel',
        activeCardState: classData.activeCardState || 'answering',
        activeCardIdOfCard: classData.activeCard?.id || null,
        activeSubjectId: classData.activeSubjectId || null,
        subjectsStr: JSON.stringify(classData.subjects || []),
        pickedIdsStr: JSON.stringify(classData.pickedIds || []),
      };
    }, (err) => {
      console.warn("Notice: Real-time class snapshot error:", err);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeClassId, teacher?.id]);

  // Sync active quiz presentation state to Class document in Firestore for student phones
  useEffect(() => {
    if (!activeClassId || !teacher?.id || isQuotaExceeded()) return;
    const currentTeacherId = teacher.id;

    const currentActiveCard = cards.find(c => c.id === activeCardId) || null;

    // If a card is selected but its details are not loaded in the `cards` array yet,
    // wait for the cards list to hydrate first instead of clearing activeCard on Firestore.
    if (activeCardId && !currentActiveCard) {
      return;
    }

    // Prevent loop: If what we want to sync is exactly what was last synced/received, skip the write!
    if (
      lastSyncedQuizRef.current.activeCardId === activeCardId &&
      lastSyncedQuizRef.current.activeRoomId === activeRoomId &&
      lastSyncedQuizRef.current.activeTab === activeTab &&
      lastSyncedQuizRef.current.activeCardState === activeCardState &&
      lastSyncedQuizRef.current.activeCardIdOfCard === (currentActiveCard?.id || null) &&
      lastSyncedQuizRef.current.activeSubjectId === activeSubjectId
    ) {
      return;
    }

    // Debounce: Wait 1.5 seconds of user stillness before syncing presentation state to Firestore
    const timer = setTimeout(async () => {
      if (isQuotaExceeded()) return;

      lastSyncedQuizRef.current = {
        ...lastSyncedQuizRef.current,
        activeCardId: activeCardId || null,
        activeRoomId: activeRoomId || null,
        activeTab: activeTab,
        activeCardState: activeCardState,
        activeCardIdOfCard: currentActiveCard?.id || null,
        activeSubjectId: activeSubjectId,
      };

      try {
        const classDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId);
        await safeSetDoc(classDocRef, {
          activeCardId: activeCardId,
          activeRoomId: activeRoomId,
          activeTab: activeTab,
          activeCardState: activeCardState,
          activeCard: currentActiveCard,
          activeSubjectId: activeSubjectId,
        }, { merge: true });
      } catch (err) {
        console.error("Failed to sync active presentation state to Firestore:", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeClassId, activeCardId, activeRoomId, activeTab, activeCardState, activeSubjectId, teacher?.id, cards]);

  // Save changes to localStorage on states update as fallback for offline use and fast initial load
  useEffect(() => {
    if (teacher) {
      localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(classes));
    } else {
      localStorage.setItem('khmer_teacher_classes', JSON.stringify(classes));
    }
  }, [classes, teacher]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId) {
      const activeCls = classes.find(c => c.id === activeClassId);
      const classOnlyStudents = students.filter(s => isStudentInClass(s, activeClassId, activeCls?.name));
      localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(classOnlyStudents));
    }
  }, [students, activeClassId, classes]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId) {
      localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(cards));
    }
  }, [cards, activeClassId]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId) {
      localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(pickedIds));
    }
  }, [pickedIds, activeClassId]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId && subjects.length > 0) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(subjects));
    }
  }, [subjects, activeClassId]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId && chapters.length > 0) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(chapters));
    }
  }, [chapters, activeClassId]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId && activeSubjectId) {
      localStorage.setItem(`active_subject_id_${activeClassId}`, activeSubjectId);
    }
  }, [activeSubjectId, activeClassId]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId) {
      if (activeRoomId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, activeRoomId);
      } else if (activeRoomId === null) {
        localStorage.removeItem(`active_room_id_${activeClassId}`);
      }
    }
  }, [activeRoomId, activeClassId]);

  // Helper to save class-level states to Firestore
  const saveClassMetadata = useCallback(async (updatedCards: QuizCard[], updatedPickedIds: string[]) => {
    if (!activeClassId) return;

    // Immediately cache cards and picked IDs to localStorage for this specific class
    localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(updatedCards));
    localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(updatedPickedIds));

    let currentSubjects = subjects;
    let currentSubId = activeSubjectId;
    if (!currentSubjects || currentSubjects.length === 0) {
      const mig = getMigratedSubjects([]);
      currentSubjects = mig.subjects;
      currentSubId = mig.activeSubjectId;
    }
    if (!currentSubId) {
      currentSubId = currentSubjects[0]?.id || 'subj-physics';
    }

    let currentSub = currentSubjects.find(s => s.id === currentSubId) || currentSubjects[0];
    let currentChapters = currentSub?.chapters || [];
    if (!currentChapters || currentChapters.length === 0) {
      currentChapters = [{
        id: `chapter-default-${Date.now()}`,
        name: 'ជំពូកទី១',
        rooms: [{
          id: `room-default-${Date.now()}`,
          name: 'មេរៀនទី១',
          cards: updatedCards,
          pickedIds: updatedPickedIds,
          createdAt: Date.now()
        }],
        createdAt: Date.now()
      }];
    }

    let currentRoomId = activeRoomId;
    let foundRoom = false;
    for (const ch of currentChapters) {
      if (ch.rooms.some(r => r.id === currentRoomId)) {
        foundRoom = true;
        break;
      }
    }
    if (!foundRoom || !currentRoomId) {
      if (currentChapters[0]?.rooms?.length > 0) {
        currentRoomId = currentChapters[0].rooms[0].id;
      } else {
        const newRoomId = `room-default-${Date.now()}`;
        currentChapters[0].rooms = [{
          id: newRoomId,
          name: 'មេរៀនទី១',
          cards: updatedCards,
          pickedIds: updatedPickedIds,
          createdAt: Date.now()
        }];
        currentRoomId = newRoomId;
      }
    }

    const updatedChapters = currentChapters.map(ch => {
      const updatedRooms = ch.rooms.map(r => {
        if (r.id === currentRoomId) {
          return {
            ...r,
            cards: updatedCards,
            pickedIds: updatedPickedIds
          };
        }
        return r;
      });
      return { ...ch, rooms: updatedRooms };
    });

    setChapters(updatedChapters);

    const updatedSubjects = currentSubjects.map(sub => {
      if (sub.id === currentSubId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });

    setSubjects(updatedSubjects);
    if (currentSubId !== activeSubjectId) setActiveSubjectId(currentSubId);
    if (currentRoomId !== activeRoomId) setActiveRoomId(currentRoomId);

    lastSubjectsStrRef.current = JSON.stringify(updatedSubjects);
    lastPickedStrRef.current = JSON.stringify(updatedPickedIds);
    activeRoomIdRef.current = currentRoomId;
    activeSubjectIdRef.current = currentSubId;

    localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
    localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    localStorage.setItem(`active_subject_id_${activeClassId}`, currentSubId);
    localStorage.setItem(`active_room_id_${activeClassId}`, currentRoomId);

    // Redundant cloud write removed - syncClassInfo effect handles this throttled.
  }, [teacher, activeClassId, activeRoomId, chapters, subjects, activeSubjectId]);

  // Helper to save student score updates to Firestore
  const saveStudentScore = useCallback(async (studentId: string, newScore: number) => {
    const currentTeacherId = teacher?.id || DEFAULT_CLOUD_TEACHER.id;
    if (activeClassId) {
      try {
        await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId), {
          score: newScore
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update student score on cloud:', err);
      }
    }
  }, [teacher, activeClassId]);

  // Helper to save pickedIds updates to Firestore immediately when wheel or panel changes it
  const handleSetPickedIds = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setPickedIds(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      
      // Dirty check to avoid redundant Firestore writes
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      
      const currentTeacherId = teacher?.id || DEFAULT_CLOUD_TEACHER.id;
      if (activeClassId && activeRoomId && activeSubjectId) {
        const updatedChapters = chapters.map(ch => {
          const updatedRooms = ch.rooms.map(r => {
            if (r.id === activeRoomId) {
              return {
                ...r,
                pickedIds: next
              };
            }
            return r;
          });
          return { ...ch, rooms: updatedRooms };
        });

        const updatedSubjects = subjects.map(sub => {
          if (sub.id === activeSubjectId) {
            return {
              ...sub,
              chapters: updatedChapters
            };
          }
          return sub;
        });

        setSubjects(updatedSubjects);
      }
      return next;
    });
  }, [teacher, activeClassId, activeRoomId, activeSubjectId, chapters, subjects]);

  // Helper to award date-based activity points (5 points) into monthlyScores and total score
  const awardStudentActivityPoints = useCallback((studentId: string, points: number = 5) => {
    let targetStudent: Student | null = null;
    const currentTeacherId = teacher?.id || DEFAULT_CLOUD_TEACHER.id;

    setStudents(prev => {
      const student = prev.find(s => s.id === studentId);
      if (!student) return prev;

      const { updatedStudent } = addActivityPointsToStudent(student, points);
      targetStudent = updatedStudent;

      const updatedList = prev.map(s => s.id === studentId ? updatedStudent : s);
      if (activeClassId) {
        localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(updatedList));
      }
      return updatedList;
    });

    if (targetStudent && activeClassId) {
      safeSetDoc(
        doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId),
        targetStudent,
        { merge: true }
      ).catch(err => console.error("Cloud score sync error:", err));
    }
  }, [activeClassId, teacher]);

  // Helper to set exact activity score directly for a student
  const handleSetExactActivityScore = useCallback((studentId: string, exactScore: number) => {
    let targetStudent: Student | null = null;
    const currentTeacherId = teacher?.id || DEFAULT_CLOUD_TEACHER.id;

    setStudents(prev => {
      const student = prev.find(s => s.id === studentId);
      if (!student) return prev;

      const { updatedStudent } = setActivityScoreForStudent(student, exactScore);
      targetStudent = updatedStudent;

      const updatedList = prev.map(s => s.id === studentId ? updatedStudent : s);
      if (activeClassId) {
        localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(updatedList));
      }
      return updatedList;
    });

    if (targetStudent && activeClassId) {
      safeSetDoc(
        doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId),
        targetStudent,
        { merge: true }
      ).catch(err => console.error("Cloud score sync error:", err));
    }
  }, [activeClassId, teacher]);

  // Helper to award group work points directly to students (adds to monthlyScores.groupWork)
  const awardStudentGroupWorkPoints = useCallback((studentIds: string[], points: number) => {
    const currentTeacherId = teacher?.id || DEFAULT_CLOUD_TEACHER.id;
    const updatedStudentsList: Student[] = [];

    setStudents(prev => {
      const updatedList = prev.map(s => {
        if (studentIds.includes(s.id)) {
          const { updatedStudent } = addGroupWorkPointsToStudent(s, points);
          updatedStudentsList.push(updatedStudent);
          return updatedStudent;
        }
        return s;
      });

      if (activeClassId) {
        localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(updatedList));
      }
      return updatedList;
    });

    if (activeClassId && updatedStudentsList.length > 0) {
      updatedStudentsList.forEach(st => {
        safeSetDoc(
          doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', st.id),
          st,
          { merge: true }
        ).catch(err => console.error("Cloud group score sync error:", err));
      });
    }
  }, [activeClassId, teacher]);

  // Handler for wheel selection: ONLY selects the student (points are only awarded upon answering questions correctly)
  const handleWheelPickStudent = useCallback((chosenStudent: Student) => {
    setSelectedStudentId(chosenStudent.id);
  }, []);

  // Helper to toggle manual called status by teacher ("គ្រូហៅផ្ទាល់")
  const handleToggleManualCall = useCallback((studentId: string) => {
    setManualCalledIds(prev => {
      const isCurrentlyManual = prev.includes(studentId);
      const next = isCurrentlyManual
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId];
      if (activeClassId) {
        localStorage.setItem(`manual_called_students_class_${activeClassId}`, JSON.stringify(next));
      }
      return next;
    });
  }, [activeClassId]);

  // Fullscreen toggle with fallback
  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        showToast('បានបើកអេក្រង់ពេញ (Fullscreen)');
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
          showToast('បានចាកចេញពីអេក្រង់ពេញ');
        }
      }
    } catch {}
  }, [showToast]);

  // Sound Mute toggle
  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playChimeSound();
      showToast('បានបើកសំឡេង 🔔');
    } else {
      showToast('បានបិទសំឡេង 🔕');
    }
  }, [soundOn, showToast]);

  // Listen to browser fullscreen change event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        (activeEl as HTMLElement).isContentEditable
      );
      if (isInput) return;

      if (e.code === 'Space') {
        if (activeTab === 'wheel') {
          e.preventDefault();
          const spinBtn = document.querySelector('button[title*="បង្វិល"]') as HTMLButtonElement | null;
          if (spinBtn) {
            spinBtn.click();
          }
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleSound();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && activeTab === 'wheel') {
          e.preventDefault();
          handleSetPickedIds([]);
          setManualCalledIds([]);
          if (activeClassId) {
            localStorage.removeItem(`manual_called_students_class_${activeClassId}`);
          }
          showToast('បានសម្អាតការហៅឈ្មោះឡើងវិញ!');
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, toggleFullscreen, toggleSound, showToast, activeClassId, handleSetPickedIds]);

  // Full 100% Comprehensive Data Restore handler
  const handleRestoreFullData = useCallback(async (backup: any) => {
    if (!backup || typeof backup !== 'object') return;
    
    // 1. Restore storageDump into localStorage first if present
    if (backup.storageDump && typeof backup.storageDump === 'object') {
      try {
        for (const [k, v] of Object.entries(backup.storageDump)) {
          if (typeof v === 'string') {
            localStorage.setItem(k, v);
          } else {
            localStorage.setItem(k, JSON.stringify(v));
          }
        }
      } catch (e) {
        console.error('Storage dump restore error:', e);
      }
    }

    const currentTeacherId = teacher?.id || backup.teacher?.id;

    // 2. Restore Classes
    if (Array.isArray(backup.classes) && backup.classes.length > 0) {
      const restoredClasses = sortClasses(backup.classes);
      setClasses(restoredClasses);
      if (currentTeacherId) {
        localStorage.setItem(`khmer_teacher_classes_${currentTeacherId}`, JSON.stringify(restoredClasses));
      }
      localStorage.setItem('khmer_teacher_classes', JSON.stringify(restoredClasses));
      
      if (currentTeacherId) {
        // Sync to cloud
        for (const cls of restoredClasses) {
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', cls.id), {
            id: cls.id,
            name: cls.name,
            order: cls.order,
            isPinned: !!cls.isPinned,
            updatedAt: Date.now()
          }, { merge: true }).catch(() => {});
        }
      }
    }

    // 3. Restore Students
    if (Array.isArray(backup.students) && backup.students.length > 0) {
      setStudents(backup.students);
      if (currentTeacherId) {
        for (const std of backup.students) {
          const targetClassId = std.classId || backup.activeClassId || (backup.classes?.[0]?.id) || 'default';
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', targetClassId, 'students', std.id), std, { merge: true }).catch(() => {});
        }
      }
    }

    // 4. Restore Subjects & Chapters & Cards
    if (Array.isArray(backup.subjects)) {
      setSubjects(backup.subjects);
    }
    if (Array.isArray(backup.chapters)) {
      setChapters(backup.chapters);
    }
    if (Array.isArray(backup.cards)) {
      setCards(backup.cards);
    }

    // 5. Restore Active Class Target
    const targetClassId = backup.activeClassId || (backup.classes && backup.classes[0]?.id) || activeClassId;
    if (targetClassId) {
      setActiveClassId(targetClassId);
      if (currentTeacherId) {
        localStorage.setItem(`khmer_teacher_active_class_id_${currentTeacherId}`, targetClassId);
      }
      localStorage.setItem('khmer_teacher_active_class_id', targetClassId);
    }

    showToast('🎉 បានស្ដារទិន្នន័យទាំងអស់ត្រឡប់មកវិញ ១០០%!');
  }, [teacher, activeClassId, showToast]);

  const handleSelectRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
    let selectedRoom: QuizRoom | undefined;
    for (const ch of chapters) {
      selectedRoom = ch.rooms.find(r => r.id === roomId);
      if (selectedRoom) break;
    }

    if (selectedRoom) {
      const roomCards = selectedRoom.cards || [];
      const roomPicked = selectedRoom.pickedIds || [];
      setCards(roomCards);
      setPickedIds(roomPicked);
      if (activeClassId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, roomId);
        localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(roomCards));
        localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(roomPicked));
      }
      if (teacher && activeClassId) {
        safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
          activeRoomId: roomId
        }, { merge: true }).catch(err => console.error('Failed to sync activeRoomId:', err));
      }
    }
  }, [chapters, teacher, activeClassId]);

  const handleCreateRoom = useCallback((chapterId: string, roomName: string) => {
    const newRoom: QuizRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      cards: [],
      pickedIds: [],
      createdAt: Date.now()
    };
    
    const updatedChapters = chapters.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          rooms: [...ch.rooms, newRoom]
        };
      }
      return ch;
    });

    setChapters(updatedChapters);
    setActiveRoomId(newRoom.id);
    setCards([]);
    setPickedIds([]);

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      localStorage.setItem(`active_room_id_${activeClassId}`, newRoom.id);
    }

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters,
        activeRoomId: newRoom.id
      }, { merge: true }).catch(err => console.error('Failed to save new room to cloud:', err));
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

  const handleDeleteRoom = useCallback((roomId: string) => {
    const totalRooms = chapters.reduce((total, ch) => total + ch.rooms.length, 0);
    if (totalRooms <= 1) {
      confirmAction({
        title: 'មិនអាចលុបបានទេ',
        message: 'មិនអាចលុបបន្ទប់ទាំងអស់បានទេ! ត្រូវតែមានយ៉ាងហោចណាស់បន្ទប់មួយនៅក្នុងជំពូកណាមួយ។',
        confirmText: 'យល់ព្រម',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    let roomName = 'បន្ទប់នេះ';
    for (const ch of chapters) {
      const r = ch.rooms.find(rm => rm.id === roomId);
      if (r) { roomName = r.name; break; }
    }

    confirmAction({
      title: 'លុបបន្ទប់ក្ដារសំណួរ',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបបន្ទប់ «${roomName}» នេះមែនទេ?​​ រាល់សំណួរនៅក្នុងបន្ទប់នេះនឹងត្រូវបាត់បង់ទាំងអស់។`,
      confirmText: 'បាទ/ចាស លុបបន្ទប់',
      variant: 'danger',
      onConfirm: () => {
        const updatedChapters = chapters.map(ch => {
          return {
            ...ch,
            rooms: ch.rooms.filter(r => r.id !== roomId)
          };
        });

        let nextActiveId = activeRoomId;
        if (activeRoomId === roomId) {
          let foundRoom = false;
          for (const ch of updatedChapters) {
            if (ch.rooms.length > 0) {
              nextActiveId = ch.rooms[0].id;
              setCards(ch.rooms[0].cards || []);
              setPickedIds(ch.rooms[0].pickedIds || []);
              foundRoom = true;
              break;
            }
          }
          if (!foundRoom) {
            nextActiveId = null;
            setCards([]);
            setPickedIds([]);
          }
        }

        setChapters(updatedChapters);
        setActiveRoomId(nextActiveId);

        const updatedSubjects = subjects.map(sub => {
          if (sub.id === activeSubjectId) {
            return {
              ...sub,
              chapters: updatedChapters
            };
          }
          return sub;
        });
        setSubjects(updatedSubjects);

        if (activeClassId) {
          localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
          localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
          if (nextActiveId) {
            localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveId);
          } else {
            localStorage.removeItem(`active_room_id_${activeClassId}`);
          }
        }

        const currentTeacherId = teacher?.id || 'local';
        if (activeClassId) {
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
            subjects: updatedSubjects,
            chapters: updatedChapters,
            activeRoomId: nextActiveId
          }, { merge: true }).catch(err => console.error('Failed to sync room deletion to cloud:', err));
        }
      }
    });
  }, [chapters, subjects, activeSubjectId, activeRoomId, teacher, activeClassId, confirmAction]);

  const handleRenameRoom = useCallback((roomId: string, newName: string) => {
    const updatedChapters = chapters.map(ch => {
      const updatedRooms = ch.rooms.map(r => {
        if (r.id === roomId) {
          return { ...r, name: newName };
        }
        return r;
      });
      return { ...ch, rooms: updatedRooms };
    });

    setChapters(updatedChapters);

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to rename room in cloud:', err));
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

  const handleCreateChapter = useCallback((chapterName: string) => {
    const newChapter: QuizChapter = {
      id: `chapter-${Date.now()}`,
      name: chapterName,
      rooms: [],
      createdAt: Date.now()
    };
    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to create chapter in cloud:', err));
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

  const handleRenameChapter = useCallback((chapterId: string, newName: string) => {
    const updatedChapters = chapters.map(ch => {
      if (ch.id === chapterId) {
        return { ...ch, name: newName };
      }
      return ch;
    });
    setChapters(updatedChapters);

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to rename chapter in cloud:', err));
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

  const handleDeleteChapter = useCallback((chapterId: string) => {
    if (chapters.length <= 1) {
      confirmAction({
        title: 'មិនអាចលុបបានទេ',
        message: 'មិនអាចលុបជំពូកទាំងអស់បានទេ! ត្រូវតែមានយ៉ាងហោចណាស់ជំពូកមួយ។',
        confirmText: 'យល់ព្រម',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    const targetChapter = chapters.find(ch => ch.id === chapterId);
    const chapterName = targetChapter ? targetChapter.name : 'ជំពូកនេះ';

    confirmAction({
      title: 'លុបជំពូក',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបជំពូក «${chapterName}» នេះមែនទេ? រាល់បន្ទប់ និងសំណួរទាំងអស់នៅក្នុងជំពូកនេះនឹងត្រូវបាត់បង់ទាំងស្រុងពីប្រព័ន្ធ។`,
      confirmText: 'បាទ/ចាស លុបជំពូក',
      variant: 'danger',
      onConfirm: () => {
        const updatedChapters = chapters.filter(ch => ch.id !== chapterId);
        setChapters(updatedChapters);

        // If active room was in deleted chapter, reset active room id
        let isDeletedActive = false;
        if (targetChapter && activeRoomId) {
          isDeletedActive = targetChapter.rooms.some(r => r.id === activeRoomId);
        }

        let nextActiveRoomId = activeRoomId;
        if (isDeletedActive) {
          let foundRoom = false;
          for (const ch of updatedChapters) {
            if (ch.rooms.length > 0) {
              nextActiveRoomId = ch.rooms[0].id;
              setCards(ch.rooms[0].cards || []);
              setPickedIds(ch.rooms[0].pickedIds || []);
              foundRoom = true;
              break;
            }
          }
          if (!foundRoom) {
            nextActiveRoomId = null;
            setCards([]);
            setPickedIds([]);
          }
        }

        setActiveRoomId(nextActiveRoomId);

        const updatedSubjects = subjects.map(sub => {
          if (sub.id === activeSubjectId) {
            return {
              ...sub,
              chapters: updatedChapters
            };
          }
          return sub;
        });
        setSubjects(updatedSubjects);

        if (activeClassId) {
          localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
          localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
          if (nextActiveRoomId) {
            localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveRoomId);
          } else {
            localStorage.removeItem(`active_room_id_${activeClassId}`);
          }
        }

        const currentTeacherId = teacher?.id || 'local';
        if (activeClassId) {
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
            subjects: updatedSubjects,
            chapters: updatedChapters,
            activeRoomId: nextActiveRoomId
          }, { merge: true }).catch(err => console.error('Failed to delete chapter in cloud:', err));
        }
      }
    });
  }, [chapters, subjects, activeSubjectId, activeRoomId, teacher, activeClassId, confirmAction]);

  const handleSelectSubject = useCallback((subjectId: string) => {
    setActiveSubjectId(subjectId);
    if (activeClassId) {
      localStorage.setItem(`active_subject_id_${activeClassId}`, subjectId);
    }
    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        activeSubjectId: subjectId
      }, { merge: true }).catch(err => console.error('Failed to sync activeSubjectId:', err));
    }

    const sub = subjects.find(s => s.id === subjectId);
    if (sub) {
      setChapters(sub.chapters);
      if (sub.chapters.length > 0 && sub.chapters[0].rooms.length > 0) {
        const firstRoom = sub.chapters[0].rooms[0];
        setActiveRoomId(firstRoom.id);
        const firstCards = firstRoom.cards || [];
        const firstPicked = firstRoom.pickedIds || [];
        setCards(firstCards);
        setPickedIds(firstPicked);
        if (activeClassId) {
          localStorage.setItem(`active_room_id_${activeClassId}`, firstRoom.id);
          localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(firstCards));
          localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(firstPicked));
        }
        if (activeClassId) {
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
            activeRoomId: firstRoom.id
          }, { merge: true }).catch(err => console.error('Failed to sync activeRoomId:', err));
        }
      } else {
        setActiveRoomId(null);
        setCards([]);
        setPickedIds([]);
        if (activeClassId) {
          localStorage.removeItem(`active_room_id_${activeClassId}`);
          localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify([]));
          localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify([]));
        }
        if (activeClassId) {
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
            activeRoomId: null
          }, { merge: true }).catch(err => console.error('Failed to sync activeRoomId:', err));
        }
      }
    }
  }, [subjects, teacher, activeClassId]);

  const handleCreateSubject = useCallback((subjectName: string) => {
    const newSubject: QuizSubject = {
      id: `subject-${Date.now()}`,
      name: subjectName,
      chapters: [
        {
          id: `chapter-subj-${Date.now()}`,
          name: 'ជំពូកទី១',
          rooms: [
            {
              id: `room-subj-${Date.now()}`,
              name: 'មេរៀនទី១',
              cards: [],
              pickedIds: [],
              createdAt: Date.now()
            }
          ],
          createdAt: Date.now()
        }
      ],
      createdAt: Date.now()
    };
    const updatedSubjects = [...subjects, newSubject];
    setSubjects(updatedSubjects);

    setActiveSubjectId(newSubject.id);
    setChapters(newSubject.chapters);
    const defaultRoom = newSubject.chapters[0].rooms[0];
    setActiveRoomId(defaultRoom.id);
    setCards([]);
    setPickedIds([]);

    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`active_subject_id_${activeClassId}`, newSubject.id);
      localStorage.setItem(`active_room_id_${activeClassId}`, defaultRoom.id);
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(newSubject.chapters));
    }

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        activeSubjectId: newSubject.id,
        activeRoomId: defaultRoom.id,
        chapters: newSubject.chapters
      }, { merge: true }).catch(err => console.error('Failed to create subject in cloud:', err));
    }
  }, [subjects, teacher, activeClassId]);

  const handleRenameSubject = useCallback((subjectId: string, newName: string) => {
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, name: newName };
      }
      return s;
    });
    setSubjects(updatedSubjects);

    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
    }

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects
      }, { merge: true }).catch(err => console.error('Failed to rename subject in cloud:', err));
    }
  }, [subjects, teacher, activeClassId]);

  const handleDeleteSubject = useCallback((subjectId: string) => {
    const targetSub = subjects.find(s => s.id === subjectId);
    const subName = targetSub ? targetSub.name : 'មុខវិជ្ជានេះ';
    
    confirmAction({
      title: 'លុបមុខវិជ្ជា',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបមុខវិជ្ជា «${subName}» នេះមែនទេ? ជំពូក មេរៀន និងកាតសំណួរទាំងអស់ក្នុងមុខវិជ្ជានេះនឹងត្រូវបាត់បង់។`,
      confirmText: 'បាទ/ចាស លុបមុខវិជ្ជា',
      variant: 'danger',
      onConfirm: () => {
        let updatedSubjects = subjects.filter(s => s.id !== subjectId);

        // If all subjects deleted, reset with a fresh default subject
        if (updatedSubjects.length === 0) {
          const freshSubject: QuizSubject = {
            id: `subj-physics-${Date.now()}`,
            name: 'រូបវិទ្យា',
            chapters: [
              {
                id: `chapter-${Date.now()}`,
                name: 'ជំពូកទី១',
                rooms: [
                  {
                    id: `room-${Date.now()}`,
                    name: 'មេរៀនទី១',
                    cards: [],
                    pickedIds: [],
                    createdAt: Date.now()
                  }
                ],
                createdAt: Date.now()
              }
            ],
            createdAt: Date.now()
          };
          updatedSubjects = [freshSubject];
        }

        setSubjects(updatedSubjects);

        let nextSubjectId = activeSubjectId;
        let nextChapters = chapters;
        let nextActiveRoomId = activeRoomId;

        if (activeSubjectId === subjectId || !updatedSubjects.some(s => s.id === activeSubjectId)) {
          const fallbackSubject = updatedSubjects[0];
          nextSubjectId = fallbackSubject.id;
          nextChapters = fallbackSubject.chapters;
          
          const activeRoom = nextChapters.length > 0 && nextChapters[0].rooms.length > 0 ? nextChapters[0].rooms[0] : null;
          nextActiveRoomId = activeRoom ? activeRoom.id : null;
          setChapters(nextChapters);
          setActiveRoomId(nextActiveRoomId);
          setCards(activeRoom ? activeRoom.cards || [] : []);
          setPickedIds(activeRoom ? activeRoom.pickedIds || [] : []);
        }

        setActiveSubjectId(nextSubjectId);

        if (activeClassId) {
          localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
          if (nextSubjectId) {
            localStorage.setItem(`active_subject_id_${activeClassId}`, nextSubjectId);
          }
          if (nextActiveRoomId) {
            localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveRoomId);
          }
          localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(nextChapters));
        }

        const currentTeacherId = teacher?.id || 'local';
        if (activeClassId) {
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
            subjects: updatedSubjects,
            activeSubjectId: nextSubjectId,
            activeRoomId: nextActiveRoomId,
            chapters: nextChapters
          }, { merge: true }).catch(err => console.error('Failed to delete subject in cloud:', err));
        }
      }
    });
  }, [subjects, activeSubjectId, chapters, activeRoomId, teacher, activeClassId, confirmAction]);

  // Handler for switching class
  const handleSwitchClass = (classId: string) => {
    if (classId === activeClassId) return;

    // Save CURRENT class data to its own key BEFORE switching!
    if (activeClassId) {
      const currentCls = classes.find(c => c.id === activeClassId);
      const validCurrentStudents = students.filter(s => isStudentInClass(s, activeClassId, currentCls?.name));
      localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(validCurrentStudents));
      localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(pickedIds));
      localStorage.setItem(`manual_called_students_class_${activeClassId}`, JSON.stringify(manualCalledIds));
      localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(cards));

      let updatedChapters = chapters;
      if (activeRoomId && chapters.length > 0) {
        updatedChapters = chapters.map(ch => ({
          ...ch,
          rooms: ch.rooms.map(r => r.id === activeRoomId ? { ...r, cards: cards, pickedIds: pickedIds } : r)
        }));
      }
      let updatedSubjects = subjects;
      if (activeSubjectId && updatedSubjects.length > 0) {
        updatedSubjects = updatedSubjects.map(sub => sub.id === activeSubjectId ? { ...sub, chapters: updatedChapters } : sub);
      }

      if (updatedSubjects.length > 0) {
        localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      }
      if (updatedChapters.length > 0) {
        localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      }
      if (activeSubjectId) {
        localStorage.setItem(`active_subject_id_${activeClassId}`, activeSubjectId);
      }
      if (activeRoomId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, activeRoomId);
      }
    }

    lastLoadedClassId.current = classId;
    setActiveClassId(classId);
    setSelectedStudentId(null);
    setActiveCardId(null);
    setActiveCardState('answering');

    // Immediately load target class's cached data from localStorage
    const targetCls = classes.find(c => c.id === classId);
    const cachedStudentsStr = localStorage.getItem(`students_class_${classId}`);
    if (cachedStudentsStr) {
      try {
        const parsed = JSON.parse(cachedStudentsStr);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((s: any) => s && s.id && !s.id.startsWith('sim-') && isStudentInClass(s, classId, targetCls?.name));
          setStudents(filtered);
        } else {
          setStudents([]);
        }
      } catch {
        setStudents([]);
      }
    } else {
      setStudents([]);
    }

    const cachedPickedStr = localStorage.getItem(`picked_students_class_${classId}`);
    if (cachedPickedStr) {
      try {
        setPickedIds(JSON.parse(cachedPickedStr));
      } catch {
        setPickedIds([]);
      }
    } else {
      setPickedIds([]);
    }

    const cachedManualCalledStr = localStorage.getItem(`manual_called_students_class_${classId}`);
    if (cachedManualCalledStr) {
      try {
        setManualCalledIds(JSON.parse(cachedManualCalledStr));
      } catch {
        setManualCalledIds([]);
      }
    } else {
      setManualCalledIds([]);
    }

    // Immediately load target class's cached subjects, chapters, and questions
    const cachedSubjectsStr = localStorage.getItem(`subjects_class_${classId}`);
    let targetSubjects: QuizSubject[] = [];
    let targetActiveSubjectId: string | null = null;
    let targetActiveRoomId: string | null = null;
    let targetChapters: QuizChapter[] = [];
    let targetCards: QuizCard[] = [];

    if (cachedSubjectsStr) {
      try {
        const parsed = JSON.parse(cachedSubjectsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          targetSubjects = parsed;
          targetActiveSubjectId = localStorage.getItem(`active_subject_id_${classId}`) || parsed[0].id;
          targetActiveRoomId = localStorage.getItem(`active_room_id_${classId}`) || null;
        }
      } catch {}
    }

    if (targetSubjects.length === 0) {
      const migration = getMigratedSubjects([]);
      targetSubjects = migration.subjects;
      targetActiveSubjectId = migration.activeSubjectId;
      targetActiveRoomId = targetSubjects[0]?.chapters[0]?.rooms[0]?.id || null;
    }

    const activeSub = targetSubjects.find(s => s.id === targetActiveSubjectId) || targetSubjects[0];
    targetChapters = activeSub?.chapters || [];

    let targetRoom: QuizRoom | undefined;
    if (targetActiveRoomId) {
      for (const ch of targetChapters) {
        targetRoom = ch.rooms.find(r => r.id === targetActiveRoomId);
        if (targetRoom) break;
      }
    }
    if (!targetRoom && targetChapters.length > 0 && targetChapters[0].rooms.length > 0) {
      targetRoom = targetChapters[0].rooms[0];
      targetActiveRoomId = targetRoom.id;
    }

    const cachedCardsStr = localStorage.getItem(`quiz_cards_class_${classId}`);
    if (cachedCardsStr) {
      try {
        targetCards = JSON.parse(cachedCardsStr);
      } catch {
        targetCards = targetRoom?.cards || [];
      }
    } else {
      targetCards = targetRoom?.cards || [];
    }

    setSubjects(targetSubjects);
    setActiveSubjectId(targetActiveSubjectId);
    setChapters(targetChapters);
    setActiveRoomId(targetActiveRoomId);
    setCards(targetCards);

    if (teacher) {
      localStorage.setItem(`khmer_teacher_active_class_id_${teacher.id}`, classId);
    }
    localStorage.setItem('khmer_teacher_active_class_id', classId);
  };

  const handleOpenAddClass = () => {
    if (!teacher) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    setClassModalState({
      isOpen: true,
      mode: 'add',
      currentName: ''
    });
  };

  const handleOpenRenameClass = (e: React.MouseEvent, classId: string, currentName: string) => {
    e.stopPropagation();
    setClassModalState({
      isOpen: true,
      mode: 'rename',
      classId,
      currentName
    });
  };

  const handleSaveClassModal = async (enteredName: string) => {
    const trimmed = enteredName.trim();
    if (!trimmed) return;

    if (classModalState.mode === 'add') {
      const newClassId = `class-${Date.now()}`;
      const newOrder = classes.length;
      const newClass: ClassInfo = { id: newClassId, name: trimmed, order: newOrder };
      
      const { subjects: defaultSubjects, activeSubjectId: defaultActiveSubjectId } = getMigratedSubjects([]);
      const defaultActiveRoomId = defaultSubjects[0]?.chapters[0]?.rooms[0]?.id || null;

      localStorage.setItem(`subjects_class_${newClassId}`, JSON.stringify(defaultSubjects));
      if (defaultActiveSubjectId) {
        localStorage.setItem(`active_subject_id_${newClassId}`, defaultActiveSubjectId);
      }
      if (defaultActiveRoomId) {
        localStorage.setItem(`active_room_id_${newClassId}`, defaultActiveRoomId);
      }

      const currentTeacherId = teacher?.id || 'local';
      const deletedKey = `khmer_teacher_deleted_classes_${currentTeacherId}`;
      const deletedClassesStr = localStorage.getItem(deletedKey);
      if (deletedClassesStr) {
        try {
          const set = new Set<string>(JSON.parse(deletedClassesStr));
          set.delete(newClassId);
          localStorage.setItem(deletedKey, JSON.stringify(Array.from(set)));
        } catch {}
      }

      const sortedClasses = sortClasses([...classes, newClass]);
      setClasses(sortedClasses);
      if (teacher) {
        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedClasses));
      }
      localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedClasses));
      
      handleSwitchClass(newClassId);

      try {
        await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', newClassId), {
          id: newClassId,
          name: trimmed,
          order: newOrder,
          subjects: defaultSubjects,
          activeSubjectId: defaultActiveSubjectId,
          activeRoomId: defaultActiveRoomId,
          pickedIds: [],
          cards: [],
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error('Failed to create class in Cloud:', err);
      }
    } else if (classModalState.mode === 'rename' && classModalState.classId) {
      const targetId = classModalState.classId;
      const updatedClasses = classes.map(c => c.id === targetId ? { ...c, name: trimmed } : c);
      const sortedClasses = sortClasses(updatedClasses);
      setClasses(sortedClasses);
      
      if (teacher) {
        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedClasses));
      }
      localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedClasses));
      
      const currentTeacherId = teacher?.id || 'local';
      try {
        await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', targetId), {
          id: targetId,
          name: trimmed
        }, { merge: true });
      } catch (err) {
        console.error("Failed to rename class in Cloud:", err);
      }
    }
  };

  const handleRemoveClass = async (e: React.MouseEvent, classId: string, className: string) => {
    e.stopPropagation(); // prevent switching to it

    confirmAction({
      title: 'លុបថ្នាក់រៀន',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបថ្នាក់ «${className}» នេះចោលមែនទេ? រាល់បញ្ជីឈ្មោះសិស្ស និងសំណួរទាំងអស់ក្នុងថ្នាក់នេះនឹងត្រូវលុបចេញទាំងស្រុង។`,
      confirmText: 'បាទ/ចាស លុបថ្នាក់',
      variant: 'danger',
      onConfirm: async () => {
        const updatedClasses = classes.filter(c => c.id !== classId);
        const sortedClasses = sortClasses(updatedClasses);
        setClasses(sortedClasses);

        // 1. Delete from Firestore if teacher is logged in
        if (teacher?.id) {
          try {
            await safeDeleteDoc(doc(db, 'teachers', teacher.id, 'classes', classId));
          } catch (err) {
            console.error('Failed to delete class from Firestore:', err);
          }
        }

        // 2. Update localStorage strictly for this teacher
        if (teacher) {
          localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedClasses));
          if (sortedClasses.length === 0) {
            localStorage.removeItem(`khmer_teacher_active_class_id_${teacher.id}`);
          }
        } else {
          localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedClasses));
          if (sortedClasses.length === 0) {
            localStorage.removeItem('khmer_teacher_active_class_id');
          }
        }

        // 3. Clear all cached class data from localStorage
        localStorage.removeItem(`students_class_${classId}`);
        localStorage.removeItem(`quiz_cards_class_${classId}`);
        localStorage.removeItem(`picked_students_class_${classId}`);
        localStorage.removeItem(`manual_called_students_class_${classId}`);
        localStorage.removeItem(`subjects_class_${classId}`);
        localStorage.removeItem(`chapters_class_${classId}`);
        localStorage.removeItem(`active_subject_id_${classId}`);
        localStorage.removeItem(`active_room_id_${classId}`);
        
        // 4. Handle active class switch
        if (activeClassId === classId) {
          if (sortedClasses.length > 0) {
            handleSwitchClass(sortedClasses[0].id);
          } else {
            setActiveClassId('');
            setStudents([]);
            setCards([]);
            setSubjects([]);
            setChapters([]);
            setPickedIds([]);
            setManualCalledIds([]);
          }
        }
        showToast(`បានលុបថ្នាក់ «${className}» ដោយជោគជ័យ`);
      }
    });
  };

  const addStudent = useCallback(async (name: string) => {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const newStudent: Student = {
      id: `s-${Date.now()}-${Math.random()}`,
      name,
      score: 0,
      emoji: randomEmoji,
      gender: 'ប្រុស',
      status: 'សកម្ម',
      classId: activeClassId
    };

    const currentTeacherId = teacher?.id || 'local';
    try {
      await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', newStudent.id), newStudent);
    } catch (err) {
      console.error(err);
    }

    setStudents(prev => {
      if (prev.some(s => s.id === newStudent.id)) return prev;
      return [...prev, newStudent];
    });
  }, [activeClassId, teacher]);

  const addStudentDetail = useCallback(async (fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string; studentId?: string }) => {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const newStudent: Student = {
      id: `s-${Date.now()}-${Math.random()}`,
      studentId: fields.studentId?.trim() || undefined,
      name: fields.name,
      score: 0,
      emoji: randomEmoji,
      gender: fields.gender,
      status: fields.status,
      classId: fields.classId
    };
    
    const currentTeacherId = teacher?.id || 'local';
    if (fields.classId === activeClassId) {
      try {
        await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', newStudent.id), newStudent);
      } catch (err) {
        console.error(err);
      }
      setStudents(prev => {
        if (prev.some(s => s.id === newStudent.id)) return prev;
        return [...prev, newStudent];
      });
    } else {
      try {
        await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', fields.classId, 'students', newStudent.id), newStudent);
      } catch (err) {
        console.error(err);
      }
      const savedKey = `students_class_${fields.classId}`;
      const savedRaw = localStorage.getItem(savedKey);
      const savedList = savedRaw ? JSON.parse(savedRaw) : [];
      savedList.push(newStudent);
      localStorage.setItem(savedKey, JSON.stringify(savedList));
      alert(`បានរក្សាទុកសិស្ស «${fields.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
    }
  }, [activeClassId, teacher]);

  const handleBulkAddStudents = useCallback(async (
    list: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }[],
    targetClassIdParam?: string
  ) => {
    const targetClassId = targetClassIdParam || activeClassId;
    const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const newStudents: Student[] = list.map(item => ({
      id: `s-${Date.now()}-${Math.random()}`,
      name: item.name,
      score: 0,
      emoji: randomEmoji(),
      gender: item.gender,
      status: item.status,
      classId: targetClassId
    }));

    const currentTeacherId = teacher?.id || 'local';
    try {
      await Promise.all(
        newStudents.map(student => 
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', targetClassId, 'students', student.id), student)
        )
      );
    } catch (err) {
      console.error(err);
    }

    if (targetClassId === activeClassId) {
      setStudents(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const uniqueNew = newStudents.filter(s => !existingIds.has(s.id));
        if (uniqueNew.length === 0) return prev;
        return [...prev, ...uniqueNew];
      });
    } else {
      const savedKey = `students_class_${targetClassId}`;
      const savedRaw = localStorage.getItem(savedKey);
      const savedList = savedRaw ? JSON.parse(savedRaw) : [];
      savedList.push(...newStudents);
      localStorage.setItem(savedKey, JSON.stringify(savedList));
    }
  }, [activeClassId, teacher]);

  const handleBatchSyncStudents = useCallback(async (
    names: string[],
    mode: 'replace' | 'append' = 'replace',
    targetClassIdParam?: string
  ) => {
    const targetClassId = targetClassIdParam || activeClassId;
    const currentTeacherId = teacher?.id || 'local';
    const cleanNames = names.map(n => n.trim()).filter(Boolean);
    const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    const targetCls = classes.find(c => c.id === targetClassId);
    const existingCurrent = students.filter(s => isStudentInClass(s, targetClassId, targetCls?.name));

    if (mode === 'append') {
      const newStudents: Student[] = cleanNames.map(name => ({
        id: `s-${Date.now()}-${Math.random()}`,
        name,
        score: 0,
        emoji: randomEmoji(),
        gender: 'ប្រុស',
        status: 'សកម្ម',
        classId: targetClassId
      }));

      try {
        await Promise.all(
          newStudents.map(student => 
            safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', targetClassId, 'students', student.id), student)
          )
        );
      } catch (err) {
        console.error('Failed to append students to cloud:', err);
      }

      setStudents(prev => [...prev, ...newStudents]);
      const updatedList = [...existingCurrent, ...newStudents];
      localStorage.setItem(`students_class_${targetClassId}`, JSON.stringify(updatedList));
      return;
    }

    // Mode: 'replace'
    const unusedExisting = [...existingCurrent];
    const finalStudents: Student[] = [];

    cleanNames.forEach(name => {
      const matchIndex = unusedExisting.findIndex(s => s.name.trim().toLowerCase() === name.toLowerCase());
      if (matchIndex >= 0) {
        const matched = unusedExisting.splice(matchIndex, 1)[0];
        finalStudents.push({
          ...matched,
          name,
          classId: targetClassId
        });
      } else {
        finalStudents.push({
          id: `s-${Date.now()}-${Math.random()}`,
          name,
          score: 0,
          emoji: randomEmoji(),
          gender: 'ប្រុស',
          status: 'សកម្ម',
          classId: targetClassId
        });
      }
    });

    try {
      await Promise.all([
        ...unusedExisting.map(s => 
          safeDeleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', targetClassId, 'students', s.id))
        ),
        ...finalStudents.map(s => 
          safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', targetClassId, 'students', s.id), s)
        )
      ]);
    } catch (err) {
      console.error('Failed to sync batch students to cloud:', err);
    }

    setStudents(prev => {
      const otherClasses = prev.filter(s => !isStudentInClass(s, targetClassId, targetCls?.name));
      return [...otherClasses, ...finalStudents];
    });

    localStorage.setItem(`students_class_${targetClassId}`, JSON.stringify(finalStudents));

    const finalIds = new Set(finalStudents.map(s => s.id));
    setPickedIds(prev => prev.filter(id => finalIds.has(id)));
    if (selectedStudentId && !finalIds.has(selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [activeClassId, teacher, classes, students, selectedStudentId]);

  const updateStudentDetail = useCallback(async (id: string, fields: Partial<Student>) => {
    let updatedStudent: Student | null = null;
    const currentTeacherId = teacher?.id || DEFAULT_CLOUD_TEACHER.id;
    
    setStudents(prev => {
      const studentToUpdate = prev.find(s => s.id === id);
      if (!studentToUpdate) return prev;
      
      const newClassId = fields.classId || studentToUpdate.classId || activeClassId;
      const oldClassId = studentToUpdate.classId || activeClassId;
      
      updatedStudent = { ...studentToUpdate, ...fields, classId: newClassId };

      if (newClassId !== oldClassId) {
        // Move to another class
        const filtered = prev.filter(s => s.id !== id);
        
        (async () => {
          try {
            await safeDeleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', oldClassId, 'students', id));
            await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', newClassId, 'students', id), updatedStudent!);
          } catch (err) {
            console.error(err);
          }
        })();
        
        const targetKey = `students_class_${newClassId}`;
        const targetRaw = localStorage.getItem(targetKey);
        const targetList = targetRaw ? JSON.parse(targetRaw) : [];
        
        const cleanedList = targetList.filter((s: any) => s.id !== id);
        cleanedList.push(updatedStudent);
        localStorage.setItem(targetKey, JSON.stringify(cleanedList));
        
        alert(`បានផ្លាស់ប្ដូរថ្នាក់សិស្ស «${fields.name || studentToUpdate.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
        return filtered;
      } else {
        (async () => {
          try {
            await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', id), updatedStudent!);
          } catch (err) {
            console.error(err);
          }
        })();
        const updatedList = prev.map(s => s.id === id ? { ...s, ...fields } : s);
        if (activeClassId) {
          localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(updatedList));
        }
        return updatedList;
      }
    });
  }, [activeClassId, teacher]);

  const removeStudent = useCallback((id: string) => {
    const student = students.find(s => s.id === id);
    const studentName = student ? student.name : 'សិស្សនេះ';

    confirmAction({
      title: 'លុបឈ្មោះសិស្ស',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបឈ្មោះសិស្ស «${studentName}» នេះចេញពីថ្នាក់មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`,
      confirmText: 'បាទ/ចាស លុប',
      variant: 'danger',
      onConfirm: async () => {
        const currentTeacherId = teacher?.id || 'local';
        try {
          await safeDeleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', id));
        } catch (err) {
          console.error(err);
        }
        setStudents(prev => {
          const filtered = prev.filter(s => s.id !== id);
          if (activeClassId) {
            localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(filtered));
          }
          return filtered;
        });
        if (selectedStudentId === id) setSelectedStudentId(null);
      }
    });
  }, [students, selectedStudentId, teacher, activeClassId, confirmAction]);

  const clearStudents = useCallback(() => {
    if (students.length === 0) return;

    confirmAction({
      title: 'លុបឈ្មោះសិស្សទាំងអស់',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបឈ្មោះសិស្សទាំងអស់ (${students.length} នាក់) ក្នុងថ្នាក់នេះមែនទេ? រាល់ឈ្មោះ និងពិន្ទុទាំងអស់នឹងត្រូវបាត់បង់ទាំងស្រុងពីប្រព័ន្ធ។`,
      confirmText: 'បាទ/ចាស លុបទាំងអស់',
      variant: 'danger',
      onConfirm: async () => {
        const currentTeacherId = teacher?.id || 'local';
        try {
          for (const s of students) {
            safeDeleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', s.id)).catch(() => {});
          }
        } catch (err) {
          console.error(err);
        }
        setStudents([]);
        setSelectedStudentId(null);
        setPickedIds([]);
        if (activeClassId) {
          localStorage.removeItem(`students_class_${activeClassId}`);
          localStorage.removeItem(`picked_students_class_${activeClassId}`);
        }
      }
    });
  }, [students, teacher, activeClassId, confirmAction]);

  const handleQuestionsGenerated = useCallback((questions: Question[]) => {
    if (!questions || questions.length === 0) return;
    const newCards: QuizCard[] = questions.map((q, i) => ({
      id: `c-${i}-${Date.now()}`,
      number: i + 1,
      question: q,
      isRevealed: false,
      status: 'idle'
    }));
    setCards(newCards);
    if (activeClassId) {
      localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(newCards));
    }
    saveClassMetadata(newCards, pickedIds);
  }, [activeClassId, pickedIds, saveClassMetadata]);

  const handleUpdateCards = useCallback((updatedCards: QuizCard[]) => {
    setCards(updatedCards);
    if (activeClassId) {
      if (updatedCards.length === 0) {
        localStorage.removeItem(`quiz_cards_class_${activeClassId}`);
      } else {
        localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(updatedCards));
      }
    }
    saveClassMetadata(updatedCards, pickedIds);
  }, [activeClassId, pickedIds, saveClassMetadata]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (!activeCardId) return;

    // Update student score if student is selected
    if (selectedStudentId) {
      // If correct answer, award 5 points into date-based activity scores system (សកម្មភាព column)
      if (correct) {
        awardStudentActivityPoints(selectedStudentId, 5);
      }

      // Add student to picked list so they are not picked again
      const updatedPickedIds = pickedIds.includes(selectedStudentId)
        ? pickedIds
        : [...pickedIds, selectedStudentId];
      setPickedIds(updatedPickedIds);
      saveClassMetadata(cards, updatedPickedIds);
    }

    // Update card status
    const updatedCards = cards.map(c => {
      if (c.id === activeCardId) {
        return { ...c, isRevealed: true, status: correct ? 'correct' : 'wrong' as any };
      }
      return c;
    });
    setCards(updatedCards);

    saveClassMetadata(updatedCards, pickedIds);
    setActiveCardId(null);
  }, [activeCardId, selectedStudentId, cards, pickedIds, saveClassMetadata, saveStudentScore]);

  const resetMatch = useCallback(async () => {
    confirmAction({
      title: 'កំណត់ពិន្ទុ និងកាតឡើងវិញ',
      message: 'តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់កំណត់ពិន្ទុសិស្ស និងការបើកសន្លឹកប័ណ្ណឡើងវិញទាំងអស់មែនទេ?',
      confirmText: 'បាទ/ចាស កំណត់ឡើងវិញ',
      variant: 'warning',
      onConfirm: async () => {
        if (teacher && activeClassId) {
          try {
            for (const s of students) {
              await safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', s.id), {
                score: 0
              }, { merge: true });
            }
          } catch (err) {
            console.error(err);
          }
        }
        
        setStudents(prev => prev.map(s => ({ ...s, score: 0 })));
        
        const resetCards = cards.map(c => ({ ...c, isRevealed: false, status: 'idle' as any }));
        setCards(resetCards);
        setSelectedStudentId(null);
        setPickedIds([]);
        setActiveCardId(null);
        
        saveClassMetadata(resetCards, []);
      }
    });
  }, [students, cards, teacher, activeClassId, saveClassMetadata, confirmAction]);

  const resetAll = useCallback(() => {
    confirmAction({
      title: 'កំណត់កម្មវិធីឡើងវិញទាំងស្រុង',
      message: 'តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់កំណត់កម្មវិធីឡើងវិញទាំងស្រុង (Factory Reset) មែនទេ? រាល់ទិន្នន័យទាំងអស់នឹងត្រូវជម្រះ។',
      confirmText: 'បាទ/ចាស កំណត់ឡើងវិញទាំងអស់',
      variant: 'danger',
      onConfirm: () => {
        localStorage.clear();
        setStudents([]);
        setCards([]);
        setSelectedStudentId(null);
        setPickedIds([]);
        setManualCalledIds([]);
        setSubjects([]);
        setChapters([]);
        setActiveCardId(null);
        setTeacher(null);
        setClasses([]);
        setActiveClassId('');
      }
    });
  }, [confirmAction]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    setIsProfileModalOpen(false);
    
    // Clear logged in teacher token
    localStorage.removeItem('logged_in_teacher');
    
    // Also clear active teacher's selected class ID in memory & offline caches
    if (teacher) {
      localStorage.removeItem(`khmer_teacher_active_class_id_${teacher.id}`);
      localStorage.removeItem(`khmer_teacher_classes_${teacher.id}`);
    }
    localStorage.removeItem('khmer_teacher_active_class_id');
    localStorage.removeItem('khmer_teacher_classes');

    // Clear all cached students/cards/pickedIds in localstorage for a clean slate
    const keysToClear: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('students_class_') || 
        key.startsWith('quiz_cards_class_') || 
        key.startsWith('picked_students_class_') || 
        key.startsWith('manual_called_students_class_') ||
        key.startsWith('subjects_class_') ||
        key.startsWith('chapters_class_') ||
        key.startsWith('active_subject_id_') ||
        key.startsWith('active_room_id_') ||
        key.startsWith('khmer_teacher_deleted_classes_')
      )) {
        keysToClear.push(key);
      }
    }
    keysToClear.forEach(k => localStorage.removeItem(k));

    // Reset application states back to fresh empty state
    setTeacher(null);
    setClasses([]);
    setActiveClassId('');
    setStudents([]);
    setCards([]);
    setSubjects([]);
    setChapters([]);
    setPickedIds([]);
    setManualCalledIds([]);
    setSelectedStudentId(null);
    setActiveCardId(null);
    showToast('បានចាកចេញពីគណនី (Logged Out)');
  };

  const activeClass = classes.find(c => c.id === activeClassId) || null;

  const currentClassStudents = React.useMemo(() => {
    if (!activeClassId) return students;
    return students.filter(s => isStudentInClass(s, activeClassId, activeClass?.name));
  }, [students, activeClassId, activeClass?.name]);

  const currentClassPickedIds = React.useMemo(() => {
    const studentIds = new Set(currentClassStudents.map(s => s.id));
    return pickedIds.filter(id => studentIds.has(id));
  }, [pickedIds, currentClassStudents]);

  const currentClassManualCalledIds = React.useMemo(() => {
    const studentIds = new Set(currentClassStudents.map(s => s.id));
    return manualCalledIds.filter(id => studentIds.has(id));
  }, [manualCalledIds, currentClassStudents]);

  const selectedStudent = currentClassStudents.find(s => s.id === selectedStudentId) || null;
  const activeCard = cards.find(c => c.id === activeCardId) || null;

  const pendingApprovalStudents = React.useMemo(() => {
    return currentClassStudents.filter(s => s.isApproved === false);
  }, [currentClassStudents]);
  const pendingStudentsCount = pendingApprovalStudents.length;

  const handleApproveAllPending = async () => {
    const currentTeacherId = teacher?.id || 'local';
    if (!activeClassId) return;
    try {
      await Promise.all(
        pendingApprovalStudents.map(student => {
          const studentDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', student.id);
          return safeSetDoc(studentDocRef, { isApproved: true }, { merge: true });
        })
      );
      showToast(`បានអនុញ្ញាតសិស្សចំនួន ${pendingStudentsCount} នាក់ចូលរួម`);
    } catch (err) {
      console.error("Approve all pending failed:", err);
    }
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#222222] text-slate-100 dark' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Header */}
      <header className={`h-20 flex items-center justify-between px-6 lg:px-8 shrink-0 z-20 border-b transition-colors ${
        isDarkMode ? 'bg-[#222222] border-[#333333]' : 'bg-gradient-to-r from-sky-50/70 via-white to-purple-50/70 border-slate-200/80 shadow-xs'
      }`}>
        <div 
          onClick={() => setActiveTab('wheel')}
          className="flex items-center gap-3.5 cursor-pointer hover:opacity-90 active:scale-98 transition-all select-none shrink-0"
          title="ត្រឡប់ទៅទំព័រដើម (Home)"
        >
          <div className="w-11 h-11 flex items-center justify-center relative drop-shadow-xs">
            {teacher?.schoolLogoUrl ? (
              <img 
                src={teacher.schoolLogoUrl} 
                alt="School Logo" 
                className="w-11 h-11 object-contain rounded-xl select-none" 
              />
            ) : (
              <SovannaphumiLogo className="w-11 h-11" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5">
                <span className="text-indigo-600 dark:text-indigo-400">EduSpin</span>
                <span className="text-slate-800 dark:text-slate-200">Pro</span>
              </h1>
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-none flex items-center gap-1.5 mt-1">
              <span className="truncate max-w-[160px] sm:max-w-[220px]" title={teacher?.schoolName || 'សាលារៀន'}>
                {teacher ? (teacher.schoolName || 'មិនទាន់បញ្ចូលឈ្មោះសាលា') : 'សាលារៀនសុវណ្ណភូមិ'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Soft Light Pastel iOS Glass Navigation Tabs */}
        <nav className={`flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-2xl overflow-x-auto no-scrollbar max-w-full select-none relative z-10 shrink-0 ${
          isDarkMode 
            ? 'bg-[#18181c]/90 border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_8px_30px_rgba(0,0,0,0.6)]' 
            : 'bg-gradient-to-r from-sky-50/90 via-indigo-50/80 to-purple-50/90 border-white/90 shadow-[0_8px_25px_rgba(100,116,139,0.08),inset_0_1px_2px_rgba(255,255,255,0.8)]'
        }`}>
          {[
            { id: 'wheel', label: 'បង្វិលឈ្មោះ', icon: Compass, activeBgLight: 'from-sky-100/95 via-blue-50/95 to-sky-100/95', textLight: 'text-sky-700', activeTextLight: 'text-sky-800' },
            { id: 'groups', label: 'បែងចែកក្រុម', icon: UsersIcon, activeBgLight: 'from-emerald-100/95 via-teal-50/95 to-emerald-100/95', textLight: 'text-emerald-700', activeTextLight: 'text-emerald-800' },
            { id: 'students', label: 'គ្រប់គ្រងសិស្ស', icon: UserCog, activeBgLight: 'from-violet-100/95 via-purple-50/95 to-violet-100/95', textLight: 'text-purple-700', activeTextLight: 'text-purple-800' },
            { id: 'quiz', label: 'ក្ដារសំណួរ', icon: LayoutGrid, activeBgLight: 'from-amber-100/95 via-orange-50/95 to-amber-100/95', textLight: 'text-amber-700', activeTextLight: 'text-amber-800' },
            { id: 'exams-room', label: 'បន្ទប់វិញ្ញាសា', icon: GraduationCap, activeBgLight: 'from-indigo-100/95 via-blue-50/95 to-indigo-100/95', textLight: 'text-indigo-700', activeTextLight: 'text-indigo-800' },
            { id: 'student-lobby', label: 'Study game', icon: Sparkles, badge: true, activeBgLight: 'from-rose-100/95 via-pink-50/95 to-rose-100/95', textLight: 'text-rose-700', activeTextLight: 'text-rose-800' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isStudyGame = tab.id === 'student-lobby';

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94, scaleY: 0.9, scaleX: 1.05 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer select-none whitespace-nowrap transition-colors duration-200 focus:outline-none ${
                  isActive
                    ? isDarkMode ? 'text-blue-400 font-extrabold' : `${tab.activeTextLight} font-black`
                    : isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : `${tab.textLight} hover:bg-white/70`
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="telegramWaterDroplet"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 22,
                      mass: 0.65
                    }}
                    className={`absolute inset-0 rounded-xl border backdrop-blur-2xl overflow-hidden pointer-events-none ${
                      isDarkMode
                        ? 'bg-white/[0.08] border-white/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(255,255,255,0.1)]'
                        : `bg-gradient-to-r ${tab.activeBgLight} border-white/95 shadow-[0_6px_20px_rgba(0,0,0,0.06),inset_0_2.5px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(255,255,255,0.5)]`
                    }`}
                  >
                    {/* Top Specular Glare Dome Reflection */}
                    <div className={`absolute top-0 inset-x-1 h-[48%] bg-gradient-to-b rounded-t-xl pointer-events-none ${
                      isDarkMode 
                        ? 'from-white/50 via-white/12 to-transparent' 
                        : 'from-white/95 via-white/40 to-transparent'
                    }`} />

                    {/* Central Radial Light Core */}
                    <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2.5 pointer-events-none ${
                      isDarkMode
                        ? 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.3)_0%,_transparent_75%)]'
                        : 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.95)_0%,_transparent_75%)]'
                    }`} />

                    {/* Bottom Droplet Meniscus Light Rim */}
                    <div className={`absolute bottom-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
                      isDarkMode ? 'via-white/50' : 'via-white/90'
                    }`} />
                  </motion.div>
                )}

                <motion.span
                  animate={{ 
                    scale: isActive ? 1.05 : 1,
                    y: isActive ? -0.5 : 0
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  className="relative z-10 flex items-center gap-2"
                >
                  <Icon className={`w-4 h-4 transition-all duration-300 ${
                    isActive
                      ? isDarkMode ? 'text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : `${tab.activeTextLight} scale-110 drop-shadow-xs`
                      : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  } ${isActive && tab.id === 'wheel' ? 'animate-spin-slow' : ''}`} />
                  <span className={
                    isActive 
                      ? isDarkMode 
                        ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                        : `${tab.activeTextLight} font-black tracking-wide` 
                      : 'font-bold'
                  }>{tab.label}</span>
                  
                  {isStudyGame && pendingStudentsCount > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 animate-bounce shadow-xs">
                      +{pendingStudentsCount}
                    </span>
                  ) : tab.badge ? (
                    <span className="flex h-2 w-2 relative ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  ) : null}
                </motion.span>
              </motion.button>
            );
          })}
        </nav>

        {/* Action and Profile Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Teacher Profile Area */}
          {teacher ? (
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border transition-colors group/prof ${
              isDarkMode ? 'bg-slate-800/90 border-slate-700 hover:border-slate-600 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}>
              {/* Avatar with Camera badge for instant change from phone/PC */}
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="relative cursor-pointer select-none rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                title="ចុចដើម្បីប្ដូររូបភាព Profile ពីទូរស័ព្ទ ឬកុំព្យូទ័រ"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500/40 bg-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-xs group-hover/prof:border-emerald-500 transition-all">
                  {teacher.avatarUrl ? (
                    <img 
                      src={teacher.avatarUrl} 
                      alt={teacher.name} 
                      className="w-full h-full object-cover select-none" 
                    />
                  ) : (
                    <User className="w-4.5 h-4.5" />
                  )}
                </div>
                {/* Camera Badge Icon */}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 group-hover/prof:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-xs border border-white dark:border-slate-800 transition-transform group-hover/prof:scale-110">
                  <Camera className="w-2.5 h-2.5" />
                </span>
              </button>

              <div 
                onClick={() => setIsProfileModalOpen(true)}
                className="text-left pr-1 hidden sm:block cursor-pointer select-none hover:opacity-85 transition-opacity"
                title="ចុចដើម្បីមើល ឬកែប្រែព័ត៌មាន Profile"
              >
                <p className={`text-xs font-black truncate max-w-[110px] ${
                  isDarkMode ? 'text-white drop-shadow-xs' : 'text-slate-900'
                }`}>
                  {teacher.name}
                </p>
                {teacher.subjects && (
                  <p className={`text-[10px] font-bold leading-none truncate max-w-[110px] mt-0.5 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {teacher.subjects}
                  </p>
                )}
              </div>

              <button
                onClick={handleLogout}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'text-slate-300 hover:text-red-400 hover:bg-red-500/20' 
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'
                }`}
                title="ចាកចេញពីគណនី"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all border border-indigo-200 dark:border-indigo-800/60 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ចូលគណនី</span>
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>ចុះឈ្មោះគ្រូ</span>
              </button>
            </div>
          )}

          <div className={`h-6 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} mx-0.5`} />

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              !soundOn
                ? 'text-red-500 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50'
                : (isDarkMode ? 'text-emerald-400 hover:bg-slate-800' : 'text-emerald-600 hover:bg-slate-100')
            }`}
            title={soundOn ? 'បិទសំឡេងហ្គេម (គ្រាប់ចុច M)' : 'បើកសំឡេងហ្គេម (គ្រាប់ចុច M)'}
          >
            {soundOn ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isFullscreen
                ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400'
                : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
            }`}
            title={isFullscreen ? 'ចាកចេញពីអេក្រង់ពេញ (គ្រាប់ចុច F)' : 'ពង្រីកពេញអេក្រង់សម្រាប់ Projector/TV (គ្រាប់ចុច F)'}
          >
            {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
          </button>

          {/* iOS Settings & 100% Backup Menu Button (Icon Only) */}
          <button
            onClick={() => setIsSettingsDrawerOpen(true)}
            className={`p-2 rounded-xl transition-all cursor-pointer shadow-xs select-none active:scale-95 border group ${
              isDarkMode 
                ? 'bg-gradient-to-tr from-blue-900/50 via-indigo-900/50 to-blue-950/50 hover:from-blue-800/80 hover:to-indigo-800/80 text-blue-300 border-blue-400/30 hover:border-blue-400/60 shadow-blue-500/10' 
                : 'bg-gradient-to-tr from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-600 border-blue-200 hover:border-blue-300 shadow-blue-500/10'
            }`}
            title="ការកំណត់ & បម្រុងទុកទិន្នន័យ ១០០% (Settings & 100% Full Backup Menu)"
            aria-label="Settings & Backup"
          >
            <Settings className="w-4.5 h-4.5 text-blue-500 group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Cloud Sync Status Indicator */}
          <div 
            title={quotaExceeded ? 'កូតា Cloud ដល់កម្រិតកំណត់ - កំពុងដំណើរការក្នុង Offline Local Mode ដោយសុវត្ថិភាព' : (teacher ? `បានភ្ជាប់គណនី ${teacher.username} ទៅកាន់ Cloud Firestore` : 'ទិន្នន័យរក្សាទុកក្នុង Local និងត្រៀម Sync ទៅកាន់ Cloud')}
            className={`inline-flex items-center gap-1 font-bold text-[9.5px] px-2 py-1 rounded-xl border select-none shadow-2xs leading-none ${
              quotaExceeded 
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/40' 
                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/40'
            }`}
          >
            <Cloud className={`w-3 h-3 ${quotaExceeded ? 'text-amber-500' : (loadingCloudData ? 'animate-pulse text-indigo-500' : 'text-emerald-500')}`} />
            <span className="hidden sm:inline">{quotaExceeded ? 'Offline' : (loadingCloudData ? 'Syncing...' : 'Cloud')}</span>
          </div>
        </div>
      </header>

      {/* Firestore Quota Exceeded / Offline Notice Banner */}
      {quotaExceeded && !quotaBannerDismissed && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 z-10 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
            <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px]">!</span>
            <div className="truncate">
              <span className="font-semibold">ម៉ូដក្រៅបណ្ដាញ (Offline Mode)៖</span>{' '}
              <span>កូតាឥតគិតថ្លៃប្រចាំថ្ងៃរបស់ Firestore បានដល់កម្រិតកំណត់។ ទិន្នន័យត្រូវបានរក្សាទុកក្នុងម៉ាស៊ីននេះដោយសុវត្ថិភាព ហើយកូតានឹង reset នៅថ្ងៃស្អែក។</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://console.firebase.google.com/project/elevated-timer-s8gvj/firestore/databases/ai-studio-b727153d-b991-4d5d-b685-54aeb74f5665/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-[11px] transition-colors whitespace-nowrap"
            >
              ដំឡើងគម្រោង (Upgrade)
            </a>
            <button
              onClick={() => setQuotaBannerDismissed(true)}
              className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
              title="បិទ (Dismiss)"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Class Switcher & Workspace Sub-Bar */}
      <div className={`py-2.5 px-6 lg:px-8 flex items-center justify-between shrink-0 border-b transition-colors gap-4 overflow-x-auto ${
        isDarkMode ? 'bg-[#222222]/95 border-[#333333]' : 'bg-slate-50/90 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 mr-1 text-slate-500 dark:text-slate-400 font-bold text-xs">
            <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>ថ្នាក់រៀន៖</span>
          </div>

          {/* Class Pills Track */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-2xl overflow-x-auto no-scrollbar max-w-full select-none relative z-10">
            {!teacher ? (
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                  មិនទាន់មានគណនីចូលប្រើ — ទិន្នន័យទទេរ
                </span>
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer"
                >
                  ចូលគណនី
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 cursor-pointer"
                >
                  ចុះឈ្មោះគ្រូ
                </button>
              </div>
            ) : classes.length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic px-3 py-1">
                មិនទាន់មានថ្នាក់នៅឡើយទេ ចុច «បន្ថែមថ្នាក់» ដើម្បីបង្កើត
              </span>
            ) : (
              classes.map((cls, idx) => {
              const isActive = activeClassId === cls.id;
              return (
                <motion.div 
                  key={cls.id ? `class-${cls.id}` : `class-idx-${idx}`}
                  onClick={() => handleSwitchClass(cls.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.94, scaleY: 0.9, scaleX: 1.05 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  draggable={canDrag && !cls.isPinned}
                  onDragStart={(e) => handleClassDragStart(e as any, idx)}
                  onDragOver={(e) => handleClassDragOver(e as any, idx)}
                  onDragEnd={handleClassDragEnd}
                  onMouseLeave={() => setCanDrag(false)}
                  className={`group/item relative px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap transition-colors duration-200 focus:outline-none ${
                    draggedClassIndex === idx
                      ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50 dark:bg-slate-800 scale-95'
                      : isActive 
                        ? isDarkMode ? 'text-blue-400 font-extrabold' : 'text-blue-600 font-extrabold' 
                        : isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  {/* Water Droplet Liquid Glass Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="classWaterDroplet"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 22,
                        mass: 0.65
                      }}
                      className={`absolute inset-0 rounded-xl border backdrop-blur-2xl overflow-hidden pointer-events-none ${
                        isDarkMode
                          ? 'bg-white/[0.08] border-white/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(255,255,255,0.1)]'
                          : 'bg-white/80 border-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03),inset_0_2.5px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(255,255,255,0.5)]'
                      }`}
                    >
                      {/* Top Specular Glare Dome Reflection (ចំណាំងពន្លឺកោងមូលតំណក់ទឹកថ្លា) */}
                      <div className={`absolute top-0 inset-x-1 h-[48%] bg-gradient-to-b rounded-t-xl pointer-events-none ${
                        isDarkMode 
                          ? 'from-white/50 via-white/12 to-transparent' 
                          : 'from-white/95 via-white/40 to-transparent'
                      }`} />
                      
                      {/* Central Radial Light Core (ស្នូលពន្លឺរលោងខាងក្នុង) */}
                      <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2 pointer-events-none ${
                        isDarkMode
                          ? 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.3)_0%,_transparent_75%)]'
                          : 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.95)_0%,_transparent_75%)]'
                      }`} />

                      {/* Bottom Droplet Meniscus Light Rim */}
                      <div className={`absolute bottom-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
                        isDarkMode ? 'via-white/50' : 'via-white/90'
                      }`} />
                    </motion.div>
                  )}

                  <motion.span
                    animate={{ 
                      scale: isActive ? 1.04 : 1,
                      y: isActive ? -0.5 : 0
                    }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                    className="relative z-10 flex items-center gap-1.5"
                  >
                    {!cls.isPinned ? (
                      <div
                        onMouseDown={() => setCanDrag(true)}
                        onTouchStart={() => setCanDrag(true)}
                        onMouseUp={() => setCanDrag(false)}
                        onTouchEnd={() => setCanDrag(false)}
                        className={`cursor-grab active:cursor-grabbing p-0.5 -m-0.5 rounded transition-colors shrink-0 flex items-center justify-center opacity-40 group-hover/item:opacity-90 ${
                          isActive 
                            ? isDarkMode ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-500/10 text-blue-600' 
                            : isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/10 text-slate-500'
                        }`}
                        title="អូសដើម្បីតម្រៀបលំដាប់ថ្នាក់"
                      >
                        <GripVertical className="w-3 h-3" />
                      </div>
                    ) : (
                      /* Visual Pin (ម្ជុល) if pinned */
                      <button
                        type="button"
                        onClick={(e) => handleTogglePinClass(e, cls.id)}
                        className="p-0.5 -ml-0.5 rounded-full hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 transition-transform active:scale-90 flex items-center justify-center cursor-pointer"
                        title="បានខ្ទាស់ម្ជុលជាប់ (ចុចដោះម្ជុលចេញវិញដើម្បីអាចប្ដូរទីតាំងបាន)"
                      >
                        <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500 -rotate-45 drop-shadow-xs" />
                      </button>
                    )}
                    
                    <span className={
                      isActive 
                        ? isDarkMode 
                          ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                          : 'text-blue-600 font-extrabold tracking-wide' 
                        : 'font-bold'
                    }>
                      {cls.name}
                    </span>

                    {/* Discrete action buttons (reveal on hover) */}
                    <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity ml-0.5">
                      {/* Pin / Unpin Button (ម្ជុល) */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePinClass(e, cls.id)}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          cls.isPinned
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/20'
                            : isActive 
                              ? 'hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:text-amber-500' 
                              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500'
                        }`}
                        title={cls.isPinned ? "ដោះម្ជុលចេញវិញ (Unpin ដើម្បីប្ដូរទីតាំងបាន)" : "ខ្ទាស់ម្ជុល (Pin)"}
                      >
                        {cls.isPinned ? (
                          <PinOff className="w-2.5 h-2.5 text-amber-500" />
                        ) : (
                          <Pin className="w-2.5 h-2.5" />
                        )}
                      </button>

                      {/* Moving left/right is only allowed for unpinned classes among other unpinned classes */}
                      {!cls.isPinned && idx > 0 && !classes[idx - 1]?.isPinned && (
                        <button
                          onClick={(e) => handleMoveClass(e, idx, 'left')}
                          className={`p-0.5 rounded transition-colors ${
                            isActive 
                              ? 'hover:bg-blue-500/20 text-blue-600 dark:text-blue-300' 
                              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'
                          }`}
                          title="រំកិលទៅឆ្វេង"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {!cls.isPinned && idx < classes.length - 1 && !classes[idx + 1]?.isPinned && (
                        <button
                          onClick={(e) => handleMoveClass(e, idx, 'right')}
                          className={`p-0.5 rounded transition-colors ${
                            isActive 
                              ? 'hover:bg-blue-500/20 text-blue-600 dark:text-blue-300' 
                              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'
                          }`}
                          title="រំកិលទៅស្ដាំ"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleOpenRenameClass(e, cls.id, cls.name)}
                        className={`p-0.5 rounded transition-colors ${
                          isActive 
                            ? 'hover:bg-blue-500/20 text-blue-600 dark:text-blue-300' 
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'
                        }`}
                        title="កែឈ្មោះថ្នាក់"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      {classes.length > 1 && (
                        <button
                          onClick={(e) => handleRemoveClass(e, cls.id, cls.name)}
                          className={`p-0.5 rounded transition-colors ${
                            isActive
                              ? 'hover:bg-red-500 text-red-500 hover:text-white'
                              : 'hover:bg-red-500/20 hover:text-red-500 text-slate-400'
                          }`}
                          title="លុបថ្នាក់"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </motion.span>
                </motion.div>
              );
            }))}

            {teacher && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleOpenAddClass}
                  className="px-3 py-1.5 bg-transparent border border-dashed rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/40 dark:hover:bg-white/10 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                  title="បន្ថែមថ្នាក់ថ្មី"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>បន្ថែមថ្នាក់</span>
                </button>
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="px-2.5 py-1.5 bg-transparent border border-dashed rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/40 dark:hover:bg-white/10 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                  title="បម្រុងទុក និងស្ដារទិន្នន័យ (Backup / Restore)"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Backup</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right workspace quick metrics */}
        <div className="hidden lg:flex items-center gap-3 shrink-0 text-xs font-bold">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}>
            <UsersIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>សិស្សសរុប៖ <strong className="text-indigo-600 dark:text-indigo-400">{currentClassStudents.length}</strong> នាក់</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}>
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>បានហៅ៖ <strong className="text-amber-600 dark:text-amber-400">{currentClassPickedIds.length + currentClassManualCalledIds.filter(id => !currentClassPickedIds.includes(id)).length}</strong>/{currentClassStudents.length}</span>
            {currentClassManualCalledIds.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded font-black">
                គ្រូហៅ {currentClassManualCalledIds.length}
              </span>
            )}
          </div>

          {(currentClassPickedIds.length > 0 || currentClassManualCalledIds.length > 0) && (
            <button
              onClick={() => {
                handleSetPickedIds([]);
                setManualCalledIds([]);
                if (activeClassId) {
                  localStorage.removeItem(`manual_called_students_class_${activeClassId}`);
                }
              }}
              className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              title="លាងសម្អាតការហៅឈ្មោះឡើងវិញ"
            >
              សម្អាតការហៅ
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'wheel' && (
          <>
            <section className="flex-1 md:basis-3/5 h-full overflow-y-auto flex flex-col bg-slate-50 dark:bg-[#222222]">
              <SpinningWheel
                students={currentClassStudents}
                pickedIds={currentClassPickedIds}
                manualCalledIds={currentClassManualCalledIds}
                onSetPickedIds={handleSetPickedIds}
                onToggleManualCall={handleToggleManualCall}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                onWheelPickStudent={handleWheelPickStudent}
                onAwardActivityPoints={awardStudentActivityPoints}
                onSetExactActivityScore={handleSetExactActivityScore}
                selectedStudent={selectedStudent}
                onAddStudent={addStudent}
                onBulkAddStudents={handleBulkAddStudents}
                showBulkInput={showWheelBulk}
                setShowBulkInput={setShowWheelBulk}
                isDarkMode={isDarkMode}
                className={activeClass?.name || 'ថ្នាក់រៀន'}
              />
            </section>
            
            <aside className="hidden md:block md:basis-2/5 h-full shrink-0 border-l border-slate-200 dark:border-[#333333]">
              <StudentPanel
                students={currentClassStudents}
                pickedIds={currentClassPickedIds}
                manualCalledIds={currentClassManualCalledIds}
                onSetPickedIds={handleSetPickedIds}
                onToggleManualCall={handleToggleManualCall}
                onAwardActivityPoints={awardStudentActivityPoints}
                onSetExactActivityScore={handleSetExactActivityScore}
                onAddStudent={addStudent}
                onRemoveStudent={removeStudent}
                onClearStudents={clearStudents}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                selectedStudent={selectedStudent}
                isDarkMode={isDarkMode}
                activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
                onBatchSyncStudents={handleBatchSyncStudents}
              />
            </aside>
          </>
        )}

        {activeTab === 'quiz' && (
          <>
            <aside className="basis-2/5 h-full shrink-0 hidden md:flex flex-col bg-slate-50 dark:bg-[#222222]">
              {/* Quick Switcher between Spinning Wheel (Image 1 - Default) and Student List (Image 3) */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-[#333333] bg-white dark:bg-[#222222] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {quizLeftView === 'wheel' ? 'កងបង្វិលសិស្ស' : 'បញ្ជីឈ្មោះសិស្ស'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {currentClassStudents.length} នាក់
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setQuizLeftView('wheel')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      quizLeftView === 'wheel'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="បង្ហាញកងបង្វិល"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>កងបង្វិល</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizLeftView('list')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      quizLeftView === 'list'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="បង្ហាញបញ្ជីឈ្មោះ"
                  >
                    <UsersIcon className="w-3.5 h-3.5" />
                    <span>បញ្ជី</span>
                  </button>
                </div>
              </div>

              {quizLeftView === 'wheel' ? (
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-2">
                  <SpinningWheel
                    students={currentClassStudents}
                    pickedIds={currentClassPickedIds}
                    manualCalledIds={currentClassManualCalledIds}
                    onSetPickedIds={handleSetPickedIds}
                    onToggleManualCall={handleToggleManualCall}
                    onSelectStudent={(s) => setSelectedStudentId(s.id)}
                    onWheelPickStudent={handleWheelPickStudent}
                    onAwardActivityPoints={awardStudentActivityPoints}
                    onSetExactActivityScore={handleSetExactActivityScore}
                    selectedStudent={selectedStudent}
                    onAddStudent={addStudent}
                    onBulkAddStudents={handleBulkAddStudents}
                    showBulkInput={showWheelBulk}
                    setShowBulkInput={setShowWheelBulk}
                    isDarkMode={isDarkMode}
                    className={activeClass?.name || 'ថ្នាក់រៀន'}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <StudentPanel
                    students={currentClassStudents}
                    pickedIds={currentClassPickedIds}
                    manualCalledIds={currentClassManualCalledIds}
                    onSetPickedIds={handleSetPickedIds}
                    onToggleManualCall={handleToggleManualCall}
                    onAwardActivityPoints={awardStudentActivityPoints}
                    onSetExactActivityScore={handleSetExactActivityScore}
                    onAddStudent={addStudent}
                    onRemoveStudent={removeStudent}
                    onClearStudents={clearStudents}
                    onSelectStudent={(s) => setSelectedStudentId(s.id)}
                    selectedStudent={selectedStudent}
                    isDarkMode={isDarkMode}
                    activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
                    onBatchSyncStudents={handleBatchSyncStudents}
                  />
                </div>
              )}
            </aside>

            {/* Bright Orange line separator between student list and question board */}
            <div className="w-[3px] bg-[#f97316] h-full hidden md:block shrink-0" />

            <section className={`flex-1 md:basis-3/5 h-full overflow-hidden flex flex-col ${
              isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-50'
            }`}>
              <QuizPanel
                cards={cards}
                onCardClick={(c) => setActiveCardId(c.id)}
                onAnswer={handleAnswer}
                onReset={resetMatch}
                activeCard={activeCard}
                onCloseActiveCard={() => setActiveCardId(null)}
                selectedStudent={selectedStudent}
                chapters={chapters}
                activeRoomId={activeRoomId}
                onSelectRoom={handleSelectRoom}
                onCreateRoom={handleCreateRoom}
                onDeleteRoom={handleDeleteRoom}
                onRenameRoom={handleRenameRoom}
                onCreateChapter={handleCreateChapter}
                onRenameChapter={handleRenameChapter}
                onDeleteChapter={handleDeleteChapter}
                isDarkMode={isDarkMode}
                onUpdateCards={handleUpdateCards}
                subjects={subjects}
                activeSubjectId={activeSubjectId}
                onSelectSubject={handleSelectSubject}
                onCreateSubject={handleCreateSubject}
                onRenameSubject={handleRenameSubject}
                onDeleteSubject={handleDeleteSubject}
                onOpenLessonModal={() => setIsLessonModalOpen(true)}
              />
            </section>
          </>
        )}

        {activeTab === 'groups' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <GroupDivider
              students={currentClassStudents}
              activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
              activeClassId={activeClassId || ''}
              teacher={teacher}
              classes={classes}
              isDarkMode={isDarkMode}
              onBatchSyncStudents={handleBatchSyncStudents}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onAwardGroupWorkPoints={awardStudentGroupWorkPoints}
              onUpdateStudentDetail={updateStudentDetail}
            />
          </div>
        )}

        {activeTab === 'stopwatch' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <StopwatchPanel
              isDarkMode={isDarkMode}
              activeClassId={activeClassId || ''}
              className={activeClass?.name || 'ថ្នាក់រៀន'}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          </div>
        )}

        {activeTab === 'students' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <StudentManager
              students={students}
              classes={classes}
              activeClassId={activeClassId}
              isDarkMode={isDarkMode}
              teacher={teacher}
              onAddStudentDetail={addStudentDetail}
              onRemoveStudent={removeStudent}
              onClearStudents={clearStudents}
              onUpdateStudentDetail={updateStudentDetail}
              onBulkAddStudents={handleBulkAddStudents}
              onBatchSyncStudents={handleBatchSyncStudents}
              onSwitchClass={handleSwitchClass}
            />
          </div>
        )}

        {activeTab === 'student-lobby' && (
          <StudentLobby
            activeClassId={activeClassId}
            className={activeClass?.name || 'ថ្នាក់រៀន'}
            teacher={teacher}
            activeRoomId={activeRoomId}
            students={currentClassStudents}
            cards={cards}
            activeCardId={activeCardId}
            isDarkMode={isDarkMode}
            setActiveCardId={setActiveCardId}
            activeCardState={activeCardState}
            setActiveCardState={setActiveCardState}
            activeSubjectName={subjects.find(s => s.id === activeSubjectId)?.name}
            onNavigateToSmartNotes={() => setActiveTab('smart-notes')}
          />
        )}

        {activeTab === 'exams-room' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <ExamsPanel
              activeClassId={activeClassId || ''}
              activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
              isDarkMode={isDarkMode}
              teacher={teacher}
              classes={classes}
              onSwitchClass={handleSwitchClass}
            />
          </div>
        )}

        {activeTab === 'smart-notes' && (
          <div className="flex-1 h-full overflow-hidden">
            <SmartNotesApp isDarkMode={isDarkMode} />
          </div>
        )}
      </main>

      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        onQuestionsGenerated={handleQuestionsGenerated}
      />

      <TeacherAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(acc) => setTeacher(acc)}
        initialMode={authModalMode}
      />

      {teacher && (
        <TeacherProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          teacher={teacher}
          onUpdateTeacher={(updated) => setTeacher(updated)}
          onLogout={() => {
            setIsProfileModalOpen(false);
            setIsLogoutModalOpen(true);
          }}
        />
      )}

      <ClassModal
        isOpen={classModalState.isOpen}
        mode={classModalState.mode}
        currentName={classModalState.currentName}
        onClose={() => setClassModalState(prev => ({ ...prev, isOpen: false }))}
        onSave={handleSaveClassModal}
      />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ចាកចេញពីគណនី</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Logout Account</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់ចាកចេញពីគណនីមែនទេ? (រាល់ទិន្នន័យដែលបានរក្សាទុកក្នុង Cloud នឹងមិនបាត់បង់ឡើយ)
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ចាកចេញ</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* iOS Settings & Menu Drawer (Slide Right-to-Left Blue Glass) */}
      <SettingsMenuDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenLessonModal={() => setIsLessonModalOpen(true)}
        onResetAll={resetAll}
        teacher={teacher}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onLogout={() => setIsLogoutModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        classes={classes}
        students={students}
        subjects={subjects}
        cards={cards}
        chapters={chapters}
        activeClassId={activeClassId}
        onRestoreFullData={handleRestoreFullData}
        onShowToast={showToast}
      />

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        classes={classes}
        students={students}
        subjects={subjects}
        cards={cards}
        chapters={chapters}
        activeClassId={activeClassId}
        teacher={teacher}
        onRestoreData={handleRestoreFullData}
        onShowToast={showToast}
        isDarkMode={isDarkMode}
      />

      {/* Keyboard Shortcuts Guide Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-2xl backdrop-blur-md flex items-center gap-2.5 border border-white/20 select-none pointer-events-none"
          >
            <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-500" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


