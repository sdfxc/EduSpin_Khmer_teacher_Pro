import { Student, QuizSubject, QuizCard, QuizChapter, QuizRoom } from '../types';

export const GRADE_8K1_CLASS_ID = 'class-grade-8k1';
export const GRADE_8K1_CLASS_NAME = 'ថ្នាក់ទី៨ក១';

// 36 Realistic Khmer Students for ថ្នាក់ទី៨ក១
export const GRADE_8K1_STUDENTS: Student[] = [
  {
    id: 'std-8k1-01',
    studentId: '801',
    name: 'កែវ ធីតា',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 95,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-04-12',
    phoneNumber: '012 345 601',
    notes: 'សិស្សឆ្នើម ពូកែគណិតវិទ្យា និងរូបវិទ្យា ឧស្សាហ៍ព្យាយាម',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 47, week1: { activity: 10, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 50, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 50, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-02',
    studentId: '802',
    name: 'ចាន់ សុវណ្ណារ៉ា',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 92,
    emoji: '👦',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-02-18',
    phoneNumber: '098 765 802',
    notes: 'ប្រធានថ្នាក់ មានការទទួលខុសត្រូវខ្ពស់ និងក្លាហាន',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-03',
    studentId: '803',
    name: 'ជា សុជាតិ',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 88,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-07-09',
    phoneNumber: '011 223 803',
    notes: 'ចូលចិត្តឆ្លើយសំណួរក្នុងថ្នាក់រៀន រហ័សរហួន',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 4, groupWork: 5 },
      'តុលា': { monthlyExam: 45, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 4, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 4, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 45, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 46, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-04',
    studentId: '804',
    name: 'វ៉ាន់ ស្រីនិច',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 94,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-09-25',
    phoneNumber: '077 889 804',
    notes: 'ពូកែអក្សរសាស្ត្រខ្មែរ និងភាសាអង់គ្លេស សរសេរស្អាត',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 50, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-05',
    studentId: '805',
    name: 'សុខ រតនា',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 85,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-11-03',
    phoneNumber: '016 445 805',
    notes: 'សកម្មក្នុងកិច្ចការក្រុម និងកីឡា',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 42, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'តុលា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 9 }, notebook: 4, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 4, groupWork: 5 },
      'មករា': { monthlyExam: 42, week1: { activity: 8, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'កុម្ភៈ': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-06',
    studentId: '806',
    name: 'ហេង ពិសិដ្ឋ',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 90,
    emoji: '👦',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-05-30',
    phoneNumber: '089 332 806',
    notes: 'ពូកែវិទ្យាសាស្ត្រ និងបច្ចេកវិទ្យា',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 45, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 46, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 47, week1: { activity: 10, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 46, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-07',
    studentId: '807',
    name: 'លឹម ចរិយា',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 87,
    emoji: '👧',
    status: 'សកម្ម',
    dateOfBirth: '2012-08-14',
    phoneNumber: '097 554 807',
    notes: 'សុភាពរាបសារ ឧស្សាហ៍រៀនសូត្រ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 45, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 45, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-08',
    studentId: '808',
    name: 'ម៉ៅ សុភ័ក្ត្រ',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 83,
    emoji: '👦',
    status: 'កំពុងរីកចម្រើន',
    dateOfBirth: '2012-01-22',
    phoneNumber: '010 667 808',
    notes: 'កំពុងខិតខំកែលម្អការធ្វើលំហាត់',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 40, week1: { activity: 8, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'តុលា': { monthlyExam: 41, week1: { activity: 8, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'វិច្ឆិកា': { monthlyExam: 42, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'មករា': { monthlyExam: 41, week1: { activity: 8, homework: 8, quiz: 7 }, week2: { activity: 8, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'កុម្ភៈ': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-09',
    studentId: '809',
    name: 'អ៊ុច ម៉ានីកា',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 93,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-06-17',
    phoneNumber: '078 990 809',
    notes: 'ពូកែគីមីវិទ្យា និងជីវវិទ្យា ចូលចិត្តស្រាវជ្រាវ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 47, week1: { activity: 10, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 50, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-10',
    studentId: '810',
    name: 'ឈុន វីរៈ',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 86,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-03-05',
    phoneNumber: '096 112 810',
    notes: 'ចេះជួយមិត្តភក្តិ ធ្វើការងារក្រុមបានល្អ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 4, groupWork: 5 },
      'តុលា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-11',
    studentId: '811',
    name: 'រ័ត្ន មុន្នី',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 89,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-10-10',
    phoneNumber: '017 334 811',
    notes: 'ពូកែគូររូប និងសិល្បៈ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 46, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 47, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 4, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-12',
    studentId: '812',
    name: 'ឃឹម សោភា',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 91,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-12-01',
    phoneNumber: '088 221 812',
    notes: 'ឧស្សាហ៍កត់ត្រាមេរៀន ច្បាស់លាស់',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 46, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-13',
    studentId: '813',
    name: 'ពេជ្រ សម្បត្តិ',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 84,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-07-28',
    phoneNumber: '015 678 813',
    notes: 'ចូលចិត្តសួរសំណួរចម្ងល់ក្នុងម៉ោងរៀន',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 41, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'តុលា': { monthlyExam: 42, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 44, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'មករា': { monthlyExam: 42, week1: { activity: 8, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'កុម្ភៈ': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-14',
    studentId: '814',
    name: 'នួន ស្រីពៅ',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 88,
    emoji: '👧',
    status: 'សកម្ម',
    dateOfBirth: '2012-09-11',
    phoneNumber: '092 443 814',
    notes: 'រៀបចំសម្ភារសិក្សាបានស្អាតបាត',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 45, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-15',
    studentId: '815',
    name: 'ទូច កុសល',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 82,
    emoji: '👦',
    status: 'កំពុងរីកចម្រើន',
    dateOfBirth: '2012-03-29',
    phoneNumber: '081 776 815',
    notes: 'មានការរីកចម្រើនលើមុខវិជ្ជាភាសាខ្មែរ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 39, week1: { activity: 8, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 8, quiz: 7 }, notebook: 4, groupWork: 4 },
      'តុលា': { monthlyExam: 41, week1: { activity: 8, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'វិច្ឆិកា': { monthlyExam: 42, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 8, quiz: 8 }, notebook: 4, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 42, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'មករា': { monthlyExam: 40, week1: { activity: 8, homework: 8, quiz: 7 }, week2: { activity: 8, homework: 7, quiz: 8 }, notebook: 4, groupWork: 4 },
      'កុម្ភៈ': { monthlyExam: 42, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 5 },
      'មីនា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-16',
    studentId: '816',
    name: 'ស៊ន ចិន្តា',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 93,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-05-08',
    phoneNumber: '093 881 816',
    notes: 'ពូកែគណិតវិទ្យា និងការគិតលេខរហ័ស',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 47, week1: { activity: 10, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 50, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-17',
    studentId: '817',
    name: 'ប្រាក់ វិបុល',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 87,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-08-02',
    phoneNumber: '012 990 817',
    notes: 'ចូលចិត្តការពិសោធន៍ និងវិទ្យាសាស្ត្រ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 45, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-18',
    studentId: '818',
    name: 'ហុង ស្រីមុំ',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 89,
    emoji: '👧',
    status: 'សកម្ម',
    dateOfBirth: '2012-10-21',
    phoneNumber: '098 123 818',
    notes: 'ពូកែមុខវិជ្ជាភូមិវិទ្យា និងប្រវត្តិវិទ្យា',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 45, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 46, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 47, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-19',
    studentId: '819',
    name: 'ឃុត ដារ៉ា',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 85,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-06-04',
    phoneNumber: '069 445 819',
    notes: 'ក្លាហាន ចូលរួមឆ្លើយសំណួរញឹកញាប់',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 42, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 5 },
      'តុលា': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 9 }, notebook: 4, groupWork: 5 },
      'មករា': { monthlyExam: 42, week1: { activity: 8, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'កុម្ភៈ': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-20',
    studentId: '820',
    name: 'ឡេង ធារី',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 91,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-11-19',
    phoneNumber: '011 556 820',
    notes: 'យកចិត្តទុកដាក់ស្ដាប់ការពន្យល់របស់គ្រូ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 45, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-21',
    studentId: '821',
    name: 'ឈៀង សុផាត',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 86,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-04-14',
    phoneNumber: '012 887 821',
    notes: 'ឧស្សាហ៍ចូលរួមធ្វើលំហាត់លើក្ដារខៀន',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 4, groupWork: 5 },
      'តុលា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 8, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-22',
    studentId: '822',
    name: 'សួស ម៉ាលីន',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 92,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-07-23',
    phoneNumber: '097 665 822',
    notes: 'ពូកែគណិតវិទ្យា និងអក្សរសាស្ត្រ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 46, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-23',
    studentId: '823',
    name: 'តាំង គឹមហុង',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 88,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-09-08',
    phoneNumber: '010 334 823',
    notes: 'ពូកែភាសាអង់គ្លេស និងកុំព្យូទ័រ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 46, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-24',
    studentId: '824',
    name: 'ភឿន ធីរ៉ា',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 90,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-01-16',
    phoneNumber: '089 778 824',
    notes: 'ឧស្សាហ៍ជួយបង្រៀនមិត្តភក្តិដែលរៀនខ្សោយ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 45, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 46, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 47, week1: { activity: 10, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 46, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 10 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-25',
    studentId: '825',
    name: 'ឡឹក សំណាង',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 84,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-05-11',
    phoneNumber: '015 998 825',
    notes: 'រីករាយរួសរាយ ចូលចិត្តកីឡាបាល់ទាត់',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 41, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'តុលា': { monthlyExam: 42, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 44, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'មករា': { monthlyExam: 42, week1: { activity: 8, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'កុម្ភៈ': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-26',
    studentId: '826',
    name: 'ហៀក គីមសួរ',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 89,
    emoji: '👧',
    status: 'សកម្ម',
    dateOfBirth: '2012-10-30',
    phoneNumber: '070 443 826',
    notes: 'សុភាព សង្វាតរៀនសូត្រ',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 45, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-27',
    studentId: '827',
    name: 'ញ៉េប សុធារ៉ា',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 87,
    emoji: '👦',
    status: 'សកម្ម',
    dateOfBirth: '2012-08-19',
    phoneNumber: '092 112 827',
    notes: 'ពូកែខាងគូរគំនូរ និងរូបវិទ្យា',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 45, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 45, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-28',
    studentId: '828',
    name: 'ឈិត គន្ធា',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 94,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-03-15',
    phoneNumber: '088 998 828',
    notes: 'សិស្សឆ្នើមលេខ១ ប្រចាំថ្នាក់',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 50, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 50, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-29',
    studentId: '829',
    name: 'អ៊ុំ សុភ័ក្រ',
    gender: 'ប្រុស',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 83,
    emoji: '👦',
    status: 'កំពុងរីកចម្រើន',
    dateOfBirth: '2012-06-27',
    phoneNumber: '016 776 829',
    notes: 'ខិតខំរៀនសូត្រ កំពុងមានការរីកចម្រើន',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 40, week1: { activity: 8, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'តុលា': { monthlyExam: 41, week1: { activity: 8, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'វិច្ឆិកា': { monthlyExam: 42, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 8, homework: 9, quiz: 8 }, notebook: 4, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 43, week1: { activity: 9, homework: 8, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'មករា': { monthlyExam: 41, week1: { activity: 8, homework: 8, quiz: 7 }, week2: { activity: 8, homework: 8, quiz: 8 }, notebook: 4, groupWork: 4 },
      'កុម្ភៈ': { monthlyExam: 43, week1: { activity: 9, homework: 9, quiz: 8 }, week2: { activity: 9, homework: 8, quiz: 8 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 44, week1: { activity: 9, homework: 9, quiz: 9 }, week2: { activity: 9, homework: 9, quiz: 8 }, notebook: 5, groupWork: 5 }
    }
  },
  {
    id: 'std-8k1-30',
    studentId: '830',
    name: 'ឃ្លាំង ណារី',
    gender: 'ស្រី',
    grade: 'ថ្នាក់ទី៨ក១',
    classId: GRADE_8K1_CLASS_ID,
    score: 91,
    emoji: '👧',
    status: 'ឆ្នើម',
    dateOfBirth: '2012-12-12',
    phoneNumber: '096 887 830',
    notes: 'ពូកែជីវវិទ្យា និងភូមិវិទ្យា',
    monthlyScores: {
      'កញ្ញា': { monthlyExam: 46, week1: { activity: 10, homework: 9, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'តុលា': { monthlyExam: 47, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 },
      'វិច្ឆិកា': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'ធ្នូ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 9 }, notebook: 5, groupWork: 5 },
      'មករា': { monthlyExam: 46, week1: { activity: 9, homework: 10, quiz: 9 }, week2: { activity: 10, homework: 9, quiz: 10 }, notebook: 5, groupWork: 5 },
      'កុម្ភៈ': { monthlyExam: 48, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 },
      'មីនា': { monthlyExam: 49, week1: { activity: 10, homework: 10, quiz: 10 }, week2: { activity: 10, homework: 10, quiz: 10 }, notebook: 5, groupWork: 5 }
    }
  }
];

// Grade 8 Quiz Subjects with complete Chapters, Rooms & Multiple Choice Questions
export const GRADE_8K1_SUBJECTS: QuizSubject[] = [
  {
    id: 'sub-g8-math',
    name: 'គណិតវិទ្យា',
    icon: '📐',
    createdAt: Date.now(),
    chapters: [
      {
        id: 'ch-math-01',
        name: 'ជំពូកទី១៖ ចំនួនសនិទាន និងចំនួនអសនិទាន',
        createdAt: Date.now(),
        rooms: [
          {
            id: 'rm-math-01',
            name: 'មេរៀនទី១៖ ចំនួនសនិទាន និងប្រភាគ',
            createdAt: Date.now(),
            pickedIds: [],
            cards: [
              {
                id: 'card-m-01',
                number: 1,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-01',
                  text: 'តើចំនួនសនិទាន (Rational Number) ជាចំនួនបែបណា?',
                  options: [
                    'ចំនួនដែលអាចសរសេរជាទម្រង់ a/b (b ≠ 0)',
                    'ចំនួនគត់វិជ្ជមានតែមួយមុខ',
                    'ចំនួនដែលមិនអាចគណនាបាន',
                    'ចំនួនទសភាគគ្មានខួប'
                  ],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'ចំនួនសនិទាន គឺជាចំនួនដែលអាចសរសេរជាទម្រង់ប្រភាគ a/b ដែល a និង b ជាចំនួនគត់ ហើយ b ≠ 0។'
                }
              },
              {
                id: 'card-m-02',
                number: 2,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-02',
                  text: 'ចូរគណនាផលបូក៖ 2/5 + 3/10 = ?',
                  options: ['7/10', '5/15', '1/2', '4/5'],
                  correctIndex: 0,
                  points: 5,
                  explanation: '2/5 = 4/10; 4/10 + 3/10 = 7/10'
                }
              },
              {
                id: 'card-m-03',
                number: 3,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-03',
                  text: 'ចូរគណនា៖ (-3/4) × (8/9) = ?',
                  options: ['-2/3', '2/3', '-1/2', '-6/13'],
                  correctIndex: 0,
                  points: 5,
                  explanation: '(-3 × 8) / (4 × 9) = -24 / 36 = -2/3'
                }
              },
              {
                id: 'card-m-04',
                number: 4,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-04',
                  text: 'តើ √16 ជាចំនួនអ្វី?',
                  options: ['ចំនួនសនិទាន (= 4)', 'ចំនួនអសនិទាន', 'ចំនួនអវិជ្ជមាន', 'ចំនួនទសភាគគ្មានទីបញ្ចប់'],
                  correctIndex: 0,
                  points: 5,
                  explanation: '√16 = 4 ដែលជាចំនួនគត់ និងជាចំនួនសនិទាន។'
                }
              },
              {
                id: 'card-m-05',
                number: 5,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-05',
                  text: 'តើ π (Pi) ជាប្រភេទចំនួនអ្វី?',
                  options: ['ចំនួនអសនិទាន (Irrational Number)', 'ចំនួនសនិទាន', 'ចំនួនគត់ធម្មជាតិ', 'ចំនួនគត់រ៉ឺឡាទីប'],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'π = 3.14159... ជាចំនួនទសភាគមិនកំណត់ និងគ្មានខួប ដូច្នេះជាចំនួនអសនិទាន។'
                }
              }
            ]
          },
          {
            id: 'rm-math-02',
            name: 'មេរៀនទី២៖ ស្វ័យគុណ និងឫសការ៉េ',
            createdAt: Date.now(),
            pickedIds: [],
            cards: [
              {
                id: 'card-m-06',
                number: 1,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-06',
                  text: 'ចូរគណនា៖ (2^3) × (2^4) = ?',
                  options: ['2^7 = 128', '2^12 = 4096', '4^7', '2^1 = 2'],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'a^m × a^n = a^(m+n) => 2^(3+4) = 2^7 = 128'
                }
              },
              {
                id: 'card-m-07',
                number: 2,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-07',
                  text: 'តម្លៃនៃ √81 ស្មើនឹងប៉ុន្មាន?',
                  options: ['9', '8', '7', '81'],
                  correctIndex: 0,
                  points: 5,
                  explanation: '9 × 9 = 81 ដូច្នេះ √81 = 9'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'ch-math-02',
        name: 'ជំពូកទី២៖ កន្សោមពីជគណិត និងសមីការ',
        createdAt: Date.now(),
        rooms: [
          {
            id: 'rm-math-03',
            name: 'មេរៀនទី១៖ សមីការដឺក្រេទី១ មានមួយអញ្ញាត',
            createdAt: Date.now(),
            pickedIds: [],
            cards: [
              {
                id: 'card-m-08',
                number: 1,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-08',
                  text: 'ដោះស្រាយសមីការ៖ 2x + 6 = 14',
                  options: ['x = 4', 'x = 5', 'x = 3', 'x = 10'],
                  correctIndex: 0,
                  points: 5,
                  explanation: '2x = 14 - 6 = 8 => x = 8 / 2 = 4'
                }
              },
              {
                id: 'card-m-09',
                number: 2,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-m-09',
                  text: 'ដោះស្រាយសមីការ៖ 5x - 3 = 2x + 9',
                  options: ['x = 4', 'x = 6', 'x = 2', 'x = 3'],
                  correctIndex: 0,
                  points: 5,
                  explanation: '5x - 2x = 9 + 3 => 3x = 12 => x = 4'
                }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'sub-g8-khmer',
    name: 'ភាសាខ្មែរ',
    icon: '📚',
    createdAt: Date.now(),
    chapters: [
      {
        id: 'ch-kh-01',
        name: 'ជំពូកទី១៖ អក្សរសិល្ប៍ និងអំណាន',
        createdAt: Date.now(),
        rooms: [
          {
            id: 'rm-kh-01',
            name: 'មេរៀនទី១៖ រឿងទុំទាវ',
            createdAt: Date.now(),
            pickedIds: [],
            cards: [
              {
                id: 'card-kh-01',
                number: 1,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-kh-01',
                  text: 'តើនរណាជាអ្នកនិពន្ធរឿង «ទុំទាវ»?',
                  options: ['ព្រះភិក្ខុសោម (ភិក្ខុសោម)', 'ក្រមង៉ុយ', 'សន្ធរម៉ុក', 'ព្រះបាទអង្គឌួង'],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'រឿងទុំទាវ និពន្ធដោយព្រះភិក្ខុសោម នៅឆ្នាំ១៩១៥។'
                }
              },
              {
                id: 'card-kh-02',
                number: 2,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-kh-02',
                  text: 'តើប្រធានរឿងសំខាន់ក្នុងរឿងទុំទាវ ឆ្លុះបញ្ចាំងពីអ្វី?',
                  options: [
                    'ស្នេហាបរិសុទ្ធប្រឆាំងនឹងទំនៀមទម្លាប់ «នំមិនធំជាងនាឡិ»',
                    'ការធ្វើសង្គ្រាមដណ្តើមទឹកដី',
                    'ការកសាងប្រាសាទបុរាណ',
                    'ការធ្វើពាណិជ្ជកម្មតាមសមុទ្រ'
                  ],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'ឆ្លុះបញ្ចាំងពីសោកនាដកម្មស្នេហាទុំ និងទាវ ដែលរងសម្ពាធពីទំនៀមទម្លាប់ហួសហេតុ។'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'ch-kh-02',
        name: 'ជំពូកទី២៖ វេយ្យាករណ៍ និងតែងសេចក្តី',
        createdAt: Date.now(),
        rooms: [
          {
            id: 'rm-kh-02',
            name: 'មេរៀនទី១៖ ថ្នាក់ពាក្យ និងឃ្លា',
            createdAt: Date.now(),
            pickedIds: [],
            cards: [
              {
                id: 'card-kh-03',
                number: 1,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-kh-03',
                  text: 'តើពាក្យ «សិស្សានុសិស្ស» ជាប្រភេទពាក្យអ្វី?',
                  options: ['នាមសាមញ្ញ (នាមសមាស)', 'កិរិយាស័ព្ទ', 'គុណនាម', 'ធ្នាក់'],
                  correctIndex: 0,
                  points: 5,
                  explanation: '«សិស្សានុសិស្ស» ជាពាក្យនាមសម្គាល់សិស្សទាំងឡាយ។'
                }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'sub-g8-physics',
    name: 'រូបវិទ្យា',
    icon: '⚡',
    createdAt: Date.now(),
    chapters: [
      {
        id: 'ch-phy-01',
        name: 'ជំពូកទី១៖ ចលនា និងកម្លាំង',
        createdAt: Date.now(),
        rooms: [
          {
            id: 'rm-phy-01',
            name: 'មេរៀនទី១៖ ល្បឿន និងចម្ងាយចរ',
            createdAt: Date.now(),
            pickedIds: [],
            cards: [
              {
                id: 'card-phy-01',
                number: 1,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-phy-01',
                  text: 'រូបមន្តគណនាល្បឿនមធ្យម v គឺ៖',
                  options: ['v = d / t', 'v = d × t', 'v = t / d', 'v = d + t'],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'ល្បឿន v = d / t (ចម្ងាយចែកនឹងរយៈពេល)'
                }
              },
              {
                id: 'card-phy-02',
                number: 2,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-phy-02',
                  text: 'ខ្នាតអន្តរជាតិ (SI) នៃកម្លាំង គឺ៖',
                  options: ['ញូតុន (N)', 'ហ្ស៊ូល (J)', 'វ៉ាត់ (W)', 'គីឡូក្រាម (kg)'],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'ខ្នាតកម្លាំងគិតជា ញូតុន (N)។'
                }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'sub-g8-chemistry',
    name: 'គីមីវិទ្យា',
    icon: '🧪',
    createdAt: Date.now(),
    chapters: [
      {
        id: 'ch-chem-01',
        name: 'ជំពូកទី១៖ ធាតុគីមី និងសមាសធាតុ',
        createdAt: Date.now(),
        rooms: [
          {
            id: 'rm-chem-01',
            name: 'មេរៀនទី១៖ និមិត្តសញ្ញា និងម៉ាស់អាតូម',
            createdAt: Date.now(),
            pickedIds: [],
            cards: [
              {
                id: 'card-chem-01',
                number: 1,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-chem-01',
                  text: 'តើនិមិត្តសញ្ញាគីមីនៃធាតុ «ដែក» គឺអ្វី?',
                  options: ['Fe', 'Cu', 'Au', 'Ag'],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'ដែក (Iron) មាននិមិត្តសញ្ញាគីមី Fe (Ferrum)។'
                }
              },
              {
                id: 'card-chem-02',
                number: 2,
                isRevealed: false,
                status: 'idle',
                question: {
                  id: 'q-chem-02',
                  text: 'រូបមន្តគីមីនៃទឹកស្អាត គឺ៖',
                  options: ['H2O', 'CO2', 'NaCl', 'O2'],
                  correctIndex: 0,
                  points: 5,
                  explanation: 'ទឹកផ្សំឡើងពីអ៊ីដ្រូសែន ២ អាតូម និងអុកស៊ីសែន ១ អាតូម (H2O)។'
                }
              }
            ]
          }
        ]
      }
    ]
  }
];

// Sample Attendance for ថ្នាក់ទី៨ក១ across dates
export function getGrade8AttendanceSeed() {
  const attendanceRecords: Record<string, Record<string, 'present' | 'absent' | 'permission' | 'late'>> = {};
  const attendanceReasons: Record<string, Record<string, string>> = {};

  const dates = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];
  const subjectKeys = ['sub-g8-math', 'sub-g8-khmer', 'sub-g8-physics', 'general'];

  dates.forEach((dStr, dIdx) => {
    subjectKeys.forEach(subKey => {
      const classKey = `${GRADE_8K1_CLASS_ID}_${subKey}_${dStr}`;
      const rec: Record<string, 'present' | 'absent' | 'permission' | 'late'> = {};
      const reasons: Record<string, string> = {};

      GRADE_8K1_STUDENTS.forEach((std, sIdx) => {
        // Mostly present, occasional permission/late
        if ((sIdx + dIdx) % 11 === 0) {
          rec[std.id] = 'permission';
          reasons[std.id] = 'ឈឺ/គ្រុនក្តៅ (មានច្បាប់)';
        } else if ((sIdx + dIdx) % 15 === 0) {
          rec[std.id] = 'late';
          reasons[std.id] = 'ស្ទះចរាចរណ៍ យឺត ១០ នាទី';
        } else {
          rec[std.id] = 'present';
        }
      });

      attendanceRecords[classKey] = rec;
      attendanceReasons[classKey] = reasons;

      // Legacy key fallback
      const legacyKey = `${GRADE_8K1_CLASS_ID}_${dStr}`;
      attendanceRecords[legacyKey] = rec;
      attendanceReasons[legacyKey] = reasons;
    });
  });

  return { attendanceRecords, attendanceReasons };
}

// Full seeding helper that writes to localStorage and returns the objects
export function seedGrade8DataToLocalStorage() {
  try {
    // 1. Students
    localStorage.setItem(`students_class_${GRADE_8K1_CLASS_ID}`, JSON.stringify(GRADE_8K1_STUDENTS));
    
    // 2. Subjects & Chapters & Cards
    localStorage.setItem(`subjects_class_${GRADE_8K1_CLASS_ID}`, JSON.stringify(GRADE_8K1_SUBJECTS));
    const activeSub = GRADE_8K1_SUBJECTS[0];
    const activeCh = activeSub.chapters[0];
    const activeRm = activeCh.rooms[0];
    
    localStorage.setItem(`active_subject_id_${GRADE_8K1_CLASS_ID}`, activeSub.id);
    localStorage.setItem(`chapters_class_${GRADE_8K1_CLASS_ID}`, JSON.stringify(activeSub.chapters));
    localStorage.setItem(`active_room_id_${GRADE_8K1_CLASS_ID}`, activeRm.id);
    localStorage.setItem(`quiz_cards_class_${GRADE_8K1_CLASS_ID}`, JSON.stringify(activeRm.cards));
    localStorage.setItem(`picked_students_class_${GRADE_8K1_CLASS_ID}`, JSON.stringify([]));

    // 3. Attendance
    const { attendanceRecords, attendanceReasons } = getGrade8AttendanceSeed();
    
    let existingAttendance: Record<string, any> = {};
    try {
      const savedAtt = localStorage.getItem('edu_spin_attendance_records');
      if (savedAtt) existingAttendance = JSON.parse(savedAtt);
    } catch {}
    const mergedAttendance = { ...existingAttendance, ...attendanceRecords };
    localStorage.setItem('edu_spin_attendance_records', JSON.stringify(mergedAttendance));

    let existingReasons: Record<string, any> = {};
    try {
      const savedRea = localStorage.getItem('edu_spin_attendance_reasons');
      if (savedRea) existingReasons = JSON.parse(savedRea);
    } catch {}
    const mergedReasons = { ...existingReasons, ...attendanceReasons };
    localStorage.setItem('edu_spin_attendance_reasons', JSON.stringify(mergedReasons));

    return {
      students: GRADE_8K1_STUDENTS,
      subjects: GRADE_8K1_SUBJECTS,
      cards: activeRm.cards,
      chapters: activeSub.chapters,
      activeSubjectId: activeSub.id,
      activeRoomId: activeRm.id,
      attendance: mergedAttendance,
      reasons: mergedReasons
    };
  } catch (err) {
    console.error('Failed to seed Grade 8 data to localStorage:', err);
    return null;
  }
}

