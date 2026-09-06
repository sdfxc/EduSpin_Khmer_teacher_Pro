/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, LayoutGrid, RotateCcw, User, LogIn, LogOut, Plus, Moon, Sun, Trash2, GraduationCap, Compass, Users as UsersIcon, UserCog, Check, Cloud, Loader2, Pencil, ChevronLeft, ChevronRight, GripVertical, Camera } from 'lucide-react';
import StudentPanel from './components/StudentPanel';
import QuizPanel from './components/QuizPanel';
import LessonModal from './components/LessonModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import SpinningWheel from './components/SpinningWheel';
import GroupDivider from './components/GroupDivider';
import StudentManager from './components/StudentManager';
import { Student, Question, QuizCard, ClassInfo, TeacherAccount, QuizRoom, QuizChapter, QuizSubject, isStudentInClass } from './types';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, safeSetDoc, safeDeleteDoc, safeOnSnapshot } from './lib/firebase';
import StudentPlayView from './components/StudentPlayView';
import StudentLobby from './components/StudentLobby';
import ExamsPanel from './components/ExamsPanel';
import SovannaphumiLogo from './components/SovannaphumiLogo';
import { useConfirm } from './context/ConfirmContext.tsx';
import { ClassModal } from './components/ClassModal';

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

  const hasOrder = filtered.some(c => typeof c.order === 'number');
  let sorted: ClassInfo[];
  if (hasOrder) {
    sorted = [...filtered].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 999;
      const orderB = typeof b.order === 'number' ? b.order : 999;
      return orderA - orderB;
    });
  } else {
    sorted = [...filtered];
  }

  return sorted.map((c, idx) => ({ ...c, order: idx }));
};

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

  const [activeTab, setActiveTab] = useState<'wheel' | 'quiz' | 'groups' | 'students' | 'student-lobby' | 'exams-room'>('wheel');
  const [showWheelBulk, setShowWheelBulk] = useState(false);
  const [loadingCloudData, setLoadingCloudData] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('khmer_teacher_dark_mode');
    return saved === 'true';
  });

  const lastLoadedClassId = useRef<string>('');

  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) {
      return [];
    }
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const saved = localStorage.getItem(`khmer_teacher_classes_${teacherObj.id}`) || localStorage.getItem('khmer_teacher_classes');
      if (saved) {
        const rawClasses = JSON.parse(saved) as ClassInfo[];
        const clean = (rawClasses || []).filter(c => c && c.name && c.name.trim() !== '');
        if (clean.length > 0) {
          return sortClasses(clean);
        }
      }
    } catch (e) {}
    return [];
  });

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) {
      return '';
    }
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const savedActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || localStorage.getItem('khmer_teacher_active_class_id');
      const savedClassesRaw = localStorage.getItem(`khmer_teacher_classes_${teacherObj.id}`) || localStorage.getItem('khmer_teacher_classes');
      if (savedClassesRaw) {
        const availableClasses = (JSON.parse(savedClassesRaw) as ClassInfo[]).filter(c => c && c.name && c.name.trim() !== '');
        if (savedActiveId && availableClasses.some(c => c.id === savedActiveId)) {
          return savedActiveId;
        }
        return availableClasses[0]?.id || '';
      }
    } catch (e) {}
    return '';
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) {
      return [];
    }
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const currentActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || localStorage.getItem('khmer_teacher_active_class_id') || '';
      if (!currentActiveId) return [];
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
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) return [];
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
      if (!activeId) return [];
      const saved = localStorage.getItem(`quiz_cards_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [pickedIds, setPickedIds] = useState<string[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) return [];
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
      if (!activeId) return [];
      const saved = localStorage.getItem(`picked_students_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [subjects, setSubjects] = useState<QuizSubject[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) return [];
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
      if (!activeId) return [];
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
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) return null;
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
      if (!activeId) return null;
      return localStorage.getItem(`active_subject_id_${activeId}`);
    } catch {
      return null;
    }
  });

  const [chapters, setChapters] = useState<QuizChapter[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) return [];
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
      if (!activeId) return [];
      const saved = localStorage.getItem(`chapters_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (!savedTeacherObj) return null;
    try {
      const teacherObj = JSON.parse(savedTeacherObj);
      const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
      if (!activeId) return null;
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
    setDraggedClassIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleClassDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedClassIndex === null || draggedClassIndex === index) return;
    
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
                order: i
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

  const handleMoveClass = async (e: React.MouseEvent, index: number, direction: 'left' | 'right') => {
    e.stopPropagation();
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;

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
            for (let i = 0; i < finalizedClasses.length; i++) {
              const cls = finalizedClasses[i];
              await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', cls.id), {
                order: i
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

  // Load teacher classes from Cloud when logged in
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
      return;
    }

    const loadTeacherClasses = async () => {
      try {
        setLoadingCloudData(true);

        // Fetch latest teacher profile from Cloud Firestore to keep schoolName fresh
        try {
          const teacherDocRef = doc(db, 'teachers', teacher.id);
          const teacherSnap = await getDoc(teacherDocRef);
          if (teacherSnap.exists()) {
            const cloudTeacher = teacherSnap.data() as TeacherAccount;
            if (cloudTeacher) {
              setTeacher(prev => {
                if (!prev) return cloudTeacher;
                if (prev.schoolName === cloudTeacher.schoolName && prev.name === cloudTeacher.name && prev.avatarUrl === cloudTeacher.avatarUrl && prev.id === cloudTeacher.id) {
                  return prev;
                }
                const updated = { ...prev, ...cloudTeacher };
                localStorage.setItem('logged_in_teacher', JSON.stringify(updated));
                return updated;
              });
            }
          }
        } catch (tErr) {
          console.error("Failed to sync teacher profile from cloud:", tErr);
        }

        const classesCollRef = collection(db, 'teachers', teacher.id, 'classes');
        const classesSnap = await getDocs(classesCollRef);
        
        let fetchedClasses: ClassInfo[] = [];
        const seenIds = new Set<string>();
        
        classesSnap.forEach(docSnap => {
          const clsData = docSnap.data() as ClassInfo;
          const id = clsData.id || docSnap.id;
          clsData.id = id;
          if (clsData && clsData.name && clsData.name.trim() !== '') {
            if (!seenIds.has(id)) {
              seenIds.add(id);
              fetchedClasses.push(clsData);
            }
          }
        });

        // Get locally saved classes to ensure no newly created classes are lost
        const localClassesStr = localStorage.getItem(`khmer_teacher_classes_${teacher.id}`) || localStorage.getItem('khmer_teacher_classes');
        let parsedLocals: ClassInfo[] = [];
        let localClassesMap = new Map<string, number>();
        if (localClassesStr) {
          try {
            parsedLocals = (JSON.parse(localClassesStr) as ClassInfo[]).filter(c => c && c.name && c.name.trim() !== '');
            parsedLocals.forEach((lc, index) => {
              if (lc && lc.id) {
                localClassesMap.set(lc.id, typeof lc.order === 'number' ? lc.order : index);
              }
            });
          } catch (e) {}
        }

        // Merge local classes: Any valid class that exists in localStorage but is not yet in Cloud must be preserved and uploaded to Cloud!
        for (const lc of parsedLocals) {
          const existsInFetched = fetchedClasses.some(fc => fc.id === lc.id || fc.name.trim() === lc.name.trim());
          if (!existsInFetched) {
            fetchedClasses.push(lc);
            // Write to Cloud Firestore immediately to guarantee persistence
            const localSubjectsStr = localStorage.getItem(`subjects_class_${lc.id}`);
            let finalSubs: QuizSubject[] = [];
            let finalActiveSubId: string | null = null;
            let finalActiveRmId: string | null = null;
            if (localSubjectsStr) {
              try {
                finalSubs = JSON.parse(localSubjectsStr);
                finalActiveSubId = localStorage.getItem(`active_subject_id_${lc.id}`) || (finalSubs[0]?.id || null);
                finalActiveRmId = localStorage.getItem(`active_room_id_${lc.id}`);
              } catch {}
            }
            if (finalSubs.length === 0) {
              const migration = getMigratedSubjects([]);
              finalSubs = migration.subjects;
              finalActiveSubId = migration.activeSubjectId;
              finalActiveRmId = finalSubs[0]?.chapters[0]?.rooms[0]?.id || null;
            }

            safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', lc.id), {
              id: lc.id,
              name: lc.name.trim(),
              order: typeof lc.order === 'number' ? lc.order : fetchedClasses.length,
              subjects: finalSubs,
              activeSubjectId: finalActiveSubId,
              activeRoomId: finalActiveRmId,
              pickedIds: [],
              cards: [],
              createdAt: new Date().toISOString()
            }, { merge: true }).catch(err => console.error(`Failed to sync local class ${lc.name} to cloud:`, err));
          }
        }

        fetchedClasses = fetchedClasses.map((cls, idx) => {
          if (typeof cls.order === 'number') return cls;
          if (localClassesMap.has(cls.id)) {
            return { ...cls, order: localClassesMap.get(cls.id) };
          }
          return { ...cls, order: idx };
        });

        const sortedCloudClasses = sortClasses(fetchedClasses);
        setClasses(sortedCloudClasses);
        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedCloudClasses));
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedCloudClasses));

        for (let i = 0; i < sortedCloudClasses.length; i++) {
          const c = sortedCloudClasses[i];
          safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', c.id), { id: c.id, name: c.name, order: i }, { merge: true }).catch(() => {});
        }
        
        if (sortedCloudClasses.length > 0) {
          const lastActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacher.id}`) || localStorage.getItem('khmer_teacher_active_class_id') || sortedCloudClasses[0].id;
          const exists = sortedCloudClasses.some(c => c.id === lastActiveId);
          setActiveClassId(exists ? lastActiveId : sortedCloudClasses[0].id);
        } else {
          setActiveClassId('');
        }
      } catch (err) {
        console.error('Failed to load classes from cloud Firestore:', err);
      } finally {
        setLoadingCloudData(false);
      }
    };

    loadTeacherClasses();
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
      setStudents([]);
      setSubjects([]);
      setActiveSubjectId(null);
      setChapters([]);
      setActiveRoomId(null);
      setCards([]);
      setPickedIds([]);
      lastLoadedClassId.current = '';
      return;
    }

    const loadClassDetails = async () => {
      try {
        setLoadingCloudData(true);
        
        // 1. Fetch class doc
        const classDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId);
        const classSnap = await getDoc(classDocRef);
        
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

        setCards(activeRoom?.cards || []);
        setPickedIds(activeRoom?.pickedIds || []);

        // Immediately cache to localStorage so refresh and tab switches retain the exact cloud data
        localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(loadedSubjects));
        localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(loadedChapters));
        if (loadedActiveSubjectId) {
          localStorage.setItem(`active_subject_id_${activeClassId}`, loadedActiveSubjectId);
        }
        if (loadedActiveRoomId) {
          localStorage.setItem(`active_room_id_${activeClassId}`, loadedActiveRoomId);
        }
        localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(activeRoom?.cards || []));
        localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(activeRoom?.pickedIds || []));

        if (classSnap.exists()) {
          const cData = classSnap.data();
          if (Array.isArray(cData.exams) && cData.exams.length > 0) {
            localStorage.setItem(`khmer_exams_${activeClassId}`, JSON.stringify(cData.exams));
          }
        }

        // 2. Fetch students
        const studentsCollRef = collection(db, 'teachers', teacher.id, 'classes', activeClassId, 'students');
        const studentsSnap = await getDocs(studentsCollRef);
        
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
                safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', data.classId, 'students', data.id), data).catch(() => {});
              }
            }
          }
        });

        for (const fId of foreignStudentsToDelete) {
          safeDeleteDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', fId)).catch(() => {});
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
                      safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', std.id), stdWithClass).catch(() => {});
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

  // Real-time Student Synchronization for cloud sessions (only for logged-in teachers)
  useEffect(() => {
    if (!activeClassId || !teacher) return;

    const studentsCollRef = collection(db, 'teachers', teacher.id, 'classes', activeClassId, 'students');
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
                  safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', std.id), std).catch(() => {});
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
            safeDeleteDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', data.id)).catch(() => {});
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
    if (!activeRoomId || !activeSubjectId) return;

    const updatedChapters = chapters.map(ch => {
      const updatedRooms = ch.rooms.map(r => {
        if (r.id === activeRoomId) {
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

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      try {
        await safeSetDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
          subjects: updatedSubjects,
          chapters: updatedChapters, // backward compatibility
          activeRoomId: activeRoomId,
          activeSubjectId: activeSubjectId
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save class metadata to cloud:', err);
      }
    }
    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters)); // backward compatibility
      localStorage.setItem(`active_subject_id_${activeClassId}`, activeSubjectId);
      localStorage.setItem(`active_room_id_${activeClassId}`, activeRoomId);
    }
  }, [teacher, activeClassId, activeRoomId, chapters, subjects, activeSubjectId]);

  // Helper to save student score updates to Firestore
  const saveStudentScore = useCallback(async (studentId: string, newScore: number) => {
    const currentTeacherId = teacher?.id || 'local';
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
      
      const currentTeacherId = teacher?.id || 'local';
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
  }, [teacher, activeClassId, activeRoomId, activeSubjectId, chapters, subjects]);

  const handleSelectRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
    let selectedRoom: QuizRoom | undefined;
    for (const ch of chapters) {
      selectedRoom = ch.rooms.find(r => r.id === roomId);
      if (selectedRoom) break;
    }

    if (selectedRoom) {
      setCards(selectedRoom.cards || []);
      setPickedIds(selectedRoom.pickedIds || []);
      if (!teacher && activeClassId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, roomId);
      } else if (teacher && activeClassId) {
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
        setCards(firstRoom.cards || []);
        setPickedIds(firstRoom.pickedIds || []);
        if (activeClassId) {
          localStorage.setItem(`active_room_id_${activeClassId}`, firstRoom.id);
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
    if (activeClassId && lastLoadedClassId.current === activeClassId) {
      const currentCls = classes.find(c => c.id === activeClassId);
      const validCurrentStudents = students.filter(s => isStudentInClass(s, activeClassId, currentCls?.name));
      localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(validCurrentStudents));
      localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(pickedIds));
      localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(cards));
      if (subjects.length > 0) {
        localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(subjects));
      }
      if (chapters.length > 0) {
        localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(chapters));
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
        
        const currentTeacherId = teacher?.id || 'local';
        const deletedKey = `khmer_teacher_deleted_classes_${currentTeacherId}`;
        const deletedClassesStr = localStorage.getItem(deletedKey);
        let deletedSet = new Set<string>();
        if (deletedClassesStr) {
          try {
            deletedSet = new Set<string>(JSON.parse(deletedClassesStr));
          } catch {}
        }
        deletedSet.add(classId);
        localStorage.setItem(deletedKey, JSON.stringify(Array.from(deletedSet)));

        try {
          await safeDeleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', classId));
        } catch (err) {
          console.error(err);
        }
        
        const sortedClasses = sortClasses(updatedClasses);
        setClasses(sortedClasses);
        if (teacher) {
          localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedClasses));
        }
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedClasses));

        localStorage.removeItem(`students_class_${classId}`);
        localStorage.removeItem(`quiz_cards_class_${classId}`);
        localStorage.removeItem(`picked_students_class_${classId}`);
        localStorage.removeItem(`subjects_class_${classId}`);
        localStorage.removeItem(`chapters_class_${classId}`);
        localStorage.removeItem(`active_subject_id_${classId}`);
        localStorage.removeItem(`active_room_id_${classId}`);
        
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

  const addStudentDetail = useCallback(async (fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string }) => {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const newStudent: Student = {
      id: `s-${Date.now()}-${Math.random()}`,
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
    const currentTeacherId = teacher?.id || 'local';
    
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
        return prev.map(s => s.id === id ? { ...s, ...fields } : s);
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
    const newCards: QuizCard[] = questions.map((q, i) => ({
      id: `c-${i}-${Date.now()}`,
      number: i + 1,
      question: q,
      isRevealed: false,
      status: 'idle'
    }));
    setCards(newCards);
    saveClassMetadata(newCards, pickedIds);
  }, [pickedIds, saveClassMetadata]);

  const handleUpdateCards = useCallback((updatedCards: QuizCard[]) => {
    setCards(updatedCards);
    saveClassMetadata(updatedCards, pickedIds);
  }, [pickedIds, saveClassMetadata]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (!activeCardId || !selectedStudentId) return;

    // Update student score
    let targetScore = 0;
    setStudents(prev => prev.map(s => {
      if (s.id === selectedStudentId) {
        targetScore = s.score + (correct ? 3 : 0);
        saveStudentScore(selectedStudentId, targetScore);
        return { ...s, score: targetScore };
      }
      return s;
    }));

    // Update card status
    const updatedCards = cards.map(c => {
      if (c.id === activeCardId) {
        return { ...c, isRevealed: true, status: correct ? 'correct' : 'wrong' as any };
      }
      return c;
    });
    setCards(updatedCards);

    // Add student to picked list so they are not picked again
    const updatedPickedIds = pickedIds.includes(selectedStudentId)
      ? pickedIds
      : [...pickedIds, selectedStudentId];
    setPickedIds(updatedPickedIds);

    saveClassMetadata(updatedCards, updatedPickedIds);
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
        setActiveCardId(null);
        setTeacher(null);
        setClasses(DEFAULT_CLASSES);
        setActiveClassId('class-7a');
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
    }
    localStorage.removeItem('khmer_teacher_active_class_id');
    localStorage.removeItem('khmer_teacher_classes');

    // Clear all cached students/cards/pickedIds in localstorage for a clean slate
    const keysToClear = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('students_class_') || key.startsWith('quiz_cards_class_') || key.startsWith('picked_students_class_'))) {
        keysToClear.push(key);
      }
    }
    keysToClear.forEach(k => localStorage.removeItem(k));

    // Reset application states back to fresh template
    setTeacher(null);
    setClasses(DEFAULT_CLASSES);
    setActiveClassId('class-7a');
    setStudents([]);
    setCards([]);
    setPickedIds([]);
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

  const selectedStudent = currentClassStudents.find(s => s.id === selectedStudentId) || null;
  const activeCard = cards.find(c => c.id === activeCardId) || null;

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#0f172a] text-slate-100 dark' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Header */}
      <header className={`h-20 flex items-center justify-between px-6 lg:px-8 shrink-0 z-20 border-b transition-colors ${
        isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
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

        {/* Dynamic Telegram iOS Liquid Glass Water Droplet Navigation Tabs */}
        <nav className={`flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-2xl overflow-x-auto no-scrollbar max-w-full select-none relative z-10 shrink-0 ${
          isDarkMode 
            ? 'bg-slate-900/80 border-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_8px_30px_rgba(0,0,0,0.4)]' 
            : 'bg-slate-200/60 border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.04)]'
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
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94, scaleY: 0.9, scaleX: 1.05 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer select-none whitespace-nowrap transition-colors duration-200 focus:outline-none ${
                  isActive
                    ? isDarkMode ? 'text-blue-400 font-extrabold' : 'text-blue-600 font-extrabold'
                    : isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
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
                    <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2.5 pointer-events-none ${
                      isDarkMode
                        ? 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.3)_0%,_transparent_75%)]'
                        : 'bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.95)_0%,_transparent_75%)]'
                    }`} />

                    {/* Bottom Droplet Meniscus Light Rim (គែមពន្លឺបាតតំណក់ទឹកថ្លា) */}
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
                      ? isDarkMode ? 'text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-blue-600 scale-110 drop-shadow-xs'
                      : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  } ${isActive && tab.id === 'wheel' ? 'animate-spin-slow' : ''}`} />
                  <span className={
                    isActive 
                      ? isDarkMode 
                        ? 'text-blue-400 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
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

          {/* Create Questions Button with Cloud Status at bottom right */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <button
              onClick={() => setIsLessonModalOpen(true)}
              className="px-4 py-2 btn-orange-gemini text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md shadow-orange-500/20 group cursor-pointer select-none"
            >
              <Sparkles className="w-4 h-4 text-orange-100 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">បង្កើតសំណួរ AI</span>
            </button>

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
      <div className={`py-2.5 px-6 lg:px-8 flex items-center justify-between shrink-0 border-b transition-colors gap-4 overflow-x-auto ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/90 border-slate-200'
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
                  draggable={canDrag}
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
                      {idx > 0 && (
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
                      {idx < classes.length - 1 && (
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
                className="px-3 py-1.5 bg-transparent border border-dashed rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/40 dark:hover:bg-white/10 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
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
            <span>បានហៅ៖ <strong className="text-amber-600 dark:text-amber-400">{currentClassPickedIds.length}</strong>/{currentClassStudents.length}</span>
          </div>

          {currentClassPickedIds.length > 0 && (
            <button
              onClick={() => handleSetPickedIds([])}
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
            <section className="flex-1 md:basis-3/5 h-full overflow-y-auto flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
              <SpinningWheel
                students={currentClassStudents}
                pickedIds={currentClassPickedIds}
                onSetPickedIds={handleSetPickedIds}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                selectedStudent={selectedStudent}
                onAddStudent={addStudent}
                onBulkAddStudents={handleBulkAddStudents}
                showBulkInput={showWheelBulk}
                setShowBulkInput={setShowWheelBulk}
                isDarkMode={isDarkMode}
              />
            </section>
            
            <aside className="hidden md:block md:basis-2/5 h-full shrink-0 border-l border-slate-200 dark:border-slate-800">
              <StudentPanel
                students={currentClassStudents}
                pickedIds={currentClassPickedIds}
                onSetPickedIds={handleSetPickedIds}
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
            <aside className="basis-2/5 h-full shrink-0 hidden md:block">
              <StudentPanel
                students={currentClassStudents}
                pickedIds={currentClassPickedIds}
                onSetPickedIds={handleSetPickedIds}
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
              isDarkMode={isDarkMode}
              onBatchSyncStudents={handleBatchSyncStudents}
            />
          </div>
        )}

        {activeTab === 'students' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <StudentManager
              students={currentClassStudents}
              classes={classes}
              activeClassId={activeClassId}
              isDarkMode={isDarkMode}
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
          />
        )}

        {activeTab === 'exams-room' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <ExamsPanel
              activeClassId={activeClassId || ''}
              activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
              isDarkMode={isDarkMode}
              teacher={teacher}
            />
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
    </div>
  );
}


