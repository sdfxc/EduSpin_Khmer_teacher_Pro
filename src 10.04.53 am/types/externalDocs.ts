import { VisualSlide } from '../lib/pptxParser';

export interface ExternalPdfDoc {
  id: string;
  title: string;
  description?: string;
  subject: string;
  grade?: string;
  fileSize?: string;
  pageCount?: number;
  fileUrl?: string; // data URL or web link
  fileStorageId?: string; // id in indexedDB
  fileName: string;
  category?: 'curriculum' | 'exam_past' | 'guideline' | 'other';
  createdAt: number;
}

export interface ExternalPowerPointDoc {
  id: string;
  title: string;
  description?: string;
  subject: string;
  grade?: string;
  slideCount: number;
  slides: VisualSlide[];
  fileUrl?: string; // web embed or download link
  fileStorageId?: string; // id in indexedDB
  fileName: string;
  embedUrl?: string; // Google Slides / OneDrive / Office 365
  theme?: 'classic' | 'navy' | 'emerald' | 'purple' | 'slate';
  createdAt: number;
}
