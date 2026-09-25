import React from 'react';
import { AVAILABLE_FONTS, ExamQuestion, ExamSubject, ExamPaper, stripPrefix } from './ExamsPanel';
import FormulaRenderer from './FormulaRenderer';

interface ExamPaperViewProps {
  exam?: ExamPaper;
  subject?: ExamSubject;
  optionsLayout?: 'inline' | 'stacked';
  optionStyle?: 'khmer' | 'latin';
  highlightKey?: boolean;
  examCenter?: string;
  roomNumber?: string;
  deskNumber?: string;
  studentName?: string;
  gradeNumber?: string;
  examName?: string;
  examSession?: string;
  durationTime?: string;
  totalScore?: string;
  logoText1?: string;
  logoText2?: string;
  customLogo?: string | null;
  imgSrc?: string;
  imageFailed?: boolean;
  onImageError?: () => void;
  headerFont?: string;
  bodyFont?: string;
  headerFontSize?: number;
  bodyFontSize?: number;
  headerLayout?: string;
  customLeftSpan?: number;
  customCenterSpan?: number;
  customRightSpan?: number;
  isPrintMode?: boolean;
}

export const SovannaphumiLogoSVG: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 pointer-events-none mx-auto drop-shadow-sm">
    <circle cx="50" cy="50" r="46" fill="#0284c7" stroke="#1e40af" strokeWidth="3" />
    <circle cx="50" cy="50" r="38" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
    <path d="M 50 18 L 60 38 L 82 38 L 65 52 L 72 74 L 50 60 L 28 74 L 35 52 L 18 38 L 40 38 Z" fill="#f59e0b" opacity="0.9" />
    <circle cx="50" cy="50" r="14" fill="#1e40af" />
    <text x="50" y="54" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">SPS</text>
  </svg>
);

export const CambodianRoyalEmblemSVG: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-16 h-9 mx-auto text-amber-600 dark:text-amber-500 fill-current opacity-90">
    <path d="M60 5 C55 15, 45 20, 30 22 C45 24, 52 30, 50 45 C54 32, 60 30, 60 30 C60 30, 66 32, 70 45 C68 30, 75 24, 90 22 C75 20, 65 15, 60 5 Z" />
    <circle cx="60" cy="22" r="3.5" fill="#f59e0b" />
    <path d="M40 38 C50 35, 70 35, 80 38 C75 44, 45 44, 40 38 Z" fill="#d97706" />
    <path d="M35 48 Q60 55 85 48 Q60 52 35 48 Z" fill="#b45309" />
  </svg>
);

export const ExamPaperView: React.FC<ExamPaperViewProps> = ({
  exam,
  subject,
  optionsLayout = 'inline',
  optionStyle = 'khmer',
  highlightKey = false,
  examCenter = 'សាលារៀនសុវណ្ណភូមិ',
  roomNumber = '..................',
  deskNumber = '..................',
  studentName = '...........................................',
  gradeNumber = '..................',
  examName = 'វិញ្ញាសាប្រឡងប្រចាំខែ',
  examSession = '......../......../........',
  durationTime = '៦០ នាទី',
  totalScore = '១០ ពិន្ទុ',
  logoText1 = 'សាលារៀនសុវណ្ណភូមិ',
  logoText2 = 'ទីតាំងផ្សារដីហុយ',
  customLogo = null,
  imgSrc = '/sovannaphumi.png',
  imageFailed = false,
  onImageError,
  headerFont = 'Moul',
  bodyFont = 'Battambang',
  headerFontSize = 10.5,
  bodyFontSize = 11,
  headerLayout = '5-1-5',
  customLeftSpan = 5,
  customCenterSpan = 2,
  customRightSpan = 5,
  isPrintMode = false
}) => {
  const selectedHeaderFontObj = AVAILABLE_FONTS.find(f => f.id === headerFont) || AVAILABLE_FONTS[0];
  const selectedBodyFontObj = AVAILABLE_FONTS.find(f => f.id === bodyFont) || AVAILABLE_FONTS[0];

  const headerInlineStyle: React.CSSProperties = {
    fontFamily: selectedHeaderFontObj.cssValue,
    fontSize: `${headerFontSize}pt`,
    lineHeight: 1.55
  };

  const bodyInlineStyle: React.CSSProperties = {
    fontFamily: selectedBodyFontObj.cssValue,
    fontSize: `${bodyFontSize}pt`,
    lineHeight: 1.6
  };

  const getOptionPrefix = (index: number) => {
    if (optionStyle === 'khmer') {
      const khmerPrefixes = ['ក', 'ខ', 'គ', 'ឃ', 'ង'];
      return khmerPrefixes[index] || String.fromCharCode(65 + index);
    }
    return String.fromCharCode(65 + index);
  };

  const toKhmerNum = (num: number | string) => {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num).split('').map(char => {
      const digit = parseInt(char, 10);
      return isNaN(digit) ? char : khmerDigits[digit];
    }).join('');
  };

  const getMatchingAnswerForIndex = (q: any, index: number) => {
    if (!q.explanation) {
      if (q.correctIndex === 3) {
        return index === 1 ? 'ខ' : 'ក';
      } else {
        return index === 1 ? 'ក' : 'ខ';
      }
    }
    const explanation = q.explanation.toLowerCase();
    const numKh = index === 1 ? '១' : index === 2 ? '២' : index === 3 ? '៣' : String(index);
    const numEn = String(index);
    const khmerLetters = ['ក', 'ខ', 'គ', 'ឃ'];
    const englishLetters = ['a', 'b', 'c', 'd'];
    const cleanExp = explanation.replace(/\s+/g, '');
    for (let lIdx = 0; lIdx < khmerLetters.length; lIdx++) {
      const khL = khmerLetters[lIdx];
      const enL = englishLetters[lIdx];
      const khRegex = new RegExp(`${numKh}[➔\\-=>:]+${khL}`);
      const khRegexReverse = new RegExp(`${khL}[➔\\-=>:]+${numKh}`);
      const enRegex = new RegExp(`${numEn}[➔\\-=>:]+${enL}`);
      if (khRegex.test(cleanExp) || khRegexReverse.test(cleanExp) || enRegex.test(cleanExp)) {
        return khL;
      }
    }
    return khmerLetters[index - 1] || 'ក';
  };

  const questions = subject?.questions || [];
  const grouped = {
    choice: [] as ExamQuestion[],
    matching: [] as ExamQuestion[],
    fill_blank: [] as ExamQuestion[],
    theory: [] as ExamQuestion[],
    exercise: [] as ExamQuestion[],
  };

  questions.forEach(q => {
    const cat = q.category || 'choice';
    if (grouped[cat]) {
      grouped[cat].push(q);
    } else {
      grouped['choice'].push(q);
    }
  });

  const showSections = 
    grouped.matching.length > 0 || 
    grouped.fill_blank.length > 0 || 
    grouped.theory.length > 0 || 
    grouped.exercise.length > 0;

  let globalIdx = 0;

  return (
    <div className={`exam-paper-preview bg-white text-black p-0 font-sans w-full max-w-4xl mx-auto text-[11px] sm:text-[12px] leading-relaxed select-text ${isPrintMode ? 'printable-sheet' : ''}`}>
      {/* 1. Header Section: Ministry & Kingdom Layout */}
      <div className="grid grid-cols-12 gap-2 w-full text-black items-start pb-2 border-b-2 border-transparent">
        {/* Left Column: Ministry & School Info */}
        <div className="col-span-12 sm:col-span-4 flex flex-col justify-start text-left gap-1" style={headerInlineStyle}>
          <div className="font-bold text-slate-900 leading-snug">ក្រសួងអប់រំ យុវជន និងកីឡា</div>
          <div className="font-bold text-slate-900 leading-snug">{examCenter || logoText1}</div>
          <div className="text-slate-800 leading-snug mt-1">ឈ្មោះសិស្ស៖ <span className="font-bold">{studentName || '...........................................'}</span></div>
          <div className="text-slate-800 leading-snug flex flex-wrap gap-x-2">
            <span>ថ្នាក់ទី៖ <span className="font-bold">{gradeNumber || '........'}</span></span>
            <span>លេខតុ៖ <span className="font-bold">{deskNumber || '........'}</span></span>
            <span>បន្ទប់៖ <span className="font-bold">{roomNumber || '........'}</span></span>
          </div>
        </div>

        {/* Middle Column: Emblem & Royal Motto */}
        <div className="col-span-12 sm:col-span-4 flex flex-col items-center text-center justify-start gap-0.5" style={headerInlineStyle}>
          <div className="mb-1 flex items-center justify-center">
            {customLogo ? (
              <img src={customLogo} alt="Logo" className="w-14 h-14 object-contain pointer-events-none mx-auto" />
            ) : imageFailed ? (
              <SovannaphumiLogoSVG />
            ) : (
              <img 
                src={imgSrc} 
                alt="School Logo" 
                className="w-14 h-14 object-contain pointer-events-none mx-auto"
                onError={onImageError}
              />
            )}
          </div>
          <div className="font-bold text-[11pt] text-slate-950 leading-tight font-serif">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div className="font-semibold text-[9.5pt] text-slate-900 leading-tight">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div className="text-amber-800 text-xs tracking-widest my-0.5 font-mono">🙞 🙠 ෴ 🙞 🙠</div>
        </div>

        {/* Right Column: Exam details & Duration */}
        <div className="col-span-12 sm:col-span-4 flex flex-col justify-start text-left sm:text-right gap-1 sm:pl-2" style={headerInlineStyle}>
          <div className="font-bold text-slate-950 leading-snug">ប្រឡង៖ <span className="text-slate-900">{examName || exam?.title || '...................'}</span></div>
          <div className="leading-snug">សម័យប្រឡង៖ <span className="font-bold text-slate-900">{examSession || exam?.examDate || '......../......../........'}</span></div>
          <div className="leading-snug">វិញ្ញាសា៖ <span className="font-bold text-slate-950">{subject?.name || '...................'}</span></div>
          <div className="leading-snug">រយៈពេល៖ <span className="font-bold text-slate-900">{durationTime || exam?.timeLimit || '៦០ នាទី'}</span> <span className="font-normal text-[9pt]">({totalScore || '...... ពិន្ទុ'})</span></div>
        </div>
      </div>

      {/* Score and Signature Summary Table Box */}
      <div className="my-3 border-2 border-black rounded-md overflow-hidden avoid-break">
        <table className="w-full border-collapse text-center text-xs" style={bodyInlineStyle}>
          <thead>
            <tr className="bg-slate-100 border-b border-black font-bold">
              <th className="border-r border-black py-1.5 px-3 w-[33%] text-slate-900">ពិន្ទុសរុប (Score)</th>
              <th className="border-r border-black py-1.5 px-3 w-[34%] text-slate-900">ហត្ថលេខាអ្នកកែ (Examiner)</th>
              <th className="py-1.5 px-3 w-[33%] text-slate-900">ហត្ថលេខាអនុរក្ស (Invigilator)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-12">
              <td className="border-r border-black p-2 font-bold text-base text-center align-middle">
                {/* Score Space */}
                <div className="w-12 h-8 border border-dashed border-slate-400 mx-auto rounded flex items-center justify-center text-slate-400 text-xs">
                  / {totalScore?.replace(/[^0-9]/g, '') || '10'}
                </div>
              </td>
              <td className="border-r border-black p-2 text-center align-bottom text-slate-400 text-[10px]">
                ..........................................
              </td>
              <td className="p-2 text-center align-bottom text-slate-400 text-[10px]">
                ..........................................
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Exam Title & Instructions Header */}
      <div className="text-center my-4" style={bodyInlineStyle}>
        <div className="font-bold text-[13pt] text-slate-950 tracking-wide underline underline-offset-4" style={headerInlineStyle}>
          វិញ្ញាសា៖ {subject?.name || 'រូបវិទ្យា'}
        </div>
        <div className="text-[10.5pt] font-bold text-slate-900 mt-2">
          សេចក្តីណែនាំ៖ ចូរអានសំណួរ និងឆ្លើយ ឬគូសរង្វង់លើចម្លើយត្រឹមត្រូវខាងក្រោម
        </div>
        <div className="text-[8.5pt] text-red-700 italic mt-0.5 font-normal">
          (បម្រាម៖ បេក្ខជនមិនត្រូវលួចចម្លងគ្នា ឬប្រើប្រាស់ឯកសារដោយគ្មានការអនុញ្ញាតឡើយ)
        </div>
      </div>

      {/* Main Questions Container */}
      <div className="space-y-6 text-black mt-4" style={bodyInlineStyle}>
        {/* 1. Multiple Choice Questions */}
        {grouped.choice.length > 0 && (
          <div className="space-y-3 avoid-break">
            {showSections && (
              <div className="font-bold text-[11.5pt] border-b-2 border-black pb-1 text-slate-950 tracking-wide" style={headerInlineStyle}>
                ផ្នែកទី ១៖ សំណួរពហុជ្រើសរើស (Multiple Choice Questions) — {toKhmerNum(grouped.choice.length)} សំណួរ
              </div>
            )}
            <div className="space-y-4">
              {grouped.choice.map((q) => {
                globalIdx++;
                return (
                  <div key={q.id || globalIdx} className="space-y-1.5 avoid-break text-left">
                    <div className="font-bold text-left text-slate-950 leading-relaxed text-xs">
                      <span>សំណួរទី {toKhmerNum(globalIdx)}៖ <FormulaRenderer text={q.text} /></span>
                      <span className="text-[9pt] text-slate-600 font-normal ml-1.5">({toKhmerNum(q.points || 2)} ពិន្ទុ)</span>
                    </div>
                    <div className={`mt-1.5 pl-4 grid gap-x-4 gap-y-1 text-left text-xs ${optionsLayout === 'inline' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {q.options.map((opt, oIdx) => {
                        const isCorrectIdx = oIdx === q.correctIndex;
                        return (
                          <div 
                            key={oIdx} 
                            className={`flex items-start gap-1.5 py-0.5 px-1.5 rounded ${
                              highlightKey && isCorrectIdx 
                                ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-300' 
                                : 'text-slate-900'
                            }`}
                          >
                            <span className="font-bold shrink-0">{getOptionPrefix(oIdx)}.</span>
                            <span><FormulaRenderer text={opt} /></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Matching Questions */}
        {grouped.matching.length > 0 && (
          <div className="space-y-3 avoid-break text-left">
            {showSections && (
              <div className="font-bold text-[11.5pt] border-b-2 border-black pb-1 text-slate-950 tracking-wide" style={headerInlineStyle}>
                ផ្នែកទី ២៖ សំណួរផ្គូផ្គង (Matching Questions) — ({toKhmerNum(grouped.matching.reduce((acc, cur) => acc + (cur.points || 4), 0))} ពិន្ទុ)
              </div>
            )}
            <div className="space-y-4">
              {grouped.matching.map((q) => {
                globalIdx++;
                return (
                  <div key={q.id || globalIdx} className="space-y-2 avoid-break">
                    <div className="font-bold text-left text-slate-950 leading-relaxed text-xs">
                      <span>សំណួរទី {toKhmerNum(globalIdx)}៖ <FormulaRenderer text={q.text || 'ចូរផ្គូផ្គងល្បារ ឬនិមិត្តសញ្ញានៅជួរ (A) ទៅនឹងនិយមន័យ ឬការពិពណ៌នាដែលត្រូវគ្នានៅជួរ (B) ឱ្យបានត្រឹមត្រូវ៖'} /></span>
                    </div>
                    
                    {/* Matching Table */}
                    <div className="my-2 max-w-2xl mx-auto overflow-x-auto avoid-break">
                      <table className="w-full border-collapse border-2 border-black text-xs text-black">
                        <thead>
                          <tr className="bg-slate-100 border-b-2 border-black font-bold">
                            <th className="border-r border-black font-bold text-center py-2 px-3 w-[40%]">ជួរ (A)</th>
                            <th className="border-r border-black font-bold text-center py-2 px-3 w-[42%]">ជួរ (B)</th>
                            <th className="font-bold text-center py-2 px-3 w-[18%]">ចម្លើយផ្គូផ្គង</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const lhs = [q.options[0], q.options[1]].filter(Boolean);
                            const rhs = q.options.slice(2).filter(Boolean);
                            const maxRows = Math.max(lhs.length, rhs.length);
                            const rows = [];
                            for (let i = 0; i < maxRows; i++) {
                              rows.push({
                                left: lhs[i] || '',
                                right: rhs[i] || '',
                                ansNum: i < lhs.length ? i + 1 : null
                              });
                            }
                            return rows.map((row, rIdx) => {
                              const leftLetter = rIdx === 0 ? '១' : rIdx === 1 ? '២' : rIdx === 2 ? '៣' : String(rIdx + 1);
                              const rightLetter = rIdx === 0 ? 'ក' : rIdx === 1 ? 'ខ' : rIdx === 2 ? 'គ' : rIdx === 3 ? 'ឃ' : String.fromCharCode(97 + rIdx);
                              
                              return (
                                <tr key={rIdx} className="border-b border-black last:border-b-0 min-h-[36px]">
                                  {/* Column A */}
                                  <td className="border-r border-black py-1.5 px-3 text-left font-medium align-middle">
                                    {row.left ? (
                                      <div className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">{leftLetter}.</span>
                                        <span><FormulaRenderer text={stripPrefix(row.left)} /></span>
                                      </div>
                                    ) : null}
                                  </td>
                                  {/* Column B */}
                                  <td className="border-r border-black py-1.5 px-3 text-left font-medium align-middle">
                                    {row.right ? (
                                      <div className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">{rightLetter}.</span>
                                        <span><FormulaRenderer text={stripPrefix(row.right)} /></span>
                                      </div>
                                    ) : null}
                                  </td>
                                  {/* Answer Space */}
                                  <td className="py-1.5 px-3 text-center font-bold align-middle">
                                    {row.ansNum !== null ? (
                                      <div className="flex items-center justify-center gap-1.5 font-bold">
                                        <span>{leftLetter} ➔</span>
                                        {highlightKey ? (
                                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-xs">
                                            {getMatchingAnswerForIndex(q, row.ansNum)}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 font-light text-[9pt] tracking-widest">.........</span>
                                        )}
                                      </div>
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Fill in the Blank Section */}
        {grouped.fill_blank.length > 0 && (() => {
          const totalPoints = grouped.fill_blank.reduce((acc, cur) => acc + (cur.points || 2), 0);
          const allOptions = Array.from(new Set(
            grouped.fill_blank.flatMap(q => q.options || [])
          )).filter(Boolean);
          if (allOptions.length === 0) {
            grouped.fill_blank.forEach(q => {
              const ans = (q.options && q.options[q.correctIndex]) ? q.options[q.correctIndex] : '';
              if (ans) allOptions.push(ans);
            });
          }

          return (
            <div className="space-y-3 avoid-break text-left">
              {showSections && (
                <div className="font-bold text-[11.5pt] border-b-2 border-black pb-1 text-slate-950 tracking-wide" style={headerInlineStyle}>
                  ផ្នែកទី ៣៖ សំណួរបំពេញចន្លោះ (Fill in the Blanks) — ({toKhmerNum(totalPoints)} ពិន្ទុ)
                </div>
              )}
              <div className="text-xs font-bold text-slate-900 leading-relaxed mt-1">
                ចូរជ្រើសរើសពាក្យក្នុងប្រអប់ខាងក្រោម ទៅបំពេញក្នុងចន្លោះនៃល្បារនីមួយៗខាងក្រោមឱ្យបានត្រឹមត្រូវ៖
              </div>
              {allOptions.length > 0 && (
                <div className="my-2.5 p-2 px-4 border border-dashed border-black bg-slate-50 text-center font-bold text-slate-900 tracking-wide text-xs max-w-2xl mx-auto rounded">
                  ( {allOptions.join(', ')} )
                </div>
              )}
              <div className="space-y-3">
                {grouped.fill_blank.map((q, qIdx) => {
                  globalIdx++;
                  const ans = (q.options && q.options[q.correctIndex]) ? q.options[q.correctIndex] : '';
                  return (
                    <div key={q.id || globalIdx} className="space-y-1 avoid-break">
                      <div className="font-bold text-left text-slate-950 leading-relaxed text-xs">
                        <span>
                          {toKhmerNum(qIdx + 1)}.{' '}
                          {(() => {
                            if (!ans || !highlightKey) {
                              return <FormulaRenderer text={q.text} />;
                            }
                            const blankRegex = /_{3,}|\.{3,}|-{3,}/g;
                            if (blankRegex.test(q.text)) {
                              const parts = q.text.split(blankRegex);
                              return (
                                <span>
                                  {parts.map((part: string, idx: number) => (
                                    <span key={idx}>
                                      <FormulaRenderer text={part} />
                                      {idx < parts.length - 1 && (
                                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 mx-1 rounded border border-emerald-300 inline-block">
                                          {ans}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </span>
                              );
                            } else {
                              return (
                                <span>
                                  <FormulaRenderer text={q.text} /> ➔{' '}
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 ml-1.5 rounded border border-emerald-300 inline-block">
                                    {ans}
                                  </span>
                                </span>
                              );
                            }
                          })()}
                        </span>
                        <span className="text-[9pt] text-slate-600 font-normal ml-1.5">({toKhmerNum(q.points || 2)} ពិន្ទុ)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 4. Theory Questions Section */}
        {grouped.theory.length > 0 && (
          <div className="space-y-3 avoid-break text-left">
            {showSections && (
              <div className="font-bold text-[11.5pt] border-b-2 border-black pb-1 text-slate-950 tracking-wide" style={headerInlineStyle}>
                ផ្នែកទី ៤៖ សំណួរទ្រឹស្ដី ឬចម្លើយខ្លី (Theory Questions) — {toKhmerNum(grouped.theory.length)} សំណួរ
              </div>
            )}
            <div className="space-y-4">
              {grouped.theory.map((q) => {
                globalIdx++;
                return (
                  <div key={q.id || globalIdx} className="space-y-1.5 avoid-break">
                    <div className="font-bold text-left text-slate-950 leading-relaxed text-xs">
                      <span>សំណួរទី {toKhmerNum(globalIdx)}៖ <FormulaRenderer text={q.text} /></span>
                      <span className="text-[9pt] text-slate-600 font-normal ml-1.5">({toKhmerNum(q.points || 2)} ពិន្ទុ)</span>
                    </div>
                    {highlightKey ? (
                      <div className="mt-1.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5 text-left max-w-2xl">
                        <div className="text-[9pt] font-bold text-emerald-900 uppercase">● ចម្លើយគំរូ (Model Answer)</div>
                        <div className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap">
                          <FormulaRenderer text={q.options && q.options[q.correctIndex] ? q.options[q.correctIndex] : q.explanation || "មិនទាន់មានចម្លើយគំរូ"} />
                        </div>
                        {q.explanation && q.options && q.options[q.correctIndex] && (
                          <div className="text-[8.5pt] text-slate-600 italic border-t border-dashed border-emerald-200 pt-1">
                            💡 ការពន្យល់បន្ថែម៖ <FormulaRenderer text={q.explanation} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 max-w-2xl">
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Exercises / Problems Section */}
        {grouped.exercise.length > 0 && (
          <div className="space-y-3 avoid-break text-left">
            {showSections && (
              <div className="font-bold text-[11.5pt] border-b-2 border-black pb-1 text-slate-950 tracking-wide" style={headerInlineStyle}>
                ផ្នែកទី ៥៖ លំហាត់គណនា ឬអនុវត្ត (Exercises / Problems) — {toKhmerNum(grouped.exercise.length)} លំហាត់
              </div>
            )}
            <div className="space-y-4">
              {grouped.exercise.map((q) => {
                globalIdx++;
                return (
                  <div key={q.id || globalIdx} className="space-y-1.5 avoid-break">
                    <div className="font-bold text-left text-slate-950 leading-relaxed text-xs">
                      <span>សំណួរទី {toKhmerNum(globalIdx)}៖ <FormulaRenderer text={q.text} /></span>
                      <span className="text-[9pt] text-slate-600 font-normal ml-1.5">({toKhmerNum(q.points || 5)} ពិន្ទុ)</span>
                    </div>
                    {highlightKey ? (
                      <div className="mt-1.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5 text-left max-w-2xl">
                        <div className="text-[9pt] font-bold text-emerald-900 uppercase">● ដំណោះស្រាយគំរូ (Model Solution)</div>
                        <div className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap">
                          <FormulaRenderer text={q.options && q.options[q.correctIndex] ? q.options[q.correctIndex] : q.explanation || "មិនទាន់មានដំណោះស្រាយគំរូ"} />
                        </div>
                        {q.explanation && q.options && q.options[q.correctIndex] && (
                          <div className="text-[8.5pt] text-slate-600 italic border-t border-dashed border-emerald-200 pt-1">
                            💡 គន្លឹះដោះស្រាយ៖ <FormulaRenderer text={q.explanation} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 max-w-2xl">
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                        <div className="border-b border-dotted border-black h-5 w-full"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Footer & Signatures Section */}
      <div className="mt-8 pt-4 border-t border-slate-300 avoid-break" style={bodyInlineStyle}>
        <div className="text-right text-xs italic text-slate-800 mb-4">
          ថ្ងៃ.................. ទី......... ខែ............... ឆ្នាំ២០២.......
        </div>
        <div className="grid grid-cols-2 gap-4 text-center text-xs">
          <div className="space-y-12">
            <div className="font-bold text-slate-950" style={headerInlineStyle}>ហត្ថលេខា និងឈ្មោះគ្រូបង្រៀន</div>
            <div className="text-slate-400 text-[10px]">.........................................................</div>
          </div>
          <div className="space-y-12">
            <div className="font-bold text-slate-950" style={headerInlineStyle}>
              <div>បានឃើញ និងឯកភាព</div>
              <div className="text-[9pt] font-semibold text-slate-800">ប្រធានគណៈកម្មការ / នាយកសាលា</div>
            </div>
            <div className="text-slate-400 text-[10px]">.........................................................</div>
          </div>
        </div>

        {/* Page Footer Indicator */}
        <div className="mt-6 text-center text-[9pt] text-slate-500 border-t border-dotted border-slate-300 pt-2 flex justify-between items-center">
          <span>{examCenter || logoText1}</span>
          <span>វិញ្ញាសា៖ {subject?.name || 'រូបវិទ្យា'} ({examName || 'ប្រឡង'})</span>
          <span>ទំព័រទី ១</span>
        </div>
      </div>
    </div>
  );
};

export default ExamPaperView;
