export interface WeeklyScoreBreakdown {
  activity?: number; // សកម្មភាព
  homework?: number; // កិច្ចការផ្ទះ
  quiz?: number;     // Quiz
}

export interface MonthlyDetailedScore {
  monthlyExam?: number; // Monthly Exam
  week1?: WeeklyScoreBreakdown;
  week2?: WeeklyScoreBreakdown;
  week3?: WeeklyScoreBreakdown;
  week4?: WeeklyScoreBreakdown;
  groupWork?: number; // ការងារក្រុម (Group Work)
  quiz?: number; // Quiz
  notebook?: number; // ពិនិត្យសៀវភៅ
  manualTotal?: number; // Teacher override total for the month
  manualSubTotalNoExam?: number; // Teacher override total excluding monthly exam
  manualAverage?: number; // Teacher override average
}

export interface SubjectScoreData {
  score?: number;
  monthlyScores?: Record<string, MonthlyDetailedScore>;
}

export interface Student {
  id: string;
  studentId?: string; // អត្តលេខ / ID សិស្ស
  name: string;
  score: number;
  emoji?: string;
  avatarUrl?: string; // Profile photo URL / base64
  gender?: 'ប្រុស' | 'ស្រី';
  grade?: string; // ថ្នាក់ទី e.g. ថ្នាក់ទី៧ក
  dateOfBirth?: string; // ថ្ងៃខែឆ្នាំកំណើត
  phoneNumber?: string; // លេខទូរស័ព្ទ / អាណាព្យាបាល
  notes?: string; // កំណត់សម្គាល់ / ព័ត៌មានបន្ថែម
  status?: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ';
  classId?: string; // To keep track if queried overall
  monthlyScores?: Record<string, MonthlyDetailedScore>; // Key is month e.g. "កញ្ញា"
  subjectScores?: Record<string, SubjectScoreData>; // Key is subjectId
  currentAnswerCardId?: string;
  currentAnswerIndex?: number;
  currentAnswerIsCorrect?: boolean;
  isApproved?: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  questionType?: 'general' | 'pisa';
  category?: 'choice' | 'matching' | 'fill_blank' | 'theory' | 'exercise';
  explanation?: string;
  points?: number;
}

export interface QuizCard {
  id: string;
  number: number;
  question?: Question;
  isRevealed: boolean;
  status: 'idle' | 'correct' | 'wrong';
}

export interface QuizRoom {
  id: string;
  name: string;
  cards: QuizCard[];
  pickedIds: string[];
  createdAt: number;
}

export interface QuizChapter {
  id: string;
  name: string;
  rooms: QuizRoom[];
  createdAt: number;
}

export interface QuizSubject {
  id: string;
  name: string;
  icon?: string;
  chapters: QuizChapter[];
  createdAt: number;
}

export interface ClassInfo {
  id: string;
  name: string;
  order?: number;
  isPinned?: boolean;
}

export interface TeacherAccount {
  id: string;
  name: string;
  schoolName: string;
  subjects?: string;
  username: string;
  password?: string;
  avatarUrl?: string;
  email?: string;
  authProvider?: 'username' | 'email' | 'google' | 'facebook' | 'telegram';
  telegramId?: string;
  telegramUsername?: string;
}

export const DEFAULT_CLOUD_TEACHER: TeacherAccount = {
  id: 'email_khengkhey835_gmail_com',
  name: 'បង្កើតគណនីគ្រូ',
  schoolName: 'សាលារៀនសុវណ្ណភូមិ',
  username: 'khengkhey835',
  email: 'khengkhey835@gmail.com',
  authProvider: 'google'
};

export interface GroupMember extends Student {
  assignedRole?: 'ប្រធាន' | 'អនុប្រធាន' | 'សមាជិក';
  groupScore?: number;
}

export interface Group {
  id: number;
  name: string;
  members: GroupMember[];
}

export function isStudentInClass(
  student: Student | null | undefined,
  targetClassId: string,
  targetClassName?: string
): boolean {
  if (!student) return false;
  if (!student.classId) return true;
  if (student.classId === targetClassId) return true;
  if (targetClassName && student.classId === targetClassName) return true;
  return false;
}
