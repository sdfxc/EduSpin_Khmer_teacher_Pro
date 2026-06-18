import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Edit3, 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  Check, 
  X, 
  Sparkles, 
  School, 
  Clock, 
  Save, 
  BookOpen, 
  ChevronRight,
  GraduationCap,
  Download,
  CheckCircle2,
  FileCode,
  Languages,
  Settings,
  Eye,
  Layers
} from 'lucide-react';
import { generateQuestions, getSavedApiKey } from '../lib/gemini';
import { PREBUILT_LESSONS } from '../lib/templates';
import { Question } from '../types';
import FormulaRenderer, { renderFormulaToHtml, preprocessText } from './FormulaRenderer';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  AlignmentType, 
  BorderStyle, 
  WidthType, 
  VerticalAlign,
  ImageRun
} from 'docx';

export const AVAILABLE_FONTS = [
  { id: 'Khmer OS', name: 'Khmer OS', cssValue: "'Khmer OS', 'Hanuman', serif", wordFontName: 'Khmer OS', googleFontId: 'Hanuman' },
  { id: 'Khmer OS Content', name: 'Khmer OS Content', cssValue: "'Khmer OS Content', 'Content', sans-serif", wordFontName: 'Khmer OS Content', googleFontId: 'Content' },
  { id: 'Khmer OS Siemreap', name: 'Khmer OS Siemreap', cssValue: "'Khmer OS Siemreap', 'Siemreap', sans-serif", wordFontName: 'Khmer OS Siemreap', googleFontId: 'Siemreap' },
  { id: 'Khmer OS Battambang', name: 'Khmer OS Battambang', cssValue: "'Khmer OS Battambang', 'Battambang', sans-serif", wordFontName: 'Khmer OS Battambang', googleFontId: 'Battambang' },
  { id: 'Khmer OS Muol Light', name: 'Khmer OS Muol Light', cssValue: "'Khmer OS Muol Light', 'Moul', sans-serif", wordFontName: 'Khmer OS Muol Light', googleFontId: 'Moul' },
  { id: 'Khmer OS Muol', name: 'Khmer OS Muol', cssValue: "'Khmer OS Muol', 'Moul', sans-serif", wordFontName: 'Khmer OS Muol', googleFontId: 'Moul' },
  { id: 'Battambang', name: 'បាត់ដំបង (Battambang)', cssValue: "'Battambang', 'Khmer OS Battambang', sans-serif", wordFontName: 'Khmer OS Battambang', googleFontId: 'Battambang' },
  { id: 'Moul', name: 'អក្សរមូល (Moul)', cssValue: "'Moul', 'Khmer OS Muol Light', sans-serif", wordFontName: 'Khmer OS Muol Light', googleFontId: 'Moul' },
  { id: 'Ang DaunTep', name: 'សន្លឹកសៀវភៅ (Ang DaunTep)', cssValue: "'Ang DaunTep', 'AngDaunTep', 'Khmer OS Ang DaunTep', sans-serif", wordFontName: 'Khmer OS Ang DaunTep', googleFontId: 'AngDaunTep' },
  { id: 'Content', name: 'មាតិកា (Content)', cssValue: "'Content', 'Khmer OS Content', sans-serif", wordFontName: 'Khmer OS Content', googleFontId: 'Content' },
  { id: 'Kantumruy Pro', name: 'កន្ទុយរុយ (Kantumruy Pro)', cssValue: "'Kantumruy Pro', sans-serif", wordFontName: 'Kantumruy Pro', googleFontId: 'Kantumruy Pro' },
  { id: 'Siemreap', name: 'សៀមរាប (Siemreap)', cssValue: "'Siemreap', sans-serif", wordFontName: 'Khmer OS Siemreap', googleFontId: 'Siemreap' },
  { id: 'Hanuman', name: 'ហនុមាន (Hanuman)', cssValue: "'Hanuman', serif", wordFontName: 'Khmer OS', googleFontId: 'Hanuman' },
  { id: 'Nokora', name: 'នគរ (Nokora)', cssValue: "'Nokora', serif", wordFontName: 'Khmer OS Bokor', googleFontId: 'Nokora' },
  { id: 'Odor Mean Chey', name: 'ឧត្តរមានជ័យ (Odor)', cssValue: "'Odor Mean Chey', sans-serif", wordFontName: 'Khmer OS Metal Chrieng', googleFontId: 'Odor Mean Chey' },
  { id: 'Preahvihear', name: 'ព្រះវិហារ (Preahvihear)', cssValue: "'Preahvihear', sans-serif", wordFontName: 'Khmer OS Freehand', googleFontId: 'Preahvihear' },
  { id: 'Koulen', name: 'កូលែន (Koulen)', cssValue: "'Koulen', sans-serif", wordFontName: 'Koulen', googleFontId: 'Koulen' },
  { id: 'Angkor', name: 'អង្គរ (Angkor)', cssValue: "'Angkor', display", wordFontName: 'Angkor', googleFontId: 'Angkor' },
  { id: 'Bokor', name: 'បូកគោ (Bokor)', cssValue: "'Bokor', display", wordFontName: 'Bokor', googleFontId: 'Bokor' },
  { id: 'Fasthand', name: 'ដៃរហ័ស (Fasthand)', cssValue: "'Fasthand', cursive", wordFontName: 'Fasthand', googleFontId: 'Fasthand' }
];

export const FONT_SIZES = [5, 6, 7, 8, 9, 10, 10.5, 11, 11.5, 12, 13, 14, 15, 16, 18, 20, 24];

export interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  questionType?: 'general' | 'pisa';
  explanation?: string;
  points?: number;
}

export interface ExamSubject {
  id: string;
  name: string; // e.g. "រូបវិទ្យា", "គីមីវិទ្យា", "ជីវវិទ្យា", "គណិតវិទ្យា"
  questions: ExamQuestion[];
}

export interface ExamPaper {
  id: string;
  title: string; // e.g., "វិញ្ញាសាខែវិច្ឆិកា", "វិញ្ញាសាខែតុលា", "ឆមាសទី១"
  type: 'monthly' | 'semester';
  schoolName: string;
  timeLimit: string; // e.g., "60 នាទី"
  examDate: string; // e.g., "2026-06-20"
  subjects: ExamSubject[];
  createdAt: number;
}

interface ExamsPanelProps {
  activeClassId: string;
  activeClassName: string;
  isDarkMode: boolean;
  teacher: any;
}

const DEFAULT_PHYSICS_QUESTIONS: ExamQuestion[] = [
  {
    id: 'ep-p1',
    text: 'តើរូបមន្តច្បាប់អូម (Ohm\'s Law) សម្រាប់គណនាតង់ស្យុង U ស្មើនឹងគន្លឹះមួយណា?',
    options: ['U = R × I', 'U = R / I', 'U = I / R', 'U = R + I'],
    correctIndex: 0,
    points: 2
  },
  {
    id: 'ep-p2',
    text: 'តើឯកតារបស់តង់ស្យុងអគ្គិសនី (U) គិតជាអ្វីនៅក្នុងប្រព័ន្ធអន្តរជាតិ (SI)?',
    options: ['អំពែ (Ampere)', 'អូម (Ohm)', 'វ៉ុល (Volt)', 'វ៉ាត់ (Watt)'],
    correctIndex: 2,
    points: 2
  },
  {
    id: 'ep-p3',
    text: 'តើឯកតារបស់រេស៊ីស្តង់អគ្គិសនី (R) គិតជាអ្វី?',
    options: ['អំពែ (A)', 'អូម (Ω)', 'វ៉ុល (V)', 'គូឡុំ (C)'],
    correctIndex: 1,
    points: 2
  },
  {
    id: 'ep-p4',
    text: 'បើឧបករណ៍អគ្គិសនីមួយមានរេស៊ីស្តង់ R = 10Ω ឆ្លងកាត់ដោយចរន្ត I = 2A តើតង់ស្យុង U ស្មើប៉ុន្មាន?',
    options: ['U = 5 V', 'U = 12 V', 'U = 20 V', 'U = 100 V'],
    correctIndex: 2,
    points: 2
  },
  {
    id: 'ep-p5',
    text: 'បើចរន្តអគ្គិសនី I ឆ្លងកាត់ខ្សែចម្លងមួយកើនឡើងទ្វេដង ខណៈដែលរេស៊ីស្តង់ R នៅថេរ តើតង់ស្យុង U ប្រែប្រួលយ៉ាងណា?',
    options: ['ថយចុះពាក់កណ្តាល', 'កើនឡើងបួនដង', 'កើនឡើងពីរដង', 'នៅថេរដដែល'],
    correctIndex: 2,
    points: 2
  }
];

const DEFAULT_CHEMISTRY_QUESTIONS: ExamQuestion[] = [
  {
    id: 'ep-c1',
    text: 'តើអាស៊ីតខ្លាំងមួយណាដែលមានវត្តមាននៅក្នុងក្រពះមនុស្សសម្រាប់រំលាយអាហារ?',
    options: ['អាស៊ីតស៊ុលហ្វួរិច (H₂SO₄)', 'អាស៊ីតនីទ្រិច (HNO₃)', 'អាស៊ីតក្លរួអ៊ីដ្រិច (HCl)', 'អាស៊ីតអាសេទិច (CH₃COOH)'],
    correctIndex: 2,
    points: 2
  },
  {
    id: 'ep-c2',
    text: 'តើទឹកបរិសុទ្ធ (Pure Water) មានកម្រិត pH ស្មើនឹងប៉ុន្មាននៅសីតុណ្ហភាព ២៥ អង្សាសេ?',
    options: ['pH = 0', 'pH = 5', 'pH = 7', 'pH = 14'],
    correctIndex: 2,
    points: 2
  },
  {
    id: 'ep-c3',
    text: 'តើម៉ូលេគុលណាជាផលដែលកើតពីប្រតិកម្មរវាងអាស៊ីត (Acid) និងបាស (Base)?',
    options: ['អុកស៊ីសែន និងអ៊ីដ្រូសែន', 'អំបិល និងទឹក', 'ឧស្ម័នកាបូនិច និងទឹក', 'អាល់កុល'],
    correctIndex: 1,
    points: 2
  },
  {
    id: 'ep-c4',
    text: 'តើនិមិត្តសញ្ញាគីមីរបស់ធាតុដែក (Iron) គឺអ្វី?',
    options: ['I', 'Ir', 'Fe', 'F'],
    correctIndex: 2,
    points: 2
  },
  {
    id: 'ep-c5',
    text: 'ក្នុងតារាងខួបនៃធាតុគីមី តើធាតុណាដែលមានម៉ាស់អាតូមស្រាលជាងគេបំផុត?',
    options: ['អុកស៊ីសែន (O)', 'អ៊ីដ្រូសែន (H)', 'ហេល្យូម (He)', 'កាបូន (C)'],
    correctIndex: 1,
    points: 2
  }
];

const DEFAULT_EXAMS: ExamPaper[] = [
  {
    id: 'exam-oct',
    title: 'វិញ្ញាសាខែតុលា',
    type: 'monthly',
    schoolName: 'សាលារៀនជំនាន់ថ្មី វិទ្យាល័យព្រះស៊ីសុវត្ថិ',
    timeLimit: '60 នាទី',
    examDate: '2026-10-25',
    createdAt: Date.now() - 2000000,
    subjects: [
      { id: 'sub-p', name: 'រូបវិទ្យា', questions: DEFAULT_PHYSICS_QUESTIONS },
      { id: 'sub-c', name: 'គីមីវិទ្យា', questions: DEFAULT_CHEMISTRY_QUESTIONS }
    ]
  },
  {
    id: 'exam-nov',
    title: 'វិញ្ញាសាខែវិច្ឆិកា',
    type: 'monthly',
    schoolName: 'សាលារៀនជំនាន់ថ្មី វិទ្យាល័យព្រះស៊ីសុវត្ថិ',
    timeLimit: '60 នាទី',
    examDate: '2026-11-28',
    createdAt: Date.now() - 1000000,
    subjects: [
      { id: 'sub-p', name: 'រូបវិទ្យា', questions: DEFAULT_PHYSICS_QUESTIONS },
      { id: 'sub-c', name: 'គីមីវិទ្យា', questions: DEFAULT_CHEMISTRY_QUESTIONS }
    ]
  },
  {
    id: 'exam-sem1',
    title: 'វិញ្ញាសាប្រឡងឆមាសទី១',
    type: 'semester',
    schoolName: 'សាលារៀនជំនាន់ថ្មី វិទ្យាល័យព្រះស៊ីសុវត្ថិ',
    timeLimit: '90 នាទី',
    examDate: '2026-03-12',
    createdAt: Date.now(),
    subjects: [
      { id: 'sub-p', name: 'រូបវិទ្យា', questions: DEFAULT_PHYSICS_QUESTIONS },
      { id: 'sub-c', name: 'គីមីវិទ្យា', questions: DEFAULT_CHEMISTRY_QUESTIONS }
    ]
  }
];

export default function ExamsPanel({ activeClassId, activeClassName, isDarkMode, teacher }: ExamsPanelProps) {
  const [exams, setExams] = useState<ExamPaper[]>(() => {
    const saved = localStorage.getItem(`khmer_exams_${activeClassId || 'general'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse exams, using defaults", e);
      }
    }
    return DEFAULT_EXAMS;
  });

  const [activeType, setActiveType] = useState<'monthly' | 'semester'>('monthly');
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    const defaultList = DEFAULT_EXAMS.filter(e => e.type === 'monthly');
    return defaultList.length > 0 ? defaultList[0].id : '';
  });

  // Active Subject selector
  const [activeSubjectId, setActiveSubjectId] = useState<string>('sub-p');

  // Edit Exams Modal (Creator / Metadata editor)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'monthly' | 'semester'>('monthly');
  const [newSchool, setNewSchool] = useState('សាលារៀនជំនាន់ថ្មី វិទ្យាល័យព្រះស៊ីសុវត្ថិ');
  const [newTime, setNewTime] = useState('60 នាទី');
  const [newDate, setNewDate] = useState('2026-06-25');

  // Active Exam being viewed/edited
  const activeExam = exams.find(e => e.id === selectedExamId) || exams[0];

  useEffect(() => {
    if (activeExam) {
      // Keep subject selector matched if the subject exists, otherwise pick first
      const exists = activeExam.subjects.some(s => s.id === activeSubjectId);
      if (!exists && activeExam.subjects.length > 0) {
        setActiveSubjectId(activeExam.subjects[0].id);
      }
    }
  }, [selectedExamId, activeExam]);

  // Edit Questions Modal
  const [isEditQuestionsOpen, setIsEditQuestionsOpen] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<ExamQuestion[]>([]);
  const [selectedQIndex, setSelectedQIndex] = useState(0);

  // Print Mode Layout
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Hidden/Active states for export and customize layouts (migrated from QuizPanel)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [headerFont, setHeaderFont] = useState('Moul');
  const [bodyFont, setBodyFont] = useState('Battambang');
  const [headerFontSize, setHeaderFontSize] = useState(10.5);
  const [bodyFontSize, setBodyFontSize] = useState(11);
  const [pageSize, setPageSize] = useState<string>('A4');
  const [marginTop, setMarginTop] = useState<number>(0.5);
  const [marginBottom, setMarginBottom] = useState<number>(0.5);
  const [marginLeft, setMarginLeft] = useState<number>(0.5);
  const [marginRight, setMarginRight] = useState<number>(0.5);
  const [marginUnit, setMarginUnit] = useState<string>('in');
  const [headerLayout, setHeaderLayout] = useState<string>('5-1-5');
  const [customLeftSpan, setCustomLeftSpan] = useState<number>(5);
  const [customCenterSpan, setCustomCenterSpan] = useState<number>(2);
  const [customRightSpan, setCustomRightSpan] = useState<number>(5);
  
  const [examCenter, setExamCenter] = useState('.....................................................');
  const [roomNumber, setRoomNumber] = useState('..................');
  const [subjectName, setSubjectName] = useState('');
  const [deskNumber, setDeskNumber] = useState('..................');
  
  const [examName, setExamName] = useState('...................................');
  const [gradeNumber, setGradeNumber] = useState('..................');
  const [examSession, setExamSession] = useState('......../......../........');
  const [studentName, setStudentName] = useState('.......................');
  const [durationTime, setDurationTime] = useState('................ នាទី');
  const [totalScore, setTotalScore] = useState('...... ពិន្ទុ');
  
  const [logoText1, setLogoText1] = useState('សាលារៀនសុវណ្ណភូមិ');
  const [logoText2, setLogoText2] = useState('ទីតាំងផ្សារដីហុយ');
  
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('teacher_custom_logo') || null;
    }
    return null;
  });
  
  const [optionsLayout, setOptionsLayout] = useState<'inline' | 'stacked'>('inline');
  const [optionStyle, setOptionStyle] = useState<'khmer' | 'latin'>('khmer');
  const [highlightKey, setHighlightKey] = useState(false);
  const [imgSrc, setImgSrc] = useState('/Sovannphomi.png');
  const [imageFailed, setImageFailed] = useState(false);

  const activeSubject = activeExam?.subjects.find(s => s.id === activeSubjectId) || activeExam?.subjects[0];

  // Auto sync layout configurations when selected exam or subject changes
  useEffect(() => {
    if (activeExam) {
      setExamCenter(activeExam.schoolName || '.....................................................');
      setExamName(activeExam.title || '...................................');
      setGradeNumber(activeClassName || '..................');
      setExamSession(activeExam.examDate || '......../......../........');
      setDurationTime(activeExam.timeLimit || '................ នាទី');
      setLogoText1(activeExam.schoolName || 'សាលារៀនសុវណ្ណភូមិ');
    }
    if (activeSubject) {
      setSubjectName(activeSubject.name || '');
      const qCount = activeSubject.questions.length;
      setTotalScore(`${qCount * 2} ពិន្ទុ`);
    }
  }, [activeExam?.id, activeSubject?.id, activeClassName]);

  // Gemini AI state
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiApiKeyInput, setAiApiKeyInput] = useState(getSavedApiKey() || '');
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('សូមបង្កើតសំណួរជ្រើសរើសចម្លើយ ៥ សំណួរអំពីមេរៀននេះ');

  // Save state helper
  const saveState = (updatedExams: ExamPaper[]) => {
    setExams(updatedExams);
    localStorage.setItem(`khmer_exams_${activeClassId || 'general'}`, JSON.stringify(updatedExams));
  };

  // Create new exam paper
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newExam: ExamPaper = {
      id: `exam-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      schoolName: newSchool.trim() || 'សាលារៀនរដ្ឋ',
      timeLimit: newTime.trim() || '60 នាទី',
      examDate: newDate,
      createdAt: Date.now(),
      subjects: [
        { id: `sub-p-${Date.now()}`, name: 'រូបវិទ្យា', questions: [...DEFAULT_PHYSICS_QUESTIONS] },
        { id: `sub-c-${Date.now()}`, name: 'គីមីវិទ្យា', questions: [...DEFAULT_CHEMISTRY_QUESTIONS] }
      ]
    };

    const updated = [newExam, ...exams];
    saveState(updated);
    setSelectedExamId(newExam.id);
    setIsCreateModalOpen(false);
    // Reset inputs
    setNewTitle('');
  };

  // Edit current exam title or meta details inline
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDate, setEditDate] = useState('');

  const startEditingMeta = () => {
    if (!activeExam) return;
    setEditTitle(activeExam.title);
    setEditSchool(activeExam.schoolName);
    setEditTime(activeExam.timeLimit);
    setEditDate(activeExam.examDate);
    setIsEditingMeta(true);
  };

  const saveMetaEdits = () => {
    if (!activeExam) return;
    const updated = exams.map(e => {
      if (e.id === activeExam.id) {
        return {
          ...e,
          title: editTitle.trim() || e.title,
          schoolName: editSchool.trim() || e.schoolName,
          timeLimit: editTime.trim() || e.timeLimit,
          examDate: editDate || e.examDate
        };
      }
      return e;
    });
    saveState(updated);
    setIsEditingMeta(false);
  };

  // Delete Exam Paper
  const handleDeleteExam = (id: string) => {
    if (confirm('តើអ្នកពិតជាចង់លុបវិញ្ញាសានេះមែនទេ?')) {
      const remaining = exams.filter(e => e.id !== id);
      saveState(remaining);
      if (selectedExamId === id && remaining.length > 0) {
        setSelectedExamId(remaining[0].id);
      }
    }
  };

  // Add custom new subject
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSubjectName.trim() || !activeExam) return;

    const newSubId = `sub-custom-${Date.now()}`;
    const newSubject: ExamSubject = {
      id: newSubId,
      name: customSubjectName.trim(),
      questions: [
        {
          id: `eq-sc-${Date.now()}`,
          text: `សំណួរទី ១ សម្រាប់មុខវិជ្ជា ${customSubjectName.trim()}`,
          options: ['ជម្រើសទី ១', 'ជម្រើសទី ២', 'ជម្រើសទី ៣', 'ជម្រើសទី ៤'],
          correctIndex: 0,
          points: 2
        }
      ]
    };

    const updated = exams.map(e => {
      if (e.id === activeExam.id) {
        return {
          ...e,
          subjects: [...e.subjects, newSubject]
        };
      }
      return e;
    });

    saveState(updated);
    setActiveSubjectId(newSubId);
    setCustomSubjectName('');
    setIsAddingSubject(false);
  };

  // Delete Subject
  const handleDeleteSubject = (subjectId: string) => {
    if (!activeExam || activeExam.subjects.length <= 1) {
      alert('ត្រូវតែមានមុខវិជ្ជាយ៉ាងហោចណាស់ ១ ក្នុងវិញ្ញាសានីមួយៗ!');
      return;
    }
    if (confirm('តើអ្នកពិតជាចង់លុបមុខវិជ្ជានេះពីវិញ្ញាសានេះមែនទេ?')) {
      const updated = exams.map(e => {
        if (e.id === activeExam.id) {
          const filtered = e.subjects.filter(s => s.id !== subjectId);
          return {
            ...e,
            subjects: filtered
          };
        }
        return e;
      });
      saveState(updated);
    }
  };

  // Edit questions handler - open modal
  const openQuestionsEditor = () => {
    const actSub = activeExam?.subjects.find(s => s.id === activeSubjectId);
    if (!actSub) return;
    setLocalQuestions(JSON.parse(JSON.stringify(actSub.questions)));
    setSelectedQIndex(0);
    setIsEditQuestionsOpen(true);
  };

  // Save edited questions
  const saveQuestionsEdits = () => {
    if (!activeExam) return;
    const updated = exams.map(e => {
      if (e.id === activeExam.id) {
        const updatedSubjects = e.subjects.map(s => {
          if (s.id === activeSubjectId) {
            return {
              ...s,
              questions: localQuestions
            };
          }
          return s;
        });
        return {
          ...e,
          subjects: updatedSubjects
        };
      }
      return e;
    });

    saveState(updated);
    setIsEditQuestionsOpen(false);
  };

  // Add question to temporary local list
  const handleAddLocalQuestion = () => {
    const newQ: ExamQuestion = {
      id: `eq-added-${Date.now()}-${Math.random()}`,
      text: 'សំណួរថ្មី...',
      options: ['ជម្រើសចម្លើយ ទី ១', 'ជម្រើសចម្លើយ ទី ២', 'ជម្រើសចម្លើយ ទី ៣', 'ជម្រើសចម្លើយ ទី ៤'],
      correctIndex: 0,
      points: 2
    };
    setLocalQuestions(prev => [...prev, newQ]);
    setSelectedQIndex(localQuestions.length);
  };

  // Delete question from temporary local list
  const handleDeleteLocalQuestion = (index: number) => {
    if (localQuestions.length <= 1) {
      alert('វិញ្ញាសាត្រូវតែមានសំណួរយ៉ាងតិច ១!');
      return;
    }
    const filtered = localQuestions.filter((_, idx) => idx !== index);
    setLocalQuestions(filtered);
    setSelectedQIndex(Math.max(0, index - 1));
  };

  // AI Generation triggers
  const handleAiGenerate = async () => {
    if (!getSavedApiKey() && !aiApiKeyInput.trim()) {
      setShowAiConfig(true);
      return;
    }
    
    setIsAiGenerating(true);
    try {
      const subjectName = activeExam?.subjects.find(s => s.id === activeSubjectId)?.name || 'រូបវិទ្យា';
      const promptText = `សូមបង្កើតសំណួរជ្រើសរើសចម្លើយ (Multiple choice questions in Khmer) ចំនួន ៥ សំណួរ អំពី ${subjectName} ជំនាញវិទ្យាល័យ សម្រាប់ថ្នាក់ទី ${activeClassName}។ មុខវិជ្ជា៖ ${subjectName}។ ព័ត៌មានបន្ថែម៖ ${aiPrompt}`;
      
      const generated = await generateQuestions(promptText, 5, [], [], [], 'general', 'khmer');
      
      if (generated && generated.length > 0) {
        const mappedQuestions: ExamQuestion[] = generated.map((g, idx) => ({
          id: `eq-ai-${Date.now()}-${idx}`,
          text: g.text,
          options: g.options,
          correctIndex: g.correctIndex,
          points: 2
        }));

        setLocalQuestions(prev => [...prev, ...mappedQuestions]);
        setSelectedQIndex(localQuestions.length);
        setIsAiGenerating(false);
        alert('សំណួរ AI ចំនួន ៥ ត្រូវបានបង្កើតជោគជ័យ!');
      } else {
        throw new Error("No questions returned");
      }
    } catch (e) {
      console.error(e);
      setIsAiGenerating(false);
      alert('កំហុសក្នុងការបង្កើតសំណួរ AI! សូមពិនិត្យមើលសោ API Key របស់អ្នកស្រឡាញ់។');
    }
  };

  const getLayoutClasses = (layout: string) => {
    switch (layout) {
      case '4-4-4':
        return {
          left: { className: 'col-span-4', style: {} },
          center: { className: 'col-span-4', style: {} },
          right: { className: 'col-span-4', style: {} }
        };
      case '4-2-6':
        return {
          left: { className: 'col-span-4', style: {} },
          center: { className: 'col-span-2', style: {} },
          right: { className: 'col-span-6', style: {} }
        };
      case '5-1-6':
        return {
          left: { className: 'col-span-5', style: {} },
          center: { className: 'col-span-1', style: {} },
          right: { className: 'col-span-6', style: {} }
        };
      case 'custom':
        return {
          left: { className: '', style: { gridColumn: `span ${customLeftSpan} / span ${customLeftSpan}` } },
          center: { className: '', style: { gridColumn: `span ${customCenterSpan} / span ${customCenterSpan}` } },
          right: { className: '', style: { gridColumn: `span ${customRightSpan} / span ${customRightSpan}` } }
        };
      case '5-1-5':
        return {
          left: { className: 'col-span-5', style: {} },
          center: { className: 'col-span-1', style: {} },
          right: { className: 'col-span-5', style: {} }
        };
      case '5-2-5':
        return {
          left: { className: 'col-span-12 md:col-span-5', style: {} },
          center: { className: 'col-span-12 md:col-span-2', style: {} },
          right: { className: 'col-span-12 md:col-span-5', style: {} }
        };
      default:
        return {
          left: { className: 'col-span-5', style: {} },
          center: { className: 'col-span-1', style: {} },
          right: { className: 'col-span-5', style: {} }
        };
    }
  };

  const getOptionPrefix = (index: number) => {
    if (optionStyle === 'khmer') {
      const khmerPrefixes = ['ក', 'ខ', 'គ', 'ឃ', 'ង'];
      return khmerPrefixes[index] || String.fromCharCode(65 + index);
    }
    return String.fromCharCode(65 + index);
  };

  const triggerPrint = () => {
    window.print();
  };

  const getWordPageSize = (size: string) => {
    switch (size) {
      case 'A3': return 'size: 11.69in 16.54in;';
      case 'B4': return 'size: 9.84in 13.90in;';
      case 'B5': return 'size: 6.93in 9.84in;';
      case 'Letter': return 'size: 8.50in 11.00in;';
      case 'A4':
      default:
        return 'size: 8.27in 11.69in;';
    }
  };

  const generateDocHtml = (selectedHeaderFontObj: any, selectedBodyFontObj: any, questionCards: any[]) => {
    let questionsHtml = '';
    questionCards.forEach((card, qIdx) => {
      let optionsHtml = '';
      if (optionsLayout === 'inline') {
        optionsHtml = `
          <table class="options-table">
            <tr>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 0 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(0)}. ${renderFormulaToHtml(card.question.options[0] || '')}
              </td>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 1 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(1)}. ${renderFormulaToHtml(card.question.options[1] || '')}
              </td>
            </tr>
            <tr>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 2 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(2)}. ${renderFormulaToHtml(card.question.options[2] || '')}
              </td>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 3 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(3)}. ${renderFormulaToHtml(card.question.options[3] || '')}
              </td>
            </tr>
          </table>
        `;
      } else {
        optionsHtml = `
          <table class="options-table">
            ${card.question.options.map((opt: string, oIdx: number) => `
              <tr>
                <td class="option-cell ${highlightKey && card.question.correctIndex === oIdx ? 'correct-highlight' : ''}" style="width: 100%;">
                  ${getOptionPrefix(oIdx)}. ${renderFormulaToHtml(opt)}
                </td>
              </tr>
            `).join('')}
          </table>
        `;
      }
      
      questionsHtml += `
        <div class="question-block">
          <div class="question-text font-bold">សំណួរទី ${qIdx + 1}៖ ${renderFormulaToHtml(card.question.text)}</div>
          ${optionsHtml}
        </div>
      `;
    });

    const headerGoogleFont = selectedHeaderFontObj.googleFontId || selectedHeaderFontObj.id;
    const bodyGoogleFont = selectedBodyFontObj.googleFontId || selectedBodyFontObj.id;

    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>វិញ្ញាសាប្រឡង</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @import url('https://fonts.googleapis.com/css2?family=${headerGoogleFont.replace(/ /g, '+')}&family=${bodyGoogleFont.replace(/ /g, '+')}&display=swap');
        
        @page Section1 {
          ${getWordPageSize(pageSize)}
          margin: ${marginTop}${marginUnit} ${marginRight}${marginUnit} ${marginBottom}${marginUnit} ${marginLeft}${marginUnit};
          mso-header-margin: 0.5in;
          mso-footer-margin: 0.5in;
          mso-footer: f1;
        }
        div.Section1 {
          page: Section1;
        }
        p.MsoFooter, li.MsoFooter, div.MsoFooter {
          margin: 0in;
          margin-bottom: .0001pt;
          mso-pagination: widow-orphan;
          font-size: 10.0pt;
          font-family: ${selectedBodyFontObj.cssValue};
          text-align: center;
          color: #4b5563;
        }
        table#hrdftrtbl {
          display: none;
        }
        
        body {
          font-family: ${selectedBodyFontObj.cssValue};
          line-height: 1.5;
          padding: 20px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .header-cell {
          font-family: ${selectedHeaderFontObj.cssValue};
          font-size: ${headerFontSize}pt;
          vertical-align: top;
          padding: 4px;
        }
        .center-text {
          text-align: center;
        }
        .bold-text {
          font-weight: bold;
        }
        .school-title {
          font-family: ${selectedHeaderFontObj.cssValue};
          font-weight: bold;
          font-size: ${headerFontSize}pt;
          margin-top: 4px;
        }
        .divider {
          border-bottom: 3px double #000000;
          margin-top: 10px;
          margin-bottom: 20px;
          height: 1px;
        }
        .exam-title-container {
          text-align: center;
          margin-bottom: 20px;
          font-family: ${selectedBodyFontObj.cssValue};
        }
        .exam-title {
          font-family: ${selectedBodyFontObj.cssValue};
          font-weight: bold;
          font-size: ${bodyFontSize + 2}pt;
          text-decoration: underline;
        }
        .question-block {
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .question-text {
          font-family: ${selectedBodyFontObj.cssValue};
          font-weight: bold;
          margin-bottom: 6px;
          font-size: ${bodyFontSize}pt;
        }
        .options-table {
          width: 100%;
          border-collapse: collapse;
          margin-left: 15px;
        }
        .option-cell {
          font-family: ${selectedBodyFontObj.cssValue};
          padding: 3px;
          vertical-align: top;
          font-size: ${bodyFontSize}pt;
        }
        .correct-highlight {
          color: #059669;
          font-weight: bold;
          background-color: #ecfdf5;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <table class="header-table">
          <tr>
            <td class="header-cell" style="width: 30%;">
              <div>មណ្ឌលប្រឡង៖ <span class="bold-text">${examCenter}</span></div>
              <div style="margin-top: 6px;">លេខបន្ទប់៖ <span class="bold-text">${roomNumber}</span></div>
              <div style="margin-top: 6px;">វិញ្ញាសា៖ <span class="bold-text">${subjectName}</span></div>
              <div style="margin-top: 6px;">លេខតុ៖ <span class="bold-text">${deskNumber}</span></div>
            </td>
            <td class="header-cell center-text" style="width: 32%;">
              <div style="height: 60px; text-align: center;">
                ${customLogo ? `
                  <img src="${customLogo}" width="45" height="45" style="object-fit: contain; max-height: 45px; max-width: 100px; display: inline-block;" />
                ` : `
                  <div style="display: inline-block; width: 45px; height: 45px; border-radius: 50%; border: 3px solid #1e40af; background-color: #0284c7; color: white; text-align: center; line-height: 40px; font-weight: bold; font-size: 8pt;">
                    SPS
                  </div>
                `}
              </div>
              <div class="school-title">${logoText1}</div>
              <div style="font-size: 9pt; margin-top: 2px;">${logoText2}</div>
            </td>
            <td class="header-cell" style="width: 38%; text-align: left; padding-left: 10px;">
              <div>ប្រឡង៖ <span class="bold-text">${examName}</span></div>
              <div style="margin-top: 6px;">ថ្នាក់ទី៖ <span class="bold-text">${gradeNumber}</span></div>
              <div style="margin-top: 6px;">សម័យប្រឡង៖ <span class="bold-text">${examSession}</span></div>
              <div style="margin-top: 6px;">ឈ្មោះ៖ <span class="bold-text">${studentName}</span></div>
              <div style="margin-top: 6px;">រយៈពេល៖ <span class="bold-text">${durationTime}</span> ${totalScore ? `<span style="font-size: 9pt;">(${totalScore})</span>` : ''}</div>
            </td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="exam-title-container">
          <div class="exam-title">សន្លឹកកិច្ចការវិញ្ញាសា</div>
          <div style="font-size: 10pt; font-weight: bold; margin-top: 5px; color: #1e293b;">
            សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់
          </div>
          <div style="font-size: 7.5pt; color: #7f1d1d; margin-top: 6px; font-weight: normal; font-style: italic;">
            (បម្រាម៖ បេក្ខជនណាមើលសំណៅឯកសារ ចម្លងគ្នា មើលគ្នា មិនធ្វើតាមបទបញ្ជាផ្ទៃក្នុងអនុរក្សនឹងត្រូវបានពិន្ទុសូន្យ।)
          </div>
        </div>
  
        <div class="questions-container">
          ${questionsHtml}
        </div>

        <!-- MSO Footers for MS Word exports -->
        <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0" style="display:none;">
          <tr>
            <td>
              <div style="mso-element:footer" id="f1">
                <p class="MsoFooter">
                  <span style="mso-field-code:'PAGE'"></span>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;
  };

  const exportToHtmlDoc = () => {
    if (!activeExam || !activeSubject) return;
    const selectedHeaderFontObj = AVAILABLE_FONTS.find(f => f.id === headerFont) || AVAILABLE_FONTS[0];
    const selectedBodyFontObj = AVAILABLE_FONTS.find(f => f.id === bodyFont) || AVAILABLE_FONTS[0];

    // Map activeSubject questions to cards array format so helper functions work perfectly
    const mappedCards = activeSubject.questions.map(q => ({
      id: q.id,
      question: {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex
      }
    }));

    const htmlContent = generateDocHtml(selectedHeaderFontObj, selectedBodyFontObj, mappedCards);
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ExamPaper_${activeSubject.name}_${activeExam.title}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToWord = async () => {
    if (!activeExam || !activeSubject) return;
    const selectedHeaderFontObj = { ...(AVAILABLE_FONTS.find(f => f.id === headerFont) || AVAILABLE_FONTS[0]) };
    const selectedBodyFontObj = { ...(AVAILABLE_FONTS.find(f => f.id === bodyFont) || AVAILABLE_FONTS[0]) };
    selectedHeaderFontObj.name = selectedHeaderFontObj.wordFontName || selectedHeaderFontObj.name;
    selectedBodyFontObj.name = selectedBodyFontObj.wordFontName || selectedBodyFontObj.name;

    // Map activeSubject questions
    const questionCards = activeSubject.questions.map(q => ({
      id: q.id,
      question: {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex
      }
    }));

    // Fetch logo as ArrayBuffer if available for Embedding in Docx
    const imagePath = customLogo || imgSrc;
    let logoImageRun: any = null;
    if (imagePath && typeof imagePath === 'string') {
      try {
        const response = await fetch(imagePath);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          let imageType: "png" | "jpg" | "gif" | "bmp" = "png";
          if (imagePath.toLowerCase().endsWith(".jpg") || imagePath.toLowerCase().endsWith(".jpeg")) {
            imageType = "jpg";
          } else if (imagePath.toLowerCase().endsWith(".gif")) {
            imageType = "gif";
          } else if (imagePath.toLowerCase().endsWith(".bmp")) {
            imageType = "bmp";
          }
          logoImageRun = new ImageRun({
            data: buffer,
            type: imageType,
            transformation: {
              width: 50,
              height: 50,
            }
          });
        }
      } catch (e) {
        console.warn("Failed to load logo for docx export:", e);
      }
    }

    // Helper: Twips conversions (1 inch = 1440 dxa, 1 cm = 567 dxa)
    const getDocxMargin = (val: number, unit: string) => {
      if (unit === 'in') {
        return val * 1440;
      }
      return val * 567; // cm
    };

    const getDocxPageDimensions = (size: string) => {
      switch (size) {
        case 'A3': return { width: 16834, height: 23818 };
        case 'B4': return { width: 14170, height: 20016 };
        case 'B5': return { width: 9979, height: 14170 };
        case 'Letter': return { width: 12240, height: 15840 };
        case 'A4':
        default:
          return { width: 11906, height: 16838 };
      }
    };

    // Helper: Parse and convert LaTeX, Math formulas, Sub/Superscripts on-the-fly to beautiful edit-ready Docx TextRuns
    const convertHtmlToTextRuns = (
      text: string, 
      fontName: string, 
      fontSizePt: number, 
      bold: boolean = false, 
      italic: boolean = false, 
      fontColor?: string,
      isSub: boolean = false,
      isSup: boolean = false
    ): TextRun[] => {
      if (!text) return [];

      let processed = preprocessText(text);

      // Normalize ^{...} to <sup>...</sup>
      processed = processed.replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>");
      // Normalize _{...} to <sub>...</sub>
      processed = processed.replace(/_\{([^}]*)\}/g, "<sub>$1</sub>");

      // Normalize simple ^... to <sup>...</sup>
      processed = processed.replace(/\^([0-9a-zA-Z+\-≈=#*]+)/g, "<sup>$1</sup>");
      // Normalize simple _... to <sub>...</sub>
      processed = processed.replace(/_([0-9a-zA-Z\x7f-\xff]+)/g, "<sub>$1</sub>");

      const runs: TextRun[] = [];
      let index = 0;

      while (index < processed.length) {
        const subIdx = processed.indexOf("<sub>", index);
        const supIdx = processed.indexOf("<sup>", index);
        const fracIdx = processed.indexOf("\\frac", index);
        const sqrtIdx = processed.indexOf("\\sqrt", index);

        const candidates = [
          { type: "sub", idx: subIdx },
          { type: "sup", idx: supIdx },
          { type: "frac", idx: fracIdx },
          { type: "sqrt", idx: sqrtIdx }
        ].filter(c => c.idx !== -1);

        if (candidates.length === 0) {
          const remainingText = processed.substring(index);
          runs.push(new TextRun({
            text: remainingText,
            font: fontName,
            size: fontSizePt * 2,
            bold,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));
          break;
        }

        candidates.sort((a, b) => a.idx - b.idx);
        const nextMatch = candidates[0];

        if (nextMatch.idx > index) {
          const textBefore = processed.substring(index, nextMatch.idx);
          runs.push(new TextRun({
            text: textBefore,
            font: fontName,
            size: fontSizePt * 2,
            bold,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));
        }

        index = nextMatch.idx;

        if (nextMatch.type === "sub" || nextMatch.type === "sup") {
          const isSubscript = nextMatch.type === "sub";
          const startTag = isSubscript ? "<sub>" : "<sup>";
          const endTag = isSubscript ? "</sub>" : "</sup>";
          const startIdx = index + startTag.length;
          const endIdx = processed.indexOf(endTag, startIdx);

          if (endIdx === -1) {
            runs.push(new TextRun({
              text: startTag,
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));
            index = startIdx;
          } else {
            const innerText = processed.substring(startIdx, endIdx);
            const innerRuns = convertHtmlToTextRuns(
              innerText,
              fontName,
              fontSizePt,
              bold,
              italic,
              fontColor,
              isSub || isSubscript,
              isSup || !isSubscript
            );
            runs.push(...innerRuns);
            index = endIdx + endTag.length;
          }
        } else if (nextMatch.type === "sqrt") {
          let innerText = "";
          let nextCharIdx = index + 5; // skip "\sqrt"
          while (nextCharIdx < processed.length && /\s/.test(processed[nextCharIdx])) {
            nextCharIdx++;
          }
          if (processed[nextCharIdx] === "{") {
            let braceCount = 1;
            let scanIdx = nextCharIdx + 1;
            while (scanIdx < processed.length && braceCount > 0) {
              if (processed[scanIdx] === "{") braceCount++;
              else if (processed[scanIdx] === "}") braceCount--;
              scanIdx++;
            }
            if (braceCount === 0) {
              innerText = processed.substring(nextCharIdx + 1, scanIdx - 1);
              index = scanIdx;
            } else {
              innerText = processed.substring(nextCharIdx + 1);
              index = processed.length;
            }
          } else {
            innerText = processed[nextCharIdx] || "";
            index = nextCharIdx + 1;
          }

          runs.push(new TextRun({
            text: "√(",
            font: fontName,
            size: fontSizePt * 2,
            bold: true,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));

          const innerRuns = convertHtmlToTextRuns(
            innerText,
            fontName,
            fontSizePt,
            bold,
            italic,
            fontColor,
            isSub,
            isSup
          );
          runs.push(...innerRuns);

          runs.push(new TextRun({
            text: ")",
            font: fontName,
            size: fontSizePt * 2,
            bold: true,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));
        } else if (nextMatch.type === "frac") {
          let numText = "";
          let denText = "";
          let scanIdx = index + 5; // skip "\frac"
          
          const parseCurlyBlock = () => {
            while (scanIdx < processed.length && /\s/.test(processed[scanIdx])) {
              scanIdx++;
            }
            if (processed[scanIdx] === "{") {
              let braceCount = 1;
              let startBlock = scanIdx + 1;
              scanIdx++;
              while (scanIdx < processed.length && braceCount > 0) {
                if (processed[scanIdx] === "{") braceCount++;
                else if (processed[scanIdx] === "}") braceCount--;
                scanIdx++;
              }
              if (braceCount === 0) {
                return processed.substring(startBlock, scanIdx - 1);
              }
            }
            return "";
          };

          numText = parseCurlyBlock();
          denText = parseCurlyBlock();

          if (numText || denText) {
            index = scanIdx;
            
            runs.push(new TextRun({
              text: "(",
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));

            const numRuns = convertHtmlToTextRuns(
              numText,
              fontName,
              fontSizePt,
              bold,
              italic,
              fontColor,
              isSub,
              isSup
            );
            runs.push(...numRuns);

            runs.push(new TextRun({
              text: " / ",
              font: fontName,
              size: fontSizePt * 2,
              bold: true,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));

            const denRuns = convertHtmlToTextRuns(
              denText,
              fontName,
              fontSizePt,
              bold,
              italic,
              fontColor,
              isSub,
              isSup
            );
            runs.push(...denRuns);

            runs.push(new TextRun({
              text: ")",
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));
          } else {
            runs.push(new TextRun({
              text: "\\frac",
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));
            index = index + 5;
          }
        }
      }

      if (runs.length === 0) {
        runs.push(new TextRun({
          text: "",
          font: fontName,
          size: fontSizePt * 2,
        }));
      }

      return runs;
    };

    // Document Table Layout widths calculations (Summing up to 90%, leaving 10% for the Score box)
    const totalSpan = customLeftSpan + customCenterSpan + customRightSpan;
    
    let pctLeft = 38;
    let pctCenter = 15;
    let pctRight = 37;
    let pctScore = 10;
    
    if (headerLayout === '5-1-5') {
      pctLeft = 44;
      pctCenter = 10;
      pctRight = 36;
      pctScore = 10;
    } else if (headerLayout === '5-2-5') {
      pctLeft = 38;
      pctCenter = 20;
      pctRight = 32;
      pctScore = 10;
    } else if (headerLayout === '4-4-4') {
      pctLeft = 33;
      pctCenter = 33;
      pctRight = 24;
      pctScore = 10;
    } else if (headerLayout === '4-2-6') {
      pctLeft = 33;
      pctCenter = 17;
      pctRight = 40;
      pctScore = 10;
    } else if (headerLayout === '5-1-6') {
      pctLeft = 38;
      pctCenter = 10;
      pctRight = 42;
      pctScore = 10;
    } else if (headerLayout === 'custom') {
      pctLeft = Math.round((customLeftSpan / totalSpan) * 90);
      pctCenter = Math.round((customCenterSpan / totalSpan) * 90);
      pctRight = 90 - pctLeft - pctCenter;
      pctScore = 10;
    }

    // Borderless Style Definition
    const borderNone = {
      style: BorderStyle.NONE,
      size: 0,
      color: "auto"
    };

    const tableBordersNone = {
      top: borderNone,
      bottom: borderNone,
      left: borderNone,
      right: borderNone,
      insideHorizontal: borderNone,
      insideVertical: borderNone,
    };

    // Header Blocks Child Definitions
    const leftCellChildren = [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "មណ្ឌលប្រឡង៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: examCenter || ".....................................................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "លេខបន្ទប់៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: roomNumber || "..................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "វិញ្ញាសា៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: subjectName || ".....................................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "លេខតុ៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: deskNumber || "..................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      })
    ];

    const centerCellChildren: Paragraph[] = [];
    if (logoImageRun) {
      centerCellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [logoImageRun]
      }));
    } else {
      centerCellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "« LOGO »", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true })
        ]
      }));
    }
    
    centerCellChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: logoText1 || "", font: selectedHeaderFontObj.name, size: 18, bold: true })
      ]
    }));
    
    if (headerLayout !== '5-1-6') {
      centerCellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40 },
        children: [
          new TextRun({ text: logoText2 || "", font: selectedHeaderFontObj.name, size: 16, bold: true })
        ]
      }));
    }

    const rightCellChildren = [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "ប្រឡង៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: examName || "..................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "ថ្នាក់ទី៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: gradeNumber || "...............", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "សម័យប្រឡង៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: examSession || "......../......../........", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "ឈ្មោះ៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: studentName || ".......................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "រយៈពេល៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: durationTime ? `${durationTime}` : "................ នាទី", font: selectedHeaderFontObj.name, size: headerFontSize * 2 }),
          new TextRun({ text: totalScore ? ` (${totalScore})` : " (...... ពិន្ទុ)", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true })
        ]
      })
    ];

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: pctLeft, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              children: leftCellChildren,
            }),
            new TableCell({
              width: { size: pctCenter, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              children: centerCellChildren,
            }),
            new TableCell({
              width: { size: pctRight + pctScore, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              margins: { left: 200 },
              children: rightCellChildren,
            })
          ]
        })
      ]
    });

    const dividerPara = new Paragraph({
      spacing: { before: 120, after: 120 },
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 24,
          space: 1,
          color: "000000",
        }
      },
      children: []
    });

    const titleParas = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: "សន្លឹកកិច្ចការវិញ្ញាសា",
            font: selectedBodyFontObj.name,
            size: (bodyFontSize + 2) * 2,
            bold: true,
            underline: {},
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: "សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់",
            font: selectedBodyFontObj.name,
            size: 20,
            bold: true,
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 180 },
        children: [
          new TextRun({
            text: "(បម្រាម៖ បេក្ខជនណាមើលសំណៅឯកសារ ចម្លងគ្នា មើលគ្នា មិនធ្វើតាមបទបញ្ជាផ្ទៃក្នុងអនុរក្សនឹងត្រូវបានពិន្ទុសូន្យ।)",
            font: selectedBodyFontObj.name,
            size: 16,
            color: "7f1d1d",
            italics: true,
          })
        ]
      })
    ];

    const childrenElements: any[] = [
      headerTable,
      dividerPara,
      ...titleParas
    ];

    questionCards.forEach((card, qIdx) => {
      // Question block
      childrenElements.push(
        new Paragraph({
          spacing: { before: 240, after: 120 },
          keepNext: true,
          children: [
            new TextRun({
              text: `សំណួរទី ${qIdx + 1}៖ `,
              font: selectedBodyFontObj.name,
              size: bodyFontSize * 2,
              bold: true,
            }),
            ...convertHtmlToTextRuns(card.question.text, selectedBodyFontObj.name, bodyFontSize)
          ]
        })
      );

      // Options block
      if (optionsLayout === 'inline') {
        const rows: TableRow[] = [];
        for (let i = 0; i < card.question.options.length; i += 2) {
          const opt1 = card.question.options[i];
          const opt2 = card.question.options[i + 1];

          const cells = [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: `${getOptionPrefix(i)}. `,
                      font: selectedBodyFontObj.name,
                      size: bodyFontSize * 2,
                      bold: true,
                    }),
                    ...convertHtmlToTextRuns(opt1, selectedBodyFontObj.name, bodyFontSize)
                  ]
                })
              ]
            })
          ];

          if (opt2 !== undefined) {
            cells.push(
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: tableBordersNone,
                children: [
                  new Paragraph({
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: `${getOptionPrefix(i + 1)}. `,
                        font: selectedBodyFontObj.name,
                        size: bodyFontSize * 2,
                        bold: true,
                      }),
                      ...convertHtmlToTextRuns(opt2, selectedBodyFontObj.name, bodyFontSize)
                    ]
                  })
                ]
              })
            );
          }

          rows.push(new TableRow({ children: cells }));
        }

        childrenElements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBordersNone,
            margins: { left: 450 },
            rows,
          })
        );
      } else {
        card.question.options.forEach((opt: string, oIdx: number) => {
          childrenElements.push(
            new Paragraph({
              indent: { left: 450 },
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: `${getOptionPrefix(oIdx)}. `,
                  font: selectedBodyFontObj.name,
                  size: bodyFontSize * 2,
                  bold: true,
                }),
                ...convertHtmlToTextRuns(opt, selectedBodyFontObj.name, bodyFontSize)
              ]
            })
          );
        });
      }
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: getDocxPageDimensions(pageSize),
            margin: {
              top: getDocxMargin(marginTop, marginUnit),
              bottom: getDocxMargin(marginBottom, marginUnit),
              left: getDocxMargin(marginLeft, marginUnit),
              right: getDocxMargin(marginRight, marginUnit),
            }
          }
        },
        children: childrenElements,
      }]
    });

    try {
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ExamPaper_${activeSubject.name}_${activeExam.title}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("docx Packer failed, falling back to legacy format: ", err);
      exportToHtmlDoc();
    }
  };

  const selectedHeaderFontObj = AVAILABLE_FONTS.find(f => f.id === headerFont) || AVAILABLE_FONTS[0];
  const selectedBodyFontObj = AVAILABLE_FONTS.find(f => f.id === bodyFont) || AVAILABLE_FONTS[0];

  const headerInlineStyle = {
    fontFamily: selectedHeaderFontObj.cssValue,
    fontSize: `${headerFontSize}pt`
  };

  const bodyInlineStyle = {
    fontFamily: selectedBodyFontObj.cssValue,
    fontSize: `${bodyFontSize}pt`
  };

  const layoutWidths = getLayoutClasses(headerLayout);

  const renderDotField = (val: string, fallback: string) => {
    return val && val.trim() !== '' ? val : fallback;
  };

  const SovannaphumiLogoSVG = () => (
    <svg viewBox="0 0 100 100" className="w-12 h-12 mx-auto">
      <circle cx="50" cy="50" r="45" fill="#f8fafc" stroke="#1e40af" strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="#0284c7" />
      <text x="50" y="55" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="sans-serif">SPS</text>
    </svg>
  );

  const filteredExams = exams.filter(e => e.type === activeType);

  return (
    <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto space-y-6">
      
      {/* Header and Layout Meta */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 shadow-sm relative overflow-hidden ${
        isDarkMode ? 'bg-[#111827] border-indigo-950/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
            <GraduationCap className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-black font-sans tracking-tight text-indigo-600 dark:text-indigo-400">
              បន្ទប់វិញ្ញាសាប្រឡង
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
              រៀបចំ បង្កើត និងកែសម្រួលវិញ្ញាសាប្រចាំខែ និងឆមាស សម្រាប់ថ្នាក់រៀន
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2shrink-0 relative z-10">
          <span className="text-[11px] font-black font-mono px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10">
            {activeClassName ? `ថ្នាក់៖ ${activeClassName}` : 'ថ្នាក់រៀនគ្មានឈ្មោះ'}
          </span>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black font-sans text-xs transition-all cursor-pointer active:scale-95 shadow-md shadow-indigo-600/10 shrink-0 border-none"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតវិញ្ញាសាថ្មី</span>
          </button>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Exams Categorization & lists */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`p-4 rounded-3xl border transition-all duration-300 bg-white dark:bg-[#111827] ${
            isDarkMode ? 'border-indigo-950/80' : 'border-slate-200'
          }`}>
            <h3 className="text-xs font-black font-sans text-slate-400 dark:text-slate-500 uppercase tracking-wilder mb-3 pl-1">
              ប្រភេទវិញ្ញាសាប្រឡង
            </h3>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/40 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveType('monthly');
                  const list = exams.filter(e => e.type === 'monthly');
                  if (list.length > 0) setSelectedExamId(list[0].id);
                }}
                className={`py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                  activeType === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                វិញ្ញាសាប្រចាំខែ
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveType('semester');
                  const list = exams.filter(e => e.type === 'semester');
                  if (list.length > 0) setSelectedExamId(list[0].id);
                }}
                className={`py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                  activeType === 'semester'
                    ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                វិញ្ញាសាឆមាស
              </button>
            </div>
          </div>

          {/* List of active exams */}
          <div className="space-y-2">
            {filteredExams.length === 0 ? (
              <div className={`p-8 text-center rounded-3xl border ${
                isDarkMode ? 'bg-[#111827]/40 border-slate-800/80 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <FileText className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-bold">មិនទាន់មានវិញ្ញាសាបង្កើតនៅឡើយទេ</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-2 text-[11px] font-black text-indigo-600 hover:underline"
                >
                  ចុចបង្កើតសំណួរឥឡូវនេះ
                </button>
              </div>
            ) : (
              filteredExams.map((exam) => {
                const isActive = exam.id === selectedExamId;
                return (
                  <div
                    key={exam.id}
                    onClick={() => setSelectedExamId(exam.id)}
                    className={`p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 text-left relative overflow-hidden group ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                        : isDarkMode
                          ? 'bg-[#111827] border-indigo-950/80 text-slate-300 hover:border-indigo-800/50'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/10 text-white' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm truncate">
                          {exam.title}
                        </h4>
                        <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                          សាលា៖ {exam.schoolName} • {exam.subjects.length} មុខវិជ្ជា
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExam(exam.id);
                      }}
                      className={`p-1.5 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-all ${
                        isActive 
                          ? 'hover:bg-white/10 text-white/80 hover:text-white' 
                          : 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Manage active exam & questions table */}
        <div className="lg:col-span-8">
          {activeExam ? (
            <div className={`rounded-3xl border p-5 space-y-6 transition-all duration-300 bg-white dark:bg-[#111827] ${
              isDarkMode ? 'border-indigo-950/80 shadow-none' : 'border-slate-200 shadow-sm'
            }`}>
              
              {/* Header inside specific Exam detailed workspace */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 dark:border-slate-800/80">
                <div className="text-left min-w-0 flex-1">
                  {isEditingMeta ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">ឈ្មោះខែ/វិញ្ញាសា</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">ឈ្មោះសាលា</label>
                          <input
                            type="text"
                            value={editSchool}
                            onChange={(e) => setEditSchool(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">រយៈពេលប្រឡង</label>
                          <input
                            type="text"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">កាលបរិច្ឆេទ</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveMetaEdits}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg transition-all cursor-pointer border-none"
                        >
                          <Check className="w-3.5 h-3.5" />
                          រក្សាទុក
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingMeta(false)}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-extrabold text-[11px] rounded-lg transition-all cursor-pointer border-none"
                        >
                          <X className="w-3.5 h-3.5" />
                          បោះបង់
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 truncate">
                          {activeExam.title} 
                        </h2>
                        <button
                          type="button"
                          onClick={startEditingMeta}
                          title="កែសម្រួលឈ្មោះខែ ឬឈ្មោះកម្មវិធីប្រឡង"
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-indigo-500 hover:text-indigo-650 transition-all border-none cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Meta lists in Cambodian row pattern */}
                      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 mt-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <School className="w-3 h-3 text-indigo-500" />
                          {activeExam.schoolName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          រយៈពេល៖ {activeExam.timeLimit}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          កាលបរិច្ឆេទ៖ {activeExam.examDate}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openQuestionsEditor}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-650/10 cursor-pointer active:scale-95 transition-all outline-none border-none bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>បង្កើតសំណួរវិញ្ញាសារ</span>
                  </button>
                  <button
                    type="button"
                    onClick={openQuestionsEditor}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 transition-all outline-none border-none"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>កែសម្រួលសំណួរ & ចម្លើយ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintPreviewOpen(true);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95 transition-all outline-none border-none"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>ទម្រង់ព្រីនរៀបចំវិញ្ញាសារ</span>
                  </button>
                </div>
              </div>

              {/* Subject Tabs - រៀបចំវិញ្ញាសារ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 px-3 py-0.5 rounded-xl font-bold text-[11px] text-slate-500">
                    <BookOpen className="w-3 h-3 text-indigo-500" />
                    រៀបចំវិញ្ញាសារមុខវិជ្ជា៖
                  </div>
                  <div className="flex items-center gap-1">
                    {isAddingSubject ? (
                      <form onSubmit={handleAddSubject} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          placeholder="ឈ្មោះមុខវិជ្ជាថ្មី..."
                          value={customSubjectName}
                          onChange={(e) => setCustomSubjectName(e.target.value)}
                          className="px-2.5 py-1 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-bold dark:bg-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border-none"
                        >
                          បន្ថែម
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingSubject(false)}
                          className="px-2 py-1 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border-none"
                        >
                          បិទ
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingSubject(true)}
                        className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-indigo-505 dark:border-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold rounded-lg cursor-pointer transition-all border-indigo-500"
                      >
                        <Plus className="w-3 h-3" />
                        <span>បន្ថែមមុខវិជ្ជាប្រឡង</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeExam.subjects.map((sub) => {
                    const isSelected = sub.id === activeSubjectId;
                    return (
                      <div key={sub.id} className="relative flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveSubjectId(sub.id)}
                          className={`px-4 py-2.5 rounded-2xl font-black font-sans text-xs transition-all border cursor-pointer select-none ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15'
                              : isDarkMode
                                ? 'bg-[#182033] border-indigo-950/80 text-indigo-400 hover:bg-[#1f2942]'
                                : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                          }`}
                        >
                          📚 {sub.name} ({sub.questions.length})
                        </button>
                        
                        {/* Option to delete non-default categories */}
                        {activeExam.subjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(sub.id)}
                            title="លុបមុខវិជ្ជា"
                            className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-black text-[9px] shadow cursor-pointer transition-all border-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Questions sheet lists */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wilder">
                    បញ្ជីសំណួរ & ជម្រើសចម្លើយ មេរៀនប្រឡង
                  </h3>
                  <div className="text-[10px] font-sans font-black text-indigo-600 dark:text-indigo-400">
                    សរុប {activeSubject?.questions.length || 0} សំណួរ • ពិន្ទុសរុប { (activeSubject?.questions.length || 0) * 2 } ពិន្ទុ
                  </div>
                </div>

                <div className="space-y-3.5">
                  {activeSubject?.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className={`p-4 rounded-3xl border transition-all duration-300 text-left space-y-3 ${
                        isDarkMode ? 'bg-[#131b2e]/40 border-indigo-950/40 text-slate-200' : 'bg-slate-50/50 border-slate-150 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm leading-relaxed">
                            {q.text}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                          +{q.points || 2} ពិន្ទុ
                        </span>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          return (
                            <div 
                              key={oIdx} 
                              className={`p-2.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-2 ${
                                isCorrect 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-extrabold'
                                  : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                                isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}>
                                {String.fromCharCode(97 + oIdx)}
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <p className="text-[10px] font-semibold text-slate-400 pl-8 bg-slate-100/40 dark:bg-slate-900/40 p-2 rounded-xl border border-dashed dark:border-slate-800/60">
                          💡 គន្លឹះយល់ដឹង៖ {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Printable container & Preview panel */}
              {isPrintPreviewOpen && (
                <div className={`p-6 rounded-3xl border-2 border-dashed space-y-6 ${
                  isDarkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-indigo-50/20 border-slate-350 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between border-b pb-3 border-dashed">
                    <div className="text-left">
                      <h3 className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                        ក្រដាសសំណួរវិញ្ញាសាពិត (Exam Paper Worksheet Preview)
                      </h3>
                      <p className="text-[10px] text-slate-400">គំរូទម្រង់ស្អាត ងាយស្រួលព្រីនចេញ ឬទាញយកទុកប្រើប្រាស់ផ្លូវការ</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsExportModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 dark:bg-indigo-700 text-white text-[10px] font-black rounded-lg cursor-pointer hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all border-none shadow-sm"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>កំណត់ទម្រង់ & នាំចេញ (Configure & Export)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-lg cursor-pointer hover:bg-emerald-700 transition-all border-none shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>ព្រីនវិញ្ញាសា ឬរក្សាទុក PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPrintPreviewOpen(false)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 rounded-lg border-none"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Standard Cambodian Official Exam Layout Paper Sheets (Dynamic Preview) */}
                  <div 
                    style={{
                      paddingTop: `${marginTop}${marginUnit}`,
                      paddingBottom: `${marginBottom}${marginUnit}`,
                      paddingLeft: `${marginLeft}${marginUnit}`,
                      paddingRight: `${marginRight}${marginUnit}`,
                    }}
                    className="p-8 bg-white text-black rounded-2xl border border-slate-200 shadow-md text-[11px] sm:text-[12px] leading-relaxed select-text font-serif min-h-[500px]"
                  >
                    {/* Live preview header columns identical to actual layout */}
                    <div className="grid grid-cols-12 gap-1 pb-4 text-black border-none">
                      {/* Left Block */}
                      <div className={`${layoutWidths.left.className} flex flex-col gap-1.5 text-left font-black text-slate-950 font-sans leading-snug`} style={{ ...headerInlineStyle, ...layoutWidths.left.style }}>
                        <div className="truncate">មណ្ឌលប្រឡង៖ {renderDotField(examCenter, '.....................................................')}</div>
                        <div className="truncate">លេខបន្ទប់៖ {renderDotField(roomNumber, '..................')}</div>
                        <div className="truncate">វិញ្ញាសា៖ {renderDotField(subjectName, '.....................................')}</div>
                        <div className="truncate">លេខតុ៖ {renderDotField(deskNumber, '..................')}</div>
                      </div>

                      {/* Middle Logo block */}
                      <div className={`${layoutWidths.center.className} flex flex-col items-center justify-start text-center`} style={{ ...headerInlineStyle, ...layoutWidths.center.style }}>
                        <div className="w-12 h-12 mb-1 flex items-center justify-center">
                          {customLogo ? (
                            <img
                              src={customLogo}
                              alt="Custom Logo"
                              className="w-12 h-12 object-contain pointer-events-none mx-auto"
                            />
                          ) : imageFailed ? (
                            <SovannaphumiLogoSVG />
                          ) : (
                            <img
                              src={imgSrc}
                              alt="Sovannphomi Logo"
                              className="w-12 h-12 object-contain pointer-events-none mx-auto"
                              onError={() => {
                                if (imgSrc === '/Sovannphomi.png') {
                                  setImgSrc('/sovannaphumi.png');
                                } else {
                                  setImageFailed(true);
                                }
                              }}
                            />
                          )}
                        </div>
                        <div className="font-black text-[9px] text-slate-900 leading-tight font-sans tracking-wide truncate max-w-full">{logoText1}</div>
                        {headerLayout !== '5-1-6' && (
                          <div className="text-[8px] font-semibold text-slate-800 leading-tight tracking-tight mt-0.5 truncate max-w-full">{logoText2}</div>
                        )}
                      </div>

                      {/* Right Block */}
                      <div className={`${layoutWidths.right.className} flex items-start justify-between gap-1.5 text-left font-black text-slate-950 pl-2 leading-snug font-sans`} style={{ ...headerInlineStyle, ...layoutWidths.right.style }}>
                        <div className="flex-1 flex flex-col gap-1.5 min-w-0 font-sans">
                          <div className="flex justify-between items-center w-full truncate">
                            <span>ប្រឡង៖ {renderDotField(examName, '..................')}</span>
                            <span>ថ្នាក់ទី៖ {renderDotField(gradeNumber, '...............')}</span>
                          </div>
                          <div className="truncate">សម័យប្រឡង៖ {renderDotField(examSession, '......../......../........')}</div>
                          <div className="truncate">រយៈពេល៖ {renderDotField(durationTime, '................ នាទី')} <span className="font-black text-[9px]">({totalScore || '...... ពិន្ទុ'})</span></div>
                        </div>

                        {/* Score Oval Place */}
                        <div className="border-double border-[3px] border-slate-900 rounded-[50%/50%] w-[84px] h-[64px] flex flex-col items-center justify-center shrink-0 self-end mt-4 p-1 translate-y-3" title="រង្វង់សម្រាប់ដាក់ពិន្ទុ">
                          <div className="border-t border-dashed border-slate-700 w-[55px] my-auto"></div>
                        </div>
                      </div>
                    </div>

                    {/* Separator exact border double black line */}
                    <div className="border-b-4 border-double border-black my-2"></div>

                    {/* Visual Preview Header title */}
                    <div className="text-center mb-4" style={bodyInlineStyle}>
                      <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] sm:text-xs font-sans">
                        សន្លឹកកិច្ចការវិញ្ញាសា
                      </div>
                      <div className="text-[10px] sm:text-[10.5px] font-black text-slate-700 dark:text-slate-300 mt-1">
                        សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់
                      </div>
                      <div className="text-[8.5px] sm:text-[9px] text-red-700 dark:text-red-400 font-medium leading-relaxed text-center italic mt-1.5 block">
                        (បម្រាម៖ បេក្ខជនណាមើលសំណៅឯកសារ ចម្លងគ្នា មើលគ្នា មិនធ្វើតាមបទបញ្ជាផ្ទៃក្នុងអនុរក្សនឹងត្រូវបានពិន្ទុសូន្យ។)
                      </div>
                    </div>

                    {/* Preview list of questions */}
                    <div className="space-y-4 text-slate-900 mt-2 font-sans text-black" style={bodyInlineStyle}>
                      {activeSubject?.questions.map((q, idx) => (
                        <div key={q.id || idx} className="space-y-1.5 avoid-break">
                          <p className="font-extrabold flex items-start text-left">
                            <span>សំណួរទី {idx + 1}៖ {q.text}</span>
                            <span className="text-[9px] text-slate-400 font-normal ml-1.5">({q.points || 2} ពិន្ទុ)</span>
                          </p>
                          <div className={`mt-2 pl-4 grid gap-x-4 gap-y-1 text-left ${optionsLayout === 'inline' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {q.options.map((opt, oIdx) => {
                              const isCorrectIdx = oIdx === q.correctIndex;
                              return (
                                <div 
                                  key={oIdx} 
                                  className={`flex items-start gap-1.5 py-0.5 px-1.5 rounded-md ${
                                    highlightKey && isCorrectIdx 
                                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/40' 
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <span className="font-black shrink-0">{getOptionPrefix(oIdx)}.</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <table className="w-full mt-10 border-none text-[11px] leading-relaxed text-black font-sans">
                      <tbody>
                        <tr className="border-none">
                          <td className="w-1/2 text-center border-none">
                            <p className="italic text-slate-500 text-[10px]">បានឃើញ និងឯកភាព</p>
                            <p className="font-bold text-slate-800 mt-5">នាយកវិទ្យាល័យ</p>
                          </td>
                          <td className="w-1/2 text-center border-none">
                            <p className="italic text-slate-500 text-[10px]">រៀបចំដោយគ្រូឧទ្ទេស</p>
                            <p className="font-bold text-slate-800 mt-5">ហត្ថលេខា និងឈ្មោះ</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className={`p-16 text-center border rounded-3xl ${
              isDarkMode ? 'bg-[#111827] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <FileText className="w-12 h-12 mx-auto text-indigo-500/40 mb-3" />
              <p className="text-sm font-bold">សូមជ្រើសរើស ឬបង្កើតវិញ្ញាសាថ្មី!</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: Create Exam Paper Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl shadow-xl overflow-hidden text-left p-6 ${
                isDarkMode ? 'bg-[#121829] border border-indigo-950/80 text-white' : 'bg-white border text-slate-850'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <h3 className="font-black font-sans text-base">រៀបចំវិញ្ញាសារប្រឡងថ្មី</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 border-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateExam} className="space-y-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase">ឈ្មោះខែ ឬកម្មវិធីប្រឡង</label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. វិញ្ញាសាខែវិច្ឆិកា, វិញ្ញាសាខែធ្នូ, ឆមាសទី២-រូបវិទ្យា"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase">ប្រភេទវិញ្ញាសា</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                  >
                    <option value="monthly">វិញ្ញាសាប្រចាំខែ (Monthly Exam)</option>
                    <option value="semester">វិញ្ញាសាប្រឡងឆមាស (Semester Exam)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase">ឈ្មោះគ្រឹះស្ថាន/សាលារៀន</label>
                  <input
                    type="text"
                    required
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase">រយៈពេលប្រឡង</label>
                    <input
                      type="text"
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase">កាលបរិច្ឆេទ</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white border-none cursor-pointer"
                  >
                    បិទ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer active:scale-95 transition-all outline-none border-none"
                  >
                    បង្កើតវិញ្ញាសារ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Create / Edit Questions Modal */}
      <AnimatePresence>
        {isEditQuestionsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className={`w-full max-w-4xl h-[90vh] rounded-3xl shadow-xl overflow-hidden text-left flex flex-col ${
                isDarkMode ? 'bg-[#121829] border border-indigo-950/80 text-white' : 'bg-white border text-slate-850'
              }`}
            >
              <div className="p-5 border-b flex items-center justify-between dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black font-sans text-xs sm:text-sm">កែសម្រួលសំណួរ & ចម្លើយមេរៀន</h3>
                    <p className="text-[10px] text-slate-400">កែប្រែសំណួរ ជម្រើសចម្លើយ ពិន្ទុ និងជ្រើសរើសចម្លើយដែលត្រូវចុងក្រោយ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditQuestionsOpen(false)}
                  className="p-1 px-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all font-bold text-xs flex items-center gap-1 cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                  <span>បិទ</span>
                </button>
              </div>

              {/* Dynamic split body structure of Questions Editor */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
                
                {/* Left side panel index selection list */}
                <div className="md:col-span-4 border-r dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col h-full min-h-0">
                  <div className="p-3 border-b dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleAddLocalQuestion}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all outline-none border-none flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>បន្ថែមសំណួរថ្មី</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {localQuestions.map((q, idx) => {
                      const isSelected = idx === selectedQIndex;
                      return (
                        <div
                          key={q.id || idx}
                          onClick={() => setSelectedQIndex(idx)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 justify-between ${
                            isSelected
                              ? 'bg-indigo-600/10 border-indigo-600 text-indigo-900 dark:text-indigo-200 font-bold shadow-sm'
                              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-850 hover:border-slate-350 text-slate-600'
                          }`}
                        >
                          <div className="min-w-0 flex-1 flex items-start gap-2.5">
                            <span className={`w-5.5 h-5.5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold line-clamp-2 leading-normal">
                                {q.text || '(គ្មានអត្ថបទ)'}
                              </p>
                              <span className="text-[9px] font-mono text-slate-400">
                                ជម្រើស {q.options.length} • {q.points || 2} ពិន្ទុ
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLocalQuestion(idx);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-60 hover:opacity-100 shrink-0 border-none transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right side editor pane workspace */}
                <div className="md:col-span-8 p-5 sm:p-6 overflow-y-auto h-full space-y-4">
                  {localQuestions[selectedQIndex] ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                        <span className="text-xs font-black text-indigo-500 uppercase tracking-wilder">
                          ការរៀបចំសំណួរទី {selectedQIndex + 1}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-black text-slate-400">ពិន្ទុ៖</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={localQuestions[selectedQIndex].points || 2}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 2;
                              setLocalQuestions(prev => prev.map((q, idx) => 
                                idx === selectedQIndex ? { ...q, points: val } : q
                              ));
                            }}
                            className="w-12 px-2 py-0.5 border text-center dark:bg-slate-900 border-slate-305 dark:border-slate-800 rounded text-xs font-bold"
                          />
                        </div>
                      </div>

                      {/* Question Textarea */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400">អត្តបទសំណួរ</label>
                        <textarea
                          rows={3}
                          value={localQuestions[selectedQIndex].text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalQuestions(prev => prev.map((q, idx) => 
                              idx === selectedQIndex ? { ...q, text: val } : q
                            ));
                          }}
                          placeholder="បញ្ចូលសំណួររបស់អ្នកនៅទីនេះ..."
                          className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                        />
                      </div>

                      {/* Choose correct choice options */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400">ជម្រើសចម្លើយ និងធីកចម្លើយត្រឹមត្រូវ</label>
                        
                        <div className="space-y-2.5">
                          {localQuestions[selectedQIndex].options.map((option, oIdx) => {
                            const isCorrect = oIdx === localQuestions[selectedQIndex].correctIndex;
                            return (
                              <div key={oIdx} className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLocalQuestions(prev => prev.map((q, idx) => 
                                      idx === selectedQIndex ? { ...q, correctIndex: oIdx } : q
                                    ));
                                  }}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all border cursor-pointer ${
                                    isCorrect
                                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400 hover:border-slate-400'
                                  }`}
                                >
                                  {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : String.fromCharCode(97 + oIdx).toUpperCase()}
                                </button>

                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalQuestions(prev => prev.map((q, idx) => {
                                      if (idx === selectedQIndex) {
                                        const nextOptions = [...q.options];
                                        nextOptions[oIdx] = val;
                                        return { ...q, options: nextOptions };
                                      }
                                      return q;
                                    }));
                                  }}
                                  placeholder={`បញ្ចូលចម្លើយទី ${oIdx + 1}`}
                                  className="flex-1 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-850 dark:text-white"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prompt / Tips Input */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400">ការបញ្ជាក់បន្ថែម ឬគន្លឹះយល់ដឹង (គំនិត/Explanation)</label>
                        <input
                          type="text"
                          value={localQuestions[selectedQIndex].explanation || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalQuestions(prev => prev.map((q, idx) => 
                              idx === selectedQIndex ? { ...q, explanation: val } : q
                            ));
                          }}
                          placeholder="ឧ. យោងតាមច្បាប់អូម U = R x I"
                          className="w-full mt-1.5 px-3 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 border-slate-300 dark:border-slate-800 dark:text-white"
                        />
                      </div>

                      {/* AI Assistance helper */}
                      <div className="pt-3 border-t dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowAiConfig(!showAiConfig)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-indigo-505 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 text-[10px] font-black hover:bg-indigo-500/5 cursor-pointer bg-transparent"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>ប្រើប្រាស់កម្លាំងជំនួយ AI បន្ថែម</span>
                        </button>

                        {showAiConfig && (
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-3 border dark:border-slate-800">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400">សោរ Gemini API Key</label>
                              <input
                                type="password"
                                placeholder="បញ្ចូលសោរ API Key របស់អ្នក..."
                                value={aiApiKeyInput}
                                onChange={(e) => {
                                  setAiApiKeyInput(e.target.value);
                                  localStorage.setItem('gemini_api_key', e.target.value);
                                }}
                                className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400">ប្រធានបទដែលចង់ឱ្យ AI បង្កើត</label>
                              <textarea
                                value={aiPrompt}
                                rows={2}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleAiGenerate}
                              disabled={isAiGenerating}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            >
                              {isAiGenerating ? 'កំពុងបង្កើតសំណួរ...' : '✨ ចាប់ផ្តើមបង្កើតសំណួរដោយឥតគិតថ្លៃ'}
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      សូមជ្រើសរើស ឬបន្ថែមសំណួរដើម្បីចាប់ផ្ដើមកែប្រែ!
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom footer button panel */}
              <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditQuestionsOpen(false)}
                  className="px-4.5 py-2.5 text-xs font-extrabold text-slate-400 hover:text-slate-600 dark:hover:text-white border-none cursor-pointer bg-transparent"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={saveQuestionsEdits}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all outline-none border-none shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>រក្សាទុកការកែប្រែទាំងអស់</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export & Print Preview Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Printer className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">នាំចេញនិងបោះពុម្ពវិញ្ញាសាប្រឡង</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">បង្កើតសន្លឹកកិច្ចការជាទម្រង់ PDF សម្រាប់ព្រីន ឬ Word .doc សម្រាប់យកទៅកែសម្រួល</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1 px-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1 border border-transparent hover:border-slate-200 shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>បិទ</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 dark:bg-slate-950/20">
                
                {/* Left config column */}
                <div className="lg:col-span-5 flex flex-col gap-5">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Settings className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">ព័ត៌មានក្បាលសន្លឹក (Header Settings)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">ផ្នែកខាងឆ្វេង</span>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">មណ្ឌលប្រឡង</label>
                          <input
                            type="text"
                            value={examCenter}
                            onChange={(e) => setExamCenter(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">លេខបន្ទប់</label>
                          <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">វិញ្ញាសា</label>
                          <input
                            type="text"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">លេខតុ</label>
                          <input
                            type="text"
                            value={deskNumber}
                            onChange={(e) => setDeskNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">ផ្នែកខាងស្ដាំ</span>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ប្រឡង</label>
                          <input
                            type="text"
                            value={examName}
                            onChange={(e) => setExamName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ថ្នាក់ទី</label>
                          <input
                            type="text"
                            value={gradeNumber}
                            onChange={(e) => setGradeNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">សម័យប្រឡង</label>
                          <input
                            type="text"
                            value={examSession}
                            onChange={(e) => setExamSession(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">រយៈពេល & ពិន្ទុ</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={durationTime}
                              onChange={(e) => setDurationTime(e.target.value)}
                              placeholder="រយៈពេល"
                              className="w-1/2 px-2 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-800 dark:text-white"
                            />
                            <input
                              type="text"
                              value={totalScore}
                              onChange={(e) => setTotalScore(e.target.value)}
                              placeholder="ពិន្ទុ"
                              className="w-1/2 px-2 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">ព័ត៌មានសាលារៀន & ឡូហ្គោ (School Info)</span>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ឈ្មោះសាលា</label>
                          <input
                            type="text"
                            value={logoText1}
                            onChange={(e) => setLogoText1(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">សាខា/អក្សរផ្ទៃក្រោម</label>
                          <input
                            type="text"
                            value={logoText2}
                            onChange={(e) => setLogoText2(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Layout Options */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">ជម្រើសទម្រង់គំរូសន្លឹក (Page Settings)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ពុម្ពអក្សរក្បាល</label>
                        <select
                          value={headerFont}
                          onChange={(e) => setHeaderFont(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                        >
                          {AVAILABLE_FONTS.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ពុម្ពអក្សរមាតិកា</label>
                        <select
                          value={bodyFont}
                          onChange={(e) => setBodyFont(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                        >
                          {AVAILABLE_FONTS.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ទំហំអក្សរក្បាល</label>
                        <select
                          value={headerFontSize}
                          onChange={(e) => setHeaderFontSize(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                        >
                          {FONT_SIZES.map(s => (
                            <option key={s} value={s}>{s} pt</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ទំហំអក្សរមាតិកា</label>
                        <select
                          value={bodyFontSize}
                          onChange={(e) => setBodyFontSize(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                        >
                          {FONT_SIZES.map(s => (
                            <option key={s} value={s}>{s} pt</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ការរៀបចំជម្រើសចម្លើយ</label>
                        <select
                          value={optionsLayout}
                          onChange={(e: any) => setOptionsLayout(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                        >
                          <option value="inline">ជួរដេក ២ ជម្រើសក្នុង ១ ជួរ (Grid)</option>
                          <option value="stacked">ជួរឈរ ១ ជម្រើសក្នុង ១ ជួរ (List)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 leading-none">ម៉ាកុសចម្លើយត្រូវ</label>
                        <select
                          value={highlightKey ? 'show' : 'hide'}
                          onChange={(e: any) => setHighlightKey(e.target.value === 'show')}
                          className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                        >
                          <option value="hide">លាក់ចម្លើយត្រូវ (Student View)</option>
                          <option value="show">បង្ហាញចម្លើយជោគជ័យ (Teacher Key)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right print preview sheet column */}
                <div className="lg:col-span-7 flex flex-col gap-3 h-full">
                  <div className="flex-1 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm p-4 overflow-y-auto max-h-[60vh] lg:max-h-[70vh]">
                    <div className="text-center font-bold text-xs text-slate-400 mb-2 font-mono uppercase">ផ្ទាំងឯកសារមើលជាមុន (A4 Print Layout Preview)</div>
                    <div 
                      style={{
                        paddingTop: `${marginTop}${marginUnit}`,
                        paddingBottom: `${marginBottom}${marginUnit}`,
                        paddingLeft: `${marginLeft}${marginUnit}`,
                        paddingRight: `${marginRight}${marginUnit}`,
                      }}
                      className="p-8 bg-white text-black rounded-lg border border-slate-200 shadow-xs text-[11px] sm:text-[12px] leading-relaxed font-serif min-h-[500px]"
                    >
                      {/* Identical Layout Paper Sheet columns */}
                      <div className="grid grid-cols-12 gap-1 pb-4 text-black border-none select-none">
                        <div className={`${layoutWidths.left.className} flex flex-col gap-1.5 text-left font-black text-slate-950 font-sans leading-snug`} style={{ ...headerInlineStyle, ...layoutWidths.left.style }}>
                          <div className="truncate font-sans font-bold">មណ្ឌលប្រឡង៖ {renderDotField(examCenter, '.....................................................')}</div>
                          <div className="truncate font-sans font-bold">លេខបន្ទប់៖ {renderDotField(roomNumber, '..................')}</div>
                          <div className="truncate font-sans font-bold">វិញ្ញាសា៖ {renderDotField(activeSubject?.name || '.....................................', '.....................................')}</div>
                          <div className="truncate font-sans font-bold">លេខតុ៖ {renderDotField(deskNumber, '..................')}</div>
                        </div>

                        <div className={`${layoutWidths.center.className} flex flex-col items-center justify-start text-center`} style={{ ...headerInlineStyle, ...layoutWidths.center.style }}>
                          <div className="w-12 h-12 mb-1 flex items-center justify-center">
                            {customLogo ? (
                              <img src={customLogo} alt="Logo" className="w-12 h-12 object-contain pointer-events-none mx-auto" />
                            ) : imageFailed ? (
                              <SovannaphumiLogoSVG />
                            ) : (
                              <img src={imgSrc} alt="Logo" className="w-12 h-12 object-contain pointer-events-none mx-auto" />
                            )}
                          </div>
                          <div className="font-black text-[9px] text-slate-900 leading-tight font-sans tracking-wide truncate max-w-full">{logoText1}</div>
                          {headerLayout !== '5-1-6' && (
                            <div className="text-[8px] font-semibold text-slate-800 leading-tight tracking-tight mt-0.5 truncate max-w-full">{logoText2}</div>
                          )}
                        </div>

                        <div className={`${layoutWidths.right.className} flex items-start justify-between gap-1.5 text-left font-black text-slate-950 pl-2 leading-snug font-sans`} style={{ ...headerInlineStyle, ...layoutWidths.right.style }}>
                          <div className="flex-1 flex flex-col gap-1.5 min-w-0 font-sans">
                            <div className="flex justify-between items-center w-full truncate font-sans font-bold">
                              <span>ប្រឡង៖ {renderDotField(examName, '..................')}</span>
                              <span>ថ្នាក់ទី៖ {renderDotField(gradeNumber, '...............')}</span>
                            </div>
                            <div className="truncate font-sans font-bold">សម័យប្រឡង៖ {renderDotField(examSession, '......../......../........')}</div>
                            <div className="truncate font-sans font-bold">រយៈពេល៖ {renderDotField(durationTime, '................ នាទី')} <span className="font-black text-[9px]">({totalScore || '...... ពិន្ទុ'})</span></div>
                          </div>
                          <div className="border-double border-[3px] border-slate-900 rounded-[50%/50%] w-[84px] h-[64px] flex flex-col items-center justify-center shrink-0 self-end mt-4 p-1 translate-y-3">
                            <div className="border-t border-dashed border-slate-700 w-[55px] my-auto"></div>
                          </div>
                        </div>
                      </div>

                      <div className="border-b-4 border-double border-black my-2"></div>

                      <div className="text-center mb-4" style={bodyInlineStyle}>
                        <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] sm:text-xs font-sans">សន្លឹកកិច្ចការវិញ្ញាសា</div>
                        <div className="text-[10px] sm:text-[10.5px] font-black text-slate-700 mt-1">សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់</div>
                      </div>

                      <div className="space-y-4 text-slate-900 mt-2 font-sans text-black animate-none" style={bodyInlineStyle}>
                        {activeSubject?.questions.map((q, idx) => (
                          <div key={q.id || idx} className="space-y-1.5 avoid-break">
                            <p className="font-extrabold flex items-start text-left font-sans text-xs">
                              <span>សំណួរទី {idx + 1}៖ {q.text}</span>
                              <span className="text-[9px] text-slate-400 font-normal ml-1.5">({q.points || 2} ពិន្ទុ)</span>
                            </p>
                            <div className={`mt-2 pl-4 grid gap-x-4 gap-y-1 text-left font-sans text-xs ${optionsLayout === 'inline' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              {q.options.map((opt, oIdx) => {
                                const isCorrectIdx = oIdx === q.correctIndex;
                                return (
                                  <div 
                                    key={oIdx} 
                                    className={`flex items-start gap-1.5 py-0.5 px-1.5 rounded-md ${
                                      highlightKey && isCorrectIdx 
                                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/40' 
                                        : 'text-slate-700'
                                    }`}
                                  >
                                    <span className="font-black shrink-0">{getOptionPrefix(oIdx)}.</span>
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 pr-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>សំណួរសរុប៖ {activeSubject?.questions.length || 0} សំណួរ</span>
                </span>
                
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                  >
                    បោះបង់
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportModalOpen(false);
                      openQuestionsEditor();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-650 hover:bg-purple-755 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-500/10 cursor-pointer active:scale-95 transition-all text-white bg-purple-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>បង្កើតសំណួរវិញ្ញាសារ</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportToWord}
                    disabled={!activeSubject || activeSubject.questions.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយកជា Word (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportToHtmlDoc}
                    disabled={!activeSubject || activeSubject.questions.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយកជា Word (HTML .doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!activeSubject || activeSubject.questions.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>បោះពុម្ព ឬរក្សាទុកជា PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
