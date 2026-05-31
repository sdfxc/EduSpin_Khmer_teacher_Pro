import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Timer, CheckCircle, XCircle, Info, Trophy, AlertCircle, RotateCcw, BookOpen, Plus, Trash2, Layers, Folder, Edit3, Check, X, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, QuizCard, Student, QuizRoom, QuizChapter } from '../types';

interface QuizPanelProps {
  cards: QuizCard[];
  onCardClick: (card: QuizCard) => void;
  onAnswer: (correct: boolean) => void;
  onReset: () => void;
  activeCard: QuizCard | null;
  selectedStudent: Student | null;
  chapters: QuizChapter[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (chapterId: string, roomName: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, newName: string) => void;
  onCreateChapter: (chapterName: string) => void;
  onRenameChapter: (chapterId: string, newName: string) => void;
  onDeleteChapter: (chapterId: string) => void;
}

export default function QuizPanel({ 
  cards, 
  onCardClick, 
  onAnswer, 
  onReset,
  activeCard,
  selectedStudent,
  chapters = [],
  activeRoomId = null,
  onSelectRoom,
  onCreateRoom,
  onDeleteRoom,
  onRenameRoom,
  onCreateChapter,
  onRenameChapter,
  onDeleteChapter
}: QuizPanelProps) {
  const [timeLeft, setTimeLeft] = useState(20);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  
  const [viewMode, setViewMode] = useState<'quiz' | 'manage'>('quiz');
  const [savedScrollTop, setSavedScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [tempChapterName, setTempChapterName] = useState('');

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [tempRoomName, setTempRoomName] = useState('');

  const [creatingRoomForChapterId, setCreatingRoomForChapterId] = useState<string | null>(null);
  const [newRoomNameMap, setNewRoomNameMap] = useState<Record<string, string>>({});

  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [openChapterDropdownId, setOpenChapterDropdownId] = useState<string | null>(null);

  const startRenameChapter = (chapter: QuizChapter) => {
    setEditingChapterId(chapter.id);
    setTempChapterName(chapter.name);
  };

  const saveChapterRenameLocal = (chapterId: string) => {
    if (tempChapterName.trim()) {
      onRenameChapter(chapterId, tempChapterName.trim());
    }
    setEditingChapterId(null);
  };

  const startRenameRoom = (room: QuizRoom) => {
    setEditingRoomId(room.id);
    setTempRoomName(room.name);
  };

  const saveRoomRenameLocal = (roomId: string) => {
    if (tempRoomName.trim()) {
      onRenameRoom(roomId, tempRoomName.trim());
    }
    setEditingRoomId(null);
  };

  const submitCreateChapter = () => {
    const trimmed = newChapterName.trim();
    const finalName = trimmed || `ជំពូកទី${chapters.length + 1}`;
    onCreateChapter(finalName);
    setNewChapterName('');
    setIsCreatingChapter(false);
  };

  const submitCreateRoomForChapter = (chapterId: string) => {
    const trimmed = (newRoomNameMap[chapterId] || '').trim();
    const chapter = chapters.find(ch => ch.id === chapterId);
    const roomsCount = chapter ? chapter.rooms.length : 0;
    const finalName = trimmed || `មេរៀនទី${roomsCount + 1}`;
    onCreateRoom(chapterId, finalName);
    setNewRoomNameMap(prev => ({ ...prev, [chapterId]: '' }));
    setCreatingRoomForChapterId(null);
  };

  const enterManageMode = () => {
    if (containerRef.current) {
      setSavedScrollTop(containerRef.current.scrollTop);
    }
    setViewMode('manage');
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }, 30);
  };

  const exitManageMode = () => {
    setViewMode('quiz');
  };

  useEffect(() => {
    if (viewMode === 'quiz' && containerRef.current && savedScrollTop > 0) {
      const el = containerRef.current;
      const timer = setTimeout(() => {
        el.scrollTop = savedScrollTop;
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [viewMode, savedScrollTop]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCard && activeCard.status === 'idle' && timeLeft > 0 && !showResult) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !showResult) {
      handleAnswer(-1); // Timeout
    }
    return () => clearInterval(timer);
  }, [activeCard, timeLeft, showResult]);

  useEffect(() => {
    if (activeCard?.question) {
      const originalOptions = activeCard.question.options;
      const originalCorrect = activeCard.question.correctIndex;
      
      // Map options to pair with correct status
      const items = originalOptions.map((opt, index) => ({
        opt,
        isCorrect: index === originalCorrect
      }));
      
      // Perform a clean Fisher-Yates shuffle
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      
      setShuffledOptions(items.map(item => item.opt));
      const newCorrectIdx = items.findIndex(item => item.isCorrect);
      setCorrectIndex(newCorrectIdx >= 0 ? newCorrectIdx : 0);
      
      setTimeLeft(20);
      setShowResult(null);
    }
  }, [activeCard]);

  const handleAnswer = (index: number) => {
    if (!activeCard?.question || showResult) return;

    const isCorrect = index === correctIndex;
    setShowResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B']
      });
    }
  };

  const handleContinue = () => {
    if (showResult !== null) {
      onAnswer(showResult === 'correct');
    }
  };

  if (activeCard) {
    return (
      <div className="flex-1 flex flex-col p-8 bg-transparent relative transition-colors duration-300 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">
                {activeCard.number}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">សំណួរដែលត្រូវឆ្លើយ</h3>
                <p className="text-xl font-bold text-slate-800 dark:text-white">សន្លឹកប័ណ្ណសំណួរ</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 mb-1 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`}>
                <Timer className="w-5 h-5 text-indigo-500" />
                <span className="text-base font-bold">រយៈពេលនៅសល់៖ <span className="text-xl font-black font-mono">{timeLeft}</span> វិនាទី</span>
              </div>
              <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 20) * 100}%` }}
                  className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`}
                />
              </div>
            </div>
          </div>

          {/* Question Content */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            <div className="bg-white dark:bg-white border-2 border-slate-200 shadow-md rounded-[2rem] p-10 mb-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
              <HelpCircle className="absolute -top-12 -right-12 w-48 h-48 text-indigo-500/5 rotate-12" />
              <span className="text-xs uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-4">សំណួរលេខ {activeCard.number}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 text-center leading-relaxed relative z-10 max-w-2xl">
                {activeCard.question?.text}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {shuffledOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showResult !== null}
                  className={`relative p-6 rounded-3xl border-3 text-left transition-all group overflow-hidden cursor-pointer ${
                    showResult === null 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/10 shadow-sm text-slate-800 dark:text-slate-100 hover:scale-[1.02]'
                      : idx === correctIndex
                        ? 'bg-green-500/15 border-green-500 shadow-xl shadow-green-500/10 text-green-950 dark:text-green-100 scale-[1.01]'
                        : showResult === 'wrong' && idx !== correctIndex
                          ? 'bg-red-500/5 border-red-500/20 opacity-50 text-slate-900 dark:text-slate-100'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-65 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md transition-all ${
                      idx === correctIndex && showResult !== null
                        ? 'bg-green-600 text-white'
                        : showResult !== null
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                          : 'bg-indigo-600 text-white group-hover:bg-indigo-700 animate-in zoom-in-30 duration-200'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={`text-lg sm:text-xl font-bold tracking-tight leading-snug ${
                      idx === correctIndex && showResult !== null
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {option}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Result Feedback Overlay */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center gap-3 p-6 rounded-3xl border-4 shadow-xl relative overflow-hidden ${
                  showResult === 'correct' 
                    ? 'bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400' 
                    : 'bg-red-500/10 border-red-500/50 text-red-750 dark:text-red-400'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {showResult === 'correct' ? <CheckCircle className="w-8 h-8 text-green-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
                    <h4 className="text-xl font-bold uppercase tracking-tight">
                      {showResult === 'correct' ? 'អស្ចារ្យណាស់! +៣ ពិន្ទុ' : 'គួរឲ្យសោកស្ដាយ! មិនទាន់ត្រឹមត្រូវទេ'}
                    </h4>
                  </div>
                  {showResult === 'wrong' && (
                    <div className="flex items-start gap-2 text-red-700 dark:text-red-400 bg-red-500/5 p-3 rounded-xl mt-4 max-w-lg mb-4 border border-red-500/20">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">
                        ចម្លើយត្រឹមត្រូវគឺ៖ <span className="font-bold underline text-slate-800 dark:text-white">{shuffledOptions[correctIndex]}</span>
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleContinue}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
                      showResult === 'correct' 
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20' 
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'
                    }`}
                  >
                    បន្តទៅទៀត
                  </button>
                </div>
                {showResult === 'correct' && (
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="p-4 bg-green-500 text-white rounded-full hidden sm:block shadow-lg shadow-green-500/20"
                  >
                    <Trophy className="w-10 h-10 text-yellow-300" />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const activeRoom = chapters.reduce<QuizRoom | null>((found, ch) => {
    if (found) return found;
    return ch.rooms?.find(r => r.id === activeRoomId) || null;
  }, null);

  const activeChapter = chapters.find(ch => ch.rooms?.some(r => r.id === activeRoomId));

  const totalCount = cards.length;
  const remainingCount = cards.filter(c => !c.isRevealed).length;

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col px-8 pt-8 pb-[500px] bg-transparent overflow-y-auto custom-scrollbar transition-colors duration-300"
    >
      {viewMode === 'quiz' ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">ក្ដារសំណួរ</h2>
                {cards.length > 0 && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-750 hover:bg-slate-50 rounded-lg transition-all font-bold text-[10px] shadow-sm active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-indigo-500" />
                    ធ្វើម្ដងទៀត
                  </button>
                )}
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs">
                សូមជ្រើសរើសសន្លឹកប័ណ្ណមួយដើម្បីចាប់ផ្ដើម។ នៅសល់ {remainingCount}/{totalCount} សំណួរ។
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={enterManageMode}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95 transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>រៀបចំជំពូក និងមេរៀន</span>
              </button>
            </div>
          </div>

          {/* Active Chapter & Lesson Header */}
          {activeChapter && activeRoom ? (
            <div className="mb-4 px-3 py-2 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-between gap-3 shadow-none min-h-[44px] relative overflow-hidden">
              <div className="flex items-center gap-2.5 relative z-10 min-w-0">
                <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm border border-indigo-400/20 shrink-0">
                  <Folder className="w-4 h-4 text-indigo-100" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide bg-indigo-100/50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md shrink-0">
                    {activeChapter.name}
                  </span>
                  <span className="text-slate-350 dark:text-slate-650 text-[10px] font-bold shrink-0">/</span>
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-indigo-200 truncate pr-1">
                    {activeRoom.name}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-2 relative z-10 select-none shrink-0">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/60 shadow-sm border border-slate-100 dark:border-slate-800/80 px-2 py-1 rounded-lg">
                  នៅសល់ {remainingCount}/{totalCount} សំណួរ
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-4 px-3 py-2 rounded-2xl bg-amber-50/65 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-3 shadow-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-100" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-amber-800 dark:text-amber-400">មិនទាន់ជ្រើសរើសមេរៀន</h3>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 hidden sm:block truncate">សូមចុចប៊ូតុង "រៀបចំជំពូក និងមេរៀន" ដើម្បីជ្រើសរើសមេរៀន។</p>
                </div>
              </div>
              <button
                type="button"
                onClick={enterManageMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] select-none shadow-sm cursor-pointer active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>រៀបចំឥឡូវនេះ</span>
              </button>
            </div>
          )}

          <AnimatePresence>
            {!selectedStudent && cards.length > 0 && (
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="mb-4 flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-850 dark:text-yellow-350 rounded-xl font-bold border border-yellow-200 dark:border-yellow-905 shadow-sm shadow-yellow-500/5 animate-pulse"
              >
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <span className="text-[11px]">សូមបង្វិលរកឈ្មោះសិស្សដំបូងសិន មុននឹងជ្រើសរើសសន្លឹកប័ណ្ណសំណួរ!</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
            {cards.map((card) => (
              <motion.button
                key={card.id}
                whileHover={selectedStudent && !card.isRevealed ? { y: -5, scale: 1.05 } : {}}
                whileTap={selectedStudent && !card.isRevealed ? { scale: 0.95 } : {}}
                onClick={() => !card.isRevealed && selectedStudent && onCardClick(card)}
                disabled={card.isRevealed || !selectedStudent}
                className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center relative transition-all shadow-md overflow-hidden group border ${
                  card.isRevealed
                    ? card.status === 'correct'
                      ? 'bg-green-500 border-green-500 text-white shadow-green-500/20 cursor-default'
                      : 'bg-red-500 border-red-500 text-white shadow-red-500/20 cursor-default'
                    : selectedStudent
                      ? 'bg-slate-950 border-slate-900 hover:border-indigo-500 hover:ring-4 hover:ring-indigo-500/20 cursor-pointer text-white shadow-lg'
                      : 'bg-[#f8fafc] dark:bg-[#1e293b] text-slate-300 dark:text-slate-600 opacity-40 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800'
                }`}
              >
                {card.isRevealed ? (
                  card.status === 'correct' ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />
                ) : (
                  <span className="text-3xl font-black drop-shadow-sm">{card.number}</span>
                )}
                
                {!selectedStudent && !card.isRevealed && (
                  <div className="absolute inset-0 bg-transparent" />
                )}
              </motion.button>
            ))}
          </div>
          
          {cards.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none max-w-sm">
                <Info className="w-16 h-16 text-indigo-300 dark:text-indigo-400 mx-auto mb-6" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">មិនទាន់មានសំណួរនៅឡើយទេ</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 italic leading-relaxed">លោកគ្រូ អ្នកគ្រូ សូមប្រើប្រាស់ឧបករណ៍ AI ដើម្បីបង្កើតសំណួរចេញពីអត្ថបទមេរៀន!</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-250">
          {/* Header of Manage Page */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-205 dark:border-slate-800 pb-4 mb-8 gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exitManageMode}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 border border-slate-200 dark:border-slate-750"
              >
                ← ត្រឡប់ទៅក្ដារសំណួរ
              </button>
              <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-705 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-505" />
                <h3 className="text-lg font-black tracking-wide text-slate-800 dark:text-slate-205">
                  ការរៀបចំជំពូក និងមេរៀន
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Add New Chapter Button */}
              {!isCreatingChapter ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingChapter(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>បង្កើតជំពូកថ្មី</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm animate-in fade-in-25 duration-100 shrink-0">
                  <input
                    type="text"
                    placeholder={`ជំពូកទី${chapters.length + 1}`}
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCreateChapter();
                      if (e.key === 'Escape') setIsCreatingChapter(false);
                    }}
                    autoFocus
                    className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 w-36 sm:w-44"
                  />
                  <button
                    type="button"
                    onClick={submitCreateChapter}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    បង្កើត
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingChapter(false)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 hover:text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                  >
                    បោះបង់
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/10 border border-indigo-150 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-400 text-xs font-bold flex items-center gap-2">
            <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
            <span>សូមជ្រើសរើសមេរៀន (បន្ទប់សំណួរ) ណាមួយខាងក្រោម រួចចុច "ត្រឡប់ទៅក្ដារសំណួរ" ដើម្បីសួរដេញដោលសិស្ស។</span>
          </div>

          {/* Active indicator */}
          {activeChapter && activeRoom && (
            <div className="mb-6 px-4 py-3.5 bg-green-500/5 dark:bg-green-400/5 border border-green-200/30 dark:border-green-900/30 rounded-2xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-350">
              <span className="font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                <span>មេរៀនសកម្ម៖</span> 
                <span className="text-indigo-600 dark:text-indigo-405 font-black ml-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                  [{activeChapter.name}] ➔ {activeRoom.name}
                </span>
              </span>
              <button
                type="button"
                onClick={exitManageMode}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-black cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-xs"
              >
                ទៅកាន់ក្ដារសំណួរឥឡូវនេះ ➔
              </button>
            </div>
          )}

          {/* Chapters list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chapters.map((chapter) => {
              const hasRooms = chapter.rooms && chapter.rooms.length > 0;
              const activeRoomInThisChapter = chapter.rooms.find(r => r.id === activeRoomId);

              return (
                <div 
                  key={chapter.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm relative overflow-visible"
                >
                  {/* Chapter Title / Header */}
                  <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 select-none">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Folder className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                      {editingChapterId === chapter.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={tempChapterName}
                            onChange={(e) => setTempChapterName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveChapterRenameLocal(chapter.id);
                              if (e.key === 'Escape') setEditingChapterId(null);
                            }}
                            autoFocus
                            className="px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-indigo-500 rounded focus:outline-none text-slate-800 dark:text-slate-100 font-bold w-full"
                          />
                          <button
                            type="button"
                            onClick={() => saveChapterRenameLocal(chapter.id)}
                            className="p-1 transform active:scale-95 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingChapterId(null)}
                            className="p-1 transform active:scale-95 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group flex-1">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide truncate">
                            {chapter.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => startRenameChapter(chapter)}
                            className="p-1 text-slate-400 hover:text-indigo-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                            title="ប្ដូរឈ្មោះជំពូក"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions for Chapter */}
                    <div className="flex items-center gap-1 shrink-0">
                      {chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteChapter(chapter.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                          title="លុបជំពូកនេះចោល"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lessons list inside Chapter as a DROPDOWN */}
                  <div className="p-4 flex flex-col gap-3 relative overflow-visible">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      បន្ទប់សំណួរមេរៀន៖
                    </span>

                    {hasRooms ? (
                      <div className="relative overflow-visible">
                        {/* Dropdown triggers */}
                        <button 
                          type="button"
                          onClick={() => setOpenChapterDropdownId(openChapterDropdownId === chapter.id ? null : chapter.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all text-xs font-bold select-none cursor-pointer ${
                            chapter.rooms.some(r => r.id === activeRoomId)
                              ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate">
                              {activeRoomInThisChapter 
                                ? `មេរៀនសកម្ម៖ ${activeRoomInThisChapter.name}` 
                                : `ជ្រើសរើសមេរៀនក្នុងជំពូកនេះ (${chapter.rooms.length})`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-normal px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                              {chapter.rooms.some(r => r.id === activeRoomId) ? 'សកម្ម' : 'មិនទាន់រើស'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </button>

                        {/* Dropdown list popup */}
                        {openChapterDropdownId === chapter.id && (
                          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 max-h-[220px] overflow-y-auto custom-scrollbar">
                            <div className="p-1 flex flex-col gap-1">
                              {chapter.rooms.map((room) => {
                                const isActive = room.id === activeRoomId;
                                return (
                                  <div
                                    key={room.id}
                                    onClick={() => {
                                      if (editingRoomId !== room.id) {
                                        onSelectRoom(room.id);
                                        setOpenChapterDropdownId(null);
                                      }
                                    }}
                                    className={`group/room relative flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-bold select-none cursor-pointer ${
                                      isActive
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-grow pr-3 truncate" onClick={(e) => {
                                      if (editingRoomId === room.id || isActive) {
                                        e.stopPropagation();
                                      }
                                    }}>
                                      <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />
                                      
                                      {editingRoomId === room.id ? (
                                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                          <input
                                            type="text"
                                            value={tempRoomName}
                                            onChange={(e) => setTempRoomName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveRoomRenameLocal(room.id);
                                              }
                                              if (e.key === 'Escape') {
                                                setEditingRoomId(null);
                                              }
                                            }}
                                            autoFocus
                                            className="px-2 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-indigo-400 rounded focus:outline-none text-slate-800 dark:text-slate-100 font-bold w-full"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => saveRoomRenameLocal(room.id)}
                                            className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-950/20 rounded transition-all cursor-pointer"
                                          >
                                            <Check className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingRoomId(null)}
                                            className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="truncate">{room.name}</span>
                                          <span className={`text-[10px] font-black shrink-0 ${isActive ? 'text-indigo-100 bg-indigo-700' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'} px-1.5 py-0.5 rounded-md`}>
                                            {room.cards ? room.cards.length : 0} សំណួរ
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions for Room (only if not renaming) */}
                                    {editingRoomId !== room.id && (
                                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/room:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startRenameRoom(room);
                                          }}
                                          className={`p-1 rounded transition-colors cursor-pointer ${
                                            isActive
                                              ? 'hover:bg-indigo-700 text-indigo-200 hover:text-white'
                                              : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500'
                                          }`}
                                          title="ប្ដូរឈ្មោះមេរៀន"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        
                                        {chapters.reduce((total, ch) => total + ch.rooms.length, 0) > 1 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteRoom(room.id);
                                            }}
                                            className={`p-1 rounded transition-colors cursor-pointer ${
                                              isActive
                                                ? 'hover:bg-rose-700 text-indigo-400 hover:text-white'
                                                : 'hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500'
                                            }`}
                                            title="លុបឈ្មោះមេរៀន"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-4 text-center border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-xl mb-1">
                        <p className="text-[11px] font-medium text-slate-400 italic">មិនទាន់មានមេរៀននៅឡើយទេ</p>
                      </div>
                    )}

                    {/* Add New Room inside Chapter Form/Button */}
                    <div className="mt-1 text-right">
                      {creatingRoomForChapterId === chapter.id ? (
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl animate-in slide-in-from-bottom-2 duration-150 relative z-10">
                          <input
                            type="text"
                            placeholder={`មេរៀនទី${(chapter.rooms || []).length + 1}`}
                            value={newRoomNameMap[chapter.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewRoomNameMap(prev => ({ ...prev, [chapter.id]: val }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitCreateRoomForChapter(chapter.id);
                              if (e.key === 'Escape') setCreatingRoomForChapterId(null);
                            }}
                            autoFocus
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 flex-1 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => submitCreateRoomForChapter(chapter.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                          >
                            បង្កើត
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatingRoomForChapterId(null)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 hover:text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                          >
                            បោះបង់
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCreatingRoomForChapterId(chapter.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg transition-all font-black text-[11px] cursor-pointer active:scale-95 border border-dashed border-amber-300 dark:border-amber-800"
                        >
                          <Plus className="w-3 h-3" />
                          <span>បង្កើតបន្ទប់មេរៀនថ្មី</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
