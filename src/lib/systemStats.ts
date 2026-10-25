import { ClassInfo, Student, QuizSubject, QuizCard, QuizChapter, TeacherAccount } from '../types';
import { getDeletedClassIds, getDeletedStudentIds } from './deletionRegistry';

export interface ClassBreakdown {
  classId: string;
  className: string;
  isPinned: boolean;
  studentsCount: number;
  questionsCount: number;
  subjectsCount: number;
}

export interface SystemComprehensiveStats {
  realClasses: ClassInfo[];
  totalClassesCount: number;
  totalStudentsCount: number;
  totalQuestionsCount: number;
  totalSubjectsCount: number;
  totalChaptersCount: number;
  allStudents: Student[];
  allSubjects: QuizSubject[];
  allCards: QuizCard[];
  allChapters: QuizChapter[];
  classBreakdowns: ClassBreakdown[];
}

/**
 * Calculates accurate aggregated statistics across ALL real classes for an account/teacher.
 * Prevents showing only the active class's counts (e.g. 14 students or 25 questions)
 * and accurately sums students and questions across every real class.
 */
export function calculateSystemStats(params: {
  classes: ClassInfo[];
  activeClassId?: string;
  activeStudents?: Student[];
  activeSubjects?: QuizSubject[];
  activeCards?: QuizCard[];
  activeChapters?: QuizChapter[];
  teacher?: TeacherAccount | null;
}): SystemComprehensiveStats {
  const {
    classes = [],
    activeClassId = '',
    activeStudents = [],
    activeSubjects = [],
    activeCards = [],
    activeChapters = [],
    teacher = null
  } = params;

  const teacherId = teacher?.id || '';
  const deletedClassIds = getDeletedClassIds(teacherId);
  const deletedStudentIds = getDeletedStudentIds();

  // 1. Gather all real, non-deleted classes
  const classMap = new Map<string, ClassInfo>();
  
  // From provided classes prop
  (classes || []).forEach(c => {
    if (c && c.id && String(c.name || '').trim() !== '' && !(c as any).isDeleted && !deletedClassIds.has(c.id)) {
      classMap.set(c.id, {
        id: String(c.id),
        name: String(c.name).trim(),
        order: typeof c.order === 'number' ? c.order : 0,
        isPinned: !!c.isPinned
      });
    }
  });

  // Also scan localStorage for teacher classes if prop was empty or incomplete
  try {
    const teacherClassesKey = teacherId ? `khmer_teacher_classes_${teacherId}` : 'khmer_teacher_classes';
    const rawTeacherClasses = localStorage.getItem(teacherClassesKey);
    if (rawTeacherClasses) {
      const parsed = JSON.parse(rawTeacherClasses) as ClassInfo[];
      if (Array.isArray(parsed)) {
        parsed.forEach(c => {
          if (c && c.id && String(c.name || '').trim() !== '' && !(c as any).isDeleted && !deletedClassIds.has(c.id)) {
            if (!classMap.has(c.id)) {
              classMap.set(c.id, {
                id: String(c.id),
                name: String(c.name).trim(),
                order: typeof c.order === 'number' ? c.order : 0,
                isPinned: !!c.isPinned
              });
            }
          }
        });
      }
    }
  } catch {}

  const realClasses = Array.from(classMap.values()).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.order - b.order;
  });

  // 2. Aggregate Students across all real classes
  const allStudentsMap = new Map<string, Student>();
  const classBreakdowns: ClassBreakdown[] = [];
  let totalQuestionsCount = 0;
  let totalSubjectsCount = 0;
  let totalChaptersCount = 0;

  const allSubjectsMap = new Map<string, QuizSubject>();
  const allCardsMap = new Map<string, QuizCard>();
  const allChaptersMap = new Map<string, QuizChapter>();

  realClasses.forEach(cls => {
    // --- Students for this class ---
    let classStudents: Student[] = [];
    if (cls.id === activeClassId && activeStudents && activeStudents.length > 0) {
      classStudents = activeStudents.filter(s => 
        s && s.id && !s.id.startsWith('sim-') && !deletedStudentIds.has(s.id)
      );
    } else {
      try {
        const raw = localStorage.getItem(`students_class_${cls.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            classStudents = parsed.filter((s: any) => 
              s && s.id && !s.id.startsWith('sim-') && !deletedStudentIds.has(s.id)
            );
          }
        }
      } catch {}
    }

    classStudents.forEach(s => {
      const uniqueKey = `${cls.id}_${s.id}`;
      allStudentsMap.set(uniqueKey, s);
    });

    // --- Subjects for this class ---
    let classSubjects: QuizSubject[] = [];
    if (cls.id === activeClassId && activeSubjects && activeSubjects.length > 0) {
      classSubjects = activeSubjects;
    } else {
      try {
        const raw = localStorage.getItem(`subjects_class_${cls.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            classSubjects = parsed;
          }
        }
      } catch {}
    }

    classSubjects.forEach(sub => {
      if (sub && sub.id) {
        allSubjectsMap.set(`${cls.id}_${sub.id}`, sub);
        (sub.chapters || []).forEach(ch => {
          if (ch && ch.id) {
            allChaptersMap.set(`${cls.id}_${ch.id}`, ch);
          }
        });
      }
    });

    // --- Questions & Quiz Cards for this class ---
    const classQuestionsMap = new Map<string, QuizCard>();

    // Direct cards (active or cached)
    let classCards: QuizCard[] = [];
    if (cls.id === activeClassId && activeCards && activeCards.length > 0) {
      classCards = activeCards;
    } else {
      try {
        const raw = localStorage.getItem(`quiz_cards_class_${cls.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            classCards = parsed;
          }
        }
      } catch {}
    }

    classCards.forEach(c => {
      if (c) {
        const qKey = c.id || `${c.question?.text || c.question?.id || Math.random()}`;
        classQuestionsMap.set(qKey, c);
        allCardsMap.set(`${cls.id}_${qKey}`, c);
      }
    });

    // Cards embedded inside chapters -> rooms
    classSubjects.forEach(sub => {
      (sub.chapters || []).forEach(ch => {
        (ch.rooms || []).forEach(rm => {
          (rm.cards || []).forEach(c => {
            if (c) {
              const qKey = c.id || `${c.question?.text || c.question?.id || Math.random()}`;
              classQuestionsMap.set(qKey, c);
              allCardsMap.set(`${cls.id}_${qKey}`, c);
            }
          });
        });
      });
    });

    // Exam questions for this class
    try {
      const rawExams = localStorage.getItem(`khmer_exams_${cls.id}`);
      if (rawExams) {
        const parsed = JSON.parse(rawExams);
        if (Array.isArray(parsed)) {
          parsed.forEach((ex: any) => {
            (ex.questions || []).forEach((q: any) => {
              if (q) {
                const qKey = `exam_${q.id || q.question}`;
                classQuestionsMap.set(qKey, q);
                allCardsMap.set(`${cls.id}_${qKey}`, q);
              }
            });
          });
        }
      }
    } catch {}

    totalQuestionsCount += classQuestionsMap.size;
    totalSubjectsCount += classSubjects.length;

    classBreakdowns.push({
      classId: cls.id,
      className: cls.name,
      isPinned: cls.isPinned,
      studentsCount: classStudents.length,
      questionsCount: classQuestionsMap.size,
      subjectsCount: classSubjects.length
    });
  });

  // If no classes exist at all, fall back to active passed stats
  const finalTotalStudents = realClasses.length > 0 ? allStudentsMap.size : (activeStudents?.length || 0);
  const finalTotalQuestions = realClasses.length > 0 ? totalQuestionsCount : (activeCards?.length || 0);
  const finalTotalSubjects = realClasses.length > 0 ? totalSubjectsCount : (activeSubjects?.length || 0);
  const finalTotalChapters = realClasses.length > 0 ? allChaptersMap.size : (activeChapters?.length || 0);

  return {
    realClasses,
    totalClassesCount: realClasses.length,
    totalStudentsCount: finalTotalStudents,
    totalQuestionsCount: finalTotalQuestions,
    totalSubjectsCount: finalTotalSubjects,
    totalChaptersCount: finalTotalChapters,
    allStudents: Array.from(allStudentsMap.values()),
    allSubjects: Array.from(allSubjectsMap.values()),
    allCards: Array.from(allCardsMap.values()),
    allChapters: Array.from(allChaptersMap.values()),
    classBreakdowns
  };
}
