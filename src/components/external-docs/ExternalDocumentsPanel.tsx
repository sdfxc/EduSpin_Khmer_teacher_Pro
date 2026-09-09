import React, { useState, useEffect } from 'react';
import {
  FileText,
  Presentation,
  UploadCloud,
  FolderSync,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalPdfDoc, ExternalPowerPointDoc } from '../../types/externalDocs';
import PdfManager from './PdfManager';
import PowerPointManager from './PowerPointManager';
import { db, safeGetDoc, safeSetDoc } from '../../lib/firebase';
import { saveFileToStorage } from '../../lib/fileStorage';
import { doc } from 'firebase/firestore';
import { TeacherAccount } from '../../types';

interface ExternalDocumentsPanelProps {
  key?: React.Key;
  activeClassId: string;
  activeClassName: string;
  isDarkMode?: boolean;
  teacher?: TeacherAccount | null;
}

// Sample preloaded PDF documents
const INITIAL_PDF_DOCS: ExternalPdfDoc[] = [
  {
    id: 'pdf-sample-1',
    title: 'សៀវភៅពុម្ពរូបវិទ្យា ថ្នាក់ទី៩ ក្រសួងអប់រំ យុវជន និងកីឡា',
    description: 'សៀវភៅពុម្ពស្តង់ដារក្រសួងសម្រាប់បង្រៀន និងរៀនមុខវិជ្ជារូបវិទ្យាកម្រិតមធ្យមសិក្សាបឋមភូមិ។',
    subject: 'រូបវិទ្យា',
    grade: 'ថ្នាក់ទី៩',
    fileSize: '4.8 MB',
    fileName: 'Physics_Grade9_MoEYS.pdf',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    category: 'curriculum',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'pdf-sample-2',
    title: 'បណ្តុំវិញ្ញាសាប្រឡងឌីប្លូមចាស់ៗ (គណិតវិទ្យា និងរូបវិទ្យា ២០២០-២០២៤)',
    description: 'វិញ្ញាសាប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិផ្លូវការ ភ្ជាប់ជាមួយគន្លឹះដោះស្រាយ និងកម្រិតពិន្ទុ។',
    subject: 'គណិតវិទ្យា',
    grade: 'ថ្នាក់ទី៩',
    fileSize: '3.2 MB',
    fileName: 'Diploma_Past_Exams_Math_Physics.pdf',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    category: 'exam_past',
    createdAt: Date.now() - 86400000 * 5,
  }
];

// Sample preloaded PowerPoint presentations with rich slides
const INITIAL_POWERPOINT_DOCS: ExternalPowerPointDoc[] = [
  {
    id: 'pptx-sample-1',
    title: 'ស្លាយបទបង្ហាញ៖ រូបវិទ្យា - ច្បាប់អគ្គិសនី និងសៀគ្វីអគ្គិសនី',
    description: 'បទបង្ហាញបែប Visual PowerPoint ជាមួយរូបមន្តអគ្គិសនី ច្បាប់អូម និងគំនូសបំព្រួញសៀគ្វី។',
    subject: 'រូបវិទ្យា',
    grade: 'ថ្នាក់ទី៩',
    slideCount: 4,
    fileName: 'Physics_Electricity_Ohm_Law.pptx',
    createdAt: Date.now() - 86400000 * 2,
    slides: [
      {
        id: 's1',
        slideNumber: 1,
        title: 'ច្បាប់អគ្គិសនី និងសៀគ្វីអគ្គិសនី',
        subtitle: 'ជំពូកទី ៣៖ អគ្គិសនី និងដែនម៉ាញ៉េទិច • ថ្នាក់ទី៩',
        bulletPoints: [
          'ស្វែងយល់ពីអាំងតង់ស៊ីតេ និងតង់ស្យុងអគ្គិសនី',
          'ពិសោធន៍ និងផ្ទៀងផ្ទាត់ច្បាប់អូម (Ohm\'s Law)',
          'គណនាតម្លៃរេស៊ីស្តង់ និងអនុវត្តលំហាត់ជាក់ស្តែង'
        ],
        images: [],
        notes: 'គ្រូណែនាំសិស្សឱ្យយកចិត្តទុកដាក់លើនិយមន័យច្បាប់អូម និងការប្រើប្រាស់ឧបករណ៍វាស់ Amperemeter/Voltmeter'
      },
      {
        id: 's2',
        slideNumber: 2,
        title: '១. ច្បាប់អូម (Ohm\'s Law)',
        subtitle: 'រូបមន្តគ្រឹះនៃចរន្តអគ្គិសនី',
        bulletPoints: [
          'អាំងតង់ស៊ីតេចរន្ត I សមាមាត្រនឹងតង់ស្យុង U',
          'ច្រាសសមាមាត្រនឹងរេស៊ីស្តង់ R នៃអង្គធាតុចម្លង',
          'រូបមន្ត៖ U = R × I',
          'ខ្នាតអន្តរជាតិ៖ U គិតជា វ៉ុល (V), I គិតជា អំពែ (A), R គិតជា អូម (Ω)'
        ],
        images: [],
        notes: 'បង្ហាញត្រីកោណរូបមន្ត U / (R * I) ដល់សិស្ស ដើម្បីងាយស្រួលទាញរូបមន្តរក I ឬ R'
      },
      {
        id: 's3',
        slideNumber: 3,
        title: '២. ការតរេស៊ីស្តង់ជាស៊េរី និងជាខ្នែង',
        subtitle: 'ភាពខុសគ្នានៃការតសៀគ្វីទាំងពីរប្រភេទ',
        bulletPoints: [
          'តជាស៊េរី៖ I ស្មើគ្នាគ្រប់កន្លែង (I = I1 = I2), U = U1 + U2, Req = R1 + R2',
          'តជាខ្នែង៖ U ស្មើគ្នា (U = U1 = U2), I = I1 + I2, 1/Req = 1/R1 + 1/R2',
          'ការអនុវត្តជាក់ស្តែងក្នុងផ្ទះ៖ ប្រើប្រាស់ការតជាខ្នែងដើម្បីសុវត្ថិភាព'
        ],
        images: [],
        notes: 'សួរនាំសិស្សអំពីមូលហេតុដែលឧបករណ៍អគ្គិសនីក្នុងគេហដ្ឋានត្រូវតជាខ្នែង'
      },
      {
        id: 's4',
        slideNumber: 4,
        title: '៣. លំហាត់អនុវត្តន៍គំរូ',
        subtitle: 'អនុវត្តគណនាចរន្ត និងតង់ស្យុងក្នុងសៀគ្វី',
        bulletPoints: [
          'ប្រធាន៖ រេស៊ីស្តរមួយមាន R = 10 Ω ភ្ជាប់ទៅតង់ស្យុង U = 12 V',
          'សំណួរ៖ ចូរគណនាអាំងតង់ស៊ីតេចរន្ត I ដែលឆ្លងកាត់រេស៊ីស្តរ?',
          'ចម្លើយ៖ តាមរូបមន្ត I = U / R = 12 / 10 = 1.2 A'
        ],
        images: [],
        notes: 'ឱ្យសិស្សឡើងធ្វើលើក្តារខៀន និងបូកពិន្ទុលើកទឹកចិត្ត'
      }
    ]
  },
  {
    id: 'pptx-sample-2',
    title: 'ស្លាយបទបង្ហាញ៖ គណិតវិទ្យា - សមីការដឺក្រេទី២ មានមួយអញ្ញាត',
    description: 'បទបង្ហាញគណិតវិទ្យា វិធីដោះស្រាយសមីការដោយប្រើរូបមន្តឌីសគ្រីមីណង់ Δ (Delta)។',
    subject: 'គណិតវិទ្យា',
    grade: 'ថ្នាក់ទី៩',
    slideCount: 3,
    fileName: 'Math_Quadratic_Equations.pptx',
    createdAt: Date.now() - 86400000 * 4,
    slides: [
      {
        id: 'm1',
        slideNumber: 1,
        title: 'សមីការដឺក្រេទី២ មានមួយអញ្ញាត',
        subtitle: 'ទម្រង់ទូទៅ ax² + bx + c = 0 (a ≠ 0)',
        bulletPoints: [
          'ស្វែងយល់ពីមេគុណ a, b, c',
          'វិធីសាស្រ្តគណនាឌីសគ្រីមីណង់ ដេលតា (Δ = b² - 4ac)',
          'កំណត់ចំនួនឫសនៃសមីការតាមតម្លៃនៃ Δ'
        ],
        images: []
      },
      {
        id: 'm2',
        slideNumber: 2,
        title: 'លក្ខខណ្ឌនៃឌីសគ្រីមីណង់ Δ',
        bulletPoints: [
          'បើ Δ > 0 ៖ សមីការមានឫសពីរផ្សេងគ្នា x1 = (-b - √Δ)/2a, x2 = (-b + √Δ)/2a',
          'បើ Δ = 0 ៖ សមីការមានឫសឌុប x1 = x2 = -b / 2a',
          'បើ Δ < 0 ៖ សមីការគ្មានឫសក្នុងសំណុំចំនួនពិត R ឡើយ'
        ],
        images: []
      },
      {
        id: 'm3',
        slideNumber: 3,
        title: 'ឧទាហរណ៍ជាក់ស្តែង',
        bulletPoints: [
          'ដោះស្រាយសមីការ៖ x² - 5x + 6 = 0',
          'a = 1, b = -5, c = 6',
          'Δ = (-5)² - 4(1)(6) = 25 - 24 = 1 > 0',
          'ឫស៖ x1 = (5 - 1)/2 = 2,  x2 = (5 + 1)/2 = 3'
        ],
        images: []
      }
    ]
  }
];

export default function ExternalDocumentsPanel({
  activeClassId,
  activeClassName,
  isDarkMode = false,
  teacher,
}: ExternalDocumentsPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pdf' | 'powerpoint'>('pdf');
  const sanitizePdfDocs = (items: ExternalPdfDoc[]): ExternalPdfDoc[] => {
    return items.map(d => {
      const storageKey = d.fileStorageId || d.id;
      if (d.fileUrl && d.fileUrl.startsWith('data:')) {
        saveFileToStorage(storageKey, d.fileUrl).catch(() => {});
        return {
          ...d,
          fileStorageId: storageKey,
          fileUrl: '',
        };
      }
      return {
        ...d,
        fileStorageId: storageKey,
        fileUrl: d.fileUrl || '',
      };
    });
  };

  const sanitizePptxDocs = (items: ExternalPowerPointDoc[]): ExternalPowerPointDoc[] => {
    return items.map(d => {
      const storageKey = d.fileStorageId || d.id;
      if (d.fileUrl && d.fileUrl.startsWith('data:')) {
        saveFileToStorage(storageKey, d.fileUrl).catch(() => {});
      }
      return {
        ...d,
        fileStorageId: storageKey,
        fileUrl: d.fileUrl && d.fileUrl.startsWith('data:') ? '' : d.fileUrl,
        slides: (d.slides || []).map(s => ({
          ...s,
          images: (s.images || []).filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
        }))
      };
    });
  };

  const teacherId = teacher?.id || 'default_teacher';
  const pdfStorageKey = `ext_pdf_${teacherId}_${activeClassId || 'general'}`;
  const pptxStorageKey = `ext_pptx_${teacherId}_${activeClassId || 'general'}`;

  const [pdfDocs, setPdfDocs] = useState<ExternalPdfDoc[]>(() => {
    try {
      const saved = localStorage.getItem(pdfStorageKey) || localStorage.getItem(`ext_pdf_${activeClassId}`);
      return saved ? sanitizePdfDocs(JSON.parse(saved)) : INITIAL_PDF_DOCS;
    } catch {
      return INITIAL_PDF_DOCS;
    }
  });

  const [pptxDocs, setPptxDocs] = useState<ExternalPowerPointDoc[]>(() => {
    try {
      const saved = localStorage.getItem(pptxStorageKey) || localStorage.getItem(`ext_pptx_${activeClassId}`);
      return saved ? sanitizePptxDocs(JSON.parse(saved)) : INITIAL_POWERPOINT_DOCS;
    } catch {
      return INITIAL_POWERPOINT_DOCS;
    }
  });

  // Pull documents from LocalStorage and Firestore on mount or class change
  useEffect(() => {
    let isSubscribed = true;

    // 1. Immediately read local storage for this specific class
    try {
      const savedPdf = localStorage.getItem(pdfStorageKey) || localStorage.getItem(`ext_pdf_${activeClassId}`);
      const savedPptx = localStorage.getItem(pptxStorageKey) || localStorage.getItem(`ext_pptx_${activeClassId}`);
      if (isSubscribed) {
        setPdfDocs(savedPdf ? sanitizePdfDocs(JSON.parse(savedPdf)) : INITIAL_PDF_DOCS);
        setPptxDocs(savedPptx ? sanitizePptxDocs(JSON.parse(savedPptx)) : INITIAL_POWERPOINT_DOCS);
      }
    } catch {}

    if (!db || !activeClassId) return;

    // 2. Fetch from cloud
    const fetchCloudDocs = async () => {
      try {
        // Try teacher-scoped class path first, then fallback
        let pdfSnap: any = null;
        if (teacher?.id) {
          pdfSnap = await safeGetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'externalDocs', 'pdf'));
        }
        if (!pdfSnap || !pdfSnap.exists || !pdfSnap.exists()) {
          pdfSnap = await safeGetDoc(doc(db, 'external_docs', `pdf_${activeClassId}`));
        }

        if (isSubscribed && pdfSnap && pdfSnap.exists && pdfSnap.exists()) {
          const data = pdfSnap.data();
          if (data && Array.isArray(data.docs) && data.docs.length > 0) {
            const sanitized = sanitizePdfDocs(data.docs);
            setPdfDocs(sanitized);
            try {
              localStorage.setItem(pdfStorageKey, JSON.stringify(sanitized));
            } catch {}
          }
        }

        let pptxSnap: any = null;
        if (teacher?.id) {
          pptxSnap = await safeGetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'externalDocs', 'pptx'));
        }
        if (!pptxSnap || !pptxSnap.exists || !pptxSnap.exists()) {
          pptxSnap = await safeGetDoc(doc(db, 'external_docs', `pptx_${activeClassId}`));
        }

        if (isSubscribed && pptxSnap && pptxSnap.exists && pptxSnap.exists()) {
          const data = pptxSnap.data();
          if (data && Array.isArray(data.docs) && data.docs.length > 0) {
            const sanitized = sanitizePptxDocs(data.docs);
            setPptxDocs(sanitized);
            try {
              localStorage.setItem(pptxStorageKey, JSON.stringify(sanitized));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Notice: External docs cloud fetch deferred:', err);
      }
    };

    fetchCloudDocs();

    return () => {
      isSubscribed = false;
    };
  }, [activeClassId, teacher?.id, pdfStorageKey, pptxStorageKey]);

  // Sync to Firestore and LocalStorage
  const handleSavePdfDocs = (docs: ExternalPdfDoc[]) => {
    const sanitized = sanitizePdfDocs(docs);
    setPdfDocs(sanitized);
    try {
      localStorage.setItem(pdfStorageKey, JSON.stringify(sanitized));
      localStorage.setItem(`ext_pdf_${activeClassId}`, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    if (db && activeClassId) {
      if (teacher?.id) {
        safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'externalDocs', 'pdf'), {
          classId: activeClassId,
          docs: sanitized,
          updatedAt: Date.now(),
        }).catch(() => {});
      }
      safeSetDoc(doc(db, 'external_docs', `pdf_${activeClassId}`), {
        classId: activeClassId,
        docs: sanitized,
        updatedAt: Date.now(),
      }).catch(err => console.warn('Firestore sync failed:', err));
    }
  };

  const handleSavePptxDocs = (docs: ExternalPowerPointDoc[]) => {
    const sanitized = sanitizePptxDocs(docs);
    setPptxDocs(sanitized);
    try {
      localStorage.setItem(pptxStorageKey, JSON.stringify(sanitized));
      localStorage.setItem(`ext_pptx_${activeClassId}`, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    if (db && activeClassId) {
      if (teacher?.id) {
        safeSetDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'externalDocs', 'pptx'), {
          classId: activeClassId,
          docs: sanitized,
          updatedAt: Date.now(),
        }).catch(() => {});
      }
      safeSetDoc(doc(db, 'external_docs', `pptx_${activeClassId}`), {
        classId: activeClassId,
        docs: sanitized,
        updatedAt: Date.now(),
      }).catch(err => console.warn('Firestore sync failed:', err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs: PDF & PowerPoint */}
      <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
        isDarkMode ? 'bg-[#111827] border-indigo-950/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {/* Sub-tab 1: PDF */}
          <button
            type="button"
            onClick={() => setActiveSubTab('pdf')}
            className={`flex items-center gap-2.5 px-4.5 py-2 rounded-xl font-bold font-sans text-xs sm:text-sm transition-all cursor-pointer border-none shrink-0 ${
              activeSubTab === 'pdf'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ឯកសារ PDF</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeSubTab === 'pdf' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {pdfDocs.length}
            </span>
          </button>

          {/* Sub-tab 2: PowerPoint */}
          <button
            type="button"
            onClick={() => setActiveSubTab('powerpoint')}
            className={`flex items-center gap-2.5 px-4.5 py-2 rounded-xl font-bold font-sans text-xs sm:text-sm transition-all cursor-pointer border-none shrink-0 ${
              activeSubTab === 'powerpoint'
                ? 'bg-[#d04423] text-white shadow-md shadow-orange-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>ស្លាយ PowerPoint</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeSubTab === 'powerpoint' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {pptxDocs.length}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pr-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>គាំទ្រ Drag & Drop, Upload និង Visual Viewer</span>
        </div>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'pdf' ? (
          <motion.div
            key="pdf-panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <PdfManager
              docs={pdfDocs}
              onSaveDocs={handleSavePdfDocs}
              isDarkMode={isDarkMode}
              activeClassName={activeClassName}
            />
          </motion.div>
        ) : (
          <motion.div
            key="pptx-panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <PowerPointManager
              docs={pptxDocs}
              onSaveDocs={handleSavePptxDocs}
              isDarkMode={isDarkMode}
              activeClassName={activeClassName}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
