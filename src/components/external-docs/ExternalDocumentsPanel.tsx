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
import { db, safeGetDoc, safeSetDoc, safeOnSnapshot } from '../../lib/firebase';
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

// Preloaded documents (empty by default)
const INITIAL_PDF_DOCS: ExternalPdfDoc[] = [];
const INITIAL_POWERPOINT_DOCS: ExternalPowerPointDoc[] = [];

const DEMO_EXT_DOC_IDS = new Set([
  'pdf-sample-1',
  'pdf-sample-2',
  'pptx-sample-1',
  'pptx-sample-2'
]);

export default function ExternalDocumentsPanel({
  activeClassId,
  activeClassName,
  isDarkMode = false,
  teacher,
}: ExternalDocumentsPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pdf' | 'powerpoint'>('pdf');
  const sanitizePdfDocs = (items: ExternalPdfDoc[]): ExternalPdfDoc[] => {
    return items
      .filter(d => !DEMO_EXT_DOC_IDS.has(d.id))
      .map(d => {
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
    return items
      .filter(d => !DEMO_EXT_DOC_IDS.has(d.id))
      .map(d => {
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
        const cleanPdf = savedPdf ? sanitizePdfDocs(JSON.parse(savedPdf)) : INITIAL_PDF_DOCS;
        const cleanPptx = savedPptx ? sanitizePptxDocs(JSON.parse(savedPptx)) : INITIAL_POWERPOINT_DOCS;
        setPdfDocs(cleanPdf);
        setPptxDocs(cleanPptx);
        localStorage.setItem(pdfStorageKey, JSON.stringify(cleanPdf));
        localStorage.setItem(pptxStorageKey, JSON.stringify(cleanPptx));
      }
    } catch {}

    if (!db || !activeClassId) return;

    // 2. Real-Time Cloud Synchronization across devices
    let unsubPdf: (() => void) | null = null;
    let unsubPptx: (() => void) | null = null;

    try {
      const pdfDocRef = teacher?.id 
        ? doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'externalDocs', 'pdf')
        : doc(db, 'external_docs', `pdf_${activeClassId}`);

      unsubPdf = safeOnSnapshot(pdfDocRef, (pdfSnap: any) => {
        if (isSubscribed && pdfSnap && pdfSnap.exists && pdfSnap.exists()) {
          const data = pdfSnap.data();
          if (data && Array.isArray(data.docs)) {
            const sanitized = sanitizePdfDocs(data.docs);
            setPdfDocs(sanitized);
            try {
              localStorage.setItem(pdfStorageKey, JSON.stringify(sanitized));
            } catch {}
          }
        }
      }, (err: any) => {
        console.warn('Notice: External PDF docs sync notice:', err);
      });

      const pptxDocRef = teacher?.id
        ? doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'externalDocs', 'pptx')
        : doc(db, 'external_docs', `pptx_${activeClassId}`);

      unsubPptx = safeOnSnapshot(pptxDocRef, (pptxSnap: any) => {
        if (isSubscribed && pptxSnap && pptxSnap.exists && pptxSnap.exists()) {
          const data = pptxSnap.data();
          if (data && Array.isArray(data.docs)) {
            const sanitized = sanitizePptxDocs(data.docs);
            setPptxDocs(sanitized);
            try {
              localStorage.setItem(pptxStorageKey, JSON.stringify(sanitized));
            } catch {}
          }
        }
      }, (err: any) => {
        console.warn('Notice: External PPTX docs sync notice:', err);
      });
    } catch (err) {
      console.warn('Notice: External docs cloud snapshot setup deferred:', err);
    }

    return () => {
      isSubscribed = false;
      if (typeof unsubPdf === 'function') unsubPdf();
      if (typeof unsubPptx === 'function') unsubPptx();
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
