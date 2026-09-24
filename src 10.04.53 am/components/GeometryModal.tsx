import React, { useState } from 'react';
import { Compass, Square, Circle, Triangle, Sparkles, Copy, Check, RefreshCw, Layers, Sliders, ChevronRight, X } from 'lucide-react';

interface GeometryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFigure: (svgDataUrl: string, title: string) => void;
  isDarkMode?: boolean;
}

export function GeometryModal({ isOpen, onClose, onInsertFigure, isDarkMode = false }: GeometryModalProps) {
  if (!isOpen) return null;

  const [selectedGrade, setSelectedGrade] = useState<'primary' | 'middle' | 'high' | 'university'>('high');
  const [selectedTopic, setSelectedTopic] = useState<string>('triangle');
  const [copied, setCopied] = useState(false);

  // Parameters for geometric shapes
  const [paramA, setParamA] = useState<number>(60); // Side a / radius
  const [paramB, setParamB] = useState<number>(80); // Side b
  const [paramC, setParamC] = useState<number>(100); // Side c

  const topics = {
    primary: [
      { id: 'square', name: 'ការ៉េ និងចតុកោណកែង (Square & Rectangle)' },
      { id: 'circle_basic', name: 'រង្វង់មូល និងកាំ (Circle & Radius)' },
      { id: 'triangle_basic', name: 'ត្រីកោណ និងមុំ (Triangles & Angles)' }
    ],
    middle: [
      { id: 'pythagoras', name: 'ទ្រឹស្តីបទពីតាករ (Pythagorean Theorem)' },
      { id: 'circle_angles', name: 'មុំក្នុងរង្វង់ (Circle Angles & Chords)' },
      { id: 'polygon', name: 'ពហុកោណ منتظم (Regular Polygons)' }
    ],
    high: [
      { id: 'triangle', name: 'ត្រីកោណទូទៅ និងត្រីកោណកែង (General & Right Triangles)' },
      { id: 'analytic_line', name: 'ធរណីមាត្រអានុគមន៍៖ បន្ទាត់ និងរង្វង់ (Lines & Circles in Plane)' },
      { id: 'conics', name: 'កោណគោល៖ រីពែល និងប៉ារ៉ាបូល (Parabola, Ellipse, Hyperbola)' },
      { id: 'solid_geometry', name: 'ធរណីមាត្រលំហ៖ ពីរ៉ាមីត និងស៊ីឡាំង (3D Solids: Pyramids & Cones)' }
    ],
    university: [
      { id: 'vectors_3d', name: 'វ៉ិចទ័រក្នុងលំហ និងប្លង់ (3D Vectors & Planes)' },
      { id: 'transformations', name: 'បម្លែងធរណីមាត្រ និងម៉ាទ្រីស (Geometric Transformations)' }
    ]
  };

  // Generate SVG String for Preview & Export
  const renderSvgString = () => {
    if (selectedTopic === 'pythagoras' || selectedTopic === 'triangle') {
      return `<svg width="220" height="180" viewBox="0 0 220 180" xmlns="http://www.w3.org/2000/svg">
        <polygon points="30,150 190,150 30,30" fill="none" stroke="#2563eb" stroke-width="3" />
        <rect x="30" y="130" width="20" height="20" fill="none" stroke="#dc2626" stroke-width="2" />
        <text x="100" y="168" font-size="14" font-weight="bold" fill="#1e293b">a = ${paramA}</text>
        <text x="10" y="95" font-size="14" font-weight="bold" fill="#1e293b">b = ${paramB}</text>
        <text x="120" y="85" font-size="14" font-weight="bold" fill="#1e293b">c = ${paramC}</text>
        <circle cx="30" cy="150" r="4" fill="#0f172a"/>
        <circle cx="190" cy="150" r="4" fill="#0f172a"/>
        <circle cx="30" cy="30" r="4" fill="#0f172a"/>
        <text x="20" y="165" font-size="12" font-weight="bold" fill="#64748b">A</text>
        <text x="195" y="165" font-size="12" font-weight="bold" fill="#64748b">B</text>
        <text x="15" y="30" font-size="12" font-weight="bold" fill="#64748b">C</text>
      </svg>`;
    } else if (selectedTopic === 'circle_basic' || selectedTopic === 'circle_angles') {
      return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="70" fill="none" stroke="#2563eb" stroke-width="3" />
        <circle cx="100" cy="100" r="4" fill="#dc2626" />
        <line x1="100" y1="100" x2="170" y2="100" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="4" />
        <text x="130" y="90" font-size="14" font-weight="bold" fill="#dc2626">R = ${paramA}</text>
        <text x="95" y="120" font-size="12" font-weight="bold" fill="#64748b">O</text>
      </svg>`;
    } else if (selectedTopic === 'solid_geometry') {
      return `<svg width="200" height="190" viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg">
        <polygon points="100,20 30,150 170,150" fill="none" stroke="#2563eb" stroke-width="3" />
        <line x1="100" y1="20" x2="100" y2="150" stroke="#dc2626" stroke-width="2" stroke-dasharray="4" />
        <text x="90" y="175" font-size="14" font-weight="bold" fill="#1e293b">កំពស់ h = ${paramA}</text>
      </svg>`;
    } else {
      return `<svg width="200" height="180" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="40" width="140" height="100" rx="6" fill="none" stroke="#2563eb" stroke-width="3" />
        <text x="50" y="98" font-size="13" font-weight="bold" fill="#1e293b">ទទឹង=${paramA}, បណ្តោយ=${paramB}</text>
      </svg>`;
    }
  };

  const handleInsert = () => {
    const svgCode = renderSvgString();
    const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    onInsertFigure(url, `ធរណីមាត្រ: ${selectedTopic}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className={`w-full max-w-4xl border rounded-3xl p-6 shadow-2xl relative ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-6 border-b border-slate-200 dark:border-slate-800 pr-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">ស្ទូឌីយ៉ូធរណីមាត្រ និងគំនូសរូប (Geometry Diagram Studio)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">គាំទ្រគ្រប់មេរៀនធរណីមាត្រពីថ្នាក់ទី១ ដល់ទី១២ និងសកលវិទ្យាល័យ សម្រាប់ដាក់បញ្ចូលក្នុងលំហាត់ សំណួរ</p>
          </div>
        </div>

        {/* Grade Level Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold my-4">
          {[
            { id: 'primary', label: 'បឋម (ថ្នាក់ទី ១-៦)' },
            { id: 'middle', label: 'អនុវិទ្យាល័យ (៧-៩)' },
            { id: 'high', label: 'វិទ្យាល័យ (១០-១២)' },
            { id: 'university', label: 'កម្រិតសកល' }
          ].map(g => (
            <button
              key={g.id}
              onClick={() => {
                setSelectedGrade(g.id as any);
                setSelectedTopic((topics as any)[g.id][0].id);
              }}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                selectedGrade === g.id 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left: Topic Selector */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>ជ្រើសរើសប្រធានបទធរណីមាត្រ</span>
            </label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {(topics as any)[selectedGrade].map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selectedTopic === t.id
                      ? isDarkMode 
                        ? 'bg-indigo-950/60 border-indigo-700 text-indigo-300 shadow-xs' 
                        : 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                      : isDarkMode 
                        ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{t.name}</span>
                  <ChevronRight className={`w-4 h-4 ${selectedTopic === t.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Live Preview & Parameters */}
          <div className="lg:col-span-7 space-y-4">
            <div className={`border rounded-3xl p-5 flex flex-col items-center justify-center min-h-[200px] relative shadow-inner ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="absolute top-3 left-4 text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                <span>រូបភាពຕົວសរសេរ SVG ជាក់ស្តែង</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 my-2" dangerouslySetInnerHTML={{ __html: renderSvgString() }} />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>កែសម្រួលរង្វាស់ (Parameters)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-600 dark:text-slate-300">តម្លៃ a / កាំ</span>
                    <span className="text-indigo-600 font-black">{paramA}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={paramA}
                    onChange={(e) => setParamA(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-600 dark:text-slate-300">តម្លៃ b / កម្ពស់</span>
                    <span className="text-indigo-600 font-black">{paramB}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={paramB}
                    onChange={(e) => setParamB(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-600 dark:text-slate-300">តម្លៃ c / មុំ</span>
                    <span className="text-indigo-600 font-black">{paramC}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={paramC}
                    onChange={(e) => setParamC(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                បោះបង់
              </button>

              <button
                type="button"
                onClick={handleInsert}
                className="py-2.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>បញ្ចូលរូបធរណីមាត្រនេះក្នុងលំហាត់ / សំណួរ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeometryModal;
