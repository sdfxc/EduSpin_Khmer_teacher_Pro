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
  LogOut
} from 'lucide-react';
import { TeacherAccount } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { compressAndResizeImage } from '../lib/imageUtils';
import { formatGoogleDriveImageUrl } from '../lib/driveUtils';

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
  const [avatarUrl, setAvatarUrl] = useState<string>(teacher.avatarUrl || '');
  const [name, setName] = useState<string>(teacher.name || '');
  const [schoolName, setSchoolName] = useState<string>(teacher.schoolName || '');
  const [subjects, setSubjects] = useState<string>(teacher.subjects || '');
  
  const [linkInput, setLinkInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Separate file inputs for generic gallery/files and direct camera capture on mobile
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so user can re-upload same file if desired
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
    setAvatarUrl('');
    setStatusMsg({
      type: 'success',
      text: 'បានលុបរូបភាព Profile ចេញ។ សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'សូមបញ្ចូលឈ្មោះគ្រូបង្រៀន!' });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const updatedTeacher: TeacherAccount = {
      ...teacher,
      name: name.trim(),
      schoolName: schoolName.trim(),
      subjects: subjects.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
    };

    try {
      // 1. Save to localStorage immediately
      localStorage.setItem('logged_in_teacher', JSON.stringify(updatedTeacher));

      // 2. Sync to Firestore cloud
      const teacherDocRef = doc(db, 'teachers', teacher.id);
      await setDoc(teacherDocRef, updatedTeacher, { merge: true });

      // 3. Update parent React state
      onUpdateTeacher(updatedTeacher);

      setStatusMsg({
        type: 'success',
        text: 'បានរក្សាទុកព័ត៌មាន និងរូបភាព Profile ចូលទៅ Cloud ជោគជ័យ!'
      });

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to sync teacher profile to Firestore:', err);
      // Still update locally if Firestore encounters connection issues
      onUpdateTeacher(updatedTeacher);
      handleFirestoreError(err, OperationType.UPDATE, `teachers/${teacher.id}`);
      setStatusMsg({
        type: 'success',
        text: 'បានរក្សាទុកក្នុងឧបករណ៍ជោគជ័យ (Offline Cache)!'
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setIsSaving(false);
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
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ព័ត៌មាន & រូបភាព Profile គ្រូបង្រៀន
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

            {/* Profile Avatar Showcase & Upload Action */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800">
              {/* Circular Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md bg-emerald-500 flex items-center justify-center text-white">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Teacher Avatar Preview" 
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <User className="w-12 h-12" />
                      <span className="text-[9px] font-bold mt-0.5 opacity-80">គ្មានរូប</span>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Quick Camera Trigger overlay on avatar */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110"
                  title="ជ្រើសរើសរូបភាព"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Controls for Mobile and PC */}
              <div className="flex-1 min-w-0 space-y-2.5 w-full text-center sm:text-left">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    រូបថតតំណាង (Profile Photo)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    គាំទ្ររូបភាពពីទូរស័ព្ទ (Camera/Gallery), កុំព្យូទ័រ (PNG/JPG) ឬ Link
                  </p>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif, image/*"
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
                    <span>ជ្រើសរើសរូប (Phone/PC)</span>
                  </button>

                  {/* Direct Camera on Phones */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50 sm:hidden"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ថតរូបផ្ទាល់</span>
                  </button>

                  {/* Remove Button */}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-bold flex items-center gap-1 border border-red-200 dark:border-red-900/50 cursor-pointer transition-all"
                      title="លុបរូបភាព Profile ចេញ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>លុបរូប</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Paste Google Drive / Web Image Link Option */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ឬបិទភ្ជាប់ Google Drive Link / Web Image URL
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... ឬ Image URL"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  disabled={!linkInput.trim()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors shrink-0"
                >
                  ភ្ជាប់រូប
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

            {/* Teacher Details Edit */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ឈ្មោះគ្រូបង្រៀន</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  placeholder="ឧ. ខេង ខី"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>មុខវិជ្ជាបង្រៀន</span>
                  </label>
                  <input
                    type="text"
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    placeholder="ឧ. រូបវិទ្យា"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-500" />
                    <span>សាលារៀន</span>
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    placeholder="ឧ. សាលារៀនសុវណ្ណភូមិ"
                  />
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
                  <span>ចាកចេញពីគណនី</span>
                </button>
              ) : <div />}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isProcessing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all disabled:opacity-50"
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
