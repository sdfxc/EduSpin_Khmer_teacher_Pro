import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  Printer,
  Copy,
  X,
  Check,
  FileText,
  Clock,
  User,
  GraduationCap,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { LessonPlanItem } from '../../types/lessonMaterials';
import { exportLessonPlanToDocx } from '../../lib/lessonWordExporter';
import { useConfirm } from '../../context/ConfirmContext';

interface LessonPlansManagerProps {
  plans: LessonPlanItem[];
  onSavePlans: (plans: LessonPlanItem[]) => void;
  isDarkMode?: boolean;
  activeClassName: string;
  schoolName?: string;
  teacherName?: string;
}

export default function LessonPlansManager({
  plans,
  onSavePlans,
  isDarkMode = false,
  activeClassName,
  schoolName = 'សាលារៀនសុវណ្ណភូមិ',
  teacherName = 'លោកគ្រូ / អ្នកគ្រូ'
}: LessonPlansManagerProps) {
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeViewingPlan, setActiveViewingPlan] = useState<LessonPlanItem | null>(null);

  // AI Generation State
  const [aiSubject, setAiSubject] = useState('រូបវិទ្យា');
  const [aiGrade, setAiGrade] = useState(activeClassName || 'ថ្នាក់ទី ៩');
  const [aiChapter, setAiChapter] = useState('ជំពូកទី ៣៖ អគ្គិសនី');
  const [aiLessonTitle, setAiLessonTitle] = useState('ច្បាប់អូម (Ohm\'s Law)');
  const [aiDuration, setAiDuration] = useState('៥០ នាទី');
  const [aiExtraInstructions, setAiExtraInstructions] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Manual Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSchoolName, setFormSchoolName] = useState(schoolName);
  const [formTeacherName, setFormTeacherName] = useState(teacherName);
  const [formSubject, setFormSubject] = useState('រូបវិទ្យា');
  const [formGrade, setFormGrade] = useState(activeClassName || 'ថ្នាក់ទី ៩');
  const [formChapter, setFormChapter] = useState('');
  const [formDuration, setFormDuration] = useState('៥០ នាទី');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Objectives
  const [objKnowledge, setObjKnowledge] = useState<string>('');
  const [objSkills, setObjSkills] = useState<string>('');
  const [objAttitude, setObjAttitude] = useState<string>('');

  // Teaching aids
  const [aidTeacher, setAidTeacher] = useState('');
  const [aidStudent, setAidStudent] = useState('');

  // Steps
  const [step1Teacher, setStep1Teacher] = useState('');
  const [step1Student, setStep1Student] = useState('');
  const [step1Duration, setStep1Duration] = useState('៥ នាទី');

  const [step2Teacher, setStep2Teacher] = useState('');
  const [step2Content, setStep2Content] = useState('');
  const [step2Student, setStep2Student] = useState('');
  const [step2Duration, setStep2Duration] = useState('៥ នាទី');

  const [step3Teacher, setStep3Teacher] = useState('');
  const [step3Content, setStep3Content] = useState('');
  const [step3Student, setStep3Student] = useState('');
  const [step3Duration, setStep3Duration] = useState('២៥ នាទី');

  const [step4Teacher, setStep4Teacher] = useState('');
  const [step4Content, setStep4Content] = useState('');
  const [step4Student, setStep4Student] = useState('');
  const [step4Duration, setStep4Duration] = useState('១០ នាទី');

  const [step5Teacher, setStep5Teacher] = useState('');
  const [step5Content, setStep5Content] = useState('');
  const [step5Student, setStep5Student] = useState('');
  const [step5Duration, setStep5Duration] = useState('៥ នាទី');

  const [formEvaluation, setFormEvaluation] = useState('');
  const [formReflection, setFormReflection] = useState('');

  const filteredPlans = plans.filter(p => {
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.chapter.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenAiModal = () => {
    setAiSubject('រូបវិទ្យា');
    setAiGrade(activeClassName || 'ថ្នាក់ទី ៩');
    setAiChapter('ជំពូកទី ៣៖ អគ្គិសនី');
    setAiLessonTitle('ច្បាប់អូម (Ohm\'s Law)');
    setAiDuration('៥០ នាទី');
    setAiExtraInstructions('');
    setAiError(null);
    setIsAiModalOpen(true);
  };

  const handleGenerateAiPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiLessonTitle.trim()) return;

    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const apiKey = localStorage.getItem('khmer_ai_gemini_api_key') || '';
      const res = await fetch('/api/generate-lesson-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          subject: aiSubject,
          grade: aiGrade,
          chapter: aiChapter,
          lessonTitle: aiLessonTitle,
          duration: aiDuration,
          schoolName: schoolName,
          teacherName: teacherName,
          extraInstructions: aiExtraInstructions
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'បរាជ័យក្នុងការបង្កើតកិច្ចតែងការដោយ AI');
      }

      const generatedPlan = await res.json();

      const newPlan: LessonPlanItem = {
        id: `plan-${Date.now()}`,
        title: generatedPlan.title || `កិច្ចតែងការបង្រៀន៖ ${aiLessonTitle}`,
        schoolName: schoolName,
        teacherName: teacherName,
        subject: aiSubject,
        grade: aiGrade,
        chapter: aiChapter,
        duration: aiDuration,
        date: new Date().toISOString().split('T')[0],
        objectives: {
          knowledge: generatedPlan.objectives?.knowledge || [],
          skills: generatedPlan.objectives?.skills || [],
          attitude: generatedPlan.objectives?.attitude || []
        },
        teachingAids: {
          teacher: generatedPlan.teachingAids?.teacher || 'សៀវភៅពុម្ព, ស្លាយ',
          student: generatedPlan.teachingAids?.student || 'សៀវភៅសរសេរ, ប៊ិច'
        },
        steps: {
          step1Admin: generatedPlan.steps?.step1Admin || {
            teacherActivity: 'ពិនិត្យអនាម័យ សណ្ដាប់ធ្នាប់ និងវត្តមានសិស្ស',
            studentActivity: 'ប្រធានថ្នាក់រាយការណ៍វត្តមាន',
            duration: '៥ នាទី'
          },
          step2Review: generatedPlan.steps?.step2Review || {
            teacherActivity: 'សួរសំណួររំលឹកមេរៀនចាស់',
            content: 'រំលឹកចំណុចសំខាន់ៗនៃមេរៀនមុន',
            studentActivity: 'សិស្សឆ្លើយសំណួរ',
            duration: '៥ នាទី'
          },
          step3NewLesson: generatedPlan.steps?.step3NewLesson || {
            teacherActivity: 'ពន្យល់ និងលើកឧទាហរណ៍មេរៀនថ្មី',
            content: 'ខ្លឹមសារមេរៀនថ្មី',
            studentActivity: 'សិស្សស្តាប់ និងកត់ត្រា',
            duration: '២៥ នាទី'
          },
          step4Strengthen: generatedPlan.steps?.step4Strengthen || {
            teacherActivity: 'ដាក់លំហាត់ពង្រឹងចំណេះដឹង',
            content: 'សំណួរ និងលំហាត់',
            studentActivity: 'សិស្សអនុវត្តលំហាត់',
            duration: '១០ នាទី'
          },
          step5Homework: generatedPlan.steps?.step5Homework || {
            teacherActivity: 'ដាក់កិច្ចការផ្ទះ',
            content: 'កិច្ចការផ្ទះទំព័រ...',
            studentActivity: 'សិស្សកត់ត្រាកិច្ចការផ្ទះ',
            duration: '៥ នាទី'
          }
        },
        evaluation: generatedPlan.evaluation || '',
        selfReflection: generatedPlan.selfReflection || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSavePlans([newPlan, ...plans]);
      setIsAiModalOpen(false);
      setActiveViewingPlan(newPlan);
      setIsViewModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'មានបញ្ហាក្នុងការបង្កើត សូមពិនិត្យ API Key ឬការតភ្ជាប់បណ្តាញ');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleOpenEditPlan = (plan: LessonPlanItem) => {
    setEditingId(plan.id);
    setFormTitle(plan.title);
    setFormSchoolName(plan.schoolName || schoolName);
    setFormTeacherName(plan.teacherName || teacherName);
    setFormSubject(plan.subject);
    setFormGrade(plan.grade || activeClassName);
    setFormChapter(plan.chapter);
    setFormDuration(plan.duration);
    setFormDate(plan.date || new Date().toISOString().split('T')[0]);

    setObjKnowledge((plan.objectives?.knowledge || []).join('\n'));
    setObjSkills((plan.objectives?.skills || []).join('\n'));
    setObjAttitude((plan.objectives?.attitude || []).join('\n'));

    setAidTeacher(plan.teachingAids?.teacher || '');
    setAidStudent(plan.teachingAids?.student || '');

    setStep1Teacher(plan.steps?.step1Admin?.teacherActivity || '');
    setStep1Student(plan.steps?.step1Admin?.studentActivity || '');
    setStep1Duration(plan.steps?.step1Admin?.duration || '៥ នាទី');

    setStep2Teacher(plan.steps?.step2Review?.teacherActivity || '');
    setStep2Content(plan.steps?.step2Review?.content || '');
    setStep2Student(plan.steps?.step2Review?.studentActivity || '');
    setStep2Duration(plan.steps?.step2Review?.duration || '៥ នាទី');

    setStep3Teacher(plan.steps?.step3NewLesson?.teacherActivity || '');
    setStep3Content(plan.steps?.step3NewLesson?.content || '');
    setStep3Student(plan.steps?.step3NewLesson?.studentActivity || '');
    setStep3Duration(plan.steps?.step3NewLesson?.duration || '២៥ នាទី');

    setStep4Teacher(plan.steps?.step4Strengthen?.teacherActivity || '');
    setStep4Content(plan.steps?.step4Strengthen?.content || '');
    setStep4Student(plan.steps?.step4Strengthen?.studentActivity || '');
    setStep4Duration(plan.steps?.step4Strengthen?.duration || '១០ នាទី');

    setStep5Teacher(plan.steps?.step5Homework?.teacherActivity || '');
    setStep5Content(plan.steps?.step5Homework?.content || '');
    setStep5Student(plan.steps?.step5Homework?.studentActivity || '');
    setStep5Duration(plan.steps?.step5Homework?.duration || '៥ នាទី');

    setFormEvaluation(plan.evaluation || '');
    setFormReflection(plan.selfReflection || '');

    setIsEditModalOpen(true);
  };

  const handleOpenCreateBlank = () => {
    setEditingId(null);
    setFormTitle('កិច្ចតែងការបង្រៀនថ្មី');
    setFormSchoolName(schoolName);
    setFormTeacherName(teacherName);
    setFormSubject('រូបវិទ្យា');
    setFormGrade(activeClassName || 'ថ្នាក់ទី ៩');
    setFormChapter('ជំពូកទី ៣');
    setFormDuration('៥០ នាទី');
    setFormDate(new Date().toISOString().split('T')[0]);

    setObjKnowledge('រៀបរាប់បានពី...\nកំណត់បាននូវ...');
    setObjSkills('អនុវត្តគណនា...\nចេះប្រើប្រាស់...');
    setObjAttitude('បណ្ដុះស្មារតី...\nមានទម្លាប់សហការ...');

    setAidTeacher('សៀវភៅពុម្ព, ស្លាយ, ឧបករណ៍ពិសោធន៍');
    setAidStudent('សៀវភៅសរសេរ, ប៊ិច, បន្ទាត់');

    setStep1Teacher('ពិនិត្យអនាម័យ សណ្ដាប់ធ្នាប់ក្នុងថ្នាក់ វត្តមានសិស្ស');
    setStep1Student('ប្រធានថ្នាក់រាយការណ៍វត្តមាន និងសិស្សអង្គុយប្រកបដោយរបៀបរៀបរយ');
    setStep1Duration('៥ នាទី');

    setStep2Teacher('សួរសំណួររំលឹកមេរៀនចាស់');
    setStep2Content('ខ្លឹមសារសង្ខេបនៃមេរៀនចាស់');
    setStep2Student('សិស្សឆ្លើយសំណួរ');
    setStep2Duration('៥ នាទី');

    setStep3Teacher('បង្ហាញពិសោធន៍គំរូ និងពន្យល់ទ្រឹស្តី');
    setStep3Content('ខ្លឹមសារមេរៀនថ្មី និងរូបមន្ត');
    setStep3Student('សិស្សសង្កេត និងកត់ត្រា');
    setStep3Duration('២៥ នាទី');

    setStep4Teacher('ដាក់លំហាត់អនុវត្តពង្រឹងចំណេះដឹង');
    setStep4Content('លំហាត់គំរូ និងដំណោះស្រាយ');
    setStep4Student('សិស្សឡើងដោះស្រាយលើក្តារខៀន');
    setStep4Duration('១០ នាទី');

    setStep5Teacher('ដាក់កិច្ចការផ្ទះ និងផ្តាំផ្ញើសិស្ស');
    setStep5Content('កិច្ចការផ្ទះលំហាត់ទី...');
    setStep5Student('សិស្សកត់ត្រាកិច្ចការផ្ទះ');
    setStep5Duration('៥ នាទី');

    setFormEvaluation('');
    setFormReflection('');

    setIsEditModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parseLines = (text: string) => text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const planData: LessonPlanItem = {
      id: editingId || `plan-${Date.now()}`,
      title: formTitle.trim(),
      schoolName: formSchoolName.trim() || schoolName,
      teacherName: formTeacherName.trim() || teacherName,
      subject: formSubject.trim(),
      grade: formGrade.trim(),
      chapter: formChapter.trim(),
      duration: formDuration.trim(),
      date: formDate,
      objectives: {
        knowledge: parseLines(objKnowledge),
        skills: parseLines(objSkills),
        attitude: parseLines(objAttitude)
      },
      teachingAids: {
        teacher: aidTeacher.trim(),
        student: aidStudent.trim()
      },
      steps: {
        step1Admin: {
          teacherActivity: step1Teacher.trim(),
          studentActivity: step1Student.trim(),
          duration: step1Duration.trim()
        },
        step2Review: {
          teacherActivity: step2Teacher.trim(),
          content: step2Content.trim(),
          studentActivity: step2Student.trim(),
          duration: step2Duration.trim()
        },
        step3NewLesson: {
          teacherActivity: step3Teacher.trim(),
          content: step3Content.trim(),
          studentActivity: step3Student.trim(),
          duration: step3Duration.trim()
        },
        step4Strengthen: {
          teacherActivity: step4Teacher.trim(),
          content: step4Content.trim(),
          studentActivity: step4Student.trim(),
          duration: step4Duration.trim()
        },
        step5Homework: {
          teacherActivity: step5Teacher.trim(),
          content: step5Content.trim(),
          studentActivity: step5Student.trim(),
          duration: step5Duration.trim()
        }
      },
      evaluation: formEvaluation.trim(),
      selfReflection: formReflection.trim(),
      createdAt: editingId ? (plans.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      onSavePlans(plans.map(p => p.id === editingId ? planData : p));
    } else {
      onSavePlans([planData, ...plans]);
    }

    setIsEditModalOpen(false);
  };

  const handleDeletePlan = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'លុបកិច្ចតែងការ',
      message: `តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់លុប "${title}" នេះមែនទេ?`,
      confirmText: 'លុបចេញ',
      cancelText: 'បោះបង់',
      variant: 'danger'
    });
    if (ok) {
      onSavePlans(plans.filter(p => p.id !== id));
      if (activeViewingPlan?.id === id) {
        setIsViewModalOpen(false);
      }
    }
  };

  const handleDuplicatePlan = (plan: LessonPlanItem) => {
    const duplicated: LessonPlanItem = {
      ...plan,
      id: `plan-${Date.now()}`,
      title: `${plan.title} (ចម្លង)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onSavePlans([duplicated, ...plans]);
  };

  const handleDownloadDocx = async (plan: LessonPlanItem) => {
    await exportLessonPlanToDocx(plan);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកកិច្ចតែងការ, មុខវិជ្ជា, ជំពូក..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl border text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAiModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 border-none"
          >
            <Sparkles className="w-4 h-4" />
            <span>បង្កើតដោយ AI</span>
          </button>
          <button
            onClick={handleOpenCreateBlank}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-2xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតដោយដៃ</span>
          </button>
        </div>
      </div>

      {/* Plans List / Grid */}
      {filteredPlans.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">មិនទាន់មានកិច្ចតែងការបង្រៀនឡើយ</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            បង្កើតកិច្ចតែងការបង្រៀនស្តង់ដារក្រសួងអប់រំ ៥ ជំហាន ដោយស្វ័យប្រវត្តិតាមរយៈ AI ឬបង្កើតដោយដៃ និង Export ជា Word (.docx) យ៉ាងងាយស្រួល។
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={handleOpenAiModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
            >
              <Sparkles className="w-4 h-4" />
              <span>បង្កើតដោយ AI ភ្លាមៗ</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="group p-5 rounded-3xl border bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    កិច្ចតែងការ ៥ ជំហាន
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDuplicatePlan(plan)}
                      title="ចម្លងកិច្ចតែងការ"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditPlan(plan)}
                      title="កែសម្រួល"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id, plan.title)}
                      title="លុប"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2">
                      {plan.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2">
                      <span>{plan.subject}</span>
                      <span>• {plan.grade}</span>
                      <span>• {plan.duration}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">ជំពូក៖</span>
                    <span className="truncate">{plan.chapter || 'ទូទៅ'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">វត្ថុបំណង៖</span>
                    <span>{plan.objectives?.knowledge?.length || 0} ចំណេះដឹង • {plan.objectives?.skills?.length || 0} បំណិន</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {plan.date || new Date(plan.updatedAt).toLocaleDateString('km-KH')}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setActiveViewingPlan(plan);
                      setIsViewModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border-none"
                  >
                    មើលលម្អិត
                  </button>
                  <button
                    onClick={() => handleDownloadDocx(plan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all cursor-pointer border-none"
                    title="ទាញយកជា Word (.docx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Word</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Lesson Plan Generator Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      បង្កើតកិច្ចតែងការដោយ AI
                    </h3>
                    <p className="text-xs text-slate-400">ស្តង់ដារក្រសួងអប់រំ MoEYS ៥ ជំហាន</p>
                  </div>
                </div>
                <button
                  disabled={isGeneratingAi}
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateAiPlan} className="p-6 space-y-4">
                {aiError && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      មុខវិជ្ជា <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={aiSubject}
                      onChange={(e) => setAiSubject(e.target.value)}
                      placeholder="ឧ. រូបវិទ្យា, គណិតវិទ្យា..."
                      className="w-full px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ថ្នាក់ទី <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={aiGrade}
                      onChange={(e) => setAiGrade(e.target.value)}
                      placeholder="ឧ. ថ្នាក់ទី ៩"
                      className="w-full px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ជំពូកទី
                    </label>
                    <input
                      type="text"
                      value={aiChapter}
                      onChange={(e) => setAiChapter(e.target.value)}
                      placeholder="ឧ. ជំពូកទី ៣៖ អគ្គិសនី"
                      className="w-full px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      រយៈពេលបង្រៀន
                    </label>
                    <input
                      type="text"
                      value={aiDuration}
                      onChange={(e) => setAiDuration(e.target.value)}
                      placeholder="ឧ. ៥០ នាទី"
                      className="w-full px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ចំណងជើងមេរៀន <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={aiLessonTitle}
                    onChange={(e) => setAiLessonTitle(e.target.value)}
                    placeholder="ឧ. ច្បាប់អូម (Ohm's Law) និងការអនុវត្ត"
                    className="w-full px-4 py-2.5 rounded-2xl border text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ចំណុចសំខាន់ៗដែលចង់បញ្ចូលបន្ថែម (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={aiExtraInstructions}
                    onChange={(e) => setAiExtraInstructions(e.target.value)}
                    placeholder="ឧ. ផ្តោតលើការពិសោធន៍ជាក់ស្តែងក្នុងថ្នាក់, គណនាលំហាត់តង់ស្យុង U = R × I, ធ្វើការជាក្រុម..."
                    className="w-full p-3 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingAi || !aiLessonTitle.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 border-none disabled:opacity-50"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>កំពុងរៀបចំកិច្ចតែងការ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>បង្កើតកិច្ចតែងការ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Plan Editor Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {editingId ? 'កែសម្រួលកិច្ចតែងការបង្រៀន' : 'បង្កើតកិច្ចតែងការបង្រៀនស្តង់ដារ ៥ ជំហាន'}
                    </h3>
                    <p className="text-xs text-slate-400">សម្រាប់ថ្នាក់៖ {activeClassName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Meta Information */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
                    ១. ព័ត៌មានទូទៅនៃកិច្ចតែងការ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ចំណងជើងកិច្ចតែងការ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        មុខវិជ្ជា
                      </label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ថ្នាក់ទី
                      </label>
                      <input
                        type="text"
                        value={formGrade}
                        onChange={(e) => setFormGrade(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ជំពូក / មេរៀន
                      </label>
                      <input
                        type="text"
                        value={formChapter}
                        onChange={(e) => setFormChapter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        រយៈពេល
                      </label>
                      <input
                        type="text"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        សាលារៀន
                      </label>
                      <input
                        type="text"
                        value={formSchoolName}
                        onChange={(e) => setFormSchoolName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ឈ្មោះគ្រូបង្រៀន
                      </label>
                      <input
                        type="text"
                        value={formTeacherName}
                        onChange={(e) => setFormTeacherName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Section I: Objectives */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    I. វត្ថុបំណងនៃការបង្រៀន (ចុះបន្ទាត់ដើម្បីបំបែកចំណុច)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ១. ផ្នែកចំណេះដឹង
                      </label>
                      <textarea
                        rows={3}
                        value={objKnowledge}
                        onChange={(e) => setObjKnowledge(e.target.value)}
                        className="w-full p-2.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ២. ផ្នែកបំណិន
                      </label>
                      <textarea
                        rows={3}
                        value={objSkills}
                        onChange={(e) => setObjSkills(e.target.value)}
                        className="w-full p-2.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ៣. ផ្នែកឥរិយាបថ
                      </label>
                      <textarea
                        rows={3}
                        value={objAttitude}
                        onChange={(e) => setObjAttitude(e.target.value)}
                        className="w-full p-2.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* Section II: Teaching Aids */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    II. សម្ភារឧបទេស
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        សម្ភារគ្រូ
                      </label>
                      <input
                        type="text"
                        value={aidTeacher}
                        onChange={(e) => setAidTeacher(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        សម្ភារសិស្ស
                      </label>
                      <input
                        type="text"
                        value={aidStudent}
                        onChange={(e) => setAidStudent(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Section III: 5 Steps */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
                    III. ដំណើរការបង្រៀន (៥ ជំហានស្តង់ដារ)
                  </h4>
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                        <span>ជំហានទី១៖ រដ្ឋបាលថ្នាក់</span>
                        <span>{step1Duration}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="សកម្មភាពគ្រូ"
                          value={step1Teacher}
                          onChange={(e) => setStep1Teacher(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="សកម្មភាពសិស្ស"
                          value={step1Student}
                          onChange={(e) => setStep1Student(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                        <span>ជំហានទី២៖ រំលឹកមេរៀនចាស់</span>
                        <span>{step2Duration}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="សកម្មភាពគ្រូ (សួរសំណួរ...)"
                          value={step2Teacher}
                          onChange={(e) => setStep2Teacher(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="ខ្លឹមសារមេរៀនចាស់"
                          value={step2Content}
                          onChange={(e) => setStep2Content(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="សកម្មភាពសិស្ស (ឆ្លើយ...)"
                          value={step2Student}
                          onChange={(e) => setStep2Student(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                        <span>ជំហានទី៣៖ មេរៀនថ្មី</span>
                        <span>{step3Duration}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <textarea
                          rows={3}
                          placeholder="សកម្មភាពគ្រូ (ពន្យល់ ធ្វើពិសោធន៍...)"
                          value={step3Teacher}
                          onChange={(e) => setStep3Teacher(e.target.value)}
                          className="p-2 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <textarea
                          rows={3}
                          placeholder="ខ្លឹមសារមេរៀនថ្មី រូបមន្ត និយមន័យ"
                          value={step3Content}
                          onChange={(e) => setStep3Content(e.target.value)}
                          className="p-2 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <textarea
                          rows={3}
                          placeholder="សកម្មភាពសិស្ស (ស្តាប់ កត់ត្រា សួរ...)"
                          value={step3Student}
                          onChange={(e) => setStep3Student(e.target.value)}
                          className="p-2 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                        <span>ជំហានទី៤៖ ពង្រឹងចំណេះដឹង</span>
                        <span>{step4Duration}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="សកម្មភាពគ្រូ (ដាក់លំហាត់...)"
                          value={step4Teacher}
                          onChange={(e) => setStep4Teacher(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="ខ្លឹមសារសំណួរពង្រឹង / ដំណោះស្រាយ"
                          value={step4Content}
                          onChange={(e) => setStep4Content(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="សកម្មភាពសិស្ស (អនុវត្ត...)"
                          value={step4Student}
                          onChange={(e) => setStep4Student(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                        <span>ជំហានទី៥៖ កិច្ចការផ្ទះ និងបណ្តាំផ្ញើ</span>
                        <span>{step5Duration}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="សកម្មភាពគ្រូ (ដាក់កិច្ចការផ្ទះ...)"
                          value={step5Teacher}
                          onChange={(e) => setStep5Teacher(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="ខ្លឹមសារកិច្ចការផ្ទះ"
                          value={step5Content}
                          onChange={(e) => setStep5Content(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="សកម្មភាពសិស្ស (កត់ត្រា...)"
                          value={step5Student}
                          onChange={(e) => setStep5Student(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 border-none"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingId ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតកិច្ចតែងការ'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Preview / Print Modal */}
      <AnimatePresence>
        {isViewModalOpen && activeViewingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                      {activeViewingPlan.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeViewingPlan.subject} • {activeViewingPlan.grade} • {activeViewingPlan.chapter}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadDocx(activeViewingPlan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយក Word</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border-none"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>បោះពុម្ព</span>
                  </button>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet */}
              <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-100 font-sans">
                {/* Kingdom Header */}
                <div className="text-center space-y-1 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h3 className="text-sm sm:text-base font-black text-blue-900 dark:text-blue-400">
                    ព្រះរាជាណាចក្រកម្ពុជា
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-400">
                    ជាតិ សាសនា ព្រះមហាក្សត្រ
                  </h4>
                  <div className="w-16 h-0.5 bg-blue-900 dark:bg-blue-400 mx-auto mt-2" />
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                  <span>{activeViewingPlan.schoolName}</span>
                  <span>គ្រូបង្រៀន៖ {activeViewingPlan.teacherName}</span>
                </div>

                <div className="text-center py-2">
                  <h2 className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    កិច្ចតែងការបង្រៀន
                  </h2>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {activeViewingPlan.title}
                  </h3>
                </div>

                {/* Metadata badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div><span className="font-bold text-slate-500">មុខវិជ្ជា៖</span> {activeViewingPlan.subject}</div>
                  <div><span className="font-bold text-slate-500">ថ្នាក់ទី៖</span> {activeViewingPlan.grade}</div>
                  <div><span className="font-bold text-slate-500">រយៈពេល៖</span> {activeViewingPlan.duration}</div>
                  <div><span className="font-bold text-slate-500">កាលបរិច្ឆេទ៖</span> {activeViewingPlan.date}</div>
                </div>

                {/* Objectives */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-500/20 pb-1">
                    I. វត្ថុបំណងនៃការបង្រៀន (Objectives)
                  </h4>
                  <div className="space-y-2 text-xs sm:text-sm pl-2">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">១. ផ្នែកចំណេះដឹង៖</span>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                        {(activeViewingPlan.objectives.knowledge || []).map((k, i) => <li key={i}>{k}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">២. ផ្នែកបំណិន៖</span>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                        {(activeViewingPlan.objectives.skills || []).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">៣. ផ្នែកឥរិយាបថ៖</span>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                        {(activeViewingPlan.objectives.attitude || []).map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Teaching Aids */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-500/20 pb-1">
                    II. សម្ភារឧបទេស (Teaching Aids)
                  </h4>
                  <div className="text-xs sm:text-sm pl-2 space-y-1 text-slate-600 dark:text-slate-400">
                    <p><span className="font-bold text-slate-700 dark:text-slate-300">• សម្ភារគ្រូ៖</span> {activeViewingPlan.teachingAids.teacher}</p>
                    <p><span className="font-bold text-slate-700 dark:text-slate-300">• សម្ភារសិស្ស៖</span> {activeViewingPlan.teachingAids.student}</p>
                  </div>
                </div>

                {/* 5-Step Official Grid Table */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-500/20 pb-1">
                    III. ដំណើរការបង្រៀន (៥ ជំហានស្តង់ដារ)
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-xs sm:text-sm text-left border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3 border-r border-slate-200 dark:border-slate-800 w-[20%] text-center">ជំហាន / រយៈពេល</th>
                          <th className="p-3 border-r border-slate-200 dark:border-slate-800 w-[26%]">សកម្មភាពគ្រូ</th>
                          <th className="p-3 border-r border-slate-200 dark:border-slate-800 w-[28%]">ខ្លឹមសារមេរៀន</th>
                          <th className="p-3 w-[26%]">សកម្មភាពសិស្ស</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {/* Step 1 */}
                        <tr>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30">
                            ជំហានទី១៖ រដ្ឋបាលថ្នាក់<br/>
                            <span className="text-[10px] text-slate-400 font-normal">({activeViewingPlan.steps.step1Admin.duration || '៥ នាទី'})</span>
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step1Admin.teacherActivity}
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            រដ្ឋបាលថ្នាក់រៀន
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step1Admin.studentActivity}
                          </td>
                        </tr>

                        {/* Step 2 */}
                        <tr>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30">
                            ជំហានទី២៖ រំលឹកមេរៀនចាស់<br/>
                            <span className="text-[10px] text-slate-400 font-normal">({activeViewingPlan.steps.step2Review.duration || '៥ នាទី'})</span>
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step2Review.teacherActivity}
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-pre-line">
                            {activeViewingPlan.steps.step2Review.content}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step2Review.studentActivity}
                          </td>
                        </tr>

                        {/* Step 3 */}
                        <tr>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30">
                            ជំហានទី៣៖ មេរៀនថ្មី<br/>
                            <span className="text-[10px] text-slate-400 font-normal">({activeViewingPlan.steps.step3NewLesson.duration || '២៥ នាទី'})</span>
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-pre-line">
                            {activeViewingPlan.steps.step3NewLesson.teacherActivity}
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-pre-line font-medium">
                            {activeViewingPlan.steps.step3NewLesson.content}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-pre-line">
                            {activeViewingPlan.steps.step3NewLesson.studentActivity}
                          </td>
                        </tr>

                        {/* Step 4 */}
                        <tr>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30">
                            ជំហានទី៤៖ ពង្រឹងចំណេះដឹង<br/>
                            <span className="text-[10px] text-slate-400 font-normal">({activeViewingPlan.steps.step4Strengthen.duration || '១០ នាទី'})</span>
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-pre-line">
                            {activeViewingPlan.steps.step4Strengthen.teacherActivity}
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-pre-line">
                            {activeViewingPlan.steps.step4Strengthen.content}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step4Strengthen.studentActivity}
                          </td>
                        </tr>

                        {/* Step 5 */}
                        <tr>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30">
                            ជំហានទី៥៖ កិច្ចការផ្ទះ<br/>
                            <span className="text-[10px] text-slate-400 font-normal">({activeViewingPlan.steps.step5Homework.duration || '៥ នាទី'})</span>
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step5Homework.teacherActivity}
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step5Homework.content}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {activeViewingPlan.steps.step5Homework.studentActivity}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Evaluation */}
                {activeViewingPlan.evaluation && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      IV. ការវាយតម្លៃការបង្រៀន (Evaluation)
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pl-2">
                      {activeViewingPlan.evaluation}
                    </p>
                  </div>
                )}

                {/* Signatures */}
                <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 text-center text-xs sm:text-sm">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">បានឃើញ និងឯកភាព</p>
                    <p className="text-xs text-slate-500">នាយកសាលា</p>
                    <div className="h-20" />
                  </div>
                  <div>
                    <p className="text-slate-500 italic">ថ្ងៃទី...... ខែ...... ឆ្នាំ២០២៦</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">ហត្ថលេខាគ្រូបង្រៀន</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">{activeViewingPlan.teacherName}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
