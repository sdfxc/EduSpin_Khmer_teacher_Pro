import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Upload, 
  User, 
  Trash2, 
  Link as LinkIcon, 
  Sparkles, 
  Check, 
  Loader2, 
  School, 
  BookOpen, 
  Smartphone, 
  Laptop, 
  AlertCircle,
  GraduationCap,
  Calendar,
  Phone,
  FileText,
  Award,
  Hash
} from 'lucide-react';
import { Student, ClassInfo } from '../types';
import { compressAndResizeImage } from '../lib/imageUtils';
import { formatGoogleDriveImageUrl } from '../lib/driveUtils';
import { useConfirm } from '../context/ConfirmContext.tsx';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: ClassInfo[];
  activeClassId: string;
  isDarkMode?: boolean;
  onSaveStudent: (id: string, updatedFields: Partial<Student>) => void | Promise<void>;
  onDeleteStudent?: (id: string) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  activeClassId,
  isDarkMode = false,
  onSaveStudent,
  onDeleteStudent,
}) => {
  const { confirmAction } = useConfirm();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [status, setStatus] = useState<'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'>('សកម្ម');
  const [classId, setClassId] = useState<string>(activeClassId);
  const [score, setScore] = useState<number>(0);
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [linkInput, setLinkInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize fields whenever a student is selected
  useEffect(() => {
    if (student) {
      setAvatarUrl(student.avatarUrl || '');
      setStudentId(student.studentId || '');
      setName(student.name || '');
      setGender(student.gender || 'ប្រុស');
      setStatus(student.status || 'សកម្ម');
      setClassId(student.classId || activeClassId);
      setScore(student.score || 0);
      setDateOfBirth(student.dateOfBirth || '');
      setPhoneNumber(student.phoneNumber || '');
      setNotes(student.notes || '');
      setLinkInput('');
      setStatusMsg(null);
    }
  }, [student, activeClassId, isOpen]);

  if (!isOpen || !student) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setIsProcessing(true);
    setStatusMsg(null);

    try {
      // Compress and resize automatically (smartphone photos 10MB -> ~40KB base64)
      const compressedDataUrl = await compressAndResizeImage(file, 512, 0.85);
      setAvatarUrl(compressedDataUrl);
      setStatusMsg({
        type: 'success',
        text: 'បានជ្រើសរើសរូបភាពជោគជ័យ! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
      });
    } catch (err) {
      console.error('Image compression failed:', err);
      setStatusMsg({
        type: 'error',
        text: 'មិនអាចអានរូបភាពបានទេ។ សូមព្យាយាមជាមួយរូបភាពផ្សេងទៀត!'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyLink = () => {
    if (!linkInput.trim()) return;
    const formatted = formatGoogleDriveImageUrl(linkInput.trim());
    setAvatarUrl(formatted);
    setLinkInput('');
    setStatusMsg({
      type: 'success',
      text: 'បានភ្ជាប់រូបភាពពី Link / Google Drive ជោគជ័យ! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
    });
  };

  const handleRemovePhoto = () => {
    confirmAction({
      title: 'លុបរូបភាព Profile សិស្ស',
      message: `តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបរូបភាព Profile របស់សិស្ស «${name || 'នេះ'}» មែនទេ?`,
      confirmText: 'បាទ/ចាស លុបរូប',
      variant: 'danger',
      onConfirm: () => {
        setAvatarUrl('');
        setStatusMsg({
          type: 'success',
          text: 'បានលុបរូបភាព Profile ចេញ។ សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
        });
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'សូមបញ្ចូលឈ្មោះសិស្ស!' });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const updatedFields: Partial<Student> = {
      name: name.trim(),
      studentId: studentId.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      gender,
      status,
      classId,
      score: Math.max(0, score || 0),
      dateOfBirth: dateOfBirth.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await onSaveStudent(student.id, updatedFields);
      setStatusMsg({
        type: 'success',
        text: 'បានរក្សាទុកព័ត៌មាន និងរូបភាព Profile សិស្សជោគជ័យ!'
      });

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update student profile:', err);
      setStatusMsg({
        type: 'error',
        text: 'មានបញ្ហាក្នុងការរក្សាទុក សូមព្យាយាមម្តងទៀត!'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-pink-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
  const badgeBg = colors[name ? name.charCodeAt(0) % colors.length : 0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ព័ត៌មាន & រូបភាព Profile សិស្ស
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ផ្លាស់ប្ដូររូបថតពីទូរស័ព្ទ ឬកុំព្យូទ័របានយ៉ាងងាយស្រួល
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-left custom-scrollbar">
            {/* Status Alert */}
            {statusMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </motion.div>
            )}

            {/* Profile Avatar Showcase & Upload Action */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800">
              {/* Circular Avatar Preview */}
              <div className="relative group shrink-0">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg ${badgeBg} flex items-center justify-center text-white`}>
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={name || "Student Avatar Preview"} 
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center select-none">
                      <span className="text-3xl sm:text-4xl font-black">
                        {name ? name.trim().charAt(0) : <User className="w-10 h-10" />}
                      </span>
                      <span className="text-[9px] font-bold mt-0.5 opacity-90">គ្មានរូប</span>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <Loader2 className="w-7 h-7 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Quick Camera Trigger overlay on avatar */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-2 border-white dark:border-slate-800 transition-transform active:scale-95 cursor-pointer"
                  title="ជ្រើសរើសរូបថត"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar action controls */}
              <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    រូបថតតំណាង (Profile Photo)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    គាំទ្ររូបភាពពីទូរស័ព្ទ (Camera/Gallery), កុំព្យូទ័រ (PNG/JPG) ឬ Link
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {/* File Pick button for PC & Mobile */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>ជ្រើសរើសរូប (Phone/PC)</span>
                  </button>

                  {/* Direct Mobile Camera Capture */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="sm:hidden px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-500" />
                    <span>ថតរូប</span>
                  </button>

                  {/* Remove photo */}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>លុបរូប</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Google Drive / Web Image Link Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>ឬបិទភ្ជាប់ Google Drive Link / Web Image URL</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/... ឬ Image URL"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    className="w-full pl-3.5 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  disabled={!linkInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shrink-0"
                >
                  ភ្ជាប់រូប
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
              {/* Row 1: Student ID & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 sm:col-span-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Hash className="w-3 h-3 text-indigo-500" />
                    <span>ID / អត្តលេខ</span>
                  </label>
                  <input
                    type="text"
                    placeholder="001, STU-01..."
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-500" />
                    <span>ឈ្មោះសិស្ស <strong className="text-red-500">*</strong></span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="បញ្ចូលឈ្មោះសិស្ស..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Gender & Class & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">ភេទ</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'ប្រុស' | 'ស្រី')}
                    className="px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ប្រុស">ប្រុស (Male)</option>
                    <option value="ស្រី">ស្រី (Female)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-indigo-500" />
                    <span>ថ្នាក់រៀន</span>
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-500" />
                    <span>ស្ថានភាព</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ឆ្នើម">ឆ្នើម (Outstanding)</option>
                    <option value="សកម្ម">សកម្ម (Active)</option>
                    <option value="កំពុងរីកចម្រើន">កំពុងរីកចម្រើន (Improving)</option>
                    <option value="គួរឲ្យបារម្ភ">គួរឲ្យបារម្ភ (Needs Attention)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Score & Date of birth & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Award className="w-3 h-3 text-yellow-500" />
                    <span>ពិន្ទុ (Points)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={score}
                    onChange={(e) => setScore(Math.max(0, parseInt(e.target.value) || 0))}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    <span>ថ្ងៃខែឆ្នាំកំណើត</span>
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-500" />
                    <span>លេខទូរស័ព្ទ / អាណាព្យាបាល</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="012 345 678..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 4: Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <FileText className="w-3 h-3 text-indigo-500" />
                  <span>កំណត់សម្គាល់បន្ថែម (Notes)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="ព័ត៌មានលម្អិតបន្ថែមអំពីសិស្ស..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                {onDeleteStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDeleteStudent(student.id);
                    }}
                    className="px-3 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>លុបសិស្សនេះ</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>កំពុងរក្សាទុក...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>រក្សាទុកការផ្លាស់ប្ដូរ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
