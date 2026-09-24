export type ToolType = 
  | 'pen' 
  | 'pencil' 
  | 'highlighter' 
  | 'eraser' 
  | 'lasso' 
  | 'text' 
  | 'image' 
  | 'shape' 
  | 'equation' 
  | 'laser'
  | 'hand'; // Pan canvas

export type PenType = 'ballpoint' | 'fountain' | 'brush';

export type EraserMode = 'stroke' | 'partial' | 'object' | 'clear';

export type ShapeType = 'line' | 'arrow' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'axes';

export type PaperTemplate = 
  | 'blank' 
  | 'ruled' 
  | 'narrow-ruled' 
  | 'graph' 
  | 'dot-grid' 
  | 'cornell' 
  | 'yellow-pad' 
  | 'chalkboard'
  | 'physics-axis';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'pencil' | 'highlighter';
  penType?: PenType;
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  createdAt: number;
}

export interface ShapeElement {
  id: string;
  type: ShapeType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  isDashed?: boolean;
}

export interface TextElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  align: 'left' | 'center' | 'right';
}

export interface ImageElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  rotation?: number; // degrees
}

export interface EquationElement {
  id: string;
  x: number;
  y: number;
  latex: string;
  color: string;
  fontSize: number;
  scale?: number;
}

export interface NotebookPage {
  id: string;
  title: string;
  template: PaperTemplate;
  backgroundColor?: string;
  strokes: Stroke[];
  shapes: ShapeElement[];
  texts: TextElement[];
  images: ImageElement[];
  equations: EquationElement[];
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  subject?: string;
  coverColor: string;
  coverIcon?: string;
  pages: NotebookPage[];
  activePageIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryAction {
  pageId: string;
  strokes: Stroke[];
  shapes: ShapeElement[];
  texts: TextElement[];
  images: ImageElement[];
  equations: EquationElement[];
}

export interface LassoSelection {
  strokeIds: string[];
  shapeIds: string[];
  textIds: string[];
  imageIds: string[];
  equationIds: string[];
  bounds: { x: number; y: number; width: number; height: number };
}
