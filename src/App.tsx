/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, LayoutGrid, RotateCcw, User, UserPlus, LogIn, LogOut, Plus, Moon, Sun, Trash2, GraduationCap, Compass, Users as UsersIcon, UserCog, Check, X, Cloud, Loader2, Pencil, ChevronLeft, ChevronRight, GripVertical, Camera, Pin, PinOff } from 'lucide-react';
import StudentPanel from './components/StudentPanel';
import QuizPanel from './components/QuizPanel';
import LessonModal from './components/LessonModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import SpinningWheel from './components/SpinningWheel';
import GroupDivider from './components/GroupDivider';
import StopwatchPanel from './components/StopwatchPanel';
import StudentManager from './components/StudentManager';
import { Student, Question, QuizCard, ClassInfo, TeacherAccount, QuizRoom, QuizChapter, QuizSubject, isStudentInClass, DEFAULT_CLOUD_TEACHER } from './types';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, safeSetDoc, safeDeleteDoc, safeOnSnapshot, safeGetDoc, safeGetDocs, saveTeacherToLocalRegistry, getTeacherFromLocalRegistry } from './lib/firebase';
import StudentPlayView from './components/StudentPlayView';
import StudentLobby from './components/StudentLobby';
import ExamsPanel from './components/ExamsPanel';
import SovannaphumiLogo from './components/SovannaphumiLogo';
import { GlassLiquidOverlay, GlassLiquidButton } from './components/GlassLiquidCapsule';
import { useConfirm } from './context/ConfirmContext.tsx';
import { ClassModal } from './components/ClassModal';
import SmartNotesApp from './components/smart-notes/SmartNotesApp';
import { BookOpen } from 'lucide-react';
import { addActivityPointsToStudent, setActivityScoreForStudent, addGroupWorkPointsToStudent, getCurrentDateScoreSlot } from './lib/scoreUtils';
import { safeSetItem, safeSetJSON, safeRemoveItem } from './lib/storageUtils';

const EMOJIS = ["🥰", "😂", "😩", "🥳", "🥺", "😇", "😎", "🤩", "🤔", "🤗", "🤭", "🫠", "😤", "😮💨", "🫡", "😬", "🙄", "🤒", "😵💫", "😳", "🤪", "😜", "🤫", "🫣", "☹️", "😕"];

function getMigratedSubjects(
  loadedChapters: QuizChapter[],
  teacherObj?: TeacherAccount | null
): { subjects: QuizSubject[], activeSubjectId: string } {
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

  const rawTeacherSubjects = teacherObj?.subjects && teacherObj.subjects.trim();
  const parsedNames = rawTeacherSubjects
    ? rawTeacherSubjects.split(/[,,\n፤]/).map(s => s.trim()).filter(Boolean)
    : [];

  const uniqueNames = Array.from(new Set(parsedNames.length > 0 ? parsedNames : ['ភាសាខ្មែរ']));

  const defaultSubjects: QuizSubject[] = uniqueNames.map((subjName, idx) => ({
    id: `subj-${Date.now()}-${idx}`,
    name: subjName,
    chapters: idx === 0 ? chaptersToUse : [
      {
        id: `chapter-default-${Date.now()}-${idx}`,
        name: 'ជំពូកទី១',
        rooms: [
          {
            id: `room-default-${Date.now()}-${idx}`,
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
  }));

  return { subjects: defaultSubjects, activeSubjectId: defaultSubjects[0].id };
}

const SAMPLE_STUDENTS: Record<string, Student[]> = {};

const isSampleDemoClass = (clsId: string, clsName?: string): boolean => {
  if (!clsId && !clsName) return false;

  const sampleBaseIds = [
    'class-7a', 'class-8a', 'class-9a', 
    'class-7a1', 'class-8a1', 'class-9a1', 'class-10a1'
  ];

  const sampleNames = [
    'ថ្នាក់ទី៧ក', 'ថ្នាក់ទី៨ក', 'ថ្នាក់ទី៩ក', 
    'ថ្នាក់ទី៧ក១', 'ថ្នាក់ទី៨ក១', 'ថ្នាក់ទី៩ក១', 'ថ្នាក់ទី១០ក១'
  ];

  if (clsId) {
    if (sampleBaseIds.includes(clsId)) return true;
    if (sampleBaseIds.some(base => clsId.startsWith(`${base}-`))) return true;
  }

  if (clsName) {
    const trimmed = clsName.trim();
    if (sampleNames.includes(trimmed)) return true;
  }

  return false;
};

const DEFAULT_CLASSES: ClassInfo[] = [
  { id: 'class-7a', name: 'ថ្នាក់ទី៧ក', order: 0 },
  { id: 'class-8a', name: 'ថ្នាក់ទី៨ក', order: 1 },
  { id: 'class-9a', name: 'ថ្នាក់ទី៩ក', order: 2 }
];

const sortClasses = (classList: ClassInfo[]): ClassInfo[] => {
  const clean = classList.filter(c => c && c.name && c.name.trim() !== '');
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
    const orderA = typeof a.order === 'number' ? a.order : 999;
    const orderB = typeof b.order === 'number' ? b.order : 999;
    return orderA - orderB;
  });

  return sorted.map((c, idx) => ({ ...c, order: idx }));
};

function getInitialActiveTeacherAndClass() {
  const savedTeacherObj = localStorage.getItem('logged_in_teacher');
  let teacherObj: TeacherAccount | null = null;
  let teacherId = '';
  if (savedTeacherObj) {
    try {
      const parsed = JSON.parse(savedTeacherObj);
      if (parsed && parsed.id) {
        teacherObj = parsed;
        teacherId = parsed.id;
      }
    } catch {}
  }

  if (!teacherObj) {
    return {
      teacher: null,
      activeClassId: '',
      classes: []
    };
  }

  const savedActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherId}`) || '';
  const savedClassesRaw = localStorage.getItem(`khmer_teacher_classes_${teacherId}`);
  let effectiveClassId = savedActiveId;
  let parsedClasses: ClassInfo[] = [];
  if (savedClassesRaw) {
    try {
      const raw = JSON.parse(savedClassesRaw) as ClassInfo[];
      parsedClasses = (raw || []).filter(c => c && c.name && c.name.trim() !== '' && !isSampleDemoClass(c.id, c.name));
    } catch {}
  }

  if (savedActiveId && parsedClasses.some(c => c.id === savedActiveId)) {
    effectiveClassId = savedActiveId;
  } else if (parsedClasses.length > 0) {
    effectiveClassId = parsedClasses[0].id;
  }

  return {
    teacher: teacherObj,
    activeClassId: effectiveClassId,
    classes: parsedClasses
  };
}

export default function App() {
  const [studentMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'student';
  });

  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  if (studentMode) {
    return <StudentPlayView />;
  }

  const { confirmAction } = useConfirm();

  const [activeTab, setActiveTab] = useState<'wheel' | 'quiz' | 'groups' | 'stopwatch' | 'students' | 'student-lobby' | 'exams-room' | 'smart-notes'>('wheel');
  const [showWheelBulk, setShowWheelBulk] = useState(false);
  const [quizLeftView, setQuizLeftView] = useState<'wheel' | 'list'>('wheel');
  const [loadingCloudData, setLoadingCloudData] = useState(false);

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
    const { teacher, activeClassId: currentActiveId } = getInitialActiveTeacherAndClass();
    if (!teacher || !currentActiveId) return [];
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
    const { teacher, activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!teacher || !activeId) return [];
    try {
      const saved = localStorage.getItem(`picked_students_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // State សម្រាប់សិស្សដែលគ្រូបានហៅផ្ទាល់ (Teacher manually called)
  const [manualCalledIds, setManualCalledIds] = useState<string[]>(() => {
    const { teacher, activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!teacher || !activeId) return [];
    try {
      const saved = localStorage.getItem(`manual_called_students_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [subjects, setSubjects] = useState<QuizSubject[]>(() => {
    const { teacher, activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!teacher || !activeId) return [];
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
    const { teacher, activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!teacher || !activeId) return null;
    try {
      return localStorage.getItem(`active_subject_id_${activeId}`);
    } catch {
      return null;
    }
  });

  const [chapters, setChapters] = useState<QuizChapter[]>(() => {
    const { teacher, activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!teacher || !activeId) return [];
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
    const { teacher, activeClassId: activeId } = getInitialActiveTeacherAndClass();
    if (!teacher || !activeId) return null;
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
    setActiveCardState('answering');
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

  const [isAddingSubjectTop, setIsAddingSubjectTop] = useState(false);
  const [newSubjectNameTop, setNewSubjectNameTop] = useState('');
  const [editingSubjectIdTop, setEditingSubjectIdTop] = useState<string | null>(null);
  const [tempSubjectNameTop, setTempSubjectNameTop] = useState('');

  const [teacher, setTeacher] = useState<TeacherAccount | null>(() => {
    const saved = localStorage.getItem('logged_in_teacher');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          if (parsed.name === 'លោកគ្រូ/អ្នកគ្រូ សុវណ្ណភូមិ') {
            parsed.name = 'បង្កើតគណនីគ្រូ';
            localStorage.setItem('logged_in_teacher', JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const effectiveTeacher = teacher;
  const effectiveTeacherId = teacher?.id || '';

  const lastSubjectsStrRef = useRef<string>('');
  const lastCardsStrRef = useRef<string>('');
  const activeSubjectIdRef = useRef<string | null>(activeSubjectId);
  const activeRoomIdRef = useRef<string | null>(activeRoomId);
  const lastPickedStrRef = useRef<string>('');
  const activeCardIdRef = useRef<string | null>(activeCardId);
  const activeCardStateRef = useRef<'answering' | 'revealed'>(activeCardState);

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
      const currentTeacherId = effectiveTeacherId;
      if (currentTeacherId) {
        safeSetJSON(`khmer_teacher_classes_${currentTeacherId}`, finalizedClasses);
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
        safeSetJSON('khmer_teacher_classes', finalizedClasses);
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
      const currentTeacherId = effectiveTeacherId;
      if (currentTeacherId) {
        safeSetJSON(`khmer_teacher_classes_${currentTeacherId}`, finalizedClasses);
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
            console.error("Failed to save pinned class state to Firestore:", err);
          }
        })();
      } else {
        safeSetJSON('khmer_teacher_classes', finalizedClasses);
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
      const currentTeacherId = effectiveTeacherId;
      if (currentTeacherId) {
        safeSetJSON(`khmer_teacher_classes_${currentTeacherId}`, finalizedClasses);
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
        safeSetJSON('khmer_teacher_classes', finalizedClasses);
      }
      return finalizedClasses;
    });
  };

  // Real-Time Cross-Device Synchronization for Teacher Profile and Classes
  useEffect(() => {
    if (!effectiveTeacherId) {
      setLoadingCloudData(false);
      return;
    }

    let unsubTeacher: (() => void) | null = null;
    let unsubClasses: (() => void) | null = null;
    let safetyTimer: any = null;

    try {
      setLoadingCloudData(true);
      safetyTimer = setTimeout(() => {
        setLoadingCloudData(false);
      }, 2000);

      // 1. Real-time Teacher Profile sync across devices
      const teacherDocRef = doc(db, 'teachers', effectiveTeacherId);
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
      const classesCollRef = collection(db, 'teachers', effectiveTeacherId, 'classes');
      unsubClasses = safeOnSnapshot(classesCollRef, (classesSnap: any) => {
        if (!classesSnap) return;

        let fetchedClasses: ClassInfo[] = [];
        const seenIds = new Set<string>();

        const currentTeacherId = effectiveTeacherId;
        const deletedKey = `khmer_teacher_deleted_classes_${currentTeacherId}`;
        const deletedClassesStr = localStorage.getItem(deletedKey);
        let deletedSet = new Set<string>();
        if (deletedClassesStr) {
          try {
            deletedSet = new Set<string>(JSON.parse(deletedClassesStr));
          } catch {}
        }

        classesSnap.forEach((docSnap: any) => {
          const clsData = docSnap.data() as ClassInfo;
          const id = clsData.id || docSnap.id;
          clsData.id = id;
          if (deletedSet.has(id)) return;
          if (isSampleDemoClass(id, clsData.name)) {
            safeDeleteDoc(doc(db, 'teachers', effectiveTeacherId, 'classes', id)).catch(() => {});
            return;
          }
          if (clsData && clsData.name && clsData.name.trim() !== '') {
            if (!seenIds.has(id)) {
              seenIds.add(id);
              fetchedClasses.push(clsData);
            }
          }
        });

        // Get locally saved classes fallback
        const isDefaultTeacherAccount = effectiveTeacherId === DEFAULT_CLOUD_TEACHER.id;
        const localClassesStr = localStorage.getItem(`khmer_teacher_classes_${effectiveTeacherId}`);
        let parsedLocals: ClassInfo[] = [];
        let localClassesMap = new Map<string, number>();
        if (localClassesStr) {
          try {
            parsedLocals = (JSON.parse(localClassesStr) as ClassInfo[]).filter(c => c && c.name && c.name.trim() !== '' && !isSampleDemoClass(c.id, c.name));
            parsedLocals.forEach((lc, index) => {
              if (lc && lc.id) {
                localClassesMap.set(lc.id, typeof lc.order === 'number' ? lc.order : index);
              }
            });
          } catch (e) {}
        }

        // Merge local classes with fetched cloud classes
        if (parsedLocals.length > 0) {
          for (const lc of parsedLocals) {
            if (deletedSet.has(lc.id) || isSampleDemoClass(lc.id, lc.name)) continue;
            const existsInFetched = fetchedClasses.some(fc => fc.id === lc.id || fc.name.trim() === lc.name.trim());
            if (!existsInFetched) {
              fetchedClasses.push(lc);
              safeSetDoc(doc(db, 'teachers', effectiveTeacherId, 'classes', lc.id), {
                id: lc.id,
                name: lc.name.trim(),
                order: typeof lc.order === 'number' ? lc.order : fetchedClasses.length,
                createdAt: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }
          }
        }

        // If 0 classes for this teacher, keep fetchedClasses empty so teacher can create custom classes

        fetchedClasses = fetchedClasses.map((cls, idx) => {
          if (typeof cls.order === 'number') return cls;
          if (localClassesMap.has(cls.id)) {
            return { ...cls, order: localClassesMap.get(cls.id) };
          }
          return { ...cls, order: idx };
        });

        const sortedCloudClasses = sortClasses(fetchedClasses);
        setClasses(prev => {
          const isSame = prev.length === sortedCloudClasses.length &&
            prev.every((c, i) => c.id === sortedCloudClasses[i].id && c.name === sortedCloudClasses[i].name && c.order === sortedCloudClasses[i].order && c.isPinned === sortedCloudClasses[i].isPinned);
          if (isSame) return prev;
          return sortedCloudClasses;
        });

        safeSetJSON(`khmer_teacher_classes_${effectiveTeacherId}`, sortedCloudClasses);
        if (isDefaultTeacherAccount) {
          safeSetJSON('khmer_teacher_classes', sortedCloudClasses);
        }

        if (sortedCloudClasses.length > 0) {
          setActiveClassId(curr => {
            if (curr && sortedCloudClasses.some(c => c.id === curr)) return curr;
            const lastActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${effectiveTeacherId}`) || localStorage.getItem('khmer_teacher_active_class_id') || sortedCloudClasses[0].id;
            const exists = sortedCloudClasses.some(c => c.id === lastActiveId);
            return exists ? lastActiveId : sortedCloudClasses[0].id;
          });
        } else {
          setActiveClassId('');
        }
        setLoadingCloudData(false);
      }, (err: any) => {
        console.warn('Notice: Operating with local class data while cloud sync is reconnecting:', err);
        setLoadingCloudData(false);
      });

    } catch (err) {
      console.warn('Notice: Failed setting up real-time class listeners:', err);
      setLoadingCloudData(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      if (typeof unsubTeacher === 'function') unsubTeacher();
      if (typeof unsubClasses === 'function') unsubClasses();
    };
  }, [effectiveTeacherId]);

  // Load students, cards, and picked status when activeClassId shifts
  useEffect(() => {
    if (!effectiveTeacherId) {
      setClasses([]);
      setActiveClassId('');
      setStudents([]);
      setSubjects([]);
      setChapters([]);
      setCards([]);
      setPickedIds([]);
      setManualCalledIds([]);
      setLoadingCloudData(false);
      return;
    }

    if (!activeClassId) return;
    localStorage.setItem(`khmer_teacher_active_class_id_${effectiveTeacherId}`, activeClassId);

    const loadClassDetails = async () => {
      try {
        setLoadingCloudData(true);
        
        // 1. Fetch class doc
        const classDocRef = doc(db, 'teachers', effectiveTeacherId, 'classes', activeClassId);
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

            // Sync with teacher's profile subjects: ensure all subjects defined in teacher.subjects exist
            const effectiveTeacherSubjectStr = effectiveTeacher?.subjects?.trim();
            if (effectiveTeacherSubjectStr) {
              const teacherSubNames = effectiveTeacherSubjectStr.split(/[,,\n፤]/).map(s => s.trim()).filter(Boolean);
              let modified = false;

              teacherSubNames.forEach((tName, idx) => {
                const exists = loadedSubjects.some(s => s.name.trim().toLowerCase() === tName.toLowerCase());
                if (!exists) {
                  if (loadedSubjects.length === 1 && idx === 0 && (loadedSubjects[0].name === 'រូបវិទ្យា' || loadedSubjects[0].name === 'ភាសាខ្មែរ')) {
                    loadedSubjects[0].name = tName;
                    modified = true;
                  } else {
                    loadedSubjects.push({
                      id: `subj-${Date.now()}-${idx}`,
                      name: tName,
                      chapters: [
                        {
                          id: `chapter-default-${Date.now()}-${idx}`,
                          name: 'ជំពូកទី១',
                          rooms: [
                            {
                              id: `room-default-${Date.now()}-${idx}`,
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
                    });
                    modified = true;
                  }
                }
              });

              if (modified) {
                safeSetJSON(`subjects_class_${activeClassId}`, loadedSubjects);
                safeSetDoc(classDocRef, {
                  subjects: loadedSubjects
                }, { merge: true }).catch(() => {});
              }
            }
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
            
            const migration = getMigratedSubjects(tempChapters, effectiveTeacher);
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
              const migration = getMigratedSubjects([], effectiveTeacher);
              loadedSubjects = migration.subjects;
              loadedActiveSubjectId = migration.activeSubjectId;
            }
          } else {
            const migration = getMigratedSubjects([], effectiveTeacher);
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
        if ((!resolvedCards || resolvedCards.length === 0) && !classSnap.exists()) {
          const localCardsStr = localStorage.getItem(`quiz_cards_class_${activeClassId}`);
          if (localCardsStr) {
            try {
              const parsedLocals = JSON.parse(localCardsStr);
              if (Array.isArray(parsedLocals) && parsedLocals.length > 0) {
                resolvedCards = parsedLocals;
                if (activeRoom) {
                  activeRoom.cards = resolvedCards;
                }
              }
            } catch {}
          }
        }

        setCards(resolvedCards);
        setPickedIds(activeRoom?.pickedIds || []);
        lastLoadedClassId.current = activeClassId;
        lastSubjectsStrRef.current = JSON.stringify(loadedSubjects);
        lastCardsStrRef.current = JSON.stringify(resolvedCards);
        lastPickedStrRef.current = JSON.stringify(activeRoom?.pickedIds || []);

        // Immediately cache to localStorage so refresh and tab switches retain the exact cloud data
        safeSetJSON(`subjects_class_${activeClassId}`, loadedSubjects);
        safeSetJSON(`chapters_class_${activeClassId}`, loadedChapters);
        if (loadedActiveSubjectId) {
          safeSetItem(`active_subject_id_${activeClassId}`, loadedActiveSubjectId);
        }
        if (loadedActiveRoomId) {
          safeSetItem(`active_room_id_${activeClassId}`, loadedActiveRoomId);
        }
        safeSetJSON(`quiz_cards_class_${activeClassId}`, resolvedCards);
        safeSetJSON(`picked_students_class_${activeClassId}`, activeRoom?.pickedIds || []);

        if (classSnap.exists()) {
          const cData = classSnap.data();
          if (Array.isArray(cData.exams) && cData.exams.length > 0) {
            safeSetJSON(`khmer_exams_${activeClassId}`, cData.exams);
          }
        }

        // 2. Fetch students
        const studentsCollRef = collection(db, 'teachers', effectiveTeacherId, 'classes', activeClassId, 'students');
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
              foreignStudentsToDelete.push(data.id);
              if (data.classId) {
                safeSetDoc(doc(db, 'teachers', effectiveTeacherId, 'classes', data.classId, 'students', data.id), data).catch(() => {});
              }
            }
          }
        });

        for (const fId of foreignStudentsToDelete) {
          safeDeleteDoc(doc(db, 'teachers', effectiveTeacherId, 'classes', activeClassId, 'students', fId)).catch(() => {});
        }

        // Merge locally saved students in case any were added before sync or offline
        const localStudentsStr = localStorage.getItem(`students_class_${activeClassId}`);
        if (localStudentsStr) {
          try {
            const parsedLocals = JSON.parse(localStudentsStr) as Student[];
            if (Array.isArray(parsedLocals)) {
              for (const std of parsedLocals) {
                if (std && std.id && !std.id.startsWith('sim-')) {
                  if (isStudentInClass(std, activeClassId, activeClassName)) {
                    if (!loadedStudents.some(s => s.id === std.id)) {
                      const stdWithClass = std.classId ? std : { ...std, classId: activeClassId };
                      loadedStudents.push(stdWithClass);
                      safeSetDoc(doc(db, 'teachers', effectiveTeacherId, 'classes', activeClassId, 'students', std.id), stdWithClass).catch(() => {});
                    }
                  }
                }
              }
            }
          } catch (e) {}
        }
        
        setStudents(loadedStudents);
        if (activeClassId) {
          safeSetJSON(`subjects_class_${activeClassId}`, loadedSubjects);
          safeSetJSON(`chapters_class_${activeClassId}`, loadedChapters);
          if (loadedActiveSubjectId) {
            safeSetItem(`active_subject_id_${activeClassId}`, loadedActiveSubjectId);
          }
          if (loadedActiveRoomId) {
            safeSetItem(`active_room_id_${activeClassId}`, loadedActiveRoomId);
          }
          safeSetJSON(`students_class_${activeClassId}`, loadedStudents);
        }
        lastLoadedClassId.current = activeClassId;
      } catch (err) {
        console.error('Failed to load class details from Firestore:', err);
      } finally {
        setLoadingCloudData(false);
      }
    };

    loadClassDetails();
  }, [activeClassId, effectiveTeacherId]);

  // Real-time Student Synchronization for cloud sessions (across all devices)
  useEffect(() => {
    if (!activeClassId || !effectiveTeacherId) return;

    const studentsCollRef = collection(db, 'teachers', effectiveTeacherId, 'classes', activeClassId, 'students');
    const unsubscribe = safeOnSnapshot(studentsCollRef, (snapshot: any) => {
      const activeCls = classes.find(c => c.id === activeClassId);
      const activeClassName = activeCls?.name;

      if (snapshot.empty) {
        // Protect local students from being wiped if snapshot reports empty during network latency
        const localStudentsStr = localStorage.getItem(`students_class_${activeClassId}`);
        if (localStudentsStr) {
          try {
            const parsed = JSON.parse(localStudentsStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const validLocals = parsed.filter((std: any) => std && std.id && !std.id.startsWith('sim-') && isStudentInClass(std, activeClassId, activeClassName));
              if (validLocals.length > 0) {
                for (const std of validLocals) {
                  safeSetDoc(doc(db, 'teachers', effectiveTeacherId, 'classes', activeClassId, 'students', std.id), std).catch(() => {});
                }
                setStudents(validLocals);
                return;
              }
            }
          } catch {}
        }
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
      safeSetJSON(`students_class_${activeClassId}`, loadedStudents);
    }, (err) => {
      console.error("Real-time snapshot error for students collection:", err);
    });

    return () => unsubscribe();
  }, [activeClassId, effectiveTeacherId, classes]);

  // Real-time Class Document Synchronization (Subjects, Rooms, Quiz Cards, Picked IDs) across devices
  useEffect(() => {
    if (!activeClassId || !effectiveTeacherId) return;

    // Reset sync refs on class shift so the new class document updates immediately
    lastSubjectsStrRef.current = '';
    lastPickedStrRef.current = '';
    lastCardsStrRef.current = '';
    activeRoomIdRef.current = null;
    activeSubjectIdRef.current = null;

    const classDocRef = doc(db, 'teachers', effectiveTeacherId, 'classes', activeClassId);
    const unsubscribe = safeOnSnapshot(classDocRef, (snap: any) => {
      if (!snap || !snap.exists()) return;
      const classData = snap.data();
      if (!classData) return;

      let currChapters: QuizChapter[] = [];
      let targetRoom: QuizRoom | undefined;

      // 1. Subjects and Rooms
      if (Array.isArray(classData.subjects) && classData.subjects.length > 0) {
        const incomingSubjectsStr = JSON.stringify(classData.subjects);
        if (incomingSubjectsStr !== lastSubjectsStrRef.current) {
          lastSubjectsStrRef.current = incomingSubjectsStr;
          setSubjects(classData.subjects);
          safeSetItem(`subjects_class_${activeClassId}`, incomingSubjectsStr);

          // Update active subject and chapters
          const activeSubId = classData.activeSubjectId || activeSubjectIdRef.current || classData.subjects[0].id;
          if (activeSubId !== activeSubjectIdRef.current) {
            activeSubjectIdRef.current = activeSubId;
            setActiveSubjectId(activeSubId);
            safeSetItem(`active_subject_id_${activeClassId}`, activeSubId);
          }

          const currentSub = classData.subjects.find((s: QuizSubject) => s.id === activeSubId) || classData.subjects[0];
          currChapters = currentSub?.chapters || [];
          setChapters(currChapters);
          safeSetJSON(`chapters_class_${activeClassId}`, currChapters);

          // Find active room
          const targetRoomId = classData.activeRoomId || activeRoomIdRef.current;
          for (const ch of currChapters) {
            targetRoom = ch.rooms.find(r => r.id === targetRoomId);
            if (targetRoom) break;
          }
          if (!targetRoom && currChapters.length > 0 && currChapters[0].rooms.length > 0) {
            targetRoom = currChapters[0].rooms[0];
          }

          if (targetRoom && targetRoom.id !== activeRoomIdRef.current) {
            activeRoomIdRef.current = targetRoom.id;
            setActiveRoomId(targetRoom.id);
            safeSetItem(`active_room_id_${activeClassId}`, targetRoom.id);
          }
        }
      }

      // 2. Authoritative Cards for this class & room (Real-time sync across Laptop, PC, iPhone, iPad, Android)
      let roomCards: QuizCard[] | null = null;
      if (targetRoom && Array.isArray(targetRoom.cards)) {
        roomCards = targetRoom.cards;
      } else if (Array.isArray(classData.cards)) {
        roomCards = classData.cards;
      }

      if (roomCards !== null) {
        const incomingCardsStr = JSON.stringify(roomCards);
        if (incomingCardsStr !== lastCardsStrRef.current) {
          lastCardsStrRef.current = incomingCardsStr;
          setCards(roomCards);
          safeSetJSON(`quiz_cards_class_${activeClassId}`, roomCards);
        }
      }

      // 3. Picked IDs on the wheel/quiz
      const incomingPicked = (targetRoom && Array.isArray(targetRoom.pickedIds))
        ? targetRoom.pickedIds
        : (Array.isArray(classData.pickedIds) ? classData.pickedIds : null);
      if (incomingPicked !== null) {
        const incomingPickedStr = JSON.stringify(incomingPicked);
        if (incomingPickedStr !== lastPickedStrRef.current) {
          lastPickedStrRef.current = incomingPickedStr;
          setPickedIds(incomingPicked);
          safeSetItem(`picked_students_class_${activeClassId}`, incomingPickedStr);
        }
      }

      // 4. Manually called students
      if (Array.isArray(classData.manualCalledIds)) {
        setManualCalledIds(classData.manualCalledIds);
        safeSetJSON(`manual_called_students_class_${activeClassId}`, classData.manualCalledIds);
      }

      // 5. Active card & card state (answering/revealed)
      if (classData.activeCardId !== undefined && classData.activeCardId !== activeCardIdRef.current) {
        activeCardIdRef.current = classData.activeCardId;
        setActiveCardId(classData.activeCardId);
      }
      if (classData.activeCardState && classData.activeCardState !== activeCardStateRef.current) {
        activeCardStateRef.current = classData.activeCardState;
        setActiveCardState(classData.activeCardState);
      }
    }, (err) => {
      console.warn("Notice: Real-time class snapshot error:", err);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeClassId, teacher?.id]);

  // Sync active quiz state to Class document in Firestore for student phones
  useEffect(() => {
    if (!activeClassId || !teacher?.id) return;
    const currentTeacherId = teacher.id;

    const syncClassInfo = async () => {
      try {
        const classDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId);
        const currentActiveCard = cards.find(c => c.id === activeCardId) || null;
        
        await safeSetDoc(classDocRef, {
          activeCardId: activeCardId,
          activeRoomId: activeRoomId,
          activeTab: activeTab,
          activeCardState: activeCardState,
          activeCard: currentActiveCard
        }, { merge: true });
      } catch (err) {
        console.error("Failed to sync active state to Firestore:", err);
      }
    };

    syncClassInfo();
  }, [activeClassId, activeCardId, activeRoomId, activeTab, activeCardState, teacher, cards]);

  // Save changes to localStorage on states update as fallback for offline use and fast initial load
  useEffect(() => {
    if (teacher) {
      safeSetJSON(`khmer_teacher_classes_${teacher.id}`, classes);
    } else {
      safeSetJSON('khmer_teacher_classes', classes);
    }
  }, [classes, teacher]);

  useEffect(() => {
    if (activeClassId && lastLoadedClassId.current === activeClassId) {
      const activeCls = classes.find(c => c.id === activeClassId);
      const classOnlyStudents = students.filter(s => isStudentInClass(s, activeClassId, activeCls?.name));
      safeSetJSON(`students_class_${activeClassId}`, classOnlyStudents);
    }
  }, [students, activeClassId, classes]);

  // Helper to save class-level states to Firestore
  const saveClassMetadata = useCallback(async (updatedCards: QuizCard[], updatedPickedIds: string[]) => {
    if (!activeClassId) return;

    // Immediately cache cards and picked IDs to localStorage for this specific class
    safeSetJSON(`quiz_cards_class_${activeClassId}`, updatedCards);
    safeSetJSON(`picked_students_class_${activeClassId}`, updatedPickedIds);

    let currentSubjects = subjects;
    let currentSubId = activeSubjectId;
    if (!currentSubjects || currentSubjects.length === 0) {
      const mig = getMigratedSubjects([], effectiveTeacher);
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

    safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
    safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
    safeSetItem(`active_subject_id_${activeClassId}`, currentSubId);
    safeSetItem(`active_room_id_${activeClassId}`, currentRoomId);

    const currentTeacherId = effectiveTeacherId;
    try {
      await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters, // backward compatibility
        activeRoomId: currentRoomId,
        activeSubjectId: currentSubId,
        cards: updatedCards,
        pickedIds: updatedPickedIds
      }, { merge: true });
    } catch (err) {
      console.error('Failed to save class metadata to cloud:', err);
    }
  }, [effectiveTeacherId, activeClassId, activeRoomId, chapters, subjects, activeSubjectId]);

  // Helper to save student score updates to Firestore
  const saveStudentScore = useCallback(async (studentId: string, newScore: number) => {
    const currentTeacherId = effectiveTeacherId;
    if (activeClassId) {
      try {
        const student = students.find(s => s.id === studentId);
        const updatedSubjectScores = { ...(student?.subjectScores || {}) };
        if (activeSubjectId) {
          updatedSubjectScores[activeSubjectId] = {
            ...(updatedSubjectScores[activeSubjectId] || {}),
            score: newScore
          };
        }
        await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId), {
          score: newScore,
          subjectScores: updatedSubjectScores
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update student score on cloud:', err);
      }
    }
  }, [effectiveTeacherId, activeClassId, activeSubjectId, students]);

  // Helper to save pickedIds updates to Firestore immediately when wheel or panel changes it
  const handleSetPickedIds = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setPickedIds(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      
      const currentTeacherId = effectiveTeacherId;
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

        safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
          subjects: updatedSubjects,
          chapters: updatedChapters,
          activeRoomId: activeRoomId,
          activeSubjectId: activeSubjectId,
          pickedIds: next
        }, { merge: true }).catch(err => {
          console.error('Failed to sync pickedIds on updates in cloud:', err);
        });
      }
      return next;
    });
  }, [effectiveTeacherId, activeClassId, activeRoomId, activeSubjectId, chapters, subjects]);

  // Helper to award date-based activity points (5 points) into monthlyScores and total score
  const awardStudentActivityPoints = useCallback((studentId: string, points: number = 5) => {
    let targetStudent: Student | null = null;
    const currentTeacherId = effectiveTeacherId;

    setStudents(prev => {
      const student = prev.find(s => s.id === studentId);
      if (!student) return prev;

      const { updatedStudent } = addActivityPointsToStudent(student, points, new Date(), activeSubjectId || undefined);
      targetStudent = updatedStudent;

      const updatedList = prev.map(s => s.id === studentId ? updatedStudent : s);
      if (activeClassId) {
        safeSetJSON(`students_class_${activeClassId}`, updatedList);
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
  }, [activeClassId, effectiveTeacherId, activeSubjectId]);

  // Helper to set exact activity score directly for a student
  const handleSetExactActivityScore = useCallback((studentId: string, exactScore: number) => {
    let targetStudent: Student | null = null;
    const currentTeacherId = effectiveTeacherId;

    setStudents(prev => {
      const student = prev.find(s => s.id === studentId);
      if (!student) return prev;

      const { updatedStudent } = setActivityScoreForStudent(student, exactScore, new Date(), activeSubjectId || undefined);
      targetStudent = updatedStudent;

      const updatedList = prev.map(s => s.id === studentId ? updatedStudent : s);
      if (activeClassId) {
        safeSetJSON(`students_class_${activeClassId}`, updatedList);
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
  }, [activeClassId, effectiveTeacherId, activeSubjectId]);

  // Helper to award group work points directly to students (adds to monthlyScores.groupWork)
  const awardStudentGroupWorkPoints = useCallback((studentIds: string[], points: number) => {
    const currentTeacherId = effectiveTeacherId;
    const updatedStudentsList: Student[] = [];

    setStudents(prev => {
      const updatedList = prev.map(s => {
        if (studentIds.includes(s.id)) {
          const { updatedStudent } = addGroupWorkPointsToStudent(s, points, new Date(), activeSubjectId || undefined);
          updatedStudentsList.push(updatedStudent);
          return updatedStudent;
        }
        return s;
      });

      if (activeClassId) {
        safeSetJSON(`students_class_${activeClassId}`, updatedList);
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
  }, [activeClassId, effectiveTeacherId, activeSubjectId]);

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
        safeSetJSON(`manual_called_students_class_${activeClassId}`, next);
      }
      return next;
    });
  }, [activeClassId]);

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
        safeSetItem(`active_room_id_${activeClassId}`, roomId);
        safeSetJSON(`quiz_cards_class_${activeClassId}`, roomCards);
        safeSetJSON(`picked_students_class_${activeClassId}`, roomPicked);
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
      safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
      safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
      safeSetItem(`active_room_id_${activeClassId}`, newRoom.id);
    }

    const currentTeacherId = effectiveTeacherId;
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
          safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
          safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
          if (nextActiveId) {
            safeSetItem(`active_room_id_${activeClassId}`, nextActiveId);
          } else {
            safeRemoveItem(`active_room_id_${activeClassId}`);
          }
        }

        const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
      safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
    }

    const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
      safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
    }

    const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
      safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
    }

    const currentTeacherId = effectiveTeacherId;
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
          safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
          safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
          if (nextActiveRoomId) {
            safeSetItem(`active_room_id_${activeClassId}`, nextActiveRoomId);
          } else {
            safeRemoveItem(`active_room_id_${activeClassId}`);
          }
        }

        const currentTeacherId = effectiveTeacherId;
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
      safeSetItem(`active_subject_id_${activeClassId}`, subjectId);
    }
    const currentTeacherId = effectiveTeacherId;
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
          safeSetItem(`active_room_id_${activeClassId}`, firstRoom.id);
          safeSetJSON(`quiz_cards_class_${activeClassId}`, firstCards);
          safeSetJSON(`picked_students_class_${activeClassId}`, firstPicked);
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
          safeRemoveItem(`active_room_id_${activeClassId}`);
          safeSetJSON(`quiz_cards_class_${activeClassId}`, []);
          safeSetJSON(`picked_students_class_${activeClassId}`, []);
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
    const trimmed = subjectName.trim();
    if (!trimmed) return;

    // Check if subject already exists
    const existingSub = subjects.find(s => s.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existingSub) {
      setActiveSubjectId(existingSub.id);
      if (existingSub.chapters && existingSub.chapters.length > 0) {
        setChapters(existingSub.chapters);
        if (existingSub.chapters[0].rooms && existingSub.chapters[0].rooms.length > 0) {
          setActiveRoomId(existingSub.chapters[0].rooms[0].id);
        }
      }
      return;
    }

    const newSubject: QuizSubject = {
      id: `subject-${Date.now()}`,
      name: trimmed,
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
      safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
      safeSetItem(`active_subject_id_${activeClassId}`, newSubject.id);
      safeSetItem(`active_room_id_${activeClassId}`, defaultRoom.id);
      safeSetJSON(`chapters_class_${activeClassId}`, newSubject.chapters);
    }

    const currentTeacherId = effectiveTeacherId;
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        activeSubjectId: newSubject.id,
        activeRoomId: defaultRoom.id,
        chapters: newSubject.chapters
      }, { merge: true }).catch(err => console.error('Failed to create subject in cloud:', err));
    }

    // Persist new subject to teacher master profile subjects list
    if (teacher) {
      const currentTeacherSubs = (teacher.subjects || '').split(/[,,\n፤]/).map(s => s.trim()).filter(Boolean);
      if (!currentTeacherSubs.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        const updatedTeacherSubStr = [...currentTeacherSubs, trimmed].join(', ');
        const updatedTeacher = { ...teacher, subjects: updatedTeacherSubStr };
        setTeacher(updatedTeacher);
        localStorage.setItem('logged_in_teacher', JSON.stringify(updatedTeacher));
        saveTeacherToLocalRegistry(updatedTeacher);
        safeSetDoc(doc(db, 'teachers', teacher.id), {
          subjects: updatedTeacherSubStr
        }, { merge: true }).catch(err => console.warn('Failed syncing new subject to teacher profile:', err));
      }
    }
  }, [subjects, teacher, activeClassId, effectiveTeacherId]);

  const handleRenameSubject = useCallback((subjectId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, name: trimmed };
      }
      return s;
    });
    setSubjects(updatedSubjects);

    if (activeClassId) {
      safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
    }

    const currentTeacherId = effectiveTeacherId;
    if (activeClassId) {
      safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects
      }, { merge: true }).catch(err => console.error('Failed to rename subject in cloud:', err));
    }

    if (teacher) {
      const currentTeacherSubs = (teacher.subjects || '').split(/[,,\n፤]/).map(s => s.trim()).filter(Boolean);
      const targetSub = subjects.find(s => s.id === subjectId);
      const oldName = targetSub?.name?.trim();
      let newTeacherSubStr = '';
      if (oldName && currentTeacherSubs.some(s => s.toLowerCase() === oldName.toLowerCase())) {
        newTeacherSubStr = currentTeacherSubs.map(s => s.toLowerCase() === oldName.toLowerCase() ? trimmed : s).join(', ');
      } else {
        newTeacherSubStr = Array.from(new Set([...currentTeacherSubs, trimmed])).join(', ');
      }
      const updatedTeacher = { ...teacher, subjects: newTeacherSubStr };
      setTeacher(updatedTeacher);
      localStorage.setItem('logged_in_teacher', JSON.stringify(updatedTeacher));
      saveTeacherToLocalRegistry(updatedTeacher);
      safeSetDoc(doc(db, 'teachers', teacher.id), {
        subjects: newTeacherSubStr
      }, { merge: true }).catch(err => console.warn('Failed syncing subject rename to teacher profile:', err));
    }
  }, [subjects, teacher, activeClassId, effectiveTeacherId]);

  const handleUpdateTeacherProfile = useCallback((updatedTeacher: TeacherAccount) => {
    setTeacher(updatedTeacher);

    localStorage.setItem('logged_in_teacher', JSON.stringify(updatedTeacher));
    saveTeacherToLocalRegistry(updatedTeacher);

    // Sync current classes to this teacher account if not already saved
    if (classes && classes.length > 0) {
      safeSetJSON(`khmer_teacher_classes_${updatedTeacher.id}`, classes);
      safeSetJSON('khmer_teacher_classes', classes);
      classes.forEach(cls => {
        safeSetDoc(doc(db, 'teachers', updatedTeacher.id, 'classes', cls.id), {
          id: cls.id,
          name: cls.name,
          order: typeof cls.order === 'number' ? cls.order : 0,
          createdAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      });
    }

    const newSubjectName = updatedTeacher.subjects?.trim();
    if (newSubjectName) {
      const parsedTeacherSubs = newSubjectName.split(/[,,\n፤]/).map(s => s.trim()).filter(Boolean);
      if (parsedTeacherSubs.length > 0) {
        setSubjects(prevSubjects => {
          let updatedSubs = [...(prevSubjects || [])];

          parsedTeacherSubs.forEach((tName, idx) => {
            const exists = updatedSubs.some(s => s.name.trim().toLowerCase() === tName.toLowerCase());
            if (!exists) {
              if (updatedSubs.length === 1 && idx === 0) {
                updatedSubs[0].name = tName;
              } else {
                updatedSubs.push({
                  id: `subj-${Date.now()}-${idx}`,
                  name: tName,
                  chapters: [
                    {
                      id: `chapter-${Date.now()}-${idx}`,
                      name: 'ជំពូកទី១',
                      rooms: [
                        {
                          id: `room-${Date.now()}-${idx}`,
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
                });
              }
            }
          });

          if (activeClassId) {
            safeSetJSON(`subjects_class_${activeClassId}`, updatedSubs);
            safeSetDoc(doc(db, 'teachers', updatedTeacher.id, 'classes', activeClassId), {
              subjects: updatedSubs
            }, { merge: true }).catch(err => console.warn('Failed syncing profile subject to class:', err));
          }
          return updatedSubs;
        });
      }
    }
  }, [activeClassId, classes]);

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
            id: `subj-default-${Date.now()}`,
            name: (effectiveTeacher?.subjects && effectiveTeacher.subjects.trim()) || 'ភាសាខ្មែរ',
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
          safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
          if (nextSubjectId) {
            safeSetItem(`active_subject_id_${activeClassId}`, nextSubjectId);
          }
          if (nextActiveRoomId) {
            safeSetItem(`active_room_id_${activeClassId}`, nextActiveRoomId);
          }
          safeSetJSON(`chapters_class_${activeClassId}`, nextChapters);
        }

        const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(`students_class_${activeClassId}`, validCurrentStudents);
      safeSetJSON(`picked_students_class_${activeClassId}`, pickedIds);
      safeSetJSON(`manual_called_students_class_${activeClassId}`, manualCalledIds);
      safeSetJSON(`quiz_cards_class_${activeClassId}`, cards);

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
        safeSetJSON(`subjects_class_${activeClassId}`, updatedSubjects);
      }
      if (updatedChapters.length > 0) {
        safeSetJSON(`chapters_class_${activeClassId}`, updatedChapters);
      }
      if (activeSubjectId) {
        safeSetItem(`active_subject_id_${activeClassId}`, activeSubjectId);
      }
      if (activeRoomId) {
        safeSetItem(`active_room_id_${activeClassId}`, activeRoomId);
      }
    }

    lastSubjectsStrRef.current = '';
    lastPickedStrRef.current = '';
    lastCardsStrRef.current = '';
    activeRoomIdRef.current = null;
    activeSubjectIdRef.current = null;
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
      const migration = getMigratedSubjects([], effectiveTeacher);
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

    // Strictly isolate cards: prioritize target room's cards, or target class's own cached cards
    if (targetRoom && Array.isArray(targetRoom.cards) && targetRoom.cards.length > 0) {
      targetCards = targetRoom.cards;
    } else {
      const cachedCardsStr = localStorage.getItem(`quiz_cards_class_${classId}`);
      if (cachedCardsStr) {
        try {
          const parsed = JSON.parse(cachedCardsStr);
          if (Array.isArray(parsed)) {
            targetCards = parsed;
          } else {
            targetCards = [];
          }
        } catch {
          targetCards = [];
        }
      } else {
        targetCards = [];
      }
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
      
      const { subjects: defaultSubjects, activeSubjectId: defaultActiveSubjectId } = getMigratedSubjects([], effectiveTeacher);
      const defaultActiveRoomId = defaultSubjects[0]?.chapters[0]?.rooms[0]?.id || null;

      safeSetJSON(`subjects_class_${newClassId}`, defaultSubjects);
      if (defaultActiveSubjectId) {
        safeSetItem(`active_subject_id_${newClassId}`, defaultActiveSubjectId);
      }
      if (defaultActiveRoomId) {
        safeSetItem(`active_room_id_${newClassId}`, defaultActiveRoomId);
      }

      const currentTeacherId = effectiveTeacherId;
      const deletedKey = `khmer_teacher_deleted_classes_${currentTeacherId}`;
      const deletedClassesStr = localStorage.getItem(deletedKey);
      if (deletedClassesStr) {
        try {
          const set = new Set<string>(JSON.parse(deletedClassesStr));
          set.delete(newClassId);
          safeSetJSON(deletedKey, Array.from(set));
        } catch {}
      }

      const sortedClasses = sortClasses([...classes, newClass]);
      setClasses(sortedClasses);
      if (teacher) {
        safeSetJSON(`khmer_teacher_classes_${teacher.id}`, sortedClasses);
      }
      safeSetJSON('khmer_teacher_classes', sortedClasses);
      
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
        safeSetJSON(`khmer_teacher_classes_${teacher.id}`, sortedClasses);
      }
      safeSetJSON('khmer_teacher_classes', sortedClasses);
      
      const currentTeacherId = effectiveTeacherId;
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
    if (classes.length <= 1) {
      confirmAction({
        title: 'មិនអាចលុបបានទេ',
        message: 'ត្រូវតែមានថ្នាក់រៀនយ៉ាងហោចណាស់មួយនៅក្នុងប្រព័ន្ធ!',
        confirmText: 'យល់ព្រម',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    confirmAction({
      title: 'លុបថ្នាក់ទី',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបថ្នាក់ទី «${className}» នេះចោលមែនទេ? រាល់បញ្ជីឈ្មោះសិស្ស និងកាតសំណួរទាំងអស់ក្នុងថ្នាក់នេះនឹងត្រូវបាត់បង់ទាំងស្រុង។`,
      confirmText: 'បាទ/ចាស លុបថ្នាក់',
      variant: 'danger',
      onConfirm: async () => {
        const updatedClasses = classes.filter(c => c.id !== classId);
        
        const currentTeacherId = effectiveTeacherId;
        const deletedKey = `khmer_teacher_deleted_classes_${currentTeacherId}`;
        const deletedClassesStr = localStorage.getItem(deletedKey);
        let deletedSet = new Set<string>();
        if (deletedClassesStr) {
          try {
            deletedSet = new Set<string>(JSON.parse(deletedClassesStr));
          } catch {}
        }
        deletedSet.add(classId);
        safeSetJSON(deletedKey, Array.from(deletedSet));

        try {
          await safeDeleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', classId));
        } catch (err) {
          console.error(err);
        }
        
        const sortedClasses = sortClasses(updatedClasses);
        setClasses(sortedClasses);
        if (teacher) {
          safeSetJSON(`khmer_teacher_classes_${teacher.id}`, sortedClasses);
        }
        safeSetJSON('khmer_teacher_classes', sortedClasses);

        safeRemoveItem(`students_class_${classId}`);
        safeRemoveItem(`quiz_cards_class_${classId}`);
        safeRemoveItem(`picked_students_class_${classId}`);
        safeRemoveItem(`subjects_class_${classId}`);
        safeRemoveItem(`chapters_class_${classId}`);
        safeRemoveItem(`active_subject_id_${classId}`);
        safeRemoveItem(`active_room_id_${classId}`);
        
        if (activeClassId === classId) {
          handleSwitchClass(sortedClasses[0].id);
        }
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

    const currentTeacherId = effectiveTeacherId;
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
    
    const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(savedKey, savedList);
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

    const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(savedKey, savedList);
    }
  }, [activeClassId, teacher]);

  const handleBatchSyncStudents = useCallback(async (
    names: string[],
    mode: 'replace' | 'append' = 'replace',
    targetClassIdParam?: string
  ) => {
    const targetClassId = targetClassIdParam || activeClassId;
    const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(`students_class_${targetClassId}`, updatedList);
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

    safeSetJSON(`students_class_${targetClassId}`, finalStudents);

    const finalIds = new Set(finalStudents.map(s => s.id));
    setPickedIds(prev => prev.filter(id => finalIds.has(id)));
    if (selectedStudentId && !finalIds.has(selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [activeClassId, teacher, classes, students, selectedStudentId]);

  const updateStudentDetail = useCallback(async (id: string, fields: Partial<Student>) => {
    let updatedStudent: Student | null = null;
    const currentTeacherId = effectiveTeacherId;
    
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
        safeSetJSON(targetKey, cleanedList);
        
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
          safeSetJSON(`students_class_${activeClassId}`, updatedList);
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
        const currentTeacherId = effectiveTeacherId;
        try {
          await safeDeleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', id));
        } catch (err) {
          console.error(err);
        }
        setStudents(prev => {
          const filtered = prev.filter(s => s.id !== id);
          if (activeClassId) {
            safeSetJSON(`students_class_${activeClassId}`, filtered);
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
        const currentTeacherId = effectiveTeacherId;
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
      safeSetJSON(`quiz_cards_class_${activeClassId}`, newCards);
    }
    saveClassMetadata(newCards, pickedIds);
  }, [activeClassId, pickedIds, saveClassMetadata]);

  const handleUpdateCards = useCallback((updatedCards: QuizCard[]) => {
    setCards(updatedCards);
    if (activeClassId) {
      safeSetJSON(`quiz_cards_class_${activeClassId}`, updatedCards);
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
        setSubjects([]);
        setChapters([]);
        setSelectedStudentId(null);
        setPickedIds([]);
        setManualCalledIds([]);
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
    const keysToClear = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('students_class_') || key.startsWith('quiz_cards_class_') || key.startsWith('picked_students_class_') || key.startsWith('manual_called_students_class_') || key.startsWith('subjects_class_') || key.startsWith('chapters_class_'))) {
        keysToClear.push(key);
      }
    }
    keysToClear.forEach(k => localStorage.removeItem(k));

    // Reset application states back to clean unauthenticated state
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

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#222222] text-slate-100 dark' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Header */}
      <header className={`h-20 flex items-center justify-between px-6 lg:px-8 shrink-0 z-20 border-b transition-colors ${
        isDarkMode ? 'bg-[#222222] border-[#333333]' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div 
          onClick={() => setActiveTab('wheel')}
          className="flex items-center gap-3.5 cursor-pointer hover:opacity-90 active:scale-98 transition-all select-none shrink-0"
          title="ត្រឡប់ទៅទំព័រដើម (Home)"
        >
          <div className="w-11 h-11 flex items-center justify-center relative drop-shadow-xs">
            <SovannaphumiLogo className="w-11 h-11" />
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

        {/* 3D Glass Liquid Capsule Navigation Tabs */}
        <nav className={`flex items-center gap-1.5 p-1.5 rounded-full border backdrop-blur-2xl overflow-x-auto no-scrollbar max-w-full select-none relative z-10 shrink-0 ${
          isDarkMode 
            ? 'bg-[#151518]/95 border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.7)]' 
            : 'bg-slate-200/70 border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.04)]'
        }`}>
          {[
            { id: 'wheel', label: 'បង្វិលឈ្មោះ', icon: Compass },
            { id: 'groups', label: 'បែងចែកក្រុម', icon: UsersIcon },
            { id: 'students', label: 'គ្រប់គ្រងសិស្ស', icon: UserCog },
            { id: 'quiz', label: 'ក្ដារសំណួរ', icon: LayoutGrid },
            { id: 'exams-room', label: 'បន្ទប់វិញ្ញាសា', icon: GraduationCap },
            { id: 'student-lobby', label: 'Live Game QR', icon: Sparkles, badge: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94, scaleY: 0.9, scaleX: 1.05 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={`relative px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer select-none whitespace-nowrap transition-colors duration-200 focus:outline-none isolate ${
                  isActive
                    ? isDarkMode ? 'text-blue-400 font-extrabold' : 'text-blue-600 font-extrabold'
                    : isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {isActive && (
                  <GlassLiquidOverlay
                    layoutId="mainNavGlassDroplet"
                    isDarkMode={isDarkMode}
                    variant="dark-glass"
                  />
                )}

                <motion.span
                  animate={{ 
                    scale: isActive ? 1.04 : 1,
                    y: isActive ? -0.5 : 0
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  className="relative z-10 flex items-center gap-2"
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isActive
                      ? isDarkMode 
                        ? 'bg-blue-500/25 text-blue-400 border border-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.4)]' 
                        : 'bg-blue-500/15 text-blue-600 border border-blue-400/60 shadow-[0_0_8px_rgba(59,130,246,0.25)]'
                      : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${isActive && tab.id === 'wheel' ? 'animate-spin-slow' : ''}`} />
                  </span>

                  <span className={
                    isActive 
                      ? isDarkMode 
                        ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_4px_rgba(59,130,246,0.6)]' 
                        : 'text-blue-600 font-extrabold tracking-wide' 
                      : 'font-bold'
                  }>{tab.label}</span>
                  {tab.badge && (
                    <span className="flex h-2 w-2 relative ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </motion.span>
              </motion.button>
            );
          })}
        </nav>

        {/* Action and Profile Controls */}
        <div className="flex items-center gap-2">
          {/* Active Teacher Profile Area */}
          {teacher ? (
            (() => {
              const isDefaultTeacher = teacher.name === 'លោកគ្រូ/អ្នកគ្រូ សុវណ្ណភូមិ' || teacher.name === 'បង្កើតគណនីគ្រូ' || teacher.id === DEFAULT_CLOUD_TEACHER.id;
              const displayName = isDefaultTeacher ? 'បង្កើតគណនីគ្រូ' : teacher.name;

              return (
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border transition-colors group/prof ${
                  isDarkMode ? 'bg-slate-800/90 border-slate-700 hover:border-slate-600 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}>
                  {/* Avatar with Camera/Plus badge */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isDefaultTeacher) {
                        setAuthModalMode('register');
                        setIsAuthModalOpen(true);
                      } else {
                        setIsProfileModalOpen(true);
                      }
                    }}
                    className="relative cursor-pointer select-none rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    title={isDefaultTeacher ? "ចុចដើម្បីបង្កើតគណនីគ្រូ" : "ចុចដើម្បីប្ដូររូបភាព Profile ពីទូរស័ព្ទ ឬកុំព្យូទ័រ"}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500/40 bg-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-xs group-hover/prof:border-emerald-500 transition-all">
                      {teacher.avatarUrl && !isDefaultTeacher ? (
                        <img 
                          src={teacher.avatarUrl} 
                          alt={displayName} 
                          className="w-full h-full object-cover select-none" 
                        />
                      ) : (
                        <User className="w-4.5 h-4.5" />
                      )}
                    </div>
                    {/* Badge Icon */}
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 group-hover/prof:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-xs border border-white dark:border-slate-800 transition-transform group-hover/prof:scale-110">
                      {isDefaultTeacher ? <UserPlus className="w-2.5 h-2.5" /> : <Camera className="w-2.5 h-2.5" />}
                    </span>
                  </button>

                  <div 
                    onClick={() => {
                      if (isDefaultTeacher) {
                        setAuthModalMode('register');
                        setIsAuthModalOpen(true);
                      } else {
                        setIsProfileModalOpen(true);
                      }
                    }}
                    className="text-left pr-1 cursor-pointer select-none hover:opacity-85 transition-opacity"
                    title={isDefaultTeacher ? "ចុចដើម្បីបង្កើតគណនីគ្រូ" : "ចុចដើម្បីមើល ឬកែប្រែព័ត៌មាន Profile"}
                  >
                    <p className={`text-xs font-black whitespace-nowrap ${
                      isDarkMode ? 'text-white drop-shadow-xs' : 'text-slate-900'
                    }`}>
                      {displayName}
                    </p>
                    {teacher.subjects && !isDefaultTeacher && (
                      <p className={`text-[10px] font-bold leading-none truncate max-w-[130px] mt-0.5 ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {teacher.subjects}
                      </p>
                    )}
                  </div>

                  {isDefaultTeacher ? (
                    <button
                      onClick={() => {
                        setAuthModalMode('register');
                        setIsAuthModalOpen(true);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDarkMode 
                          ? 'text-indigo-300 hover:text-white hover:bg-indigo-600/30' 
                          : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50'
                      }`}
                      title="បង្កើតគណនីគ្រូ"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  ) : (
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
                  )}
                </div>
              );
            })()
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <GlassLiquidButton
                isDarkMode={isDarkMode}
                variant="indigo-glass"
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="h-10 px-4 py-2 text-xs font-extrabold shadow-[0_4px_18px_rgba(99,102,241,0.5)] shrink-0 gap-2"
              >
                <span className="w-6 h-6 rounded-full bg-white/25 border border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.3)] flex items-center justify-center shrink-0 text-white">
                  <UserPlus className="w-3.5 h-3.5" />
                </span>
                <span className="font-extrabold tracking-wide">បង្កើតគណនីគ្រូ</span>
              </GlassLiquidButton>
            </div>
          )}

          <div className={`h-6 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} mx-0.5`} />

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDarkMode ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={isDarkMode ? 'ប្ដូរទៅមុខងារពន្លឺ (Light)' : 'ប្ដូរទៅមុខងារងងឹត (Dark)'}
          >
            {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* Reset All */}
          <button
            onClick={resetAll}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
            }`}
            title="កំណត់កម្មវិធីឡើងវិញ (Reset All)"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>

          {/* 💧 3D Glass Liquid Capsule "បង្កើតសំណួរ AI" Button */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <GlassLiquidButton
              isDarkMode={isDarkMode}
              variant="orange-glass"
              onClick={() => setIsLessonModalOpen(true)}
              className="px-4 py-2 text-xs font-black shadow-[0_8px_25px_rgba(249,115,22,0.45)] cursor-pointer select-none group gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-100 group-hover:rotate-12 transition-transform drop-shadow" />
              <span className="hidden sm:inline font-extrabold tracking-wide drop-shadow-sm">បង្កើតសំណួរ AI</span>
            </GlassLiquidButton>

            {/* Cloud Sync Status - very small at bottom right */}
            <div 
              title={teacher ? `បានភ្ជាប់គណនី ${teacher.username} ទៅកាន់ Cloud Firestore` : 'ទិន្នន័យរក្សាទុកក្នុង Local និងត្រៀម Sync ទៅកាន់ Cloud'}
              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] bg-emerald-50/90 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40 select-none shadow-2xs leading-none mr-0.5"
            >
              <Cloud className={`w-2.5 h-2.5 ${loadingCloudData ? 'animate-pulse text-indigo-500' : 'text-emerald-500'}`} />
              <span>{loadingCloudData ? 'Syncing...' : 'Cloud'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Class Switcher & Workspace Sub-Bar */}
      <div className={`py-2 px-4 sm:px-6 lg:px-8 flex flex-col gap-2 shrink-0 border-b transition-colors ${
        isDarkMode ? 'bg-[#222222]/95 border-[#333333]' : 'bg-slate-50/90 border-slate-200'
      }`}>
        {/* Top Row: Class Selector + Right workspace quick metrics */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 mr-1 text-slate-500 dark:text-slate-400 font-bold text-xs shrink-0">
              <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>ថ្នាក់រៀន៖</span>
            </div>

            {/* Class Pills Track */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-200/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-2xl overflow-x-auto no-scrollbar max-w-full select-none relative z-10">
              {!teacher ? (
                <div className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-0.5 max-w-full">
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 italic hidden lg:inline truncate max-w-[200px] lg:max-w-none">
                    សូមចូលប្រើប្រាស់ ឬបង្កើតគណនី ដើម្បីចាប់ផ្ដើមបង្កើតទិន្នន័យ
                  </span>
                  <GlassLiquidButton
                    isDarkMode={isDarkMode}
                    variant="indigo-glass"
                    className="h-8 px-3 py-1 text-xs font-extrabold shrink-0 shadow-[0_4px_14px_rgba(99,102,241,0.4)] gap-1.5"
                    onClick={() => {
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                    }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="font-extrabold tracking-wide">ចូលគណនី</span>
                  </GlassLiquidButton>
                  <GlassLiquidButton
                    isDarkMode={isDarkMode}
                    variant="emerald-glass"
                    className="h-8 px-3 py-1 text-xs font-extrabold shrink-0 shadow-[0_4px_14px_rgba(16,185,129,0.4)] gap-1.5"
                    onClick={() => {
                      setAuthModalMode('register');
                      setIsAuthModalOpen(true);
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="font-extrabold tracking-wide">បង្កើតគណនីគ្រូ</span>
                  </GlassLiquidButton>
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
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94, scaleY: 0.9, scaleX: 1.05 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    draggable={canDrag && !cls.isPinned}
                    onDragStart={(e) => handleClassDragStart(e as any, idx)}
                    onDragOver={(e) => handleClassDragOver(e as any, idx)}
                    onDragEnd={handleClassDragEnd}
                    onMouseLeave={() => setCanDrag(false)}
                    className={`group/item relative px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap transition-colors duration-200 focus:outline-none isolate ${
                      draggedClassIndex === idx
                        ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50 dark:bg-slate-800 scale-95'
                        : isActive 
                          ? isDarkMode ? 'text-blue-400 font-extrabold' : 'text-blue-600 font-extrabold' 
                          : isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                    }`}
                  >
                    {/* 3D Glass Liquid Droplet Pill */}
                    {isActive && (
                      <GlassLiquidOverlay
                        layoutId="classWaterDroplet"
                        isDarkMode={isDarkMode}
                        variant="dark-glass"
                      />
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
                <button
                  onClick={handleOpenAddClass}
                  className="px-3.5 py-1.5 bg-transparent border border-dashed rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/40 dark:hover:bg-white/10 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                  title="បន្ថែមថ្នាក់ថ្មី"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>បន្ថែមថ្នាក់</span>
                </button>
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

        {/* Second Row: Subject Selector & Add Subject Tab (shown after class is selected) */}
        {teacher && activeClassId && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-200/60 dark:border-slate-800/60 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 mr-1 text-slate-700 dark:text-slate-200 font-black text-xs shrink-0">
              <BookOpen className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span>មុខវិជ្ជា៖</span>
            </div>

            {/* Subject Pills Track */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-200/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] backdrop-blur-2xl overflow-x-auto no-scrollbar max-w-full select-none relative z-10">
              {subjects.map((sub) => {
                const isSubActive = activeSubjectId === sub.id;
                const subEmoji = sub.name === 'រូបវិទ្យា' ? '🧬' : sub.name === 'គីមីវិទ្យា' ? '🧪' : sub.name === 'ជីវវិទ្យា' ? '🌱' : sub.name === 'គណិតវិទ្យា' ? '📐' : sub.name === 'ភាសាខ្មែរ' ? '🇰🇭' : '📚';

                if (editingSubjectIdTop === sub.id) {
                  return (
                    <div 
                      key={sub.id} 
                      className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500 rounded-full animate-in zoom-in-95 duration-100"
                    >
                      <input
                        type="text"
                        value={tempSubjectNameTop}
                        onChange={(e) => setTempSubjectNameTop(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (tempSubjectNameTop.trim()) {
                              handleRenameSubject(sub.id, tempSubjectNameTop.trim());
                            }
                            setEditingSubjectIdTop(null);
                          }
                          if (e.key === 'Escape') setEditingSubjectIdTop(null);
                        }}
                        autoFocus
                        className="px-2 py-0.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white font-bold w-28"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempSubjectNameTop.trim()) {
                            handleRenameSubject(sub.id, tempSubjectNameTop.trim());
                          }
                          setEditingSubjectIdTop(null);
                        }}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-full cursor-pointer transition-all active:scale-90"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSubjectIdTop(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-all active:scale-90"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                }

                return (
                  <motion.div
                    key={sub.id}
                    onClick={() => handleSelectSubject(sub.id)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    className={`group/subj relative px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap transition-all duration-200 isolate ${
                      isSubActive
                        ? isDarkMode ? 'text-emerald-400 font-black' : 'text-emerald-700 font-black'
                        : isDarkMode ? 'text-slate-200 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-slate-950 hover:bg-white/50'
                    }`}
                  >
                    {isSubActive && (
                      <GlassLiquidOverlay
                        layoutId="subjectWaterDroplet"
                        isDarkMode={isDarkMode}
                        variant="dark-glass"
                      />
                    )}

                    <span className="relative z-10 flex items-center gap-1.5">
                      <span>{subEmoji}</span>
                      <span className={isSubActive ? (isDarkMode ? 'text-emerald-300 font-black drop-shadow-sm' : 'text-emerald-800 font-black') : 'font-extrabold'}>
                        {sub.name}
                      </span>

                      {/* Hover actions */}
                      <span className="opacity-0 group-hover/subj:opacity-100 flex items-center gap-0.5 ml-0.5 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSubjectIdTop(sub.id);
                            setTempSubjectNameTop(sub.name);
                          }}
                          className="p-0.5 text-slate-400 hover:text-emerald-500 rounded cursor-pointer"
                          title="កែឈ្មោះមុខវិជ្ជា"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        {subjects.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubject(sub.id);
                            }}
                            className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                            title="លុបមុខវិជ្ជា"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    </span>
                  </motion.div>
                );
              })}

              {/* Add Subject Inline Form / Button */}
              {isAddingSubjectTop ? (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500 rounded-full animate-in zoom-in-95 duration-100">
                  <input
                    type="text"
                    value={newSubjectNameTop}
                    onChange={(e) => setNewSubjectNameTop(e.target.value)}
                    placeholder="ឈ្មោះមុខវិជ្ជា..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (newSubjectNameTop.trim()) {
                          handleCreateSubject(newSubjectNameTop.trim());
                          setNewSubjectNameTop('');
                        }
                        setIsAddingSubjectTop(false);
                      }
                      if (e.key === 'Escape') setIsAddingSubjectTop(false);
                    }}
                    autoFocus
                    className="px-2.5 py-0.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white font-bold w-32"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubjectNameTop.trim()) {
                        handleCreateSubject(newSubjectNameTop.trim());
                        setNewSubjectNameTop('');
                      }
                      setIsAddingSubjectTop(false);
                    }}
                    className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-extrabold cursor-pointer transition-all active:scale-95"
                  >
                    បន្ថែម
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingSubjectTop(false)}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:text-slate-300 rounded-full text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    បោះបង់
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsAddingSubjectTop(true);
                    setNewSubjectNameTop('');
                  }}
                  className="px-3.5 py-1 bg-transparent border border-dashed rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-400/60 dark:border-emerald-500/40 active:scale-95 shrink-0"
                  title="បន្ថែមមុខវិជ្ជាថ្មី"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ បន្ថែមមុខវិជ្ជា</span>
                </button>
              )}
            </div>
          </div>
        )}
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

            <section key={`quiz-section-${activeClassId}`} className={`flex-1 md:basis-3/5 h-full overflow-hidden flex flex-col ${
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
                teacher={teacher}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
              activeSubjectId={activeSubjectId}
              activeSubjectName={subjects.find(s => s.id === activeSubjectId)?.name}
              subjects={subjects}
              onSelectSubject={handleSelectSubject}
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
          <div key={`exams-section-${activeClassId}-${activeSubjectId}`} className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <ExamsPanel
              activeClassId={activeClassId || ''}
              activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
              isDarkMode={isDarkMode}
              teacher={teacher}
              classes={classes}
              onSwitchClass={handleSwitchClass}
              activeSubjectId={activeSubjectId}
              activeSubjectName={subjects.find(s => s.id === activeSubjectId)?.name}
              subjects={subjects}
              onSelectSubject={handleSelectSubject}
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
        isDarkMode={isDarkMode}
      />

      <TeacherAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(acc) => handleUpdateTeacherProfile(acc)}
        initialMode={authModalMode}
        isDarkMode={isDarkMode}
      />

      {teacher && (
        <TeacherProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          teacher={teacher}
          onUpdateTeacher={handleUpdateTeacherProfile}
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
    </div>
  );
}


