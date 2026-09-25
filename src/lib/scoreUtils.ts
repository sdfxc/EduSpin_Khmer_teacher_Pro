import { Student, MonthlyDetailedScore, WeeklyScoreBreakdown } from '../types';

export const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

export type WeekKey = 'week1' | 'week2' | 'week3' | 'week4';

export function getCurrentDateScoreSlot(date: Date = new Date()): {
  month: string;
  weekKey: WeekKey;
  weekLabel: string;
  day: number;
} {
  const month = KHMER_MONTHS[date.getMonth()] || 'កញ្ញា';
  const day = date.getDate();
  let weekKey: WeekKey = 'week1';
  let weekLabel = 'សប្ដាហ៍ទី 1 (Week 1)';

  if (day <= 7) {
    weekKey = 'week1';
    weekLabel = 'សប្ដាហ៍ទី 1 (Week 1)';
  } else if (day <= 14) {
    weekKey = 'week2';
    weekLabel = 'សប្ដាហ៍ទី 2 (Week 2)';
  } else if (day <= 21) {
    weekKey = 'week3';
    weekLabel = 'សប្ដាហ៍ទី 3 (Week 3)';
  } else {
    weekKey = 'week4';
    weekLabel = 'សប្ដាហ៍ទី 4 (Week 4)';
  }

  return { month, weekKey, weekLabel, day };
}

export function addActivityPointsToStudent(
  student: Student,
  points: number = 5,
  date: Date = new Date()
): {
  updatedStudent: Student;
  month: string;
  weekKey: WeekKey;
  weekLabel: string;
  newActivityScore: number;
} {
  const { month, weekKey, weekLabel } = getCurrentDateScoreSlot(date);
  const currentMonthScores = student.monthlyScores || {};
  const existingMonthData: MonthlyDetailedScore = currentMonthScores[month] || {};
  const updatedMonthData: MonthlyDetailedScore = JSON.parse(JSON.stringify(existingMonthData));

  // Clear manual overrides so dynamic formulas calculate cleanly
  delete updatedMonthData.manualTotal;
  delete updatedMonthData.manualSubTotalNoExam;
  delete updatedMonthData.manualAverage;

  const currentWeek: WeeklyScoreBreakdown = updatedMonthData[weekKey] || {};
  const currentActivity = Number(currentWeek.activity) || 0;
  const newActivityScore = currentActivity + points;

  updatedMonthData[weekKey] = {
    ...currentWeek,
    activity: newActivityScore
  };

  // Recalculate auto total
  const mExam = Number(updatedMonthData.monthlyExam) || 0;
  const w1 = (Number(updatedMonthData.week1?.activity) || 0) + (Number(updatedMonthData.week1?.homework) || 0) + (Number(updatedMonthData.week1?.quiz) || 0);
  const w2 = (Number(updatedMonthData.week2?.activity) || 0) + (Number(updatedMonthData.week2?.homework) || 0) + (Number(updatedMonthData.week2?.quiz) || 0);
  const w3 = (Number(updatedMonthData.week3?.activity) || 0) + (Number(updatedMonthData.week3?.homework) || 0) + (Number(updatedMonthData.week3?.quiz) || 0);
  const w4 = (Number(updatedMonthData.week4?.activity) || 0) + (Number(updatedMonthData.week4?.homework) || 0) + (Number(updatedMonthData.week4?.quiz) || 0);
  const quiz = Number(updatedMonthData.quiz) || 0;
  const notebook = Number(updatedMonthData.notebook) || 0;
  const groupWork = Number(updatedMonthData.groupWork) || 0;

  const newTotal = mExam + w1 + w2 + w3 + w4 + groupWork + quiz + notebook;

  const updatedStudent: Student = {
    ...student,
    monthlyScores: {
      ...currentMonthScores,
      [month]: updatedMonthData
    },
    score: newTotal
  };

  return {
    updatedStudent,
    month,
    weekKey,
    weekLabel,
    newActivityScore
  };
}

export function setActivityScoreForStudent(
  student: Student,
  exactScore: number,
  date: Date = new Date()
): {
  updatedStudent: Student;
  month: string;
  weekKey: WeekKey;
  weekLabel: string;
  newActivityScore: number;
} {
  const { month, weekKey, weekLabel } = getCurrentDateScoreSlot(date);
  const currentMonthScores = student.monthlyScores || {};
  const existingMonthData: MonthlyDetailedScore = currentMonthScores[month] || {};
  const updatedMonthData: MonthlyDetailedScore = JSON.parse(JSON.stringify(existingMonthData));

  delete updatedMonthData.manualTotal;
  delete updatedMonthData.manualSubTotalNoExam;
  delete updatedMonthData.manualAverage;

  const currentWeek: WeeklyScoreBreakdown = updatedMonthData[weekKey] || {};
  const newActivityScore = Math.max(0, exactScore);

  updatedMonthData[weekKey] = {
    ...currentWeek,
    activity: newActivityScore
  };

  const mExam = Number(updatedMonthData.monthlyExam) || 0;
  const w1 = (Number(updatedMonthData.week1?.activity) || 0) + (Number(updatedMonthData.week1?.homework) || 0) + (Number(updatedMonthData.week1?.quiz) || 0);
  const w2 = (Number(updatedMonthData.week2?.activity) || 0) + (Number(updatedMonthData.week2?.homework) || 0) + (Number(updatedMonthData.week2?.quiz) || 0);
  const w3 = (Number(updatedMonthData.week3?.activity) || 0) + (Number(updatedMonthData.week3?.homework) || 0) + (Number(updatedMonthData.week3?.quiz) || 0);
  const w4 = (Number(updatedMonthData.week4?.activity) || 0) + (Number(updatedMonthData.week4?.homework) || 0) + (Number(updatedMonthData.week4?.quiz) || 0);
  const quiz = Number(updatedMonthData.quiz) || 0;
  const notebook = Number(updatedMonthData.notebook) || 0;
  const groupWork = Number(updatedMonthData.groupWork) || 0;

  const newTotal = mExam + w1 + w2 + w3 + w4 + groupWork + quiz + notebook;

  const updatedStudent: Student = {
    ...student,
    monthlyScores: {
      ...currentMonthScores,
      [month]: updatedMonthData
    },
    score: newTotal
  };

  return {
    updatedStudent,
    month,
    weekKey,
    weekLabel,
    newActivityScore
  };
}

export function addGroupWorkPointsToStudent(
  student: Student,
  points: number,
  date: Date = new Date()
): {
  updatedStudent: Student;
  month: string;
  newGroupWorkScore: number;
} {
  const { month } = getCurrentDateScoreSlot(date);
  const currentMonthScores = student.monthlyScores || {};
  const existingMonthData: MonthlyDetailedScore = currentMonthScores[month] || {};
  const updatedMonthData: MonthlyDetailedScore = JSON.parse(JSON.stringify(existingMonthData));

  delete updatedMonthData.manualTotal;
  delete updatedMonthData.manualSubTotalNoExam;
  delete updatedMonthData.manualAverage;

  const currentGroupWork = Number(updatedMonthData.groupWork) || 0;
  const newGroupWorkScore = Math.max(0, currentGroupWork + points);

  updatedMonthData.groupWork = newGroupWorkScore;

  const mExam = Number(updatedMonthData.monthlyExam) || 0;
  const w1 = (Number(updatedMonthData.week1?.activity) || 0) + (Number(updatedMonthData.week1?.homework) || 0) + (Number(updatedMonthData.week1?.quiz) || 0);
  const w2 = (Number(updatedMonthData.week2?.activity) || 0) + (Number(updatedMonthData.week2?.homework) || 0) + (Number(updatedMonthData.week2?.quiz) || 0);
  const w3 = (Number(updatedMonthData.week3?.activity) || 0) + (Number(updatedMonthData.week3?.homework) || 0) + (Number(updatedMonthData.week3?.quiz) || 0);
  const w4 = (Number(updatedMonthData.week4?.activity) || 0) + (Number(updatedMonthData.week4?.homework) || 0) + (Number(updatedMonthData.week4?.quiz) || 0);
  const quiz = Number(updatedMonthData.quiz) || 0;
  const notebook = Number(updatedMonthData.notebook) || 0;
  const groupWork = Number(updatedMonthData.groupWork) || 0;

  const newTotal = mExam + w1 + w2 + w3 + w4 + groupWork + quiz + notebook;

  const updatedStudent: Student = {
    ...student,
    monthlyScores: {
      ...currentMonthScores,
      [month]: updatedMonthData
    },
    score: newTotal
  };

  return {
    updatedStudent,
    month,
    newGroupWorkScore
  };
}

export function setGroupWorkScoreForStudent(
  student: Student,
  exactScore: number,
  date: Date = new Date()
): {
  updatedStudent: Student;
  month: string;
  newGroupWorkScore: number;
} {
  const { month } = getCurrentDateScoreSlot(date);
  const currentMonthScores = student.monthlyScores || {};
  const existingMonthData: MonthlyDetailedScore = currentMonthScores[month] || {};
  const updatedMonthData: MonthlyDetailedScore = JSON.parse(JSON.stringify(existingMonthData));

  delete updatedMonthData.manualTotal;
  delete updatedMonthData.manualSubTotalNoExam;
  delete updatedMonthData.manualAverage;

  const newGroupWorkScore = Math.max(0, exactScore);
  updatedMonthData.groupWork = newGroupWorkScore;

  const mExam = Number(updatedMonthData.monthlyExam) || 0;
  const w1 = (Number(updatedMonthData.week1?.activity) || 0) + (Number(updatedMonthData.week1?.homework) || 0) + (Number(updatedMonthData.week1?.quiz) || 0);
  const w2 = (Number(updatedMonthData.week2?.activity) || 0) + (Number(updatedMonthData.week2?.homework) || 0) + (Number(updatedMonthData.week2?.quiz) || 0);
  const w3 = (Number(updatedMonthData.week3?.activity) || 0) + (Number(updatedMonthData.week3?.homework) || 0) + (Number(updatedMonthData.week3?.quiz) || 0);
  const w4 = (Number(updatedMonthData.week4?.activity) || 0) + (Number(updatedMonthData.week4?.homework) || 0) + (Number(updatedMonthData.week4?.quiz) || 0);
  const quiz = Number(updatedMonthData.quiz) || 0;
  const notebook = Number(updatedMonthData.notebook) || 0;
  const groupWork = Number(updatedMonthData.groupWork) || 0;

  const newTotal = mExam + w1 + w2 + w3 + w4 + groupWork + quiz + notebook;

  const updatedStudent: Student = {
    ...student,
    monthlyScores: {
      ...currentMonthScores,
      [month]: updatedMonthData
    },
    score: newTotal
  };

  return {
    updatedStudent,
    month,
    newGroupWorkScore
  };
}

export function getStudentCurrentWeekActivityScore(student: Student, date: Date = new Date()): {
  activityScore: number;
  month: string;
  weekKey: WeekKey;
  weekLabel: string;
} {
  const { month, weekKey, weekLabel } = getCurrentDateScoreSlot(date);
  const monthData = student.monthlyScores?.[month];
  const weekData = monthData?.[weekKey];
  const activityScore = Number(weekData?.activity) || 0;
  return { activityScore, month, weekKey, weekLabel };
}
