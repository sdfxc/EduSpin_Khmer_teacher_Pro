/**
 * deletionRegistry.ts
 * 
 * Comprehensive, permanent tracking of deleted data across the application.
 * Ensures that any data deleted by the user (classes, students, exams, subjects,
 * chapters, rooms) NEVER recovers or reappears when the page is refreshed, 
 * when the app is reopened, or when cloud snapshots reconnect.
 */

import { QuizSubject } from '../types';

function scanKeysForDeleted(prefix: string): Set<string> {
  const set = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            arr.forEach(id => {
              if (id) set.add(String(id));
            });
          }
        }
      }
    }
  } catch {}
  return set;
}

function addToStorageList(key: string, id: string) {
  try {
    const raw = localStorage.getItem(key);
    let arr: string[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed.map(String);
    }
    if (!arr.includes(id)) {
      arr.push(id);
      localStorage.setItem(key, JSON.stringify(arr));
    }
  } catch {}
}

function removeFromStorageList(prefix: string, id: string) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const filtered = arr.filter(item => String(item) !== id);
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        }
      }
    }
  } catch {}
}

// ----------------------------------------------------
// 1. CLASSES
// ----------------------------------------------------
export function getDeletedClassIds(teacherId?: string): Set<string> {
  return scanKeysForDeleted('khmer_teacher_deleted_classes');
}

export function markClassAsDeleted(classId: string, teacherId?: string) {
  if (!classId) return;
  const strId = String(classId);
  addToStorageList('khmer_teacher_deleted_classes_local', strId);
  if (teacherId && teacherId !== 'local') {
    addToStorageList(`khmer_teacher_deleted_classes_${teacherId}`, strId);
  }
}

export function unmarkClassAsDeleted(classId: string) {
  if (!classId) return;
  removeFromStorageList('khmer_teacher_deleted_classes', String(classId));
}

// ----------------------------------------------------
// 2. STUDENTS
// ----------------------------------------------------
export function getDeletedStudentIds(classId?: string): Set<string> {
  return scanKeysForDeleted('khmer_deleted_students');
}

export function markStudentAsDeleted(studentId: string, classId?: string) {
  if (!studentId) return;
  const strId = String(studentId);
  addToStorageList('khmer_deleted_students_global', strId);
  if (classId) {
    addToStorageList(`khmer_deleted_students_${classId}`, strId);
  }
}

export function unmarkStudentAsDeleted(studentId: string) {
  if (!studentId) return;
  removeFromStorageList('khmer_deleted_students', String(studentId));
}

// ----------------------------------------------------
// 3. EXAMS
// ----------------------------------------------------
export function getDeletedExamIds(classId?: string): Set<string> {
  return scanKeysForDeleted('khmer_deleted_exams');
}

export function markExamAsDeleted(examId: string, classId?: string) {
  if (!examId) return;
  const strId = String(examId);
  addToStorageList('khmer_deleted_exams_global', strId);
  if (classId) {
    addToStorageList(`khmer_deleted_exams_${classId}`, strId);
  }
}

export function unmarkExamAsDeleted(examId: string) {
  if (!examId) return;
  removeFromStorageList('khmer_deleted_exams', String(examId));
}

// ----------------------------------------------------
// 4. SUBJECTS, CHAPTERS, ROOMS
// ----------------------------------------------------
export function getDeletedSubjectIds(): Set<string> {
  return scanKeysForDeleted('khmer_deleted_subjects');
}

export function markSubjectAsDeleted(subjectId: string) {
  if (!subjectId) return;
  addToStorageList('khmer_deleted_subjects_global', String(subjectId));
}

export function unmarkSubjectAsDeleted(subjectId: string) {
  if (!subjectId) return;
  removeFromStorageList('khmer_deleted_subjects', String(subjectId));
}

export function getDeletedChapterIds(): Set<string> {
  return scanKeysForDeleted('khmer_deleted_chapters');
}

export function markChapterAsDeleted(chapterId: string) {
  if (!chapterId) return;
  addToStorageList('khmer_deleted_chapters_global', String(chapterId));
}

export function unmarkChapterAsDeleted(chapterId: string) {
  if (!chapterId) return;
  removeFromStorageList('khmer_deleted_chapters', String(chapterId));
}

export function getDeletedRoomIds(): Set<string> {
  return scanKeysForDeleted('khmer_deleted_rooms');
}

export function markRoomAsDeleted(roomId: string) {
  if (!roomId) return;
  addToStorageList('khmer_deleted_rooms_global', String(roomId));
}

export function unmarkRoomAsDeleted(roomId: string) {
  if (!roomId) return;
  removeFromStorageList('khmer_deleted_rooms', String(roomId));
}

/**
 * Filters a QuizSubject array to remove any deleted subjects, chapters, or rooms.
 */
export function filterDeletedSubjects(subjects: QuizSubject[]): QuizSubject[] {
  if (!Array.isArray(subjects)) return [];
  const delSubjects = getDeletedSubjectIds();
  const delChapters = getDeletedChapterIds();
  const delRooms = getDeletedRoomIds();

  return subjects
    .filter(sub => sub && sub.id && !delSubjects.has(String(sub.id)))
    .map(sub => {
      const validChapters = (sub.chapters || [])
        .filter(ch => ch && ch.id && !delChapters.has(String(ch.id)))
        .map(ch => {
          const validRooms = (ch.rooms || [])
            .filter(r => r && r.id && !delRooms.has(String(r.id)));
          return {
            ...ch,
            rooms: validRooms
          };
        });
      return {
        ...sub,
        chapters: validChapters
      };
    });
}
