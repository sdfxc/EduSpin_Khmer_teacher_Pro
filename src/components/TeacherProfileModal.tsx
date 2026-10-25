import React, { useState, useRef } from 'react';
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
  LogOut,
  ClipboardPaste,
  Image as ImageIcon
} from 'lucide-react';
import { TeacherAccount } from '../types';
import { doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, safeSetDoc, saveTeacherToLocalRegistry } from '../lib/firebase';
import { compressAndResizeImage } from '../lib/imageUtils';
import { formatGoogleDriveImageUrl } from '../lib/driveUtils';
import { useImageDropAndPaste } from '../lib/useImageDropAndPaste';
import { useConfirm } from '../context/ConfirmContext.tsx';
import { useLanguage } from '../context/LanguageContext';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherAccount;
  onUpdateTeacher: (updated: TeacherAccount) => void;
  onLogout?: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onUpdateTeacher,
  onLogout,
}) => {
  const { language } = useLanguage();
  const { confirmAction } = useConfirm();
  const [imageTab, setImageTab] = useState<'avatar' | 'schoolLogo'>('avatar');
  
  const [avatarUrl, setAvatarUrl] = useState<string>(teacher.avatarUrl || '');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string>(teacher.schoolLogoUrl || '');
  const [name, setName] = useState<string>(teacher.name || '');
  const [schoolName, setSchoolName] = useState<string>(teacher.schoolName || '');
  const [gender, setGender] = useState<'ប្រុស' | 'ស្រី'>(() => {
    if (teacher.gender) return teacher.gender;
    const stored = localStorage.getItem('teacher_gender') || localStorage.getItem('khmer_teacher_gender');
    if (stored === 'ស្រី') return 'ស្រី';
    if (teacher.name?.includes('អ្នកគ្រូ')) return 'ស្រី';
    return 'ប្រុស';
  });
  const [subjects, setSubjects] = useState<string>(teacher.subjects || '');
  
  const [linkInput, setLinkInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Keep a ref to the active tab so the drop/paste callback always targets the current tab
  const activeTabRef = useRef<'avatar' | 'schoolLogo'>('avatar');
  activeTabRef.current = imageTab;

  // Separate file inputs for generic gallery/files and direct camera capture on mobile
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Hook for Drag-and-Drop and Paste (Ctrl+V / Clipboard) from anywhere
  const {
    isDraggingOver,
    dragProps,
    pasteFromClipboard,
    processImageFile,
  } = useImageDropAndPaste({
    isOpen,
    onImageReady: (newUrl) => {
      if (activeTabRef.current === 'avatar') {
        setAvatarUrl(newUrl);
        setStatusMsg({
          type: 'success',
          text: language === 'km' 
            ? 'បានបច្ចុប្បន្នភាពរូបភាព Profile! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
            : 'Profile image updated! Please click "Save Changes"'
        });
      } else {
        setSchoolLogoUrl(newUrl);
        setStatusMsg({
          type: 'success',
          text: language === 'km' 
            ? 'បានបច្ចុប្បន្នភាពឡូហ្គោសាលារៀន! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
            : 'School logo updated! Please click "Save Changes"'
        });
      }
    },
    setIsProcessing,
    setStatusMsg,
  });

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so user can re-upload same file if desired
    e.target.value = '';
    await processImageFile(file, 'upload');
  };

  const handleApplyLink = () => {
    if (!linkInput.trim()) return;
    const formatted = formatGoogleDriveImageUrl(linkInput.trim());
    if (imageTab === 'avatar') {
      setAvatarUrl(formatted);
      setStatusMsg({
        type: 'success',
        text: language === 'km' 
          ? 'បានភ្ជាប់រូបភាព Profile ពី Link/Drive! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
          : 'Profile image linked from Drive/URL! Please click "Save Changes"'
      });
    } else {
      setSchoolLogoUrl(formatted);
      setStatusMsg({
        type: 'success',
        text: language === 'km' 
          ? 'បានភ្ជាប់ឡូហ្គោសាលាពី Link/Drive! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
          : 'School logo linked from Drive/URL! Please click "Save Changes"'
      });
    }
    setLinkInput('');
  };

  const handleRemovePhoto = () => {
    const isAvatar = imageTab === 'avatar';
    confirmAction({
      title: isAvatar 
        ? (language === 'km' ? 'លុបរូបភាព Profile' : 'Remove Profile Image') 
        : (language === 'km' ? 'លុបឡូហ្គោសាលារៀន' : 'Remove School Logo'),
      message: isAvatar 
        ? (language === 'km' ? 'តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបរូបភាព Profile នេះចេញមែនទេ?' : 'Are you sure you want to remove your profile picture?') 
        : (language === 'km' ? 'តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបឡូហ្គោសាលារៀននេះចេញមែនទេ?' : 'Are you sure you want to remove the school logo?'),
      confirmText: language === 'km' ? 'បាទ/ចាស លុបចេញ' : 'Remove',
      variant: 'danger',
      onConfirm: () => {
        if (isAvatar) {
          setAvatarUrl('');
          setStatusMsg({
            type: 'success',
            text: language === 'km' 
              ? 'បានលុបរូបភាព Profile ចេញ។ សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
              : 'Profile photo removed. Please click "Save Changes"'
          });
        } else {
          setSchoolLogoUrl('');
          setStatusMsg({
            type: 'success',
            text: language === 'km' 
              ? 'បានលុបឡូហ្គោសាលារៀនចេញ។ សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
              : 'School logo removed. Please click "Save Changes"'
          });
        }
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMsg({ 
        type: 'error', 
        text: language === 'km' ? 'សូមបញ្ចូលឈ្មោះគ្រូបង្រៀន!' : 'Please enter teacher name!' 
      });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const updatedTeacher: TeacherAccount = {
      ...teacher,
      name: name.trim(),
      gender,
      title: gender === 'ស្រី' ? 'អ្នកគ្រូ' : 'លោកគ្រូ',
      schoolName: schoolName.trim(),
      subjects: subjects.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
      schoolLogoUrl: schoolLogoUrl.trim() || undefined,
    };
    localStorage.setItem('teacher_gender', gender);
    localStorage.setItem('khmer_teacher_gender', gender);

    try {
      // 1. Save to local storage & local registry immediately
      localStorage.setItem('logged_in_teacher', JSON.stringify(updatedTeacher));
      saveTeacherToLocalRegistry(updatedTeacher);

      // 2. Immediately update parent state so UI reacts instantly
      onUpdateTeacher(updatedTeacher);

      // 3. Sync to Firestore in background without blocking UI
      if (teacher.id) {
        const teacherDocRef = doc(db, 'teachers', teacher.id);
        safeSetDoc(teacherDocRef, updatedTeacher, { merge: true }).catch(err => {
          console.warn('Background teacher profile sync error:', err);
        });
      }

      setStatusMsg({
        type: 'success',
        text: language === 'km' 
          ? 'បានរក្សាទុកព័ត៌មាន និងឡូហ្គោសាលារៀនជោគជ័យ!' 
          : 'Successfully saved profile information & school logo!'
      });

      // Finish saving and close modal quickly (after 150ms)
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 150);
    } catch (err) {
      console.error('Teacher profile save error:', err);
      onUpdateTeacher(updatedTeacher);
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          {...dragProps}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Drag & Drop Visual Overlay when dragging file or image from anywhere */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-50 rounded-3xl bg-indigo-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white font-black animate-pulse border-4 border-dashed border-white pointer-events-none p-6 text-center">
              <Upload className="w-14 h-14 mb-3 animate-bounce" />
              <span className="text-lg font-black">
                {language === 'km' 
                  ? `ទម្លាក់${imageTab === 'avatar' ? 'រូបភាព Profile' : 'ឡូហ្គោសាលារៀន'}នៅទីនេះ (Drop Image Here)`
                  : `Drop ${imageTab === 'avatar' ? 'Profile Photo' : 'School Logo'} Here`}
              </span>
              <span className="text-xs font-medium opacity-90 mt-1">
                {language === 'km' 
                  ? 'គាំទ្ររូបភាពពីកុំព្យូទ័រ (PNG, JPG, WebP) ឬរូបដែលទាញពីគេហទំព័រផ្សេងៗ' 
                  : 'Supports image files (PNG, JPG, WebP) or online image URLs'}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {language === 'km' ? 'ព័ត៌មាន & រូបភាព Profile គ្រូបង្រៀន' : 'Teacher Profile & Settings'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'km' ? 'គ្រប់គ្រងរូបថត Profile និងឡូហ្គោសាលារៀនបានយ៉ាងងាយស្រួល' : 'Manage your profile photo, school logo and teacher details'}
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

          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Status Alert */}
            {statusMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
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

            {/* Sub-tabs for switching between Profile Photo & School Logo */}
            <div className="p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setImageTab('avatar')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                  imageTab === 'avatar'
                    ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>{language === 'km' ? 'រូបថតតំណាង (Profile Photo)' : 'Profile Photo'}</span>
                {avatarUrl && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="has image" />}
              </button>

              <button
                type="button"
                onClick={() => setImageTab('schoolLogo')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                  imageTab === 'schoolLogo'
                    ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <School className="w-4 h-4 text-emerald-500" />
                <span>{language === 'km' ? 'ឡូហ្គោសាលារៀន (School Logo)' : 'School Logo'}</span>
                {schoolLogoUrl && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="has logo" />}
              </button>
            </div>

            {/* Profile Avatar or School Logo Showcase & Upload Action */}
            <div className={`flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border transition-all ${
              isDraggingOver
                ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800'
            }`}>
              {/* Preview Box */}
              <div className="relative group shrink-0">
                {imageTab === 'avatar' ? (
                  // Circular Avatar Preview
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md bg-emerald-500 flex items-center justify-center text-white relative">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Teacher Avatar Preview" 
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <User className="w-12 h-12" />
                        <span className="text-[9px] font-bold mt-0.5 opacity-80">{language === 'km' ? 'គ្មានរូប' : 'No Photo'}</span>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  // Square/Rounded School Logo Preview
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 border-indigo-100 flex flex-col items-center justify-center text-indigo-600 relative p-1.5">
                    {schoolLogoUrl ? (
                      <img 
                        src={schoolLogoUrl} 
                        alt="School Logo Preview" 
                        className="w-full h-full object-contain select-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <School className="w-10 h-10 text-indigo-500" />
                        <span className="text-[9px] font-bold mt-1 text-slate-500">{language === 'km' ? 'គ្មានឡូហ្គោ' : 'No Logo'}</span>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Camera/Upload Trigger overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110"
                  title={imageTab === 'avatar' 
                    ? (language === 'km' ? 'ជ្រើសរើសរូប Profile' : 'Choose Profile Photo') 
                    : (language === 'km' ? 'ជ្រើសរើសឡូហ្គោសាលា' : 'Choose School Logo')}
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Controls for Mobile and PC */}
              <div className="flex-1 min-w-0 space-y-2.5 w-full text-center sm:text-left">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                    {imageTab === 'avatar' ? (
                      <>
                        <User className="w-4 h-4 text-indigo-500" />
                        <span>{language === 'km' ? 'រូបថតតំណាង (Profile Photo)' : 'Profile Photo'}</span>
                      </>
                    ) : (
                      <>
                        <School className="w-4 h-4 text-emerald-500" />
                        <span>{language === 'km' ? 'ឡូហ្គោសាលារៀន (School Logo)' : 'School Logo'}</span>
                      </>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {imageTab === 'avatar'
                      ? (language === 'km' 
                          ? 'គាំទ្ររូបភាពពីទូរស័ព្ទ (Camera/Gallery), កុំព្យូទ័រ (PNG/JPG) ឬ Link' 
                          : 'Supports Camera/Gallery, Computer uploads (PNG/JPG), or URL links')
                      : (language === 'km' 
                          ? 'គាំទ្រ Drag & Drop, Paste (Ctrl+V), ឯកសាររូបភាព ឬ Google Drive Link' 
                          : 'Supports Drag & Drop, Paste (Ctrl+V), image files or Google Drive link')}
                  </p>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml, image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="teacher-profile-file-input"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileChange}
                  className="hidden"
                  id="teacher-profile-camera-input"
                />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {/* Choose from Phone/PC */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'ជ្រើសរើសរូប (Phone/PC)' : 'Upload Photo'}</span>
                  </button>

                  {/* Direct Camera on Phones */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50 sm:hidden"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'ថតរូបផ្ទាល់' : 'Camera'}</span>
                  </button>

                  {/* Paste from Clipboard Button */}
                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    title={language === 'km' ? 'បិទភ្ជាប់រូបភាពពី Clipboard ឬ Screenshot (Ctrl+V)' : 'Paste image from clipboard (Ctrl+V)'}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'បិទភ្ជាប់រូប (Paste)' : 'Paste Image'}</span>
                  </button>

                  {/* Remove Button */}
                  {((imageTab === 'avatar' && avatarUrl) || (imageTab === 'schoolLogo' && schoolLogoUrl)) && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-bold flex items-center gap-1 border border-red-200 dark:border-red-900/50 cursor-pointer transition-all"
                      title={imageTab === 'avatar' 
                        ? (language === 'km' ? 'លុបរូបភាព Profile ចេញ' : 'Remove profile picture') 
                        : (language === 'km' ? 'លុបឡូហ្គោសាលាចេញ' : 'Remove school logo')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'km' ? 'លុបរូប' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                {/* Helpful drag-and-drop & paste hint */}
                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 inline-flex items-center gap-1.5 mt-1">
                  <Sparkles className="w-3 h-3 shrink-0 text-indigo-500" />
                  <span>
                    {imageTab === 'avatar'
                      ? (language === 'km' 
                          ? 'អាចទាញទម្លាក់រូប (Drag & Drop) ឬចុច Ctrl+V ដើម្បី Paste រូបភាព Profile' 
                          : 'Drag & Drop or press Ctrl+V to paste profile photo')
                      : (language === 'km' 
                          ? 'អាចទាញទម្លាក់រូប (Drag & Drop) ឬចុច Ctrl+V ដើម្បី Paste ឡូហ្គោសាលារៀន' 
                          : 'Drag & Drop or press Ctrl+V to paste school logo')}
                  </span>
                </div>
              </div>
            </div>

            {/* Paste Google Drive / Web Image Link Option */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'km' 
                  ? `ឬបិទភ្ជាប់ Google Drive Link / Web Image URL សម្រាប់ ${imageTab === 'avatar' ? 'រូបថតតំណាង' : 'ឡូហ្គោសាលារៀន'}`
                  : `Or paste Google Drive Link / Web Image URL for ${imageTab === 'avatar' ? 'Profile Avatar' : 'School Logo'}`}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder={language === 'km' ? 'https://drive.google.com/file/d/... ឬ Image URL' : 'https://drive.google.com/file/d/... or Image URL'}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  disabled={!linkInput.trim()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors shrink-0"
                >
                  {language === 'km' ? 'ភ្ជាប់រូប' : 'Attach'}
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

            {/* Teacher Details Edit */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{language === 'km' ? 'ឈ្មោះគ្រូបង្រៀន' : 'Teacher Name'}</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    placeholder={language === 'km' ? 'ឧ. ខេង ខី' : 'e.g. John Doe'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <span className="text-xs">👤</span>
                    <span>{language === 'km' ? 'ភេទ' : 'Gender'}</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      const newG = e.target.value as 'ប្រុស' | 'ស្រី';
                      setGender(newG);
                      localStorage.setItem('teacher_gender', newG);
                      localStorage.setItem('khmer_teacher_gender', newG);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="ប្រុស">ប្រុស (👨‍🏫 លោកគ្រូ)</option>
                    <option value="ស្រី">ស្រី (👩‍🏫 អ្នកគ្រូ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{language === 'km' ? 'មុខវិជ្ជាបង្រៀន' : 'Teaching Subject'}</span>
                  </label>
                  <input
                    type="text"
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    placeholder={language === 'km' ? 'ឧ. រូបវិទ្យា' : 'e.g. Physics'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{language === 'km' ? 'សាលារៀន' : 'School'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageTab('schoolLogo')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>{schoolLogoUrl ? (language === 'km' ? 'ប្ដូរឡូហ្គោ' : 'Change Logo') : (language === 'km' ? '+ បញ្ចូលឡូហ្គោ' : '+ Add Logo')}</span>
                    </button>
                  </label>
                  <div className="flex items-center gap-2">
                    {schoolLogoUrl && (
                      <div 
                        onClick={() => setImageTab('schoolLogo')}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0 cursor-pointer shadow-xs"
                        title={language === 'km' ? 'ចុចដើម្បីប្ដូរឡូហ្គោសាលារៀន' : 'Click to change school logo'}
                      >
                        <img src={schoolLogoUrl} alt="School Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      placeholder={language === 'km' ? 'ឧ. សាលារៀនសុវណ្ណភូមិ' : 'e.g. Sovannaphumi School'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-red-200 dark:border-red-900/50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'km' ? 'ចាកចេញពីគណនី' : 'Log Out'}</span>
                </button>
              ) : <div />}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isProcessing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{language === 'km' ? 'រក្សាទុកការផ្លាស់ប្ដូរ' : 'Save Changes'}</span>
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
