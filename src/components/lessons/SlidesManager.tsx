import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Presentation,
  Plus,
  Play,
  Trash2,
  Edit3,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Check,
  Upload,
  Link as LinkIcon,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Eye,
  BookOpen
} from 'lucide-react';
import { SlideDeckItem, SlideItem } from '../../types/lessonMaterials';
import { useConfirm } from '../../context/ConfirmContext';

interface SlidesManagerProps {
  slides: SlideDeckItem[];
  onSaveSlides: (slides: SlideDeckItem[]) => void;
  isDarkMode?: boolean;
  activeClassName: string;
}

export default function SlidesManager({
  slides,
  onSaveSlides,
  isDarkMode = false,
  activeClassName
}: SlidesManagerProps) {
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');

  // Active Presentation Mode state
  const [presentingDeck, setPresentingDeck] = useState<SlideDeckItem | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showTeacherNotes, setShowTeacherNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Deck Editor / Creator Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState('');
  const [deckSubject, setDeckSubject] = useState('រូបវិទ្យា');
  const [deckChapter, setDeckChapter] = useState('');
  const [deckLessonNumber, setDeckLessonNumber] = useState('មេរៀនទី ១');
  const [deckEmbedUrl, setDeckEmbedUrl] = useState('');
  const [deckFileName, setDeckFileName] = useState('');
  const [deckSlides, setDeckSlides] = useState<SlideItem[]>([]);

  // Filter decks
  const filteredDecks = slides.filter(d => {
    return d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.subject && d.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.chapter && d.chapter.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!presentingDeck) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.min(prev + 1, presentingDeck.slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setPresentingDeck(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentingDeck]);

  const handleStartPresentation = (deck: SlideDeckItem) => {
    setPresentingDeck(deck);
    setCurrentSlideIndex(0);
    setShowTeacherNotes(false);
  };

  const handleOpenCreateDeck = () => {
    setEditingDeckId(null);
    setDeckTitle('');
    setDeckSubject('រូបវិទ្យា');
    setDeckChapter('ជំពូកទី ៣៖ អគ្គិសនី');
    setDeckLessonNumber('មេរៀនទី ១');
    setDeckEmbedUrl('');
    setDeckFileName('');
    setDeckSlides([
      {
        id: `slide-1`,
        title: 'ចំណងជើងមេរៀន',
        subtitle: 'សេចក្តីផ្តើម និងវត្ថុបំណង',
        bulletPoints: [
          'ចំណុចគោលទី១ នៃមេរៀន',
          'ចំណុចគោលទី២ នៃមេរៀន',
          'ចំណុចគោលទី៣ នៃមេរៀន'
        ],
        formulaOrKeyPoint: 'ចំណុចគន្លឹះ ឬរូបមន្តគ្រឹះ',
        notes: 'កំណត់ចំណាំសម្រាប់លោកគ្រូ/អ្នកគ្រូពន្យល់សិស្ស'
      },
      {
        id: `slide-2`,
        title: 'ខ្លឹមសារលម្អិត',
        subtitle: 'ទ្រឹស្តី និងឧទាហរណ៍ជាក់ស្តែង',
        bulletPoints: [
          'និយមន័យ និងការពន្យល់',
          'លក្ខណៈ និងទំនាក់ទំនង',
          'ការអនុវត្តជាក់ស្តែង'
        ],
        formulaOrKeyPoint: 'A = B × C',
        notes: 'សួរសំណួរបំផុសសិស្ស'
      }
    ]);
    setIsEditModalOpen(true);
  };

  const handleOpenEditDeck = (deck: SlideDeckItem) => {
    setEditingDeckId(deck.id);
    setDeckTitle(deck.title);
    setDeckSubject(deck.subject || 'រូបវិទ្យា');
    setDeckChapter(deck.chapter || '');
    setDeckLessonNumber(deck.lessonNumber || 'មេរៀនទី ១');
    setDeckEmbedUrl(deck.externalEmbedUrl || '');
    setDeckFileName(deck.fileName || '');
    setDeckSlides(deck.slides || []);
    setIsEditModalOpen(true);
  };

  const handleSaveDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckTitle.trim()) return;

    if (editingDeckId) {
      const updated = slides.map(d => d.id === editingDeckId ? {
        ...d,
        title: deckTitle.trim(),
        subject: deckSubject.trim(),
        chapter: deckChapter.trim(),
        lessonNumber: deckLessonNumber.trim(),
        externalEmbedUrl: deckEmbedUrl.trim(),
        fileName: deckFileName.trim(),
        slides: deckSlides,
        updatedAt: new Date().toISOString()
      } : d);
      onSaveSlides(updated);
    } else {
      const newDeck: SlideDeckItem = {
        id: `deck-${Date.now()}`,
        title: deckTitle.trim(),
        subject: deckSubject.trim(),
        chapter: deckChapter.trim(),
        lessonNumber: deckLessonNumber.trim(),
        externalEmbedUrl: deckEmbedUrl.trim(),
        fileName: deckFileName.trim(),
        slides: deckSlides,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSaveSlides([newDeck, ...slides]);
    }

    setIsEditModalOpen(false);
  };

  const handleDeleteDeck = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'លុបស្លាយបង្រៀន',
      message: `តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់លុបស្លាយ "${title}" នេះមែនទេ?`,
      confirmText: 'លុបចេញ',
      cancelText: 'បោះបង់',
      variant: 'danger'
    });
    if (ok) {
      onSaveSlides(slides.filter(s => s.id !== id));
      if (presentingDeck?.id === id) {
        setPresentingDeck(null);
      }
    }
  };

  // Add slide to current editing deck
  const handleAddSlideToDeck = () => {
    const newSlide: SlideItem = {
      id: `slide-${Date.now()}`,
      title: `ស្លាយទី ${deckSlides.length + 1}`,
      subtitle: '',
      bulletPoints: ['ចំណុចទី១', 'ចំណុចទី២'],
      formulaOrKeyPoint: '',
      notes: ''
    };
    setDeckSlides([...deckSlides, newSlide]);
  };

  // Remove slide from editing deck
  const handleRemoveSlideFromDeck = (idx: number) => {
    if (deckSlides.length <= 1) return;
    setDeckSlides(deckSlides.filter((_, i) => i !== idx));
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកស្លាយបង្រៀន, មុខវិជ្ជា, មេរៀន..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl border text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateDeck}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer active:scale-95 border-none"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតស្លាយបង្រៀនថ្មី</span>
          </button>
        </div>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <Presentation className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">មិនទាន់មានស្លាយបង្រៀនឡើយ</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            បង្កើតស្លាយបង្រៀនអន្តរកម្ម ឬភ្ជាប់ស្លាយ Google Slides / Canva សម្រាប់បង្ហាញសិស្សក្នុងថ្នាក់បានយ៉ាងងាយស្រួល។
          </p>
          <button
            onClick={handleOpenCreateDeck}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតស្លាយដំបូង</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDecks.map((deck) => {
            const slideCount = deck.slides?.length || 0;
            return (
              <div
                key={deck.id}
                className="group p-5 rounded-3xl border bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                      {slideCount} ស្លាយ
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditDeck(deck)}
                        title="កែសម្រួលស្លាយ"
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck.id, deck.title)}
                        title="លុបស្លាយ"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Preview Card */}
                  <div
                    onClick={() => handleStartPresentation(deck)}
                    className="w-full aspect-video rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 p-4 text-white flex flex-col justify-between cursor-pointer relative overflow-hidden shadow-inner group/thumb"
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/0 transition-colors" />
                    <div className="relative z-10">
                      <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm">
                        {deck.subject || 'មេរៀន'}
                      </span>
                    </div>

                    <div className="relative z-10 my-auto text-center py-2">
                      <h4 className="font-black text-sm sm:text-base line-clamp-2 drop-shadow-md">
                        {deck.title}
                      </h4>
                      {deck.slides?.[0]?.subtitle && (
                        <p className="text-[10px] text-purple-200 mt-1 line-clamp-1">
                          {deck.slides[0].subtitle}
                        </p>
                      )}
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-[10px] text-purple-300">
                      <span>{deck.lessonNumber || 'មេរៀនទី១'}</span>
                      <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>ចាក់ស្លាយ</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-3 line-clamp-2">
                    {deck.title}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {deck.chapter && `${deck.chapter} • `}{deck.subject}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(deck.updatedAt).toLocaleDateString('km-KH')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {deck.externalEmbedUrl && (
                      <a
                        href={deck.externalEmbedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        title="បើកមើល Google Slides"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => handleStartPresentation(deck)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer border-none active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ចាក់ស្លាយបង្រៀន</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Interactive Presentation Mode */}
      <AnimatePresence>
        {presentingDeck && (
          <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-xs">
                  {currentSlideIndex + 1}/{presentingDeck.slides.length}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 line-clamp-1">
                    {presentingDeck.title}
                  </h3>
                  <p className="text-[11px] text-purple-300">
                    {presentingDeck.slides[currentSlideIndex]?.subtitle || presentingDeck.subject}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTeacherNotes(!showTeacherNotes)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    showTeacherNotes
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {showTeacherNotes ? 'លាក់កំណត់ចំណាំគ្រូ' : 'កំណត់ចំណាំគ្រូ'}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border-none"
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setPresentingDeck(null)}
                  className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer border-none"
                  title="ចាកចេញពីស្លាយ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Slide Canvas */}
            <div className="flex-1 p-6 sm:p-12 flex items-center justify-center relative overflow-hidden">
              <div className="w-full max-w-5xl aspect-video bg-gradient-to-br from-slate-900 to-indigo-950/90 rounded-3xl border border-slate-800 shadow-2xl p-8 sm:p-14 flex flex-col justify-between relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Slide Header */}
                <div>
                  <div className="flex items-center justify-between text-xs text-purple-400 font-bold mb-2">
                    <span>{presentingDeck.subject} • {presentingDeck.lessonNumber}</span>
                    <span>ស្លាយទី {currentSlideIndex + 1} នៃ {presentingDeck.slides.length}</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white font-sans">
                    {presentingDeck.slides[currentSlideIndex]?.title}
                  </h1>
                  {presentingDeck.slides[currentSlideIndex]?.subtitle && (
                    <p className="text-sm sm:text-lg text-purple-200/90 font-medium mt-1">
                      {presentingDeck.slides[currentSlideIndex]?.subtitle}
                    </p>
                  )}
                </div>

                {/* Slide Core Content */}
                <div className="my-auto py-6 space-y-4">
                  {presentingDeck.slides[currentSlideIndex]?.bulletPoints && (
                    <ul className="space-y-3">
                      {presentingDeck.slides[currentSlideIndex].bulletPoints.map((point, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-3 text-base sm:text-xl text-slate-100 leading-relaxed font-sans"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 mt-2 shrink-0 shadow-sm shadow-purple-400" />
                          <span>{point}</span>
                        </motion.li>
                      ))}
                    </ul>
                  )}

                  {/* Formula or Key takeaway highlight */}
                  {presentingDeck.slides[currentSlideIndex]?.formulaOrKeyPoint && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-6 p-4 sm:p-6 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-center shadow-lg"
                    >
                      <span className="text-xs text-purple-300 font-bold block mb-1">ចំណុចគន្លឹះ / រូបមន្ត៖</span>
                      <span className="text-xl sm:text-3xl font-black text-purple-300 font-mono tracking-wider">
                        {presentingDeck.slides[currentSlideIndex].formulaOrKeyPoint}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Slide Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <span>{activeClassName}</span>
                  <span>ចុចគ្រាប់ចុច ◀ ឬ ▶ នៅលើក្ដារចុចដើម្បីប្តូរស្លាយ</span>
                </div>
              </div>

              {/* Slide Navigation Buttons */}
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(prev => Math.max(prev - 1, 0))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-800/80 hover:bg-purple-600 disabled:opacity-20 disabled:pointer-events-none text-white flex items-center justify-center transition-all cursor-pointer border-none shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                disabled={currentSlideIndex === presentingDeck.slides.length - 1}
                onClick={() => setCurrentSlideIndex(prev => Math.min(prev + 1, presentingDeck.slides.length - 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-800/80 hover:bg-purple-600 disabled:opacity-20 disabled:pointer-events-none text-white flex items-center justify-center transition-all cursor-pointer border-none shadow-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Teacher Notes Drawer */}
            {showTeacherNotes && presentingDeck.slides[currentSlideIndex]?.notes && (
              <div className="p-4 bg-purple-950/90 border-t border-purple-800/80 shrink-0">
                <div className="max-w-5xl mx-auto flex items-start gap-3 text-xs sm:text-sm text-purple-200">
                  <span className="font-bold text-purple-300 shrink-0">📌 កំណត់ចំណាំគ្រូ៖</span>
                  <p className="leading-relaxed">{presentingDeck.slides[currentSlideIndex].notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Edit / Create Deck Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
                    <Presentation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {editingDeckId ? 'កែសម្រួលស្លាយបង្រៀន' : 'បង្កើតស្លាយបង្រៀនថ្មី'}
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

              <form onSubmit={handleSaveDeck} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ចំណងជើងស្លាយបង្រៀន <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    placeholder="ឧ. ស្លាយបង្រៀន៖ ច្បាប់អូម និងសៀគ្វីអគ្គិសនី"
                    className="w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      មុខវិជ្ជា
                    </label>
                    <input
                      type="text"
                      value={deckSubject}
                      onChange={(e) => setDeckSubject(e.target.value)}
                      placeholder="ឧ. រូបវិទ្យា"
                      className="w-full px-3 py-2 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ជំពូក
                    </label>
                    <input
                      type="text"
                      value={deckChapter}
                      onChange={(e) => setDeckChapter(e.target.value)}
                      placeholder="ឧ. ជំពូកទី ៣"
                      className="w-full px-3 py-2 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      មេរៀនទី
                    </label>
                    <input
                      type="text"
                      value={deckLessonNumber}
                      onChange={(e) => setDeckLessonNumber(e.target.value)}
                      placeholder="ឧ. មេរៀនទី ១"
                      className="w-full px-3 py-2 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* External link / Google Slides embed */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-purple-500" />
                    <span>ភ្ជាប់ Link Google Slides ឬ Canva Presentation (ប្រសិនបើមាន)</span>
                  </label>
                  <input
                    type="url"
                    value={deckEmbedUrl}
                    onChange={(e) => setDeckEmbedUrl(e.target.value)}
                    placeholder="https://docs.google.com/presentation/d/.../embed"
                    className="w-full px-4 py-2 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Slide Items List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      បញ្ជីស្លាយបង្រៀន ({deckSlides.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddSlideToDeck}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors border-none cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>បន្ថែមស្លាយ</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {deckSlides.map((slide, sIndex) => (
                      <div
                        key={slide.id || sIndex}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                            ស្លាយទី {sIndex + 1}
                          </span>
                          {deckSlides.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlideFromDeck(sIndex)}
                              className="text-slate-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer p-1"
                              title="លុបស្លាយនេះ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={slide.title}
                            onChange={(e) => {
                              const updated = [...deckSlides];
                              updated[sIndex].title = e.target.value;
                              setDeckSlides(updated);
                            }}
                            placeholder="ចំណងជើងស្លាយ"
                            className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          />
                          <input
                            type="text"
                            value={slide.subtitle || ''}
                            onChange={(e) => {
                              const updated = [...deckSlides];
                              updated[sIndex].subtitle = e.target.value;
                              setDeckSlides(updated);
                            }}
                            placeholder="ចំណងជើងរង (ប្រសិនបើមាន)"
                            className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            ចំណុចខ្លឹមសារ (ចុះបន្ទាត់ដើម្បីបំបែកចំណុច)
                          </label>
                          <textarea
                            rows={3}
                            value={slide.bulletPoints.join('\n')}
                            onChange={(e) => {
                              const updated = [...deckSlides];
                              updated[sIndex].bulletPoints = e.target.value.split('\n').filter(p => p.trim() !== '');
                              setDeckSlides(updated);
                            }}
                            placeholder="ចំណុចទី១&#10;ចំណុចទី២&#10;ចំណុចទី៣"
                            className="w-full px-3 py-2 rounded-xl border text-xs font-sans leading-relaxed bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={slide.formulaOrKeyPoint || ''}
                            onChange={(e) => {
                              const updated = [...deckSlides];
                              updated[sIndex].formulaOrKeyPoint = e.target.value;
                              setDeckSlides(updated);
                            }}
                            placeholder="រូបមន្ត ឬចំណុចសំខាន់ (ឧ. U = R × I)"
                            className="px-3 py-1.5 rounded-xl border text-xs font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          />
                          <input
                            type="text"
                            value={slide.notes || ''}
                            onChange={(e) => {
                              const updated = [...deckSlides];
                              updated[sIndex].notes = e.target.value;
                              setDeckSlides(updated);
                            }}
                            placeholder="កំណត់ចំណាំគ្រូ (Teacher talking notes)"
                            className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        {/* Slide Image Drop & Paste Zone */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500">
                            រូបភាពស្លាយ (អូសទម្លាក់ Drag & Drop ឬចុចបិទភ្ជាប់ Ctrl+V Paste រូបភាពពីកន្លែងណាបាន)
                          </label>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const file = e.dataTransfer.files[0];
                                if (file.type.startsWith('image/')) {
                                  const reader = new FileReader();
                                  reader.onload = (rev) => {
                                    const updated = [...deckSlides];
                                    updated[sIndex].imageUrl = rev.target?.result as string;
                                    setDeckSlides(updated);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              } else {
                                const text = e.dataTransfer.getData('text');
                                if (text && text.startsWith('http')) {
                                  const updated = [...deckSlides];
                                  updated[sIndex].imageUrl = text;
                                  setDeckSlides(updated);
                                }
                              }
                            }}
                            onPaste={(e) => {
                              const items = e.clipboardData?.items;
                              if (items) {
                                for (let i = 0; i < items.length; i++) {
                                  if (items[i].type.indexOf('image') !== -1) {
                                    const blob = items[i].getAsFile();
                                    if (blob) {
                                      const reader = new FileReader();
                                      reader.onload = (rev) => {
                                        const updated = [...deckSlides];
                                        updated[sIndex].imageUrl = rev.target?.result as string;
                                        setDeckSlides(updated);
                                      };
                                      reader.readAsDataURL(blob);
                                      return;
                                    }
                                  }
                                }
                              }
                            }}
                            className="p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 flex items-center justify-between gap-2 text-xs"
                          >
                            {slide.imageUrl ? (
                              <div className="flex items-center gap-2.5 w-full">
                                <img
                                  src={slide.imageUrl}
                                  alt="Slide preview"
                                  className="w-10 h-8 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-bold text-emerald-600 block truncate">
                                    មានរូបភាពរួចរាល់
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    អូសទម្លាក់រូបថ្មីដើម្បីផ្លាស់ប្តូរ
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...deckSlides];
                                    updated[sIndex].imageUrl = undefined;
                                    setDeckSlides(updated);
                                  }}
                                  className="text-xs text-red-500 hover:text-red-700 p-1 cursor-pointer border-none bg-transparent"
                                >
                                  លុបរូប
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-slate-400 text-[11px] truncate">
                                  អូសទម្លាក់រូបភាព ឬចុច Ctrl+V Paste នៅទីនេះ
                                </span>
                                <label className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] cursor-pointer shrink-0">
                                  <span>រករូបភាព</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (rev) => {
                                          const updated = [...deckSlides];
                                          updated[sIndex].imageUrl = rev.target?.result as string;
                                          setDeckSlides(updated);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer active:scale-95 border-none"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingDeckId ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតស្លាយ'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
