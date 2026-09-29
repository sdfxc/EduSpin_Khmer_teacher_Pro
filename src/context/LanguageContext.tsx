import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'kh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<Language, string>> = {
  // Navigation Tabs
  'tab_wheel': { kh: 'បង្វិលឈ្មោះ', en: 'Spin Wheel' },
  'tab_groups': { kh: 'បែងចែកក្រុម', en: 'Group Divider' },
  'tab_students': { kh: 'គ្រប់គ្រងសិស្ស', en: 'Student Manager' },
  'tab_quiz': { kh: 'ក្ដារសំណួរ', en: 'Quiz Panel' },
  'tab_exams': { kh: 'បន្ទប់វិញ្ញាសា', en: 'Exams Room' },
  'tab_lobby': { kh: 'Study game', en: 'Study game' },

  // Settings
  'settings_title': { kh: 'ការកំណត់ & Menu', en: 'Settings & Menu' },
  'settings_sub': { kh: 'Control Center & 100% Data Vault', en: 'Control Center & 100% Data Vault' },
  'settings_controls': { kh: 'ការកំណត់ប្រព័ន្ធ', en: 'System Settings' },
  'settings_backup': { kh: 'បម្រុងទុក & ស្ដារ', en: 'Backup & Restore' },
  'settings_lang': { kh: 'ភាសាប្រព័ន្ធ (Language)', en: 'System Language' },
  'settings_theme': { kh: 'ពន្លឺ / ងងឹត', en: 'Light / Dark Mode' },
  'settings_theme_desc': { kh: 'ប្ដូរ Theme កម្មវិធី', en: 'Switch app theme' },
  'settings_sound': { kh: 'សំឡេងហ្គេម', en: 'Game Sound' },
  'settings_sound_desc': { kh: 'SFX & Chimes', en: 'SFX & Chimes' },
  'settings_fullscreen': { kh: 'ពេញអេក្រង់ (F)', en: 'Fullscreen (F)' },
  'settings_fullscreen_desc': { kh: 'សម្រាប់ TV/Projector', en: 'For TV/Projector' },
  'settings_shortcuts': { kh: 'គ្រាប់ចុចកាត់', en: 'Keyboard Shortcuts' },
  'settings_shortcuts_desc': { kh: 'Shortcuts List', en: 'Shortcuts List' },
  'settings_ai': { kh: 'បង្កើតសំណួរ AI', en: 'Create Questions with AI' },
  'settings_ai_desc': { kh: 'ទាញយកសំណួរពីមេរៀនស្វ័យប្រវត្ត', en: 'Extract questions automatically' },
  'settings_reset': { kh: 'កំណត់កម្មវិធីឡើងវិញ (Reset All Data)', en: 'Reset App (Clear All Data)' },

  // General Exam Creators & Lesson Modal
  'moeys_national_curriculum': { kh: '១. កម្មវិធីសិក្សាជាតិ (MoEYS)', en: '1. National Curriculum (MoEYS)' },
  'exam_sections_count': { kh: '២. ផ្នែកវិញ្ញាសា & ចំនួនសំណួរ', en: '2. Exam Sections & Questions Count' },
  'cognitive_levels_conditions': { kh: '៣. កម្រិតវិភាគ & លក្ខខណ្ឌ', en: '3. Cognitive Levels & Conditions' },
  'files_support_images': { kh: '៤. ឯកសារ & រូបភាពជំនួយ', en: '4. Reference Files & Images' },

  // Screen 1: Config Exams
  'exam_config_mode': { kh: 'របៀបកំណត់វិញ្ញាសា', en: 'Exam Configuration Mode' },
  'by_section': { kh: 'កំណត់តាមផ្នែកៗ', en: 'By Section' },
  'total_count_only': { kh: 'ចំនួនសរុបតែម្តង', en: 'Total Count Only' },
  'quick_section_presets': { kh: 'គំរូទម្រង់វិញ្ញាសារហ័ស', en: 'Quick Section Presets' },
  'moeys_standard': { kh: 'ស្ដង់ដារក្រសួង MoEYS', en: 'MoEYS Standard' },
  'monthly_exam': { kh: 'វិញ្ញាសាប្រចាំខែ', en: 'Monthly Exam' },
  'semester_exam': { kh: 'វិញ្ញាសាឆមាស', en: 'Semester Exam' },
  'pure_qcm': { kh: 'ពហុជ្រើសរើសសុទ្ធ (QCM)', en: 'Pure Multiple Choice (QCM)' },
  'focus_stem': { kh: 'ផ្ដោតលើលំហាត់ STEM', en: 'Focus on STEM Exercises' },
  'stem_exercise': { kh: 'ផ្ដោតលើលំហាត់ STEM', en: 'Focus on STEM Exercises' },
  'customize_sections': { kh: 'កែសម្រួលចំនួនសំណួរ និងពិន្ទុតាមផ្នែក', en: 'Customize Questions & Points' },
  'section_1_qcm': { kh: 'ផ្នែកទី ១៖ សំណួរពហុជ្រើសរើស', en: 'Section 1: Multiple Choice' },
  'section_1_desc': { kh: 'សំណួរជ្រើសរើសចម្លើយត្រឹមត្រូវ ១ ក្នុងចំណោម ៤', en: 'Select 1 correct answer out of 4 options' },
  'section_2_matching': { kh: 'ផ្នែកទី ២៖ សំណួរផ្គូផ្គង', en: 'Section 2: Matching Questions' },
  'section_2_desc': { kh: 'ផ្គូផ្គងប្រយោគ ឬនិយមន័យរវាងជួរឈរ ក និង ខ', en: 'Match sentences or definitions between Column A & B' },
  'questions_count': { kh: 'ចំនួនសំណួរ', en: 'Questions Count' },
  'points_per_question': { kh: 'ពិន្ទុក្នុង ១ សំណួរ', en: 'Points Per Question' },
  'questions': { kh: 'សំណួរ', en: 'Questions' },
  'points': { kh: 'ពិន្ទុ', en: 'Points' },
  
  // Section Preset Descriptions
  'moeys_standard_desc': { kh: 'បន្សំគ្រប់ផ្នែក (QCM ៥, ផ្គូផ្គង ៤, បំពេញ ៤, ទ្រឹស្ដី ២, លំហាត់ ២)', en: 'Mixed sections (QCM 5, Matching 4, Fill blank 4, Theory 2, Exercise 2)' },
  'monthly_exam_desc': { kh: 'QCM ៥, ផ្គូផ្គង ២, បំពេញ ៣, ទ្រឹស្ដី ២, លំហាត់ ២ (សរុប ១៤)', en: 'QCM 5, Matching 2, Fill blank 3, Theory 2, Exercise 2 (Total 14)' },
  'semester_exam_desc': { kh: 'QCM ៨, ផ្គូផ្គង ៤, បំពេញ ៤, ទ្រឹស្ដី ៤, លំហាត់ ៤ (សរុប ២៤)', en: 'QCM 8, Matching 4, Fill blank 4, Theory 4, Exercise 4 (Total 24)' },
  'pure_qcm_desc': { kh: 'QCM ២០ សំណួរសុទ្ធ មិនមានផ្នែកផ្សេង', en: 'QCM 20 questions only, no other sections' },
  'stem_exercise_desc': { kh: 'QCM ៤, ផ្គូផ្គង ២, បំពេញ ២, ទ្រឹស្ដី ២, លំហាត់ ៥ (សរុប ១៥)', en: 'QCM 4, Matching 2, Fill blank 2, Theory 2, Exercise 5 (Total 15)' },

  // Screen 2: Lesson Parameter Modals
  'curriculum_alignment': { kh: '១. ប៉ារ៉ាម៉ែត្រកម្មវិធីសិក្សា', en: '1. Curriculum Alignment' },
  'files_notes': { kh: '២. ឯកសារ & កំណត់ចំណាំ', en: '2. Files & Notes' },
  'grade_level': { kh: 'កម្រិតថ្នាក់', en: 'Grade Level' },
  'moeys_subject': { kh: 'មុខវិជ្ជាក្រសួង MoEYS', en: 'MoEYS Subject' },
  'chapter': { kh: 'ជំពូក', en: 'Chapter' },
  'lesson': { kh: 'មេរៀន', en: 'Lesson' },
  'topic_concept': { kh: 'ប្រធានបទ / គោលគំនិត', en: 'Topic / Concept' },
  'question_assessment_types': { kh: 'ប្រភេទសំណួរ', en: 'Question Assessment Types' },
  'all_mixed': { kh: 'ចម្រុះទាំងអស់', en: 'All Mixed' },
  'qcm_mcq': { kh: 'QCM / MCQ', en: 'QCM / MCQ' },
  'true_false': { kh: 'True / False', en: 'True / False' },
  'short_answer': { kh: 'Short Answer', en: 'Short Answer' },
  'problem_solving': { kh: 'Problem Solving', en: 'Problem Solving' },
  'application_scenario': { kh: 'Application & Scenario', en: 'Application & Scenario' },
  'hots': { kh: 'HOTS (គិតកម្រិតខ្ពស់)', en: 'HOTS (Higher Order Thinking)' },
  'pisa_style': { kh: 'PISA-style (ស្ដង់ដារអន្តរជាតិ)', en: 'PISA-style (International Standard)' },
  'stem_project': { kh: 'STEM Project (គម្រោង STEM)', en: 'STEM Project' },
  'bloom_taxonomy': { kh: 'កម្រិតវិភាគតាមទ្រឹស្តី BLOOM\'S TAXONOMY', en: 'Theory of Bloom\'s Taxonomy Levels' },
  'difficulty_level': { kh: 'កម្រិតពិបាក', en: 'Difficulty Level' },
  'question_language': { kh: 'ភាសានៃសំណួរ', en: 'Question Language' },
  'khmer': { kh: 'ខ្មែរ', en: 'Khmer' },
  'bilingual': { kh: 'ទ្វេភាសា', en: 'Bilingual' },
  'formula_solutions': { kh: 'ដំណោះស្រាយរូបមន្ត និងជំហានគណនា', en: 'Formulas & Step-by-Step Solutions' },
  'formula_solutions_desc': { kh: 'បង្ហាញរូបមន្ត រួមទាំងជំហានគណនាលម្អិត', en: 'Show formulas and detailed calculation steps' },
  
  // Screen 3: API & Lesson Content
  'ai_assessment_expert': { kh: 'អ្នកជំនាញវាយតម្លៃការសិក្សា AI', en: 'AI Educational Assessment Expert' },
  'lesson_content_notes': { kh: 'ខ្លឹមសារមេរៀន / សៀវភៅពុម្ព MOEYS', en: 'Lesson Content / MOEYS Textbook Notes' },
  'copy_lesson_content_placeholder': { kh: 'ចម្លងខ្លឹមសារមេរៀន ឬកំណត់ចំណាំដាក់ទីនេះ... AI នឹងផ្អែកលើព័ត៌មាននេះដើម្បីបង្កើតសំណួរ', en: 'Copy lesson content or textbook notes here... AI will generate questions based on this information' },
  'upload_docs_images': { kh: 'បញ្ជូនឯកសារ រូបភាព', en: 'Submit Documents & Images' },
  'drag_drop_files_images': { kh: 'ចុចទីនេះ ឬអូសទម្លាក់ឯកសារ រូបភាព (Ctrl+V ដើម្បីបិទភ្ជាប់រូបភាព)', en: 'Click here or drag & drop files/images (Ctrl+V to paste image)' },
  'supported_file_types': { kh: 'គាំទ្រ PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx) និងរូបភាព JPEG/PNG', en: 'Supports PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx) and JPEG/PNG images' },
  'cards_count': { kh: 'ចំនួនសន្លឹកបៀកាតសំណួរ', en: 'Cards Count' },

  // Screen 5: Bloom Taxonomy Tab
  'mixed': { kh: 'ចម្រុះ', en: 'Mixed' },
  'remember': { kh: 'ចងចាំ', en: 'Remembering' },
  'understand': { kh: 'យល់ដឹង', en: 'Understanding' },
  'apply': { kh: 'អនុវត្ត', en: 'Applying' },
  'analyze': { kh: 'វិភាគ', en: 'Analyzing' },
  'evaluate': { kh: 'វាយតម្លៃ', en: 'Evaluating' },
  'create': { kh: 'បង្កើតថ្មី', en: 'Creating' },
  'difficulty': { kh: 'កម្រិតលំបាក', en: 'Difficulty' },
  'easy': { kh: 'ងាយស្រួល', en: 'Easy' },
  'medium': { kh: 'មធ្យម', en: 'Medium' },
  'hard': { kh: 'ពិបាក', en: 'Hard' },
  'exam_context': { kh: 'ប្រភេទវិញ្ញាសា', en: 'Exam Type / Context' },
  'exam_context_monthly': { kh: 'វិញ្ញាសាប្រឡងប្រចាំខែ', en: 'Monthly Exam Assessment' },
  'total_questions_create': { kh: 'ចំនួនសំណួរដែលត្រូវបង្កើត', en: 'Total Questions to Create' },
  'start_creating_exam_ai': { kh: 'ចាប់ផ្តើមបង្កើតវិញ្ញាសា (AI)', en: 'Start Creating Exam (AI)' },

  // Screen 6: Reference Files
  'ref_files_images': { kh: 'ឯកសារយោង និងរូបភាពសៀវភៅពុម្ព', en: 'Reference Files & Textbook Images' },
  'submit_images': { kh: 'បញ្ជូនរូបភាព', en: 'Submit Images' },
  'images_photos_desc': { kh: 'រូបទំព័រសៀវភៅពុម្ព, លំហាត់ ឬក្រាហ្វិក', en: 'Textbook pages, exercises or graphic images' },
  'submit_files': { kh: 'បញ្ជូនឯកសារ PDF / Word / PPTX', en: 'Submit PDF / Word / PPTX' },
  'submit_files_desc': { kh: 'កម្រងវិញ្ញាសាចាស់ៗ, កិច្ចតែងការ, ឯកសារក្រសួង', en: 'Old exams, lesson plans or MoEYS documents' },
  'custom_prompt_teacher': { kh: 'សេចក្តីណែនាំគន្លឹះបន្ថែមរបស់លោកគ្រូ អ្នកគ្រូ', en: 'Additional custom instructions from the teacher' },
  'custom_prompt_placeholder': { kh: 'ឧទហរណ៍៖ សូមសង្កត់ធ្ងន់លើលំហាត់គណនាសមីការគីមី និងទ្រឹស្តីដែលមានក្នុងសៀវភៅពុម្ពទំព័រ ២៥-៣០...', en: 'Example: Please emphasize chemical equation calculation exercises and theories from textbook pages 25-30...' },

  // General App Bar & Footer
  'total_students': { kh: 'សិស្សសរុប៖', en: 'Total Students:' },
  'called': { kh: 'បានហៅ៖', en: 'Called:' },
  'teacher_called': { kh: 'គ្រូហៅ', en: 'Teacher Call' },
  'clear_call': { kh: 'សម្អាតការហៅ', en: 'Clear Call List' },
  'classroom': { kh: 'ថ្នាក់រៀន', en: 'Classroom' },
  'add_class': { kh: 'បន្ថែមថ្នាក់', en: 'Add Class' },
  'class_no_exist_yet': { kh: 'មិនទាន់មានថ្នាក់នៅឡើយទេ ចុច «បន្ថែមថ្នាក់» ដើម្បីបង្កើត', en: 'No classrooms yet. Click "Add Class" to create one.' },
  'not_logged_in_empty': { kh: 'មិនទាន់មានគណនីចូលប្រើ — ទិន្នន័យទទេរ', en: 'Not logged in — data is empty' },
  'login': { kh: 'ចូលគណនី', en: 'Login' },
  'register_teacher': { kh: 'ចុះឈ្មោះគ្រូ', en: 'Register Teacher' },
  'cancel': { kh: 'បោះបង់', en: 'Cancel' },
  'save': { kh: 'រក្សាទុក', en: 'Save' },
  'school': { kh: 'សាលារៀន', en: 'School' },
  'done': { kh: 'រួចរាល់', en: 'Done' },
  'total_questions': { kh: 'សរុប', en: 'Total' },
  'approved_points_count': { kh: 'ពិនិត្យសរុប', en: 'total points' },
  'points_label': { kh: 'ពិន្ទុ', en: 'Points' },
  'print_or_export': { kh: 'បោះពុម្ព', en: 'Print / Export' },

  // Grades
  'grade_1': { kh: 'ថ្នាក់ទី ១', en: 'Grade 1' },
  'grade_2': { kh: 'ថ្នាក់ទី ២', en: 'Grade 2' },
  'grade_3': { kh: 'ថ្នាក់ទី ៣', en: 'Grade 3' },
  'grade_4': { kh: 'ថ្នាក់ទី ៤', en: 'Grade 4' },
  'grade_5': { kh: 'ថ្នាក់ទី ៥', en: 'Grade 5' },
  'grade_6': { kh: 'ថ្នាក់ទី ៦', en: 'Grade 6' },
  'grade_7': { kh: 'ថ្នាក់ទី ៧', en: 'Grade 7' },
  'grade_8': { kh: 'ថ្នាក់ទី ៨', en: 'Grade 8' },
  'grade_9': { kh: 'ថ្នាក់ទី ៩', en: 'Grade 9' },
  'grade_10': { kh: 'ថ្នាក់ទី ១០', en: 'Grade 10' },
  'grade_11': { kh: 'ថ្នាក់ទី ១១', en: 'Grade 11' },
  'grade_12': { kh: 'ថ្នាក់ទី ១២', en: 'Grade 12' },

  // Subjects
  'subj_math': { kh: 'គណិតវិទ្យា', en: 'Mathematics' },
  'subj_physics': { kh: 'រូបវិទ្យា', en: 'Physics' },
  'subj_chemistry': { kh: 'គីមីវិទ្យា', en: 'Chemistry' },
  'subj_biology': { kh: 'ជីវវិទ្យា', en: 'Biology' },
  'subj_earth_science': { kh: 'ផែនដីវិទ្យា', en: 'Earth Science' },
  'subj_khmer': { kh: 'ភាសាខ្មែរ', en: 'Khmer Language' },
  'subj_english': { kh: 'ភាសាអង់គ្លេស', en: 'English Language' },
  'subj_french': { kh: 'ភាសាបារាំង', en: 'French Language' },
  'subj_history': { kh: 'ប្រវត្តិវិទ្យា', en: 'History' },
  'subj_geography': { kh: 'ភូមិវិទ្យា', en: 'Geography' },
  'subj_morality': { kh: 'សីលធម៌–ពលរដ្ឋវិជ្ជា', en: 'Morality & Civics' },
  'subj_stem': { kh: 'STEM', en: 'STEM' },
  'subj_ict': { kh: 'កុំព្យូទ័រ / ICT', en: 'Computer / ICT' },
  'subj_technology': { kh: 'បច្ចេកវិទ្យា', en: 'Technology' },
  'subj_home_economics': { kh: 'គេហវិទ្យា', en: 'Home Economics' },
  'subj_sports': { kh: 'អប់រំកាយ និងកីឡា', en: 'Physical Education' },
  'subj_other': { kh: 'មុខវិជ្ជាផ្សេងៗ', en: 'Other' },
  'subj_essay': { kh: 'តែងសេចក្ដី', en: 'Essay Writing' },
  'subj_dictation': { kh: 'សរសេរតាមអាន', en: 'Dictation' },

  // Question Types
  'qt_all_mixed_name': { kh: 'ចម្រុះទាំងអស់', en: 'All Mixed' },
  'qt_all_mixed_desc': { kh: 'បន្សំគ្រប់ប្រភេទសំណួរ (QCM, ត្រូវ/ខុស, ចម្លើយខ្លី, លំហាត់គណនា...)', en: 'Combination of all question types (QCM, T/F, Short, Problem Solving...)' },
  'qt_qcm_name': { kh: 'សំណួរពហុជ្រើសរើស (QCM)', en: 'Multiple Choice (QCM)' },
  'qt_qcm_desc': { kh: 'ជម្រើស ៤ (A, B, C, D) ឆ្លាស់ចម្លើយត្រឹមត្រូវ', en: 'Select 1 correct answer out of 4 options' },
  'qt_true_false_name': { kh: 'ត្រូវ ຫຼື ខុស', en: 'True / False' },
  'qt_true_false_desc': { kh: 'ត្រូវ ឬ ខុស រហ័ស', en: 'Quick True or False statements' },
  'qt_short_answer_name': { kh: 'សំណួរចម្លើយខ្លី', en: 'Short Answer' },
  'qt_short_answer_desc': { kh: 'សំណួរចម្លើយខ្លីៗ ចំគោលដៅ', en: 'Concise target-oriented short answers' },
  'qt_problem_solving_name': { kh: 'លំហាត់គណនា', en: 'Problem Solving' },
  'qt_problem_solving_desc': { kh: 'លំហាត់គណនា រូបមន្ត និងដំណោះស្រាយ', en: 'Mathematical calculations, formulas and solutions' },
  'qt_application_name': { kh: 'ការអនុវត្តជាក់ស្តែង', en: 'Application & Scenario' },
  'qt_application_desc': { kh: 'ការអនុវត្តជាក់ស្តែងក្នុងជីវភាពរស់នៅ', en: 'Real-life applications and context scenarios' },
  'qt_hots_name': { kh: 'គិតកម្រិតខ្ពស់ (HOTS)', en: 'Higher Order Thinking (HOTS)' },
  'qt_hots_desc': { kh: 'ការគិតកម្រិតខ្ពស់ វិភាគស៊ីជម្រៅ', en: 'Deep analysis and critical thinking skills' },
  'qt_pisa_name': { kh: 'ស្ដង់ដារតេស្ត PISA', en: 'PISA-style Standard' },
  'qt_pisa_desc': { kh: 'ស្ដង់ដារតេស្ត PISA អន្តរជាតិ MoEYS', en: 'International student assessment style standard' },
  'qt_stem_name': { kh: 'គម្រោង STEM', en: 'STEM Project' },
  'qt_stem_desc': { kh: 'គម្រោង STEM และសមត្ថภาพអនុวัตផ្ទាល់', en: 'STEM projects based on practical implementation' },

  // Bloom Levels
  'bloom_all_name': { kh: 'ចម្រុះគ្រប់កម្រិត', en: 'Balanced Levels' },
  'bloom_all_desc': { kh: 'បែងចែកពី L1 ដល់ L6 សមស្រប', en: 'Appropriately balanced from L1 to L6' },
  'bloom_remember_name': { kh: 'កម្រិត ១ ៖ ចងចាំ', en: 'Level 1: Remembering' },
  'bloom_remember_desc': { kh: 'កំណត់, រំលឹក, រាយឈ្មោះ, សម្គាល់', en: 'Identify, recall, list, recognize' },
  'bloom_understand_name': { kh: 'កម្រិត ២ ៖ យល់ដឹង', en: 'Level 2: Understanding' },
  'bloom_understand_desc': { kh: 'ពន្យល់, បកស្រាយ, ប្រៀបធៀប, សង្ខេប', en: 'Explain, interpret, compare, summarize' },
  'bloom_apply_name': { kh: 'កម្រិត ៣ ៖ អនុវត្ត', en: 'Level 3: Applying' },
  'bloom_apply_desc': { kh: 'គណនា, អនុវត្ត, ប្រើរូបមន្ត, ដោះស្រាយ', en: 'Calculate, apply, use formulas, solve' },
  'bloom_analyze_name': { kh: 'កម្រិត ៤ ៖ វិភាគ', en: 'Level 4: Analyzing' },
  'bloom_analyze_desc': { kh: 'វិភាគ, បែងចែក, រកមូលហេតុ, ទំនាក់ទំនង', en: 'Analyze, categorize, find causes, relationships' },
  'bloom_evaluate_name': { kh: 'កម្រិត ៥ ៖ វាយតម្លៃ', en: 'Level 5: Evaluating' },
  'bloom_evaluate_desc': { kh: 'វាយតម្លៃ, បង្ហាញហេតុផល, ជ្រើសរើស', en: 'Evaluate, justify, select' },
  'bloom_create_name': { kh: 'កម្រិត ៦ ៖ បង្កើតថ្មី', en: 'Level 6: Creating' },
  'bloom_create_desc': { kh: 'បង្កើត, រចនា, ស្វែងរកដំណោះស្រាយ, គម្រោង', en: 'Create, design, find solutions, projects' },

  // Additional Keys
  'expert_ai_title': { kh: 'ប្រព័ន្ធវាយតម្លៃការសិក្សា AI ស្របតាមកម្មវិធី MoEYS', en: 'MoEYS Curriculum AI Assessment Expert' },
  'expert_ai_subtitle': { kh: 'បង្កើតសំណួរវិញ្ញាសារស្វ័យប្រវត្តិតាមកម្មវិធីសិក្សាជាតិ និងស្តង់ដារក្រសួងអប់រំ យុវជន និងកីឡា', en: 'Generate exams automatically based on the National Curriculum standards' },
  'gemini_key_title': { kh: 'កូនសោ API Gemini', en: 'Gemini API Key' },
  'gemini_key_desc': { kh: 'បញ្ចូលកូនសោ API Gemini (ឧទាហរណ៍៖ AIzaSy...)', en: 'Enter Gemini API Key (e.g. AIzaSy...)' },
  'gemini_key_get': { kh: 'បង្កើត API Key ឥតគិតថ្លៃ ↗', en: 'Get Free API Key ↗' },
  'exam_standard_preview': { kh: 'ផ្ទាំងឯកសារមើលជាមុន (ស្តង់ដារ MoEYS)', en: 'Document Print Preview (MoEYS Standard)' },
  'points_per_q': { kh: 'ពិន្ទុ/សំណួរ', en: 'Points/Question' },
  'custom_teacher_directive': { kh: 'ការណែនាំបន្ថែមពិសេសពីលោកគ្រូ អ្នកគ្រូ', en: 'Custom Teacher Directives' },
  'ai_generating_msg': { kh: 'AI កំពុងបង្កើតសំណួរតាមកម្មវិធីសិក្សាក្រសួង MoEYS', en: 'AI is generating questions according to the MoEYS curriculum' },
  'create_questions_ai_now': { kh: 'បង្កើតសំណួរ AI ស្របតាម MoEYS ឥឡូវនេះ', en: 'Generate AI Questions according to MoEYS Now' },
  'ai_system_notes_msg': { kh: 'ប្រព័ន្ធ AI ដំណើរការស្របតាមសៀវភៅសិក្សាគោល និងកម្រិតគរុកោសល្យ Bloom\'s Taxonomy របស់ក្រសួងអប់រំ យុវជន និងកីឡា', en: 'AI System operates in accordance with the MoEYS textbooks and Bloom\'s Taxonomy pedagogical levels' },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('edu_lang') as Language) || 'kh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('edu_lang', lang);
  };

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
