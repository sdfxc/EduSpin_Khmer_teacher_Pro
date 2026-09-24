import { Notebook, NotebookPage } from './types';

const STORAGE_KEY = 'khmer_smart_notes_notebooks_v1';
const ACTIVE_NOTEBOOK_KEY = 'khmer_smart_notes_active_id_v1';

// Initial physics sample notebook matching user's image 2 with clean equations
export function createDefaultNotebook(): Notebook {
  const page1: NotebookPage = {
    id: `page-${Date.now()}-1`,
    title: 'រូបវិទ្យាថ្នាក់ទី១២ - សៀគ្វីចរន្តឆ្លាស់ RLC',
    template: 'ruled',
    backgroundColor: '#ffffff',
    strokes: [],
    shapes: [
      {
        id: `shape-axes-1`,
        type: 'axes',
        x1: 180,
        y1: 520,
        x2: 480,
        y2: 320,
        strokeColor: '#0284c7',
        strokeWidth: 2.5
      },
      {
        id: `shape-vec-imr`,
        type: 'arrow',
        x1: 180,
        y1: 520,
        x2: 360,
        y2: 520,
        strokeColor: '#dc2626',
        strokeWidth: 2.5
      },
      {
        id: `shape-vec-imc`,
        type: 'arrow',
        x1: 360,
        y1: 520,
        x2: 360,
        y2: 360,
        strokeColor: '#ea580c',
        strokeWidth: 2.5
      },
      {
        id: `shape-vec-im`,
        type: 'arrow',
        x1: 180,
        y1: 520,
        x2: 360,
        y2: 360,
        strokeColor: '#2563eb',
        strokeWidth: 3
      }
    ],
    texts: [
      {
        id: `txt-1`,
        x: 60,
        y: 60,
        width: 600,
        height: 40,
        text: '— ដំណាក់កាលកាប៉ាស៊ីទ័រ (Capacitor):',
        fontSize: 22,
        fontFamily: 'Kantumruy Pro, sans-serif',
        color: '#1e3a8a',
        isBold: true,
        isItalic: false,
        isUnderline: false,
        align: 'left'
      },
      {
        id: `txt-2`,
        x: 80,
        y: 110,
        width: 500,
        height: 35,
        text: 'ចរន្ត i_C លឿនជាងតង់ស្យុង u នូវមុំ ដំណាក់ φ = π/2',
        fontSize: 18,
        fontFamily: 'Kantumruy Pro, sans-serif',
        color: '#0f172a',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        align: 'left'
      },
      {
        id: `txt-3`,
        x: 80,
        y: 310,
        width: 300,
        height: 35,
        text: 'សំនង់ ហ្វ្រេណែល (Fresnel Diagram):',
        fontSize: 19,
        fontFamily: 'Kantumruy Pro, sans-serif',
        color: '#7c3aed',
        isBold: true,
        isItalic: false,
        isUnderline: false,
        align: 'left'
      }
    ],
    images: [],
    equations: [
      {
        id: `eq-1`,
        x: 80,
        y: 155,
        latex: 'i_C = I_{mC} \\sin\\left(\\omega t + \\frac{\\pi}{2}\\right)',
        color: '#1d4ed8',
        fontSize: 22
      },
      {
        id: `eq-2`,
        x: 80,
        y: 225,
        latex: 'I_{mC} = \\frac{V_m}{X_C} \\quad , \\quad X_C = \\frac{1}{C\\omega}',
        color: '#047857',
        fontSize: 22
      },
      {
        id: `eq-3`,
        x: 80,
        y: 620,
        latex: 'I_m^2 = I_{mR}^2 + (I_{mC} - I_{mL})^2 \\implies I_m = \\sqrt{I_{mR}^2 + (I_{mC} - I_{mL})^2}',
        color: '#b91c1c',
        fontSize: 23
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const page2: NotebookPage = {
    id: `page-${Date.now()}-2`,
    title: 'ទំព័រទី២ - លំហាត់អនុវត្តន៍',
    template: 'graph',
    backgroundColor: '#ffffff',
    strokes: [],
    shapes: [],
    texts: [
      {
        id: `txt-p2-1`,
        x: 60,
        y: 60,
        width: 500,
        height: 40,
        text: '📝 លំហាត់គំរូ ៖ គណនាចរន្តប្រសិទ្ធ I_eff',
        fontSize: 20,
        fontFamily: 'Kantumruy Pro, sans-serif',
        color: '#1e293b',
        isBold: true,
        isItalic: false,
        isUnderline: false,
        align: 'left'
      }
    ],
    images: [],
    equations: [
      {
        id: `eq-p2-1`,
        x: 80,
        y: 120,
        latex: 'I_{eff} = \\frac{I_m}{\\sqrt{2}} \\quad , \\quad U_{eff} = \\frac{U_m}{\\sqrt{2}}',
        color: '#3b82f6',
        fontSize: 22
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return {
    id: `nb-${Date.now()}`,
    title: 'វិញ្ញាសារូបវិទ្យាថ្នាក់ទី១២ (GoodNotes Mode)',
    subject: 'រូបវិទ្យា',
    coverColor: '#4f46e5',
    coverIcon: '⚡',
    pages: [page1, page2],
    activePageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function loadNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load notebooks:', e);
  }

  // If no notebooks found, create default physics notebook
  const defaultNb = createDefaultNotebook();
  saveNotebooks([defaultNb]);
  return [defaultNb];
}

export function saveNotebooks(notebooks: Notebook[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks));
  } catch (e) {
    console.error('Failed to save notebooks:', e);
  }
}

export function loadActiveNotebookId(): string {
  return localStorage.getItem(ACTIVE_NOTEBOOK_KEY) || '';
}

export function saveActiveNotebookId(id: string): void {
  localStorage.setItem(ACTIVE_NOTEBOOK_KEY, id);
}
