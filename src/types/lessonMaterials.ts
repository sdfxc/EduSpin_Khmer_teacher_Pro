export interface WordDocItem {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  chapter?: string;
  grade?: string;
  category: 'worksheet' | 'summary' | 'exercise' | 'general';
  fileUrl?: string; // Data URL or Web link
  fileName?: string;
  fileSize?: number;
  content?: string; // Rich text / markdown / HTML / notes
  createdAt: string;
  updatedAt: string;
}

export interface SlideItem {
  id: string;
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  formulaOrKeyPoint?: string;
  imageUrl?: string;
  notes?: string;
  layout?: 'standard' | 'split-image' | 'formula-focus' | 'summary';
}

export interface SlideDeckItem {
  id: string;
  title: string;
  subject?: string;
  chapter?: string;
  lessonNumber?: string;
  grade?: string;
  externalEmbedUrl?: string; // Google Slides / Canva / PPT online embed URL
  fileUrl?: string; // Uploaded PPTX or presentation file
  fileName?: string;
  slides: SlideItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonPlanObjectives {
  knowledge: string[];
  skills: string[];
  attitude: string[];
}

export interface LessonPlanTeachingAids {
  teacher: string;
  student: string;
}

export interface LessonPlanStep {
  teacherActivity: string;
  content: string;
  studentActivity: string;
  duration?: string;
}

export interface LessonPlanSteps {
  step1Admin: { teacherActivity: string; studentActivity: string; duration?: string };
  step2Review: LessonPlanStep;
  step3NewLesson: LessonPlanStep;
  step4Strengthen: LessonPlanStep;
  step5Homework: LessonPlanStep;
}

export interface LessonPlanItem {
  id: string;
  title: string;
  schoolName: string;
  teacherName: string;
  subject: string;
  grade: string;
  chapter: string;
  duration: string;
  date: string;
  objectives: LessonPlanObjectives;
  teachingAids: LessonPlanTeachingAids;
  steps: LessonPlanSteps;
  evaluation?: string;
  selfReflection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonMaterialsData {
  wordDocs: WordDocItem[];
  slides: SlideDeckItem[];
  lessonPlans: LessonPlanItem[];
  updatedAt: string;
}
