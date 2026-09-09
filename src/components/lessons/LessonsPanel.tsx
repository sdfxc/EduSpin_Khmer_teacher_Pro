import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Presentation,
  BookOpen,
  FolderOpen,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';
import WordDocsManager from './WordDocsManager';
import SlidesManager from './SlidesManager';
import LessonPlansManager from './LessonPlansManager';
import { WordDocItem, SlideDeckItem, LessonPlanItem } from '../../types/lessonMaterials';
import { DEFAULT_WORD_DOCS, DEFAULT_SLIDES, DEFAULT_LESSON_PLANS } from '../../lib/defaultLessonMaterials';
import { db, doc, setDoc, safeGetDoc } from '../../lib/firebase';
import { TeacherAccount } from '../../types';

interface LessonsPanelProps {
  key?: React.Key;
  activeClassId: string;
  activeClassName: string;
  isDarkMode?: boolean;
  teacher?: TeacherAccount | null;
}

export type LessonSubTab = 'word' | 'slides' | 'plans';

export default function LessonsPanel({
  activeClassId,
  activeClassName,
  isDarkMode = false,
  teacher
}: LessonsPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<LessonSubTab>('word');

  const teacherId = teacher?.id || 'default_teacher';
  const storageKey = `khmer_lesson_materials_${teacherId}_${activeClassId || 'general'}`;

  // Data states
  const [wordDocs, setWordDocs] = useState<WordDocItem[]>(() => {
    try {
      const cached = localStorage.getItem(`${storageKey}_words`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_WORD_DOCS;
  });

  const [slides, setSlides] = useState<SlideDeckItem[]>(() => {
    try {
      const cached = localStorage.getItem(`${storageKey}_slides`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_SLIDES;
  });

  const [lessonPlans, setLessonPlans] = useState<LessonPlanItem[]>(() => {
    try {
      const cached = localStorage.getItem(`${storageKey}_plans`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_LESSON_PLANS;
  });

  // Sync with localStorage & Firestore safely on class change
  useEffect(() => {
    let isMounted = true;

    // First load from localStorage for this specific class
    try {
      const cachedWords = localStorage.getItem(`${storageKey}_words`);
      const cachedSlides = localStorage.getItem(`${storageKey}_slides`);
      const cachedPlans = localStorage.getItem(`${storageKey}_plans`);
      if (isMounted) {
        setWordDocs(cachedWords ? JSON.parse(cachedWords) : DEFAULT_WORD_DOCS);
        setSlides(cachedSlides ? JSON.parse(cachedSlides) : DEFAULT_SLIDES);
        setLessonPlans(cachedPlans ? JSON.parse(cachedPlans) : DEFAULT_LESSON_PLANS);
      }
    } catch {}

    async function loadCloudMaterials() {
      if (!teacher?.id || !activeClassId) return;

      try {
        const matDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'lessonMaterials', 'data');
        const snap = await safeGetDoc(matDocRef);

        if (snap.exists && snap.exists() && isMounted) {
          const data = snap.data();
          if (data.wordDocs && Array.isArray(data.wordDocs)) {
            setWordDocs(data.wordDocs);
            localStorage.setItem(`${storageKey}_words`, JSON.stringify(data.wordDocs));
          }
          if (data.slides && Array.isArray(data.slides)) {
            setSlides(data.slides);
            localStorage.setItem(`${storageKey}_slides`, JSON.stringify(data.slides));
          }
          if (data.lessonPlans && Array.isArray(data.lessonPlans)) {
            setLessonPlans(data.lessonPlans);
            localStorage.setItem(`${storageKey}_plans`, JSON.stringify(data.lessonPlans));
          }
        }
      } catch (err) {
        console.warn('Could not fetch cloud lesson materials:', err);
      }
    }

    loadCloudMaterials();

    return () => {
      isMounted = false;
    };
  }, [teacher?.id, activeClassId, storageKey]);

  // Save to localStorage & Cloud Firestore helper
  const persistMaterials = useCallback(
    async (
      newWords: WordDocItem[],
      newSlides: SlideDeckItem[],
      newPlans: LessonPlanItem[]
    ) => {
      try {
        localStorage.setItem(`${storageKey}_words`, JSON.stringify(newWords));
        localStorage.setItem(`${storageKey}_slides`, JSON.stringify(newSlides));
        localStorage.setItem(`${storageKey}_plans`, JSON.stringify(newPlans));

        if (teacher?.id && activeClassId) {
          const matDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'lessonMaterials', 'data');
          await setDoc(matDocRef, {
            wordDocs: newWords,
            slides: newSlides,
            lessonPlans: newPlans,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch((e) => console.warn('Cloud save warning (offline):', e));
        }
      } catch (err) {
        console.warn('Persist error:', err);
      }
    },
    [teacher?.id, activeClassId, storageKey]
  );

  const handleSaveWordDocs = (newWords: WordDocItem[]) => {
    setWordDocs(newWords);
    persistMaterials(newWords, slides, lessonPlans);
  };

  const handleSaveSlides = (newSlides: SlideDeckItem[]) => {
    setSlides(newSlides);
    persistMaterials(wordDocs, newSlides, lessonPlans);
  };

  const handleSavePlans = (newPlans: LessonPlanItem[]) => {
    setLessonPlans(newPlans);
    persistMaterials(wordDocs, slides, newPlans);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation Bar */}
      <div className={`p-2 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
        isDarkMode ? 'bg-[#111827] border-indigo-950/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {/* Word Tab */}
          <button
            onClick={() => setActiveSubTab('word')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none shrink-0 ${
              activeSubTab === 'word'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ឯកសារ Word</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeSubTab === 'word' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {wordDocs.length}
            </span>
          </button>

          {/* Slides Tab */}
          <button
            onClick={() => setActiveSubTab('slides')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none shrink-0 ${
              activeSubTab === 'slides'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>ស្លាយ</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeSubTab === 'slides' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {slides.length}
            </span>
          </button>

          {/* Lesson Plans Tab */}
          <button
            onClick={() => setActiveSubTab('plans')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none shrink-0 ${
              activeSubTab === 'plans'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>កិច្ចតែងការ</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeSubTab === 'plans' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {lessonPlans.length}
            </span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 pr-2">
          <span>ថ្នាក់៖ {activeClassName}</span>
        </div>
      </div>

      {/* Sub-tab Content Area */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'word' && (
          <motion.div
            key="word"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <WordDocsManager
              docs={wordDocs}
              onSaveDocs={handleSaveWordDocs}
              isDarkMode={isDarkMode}
              activeClassName={activeClassName}
              schoolName={teacher?.schoolName || 'សាលារៀនសុវណ្ណភូមិ'}
              teacherName={teacher?.name || 'លោកគ្រូ / អ្នកគ្រូ'}
            />
          </motion.div>
        )}

        {activeSubTab === 'slides' && (
          <motion.div
            key="slides"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <SlidesManager
              slides={slides}
              onSaveSlides={handleSaveSlides}
              isDarkMode={isDarkMode}
              activeClassName={activeClassName}
            />
          </motion.div>
        )}

        {activeSubTab === 'plans' && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <LessonPlansManager
              plans={lessonPlans}
              onSavePlans={handleSavePlans}
              isDarkMode={isDarkMode}
              activeClassName={activeClassName}
              schoolName={teacher?.schoolName || 'សាលារៀនសុវណ្ណភូមិ'}
              teacherName={teacher?.name || 'លោកគ្រូ / អ្នកគ្រូ'}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
