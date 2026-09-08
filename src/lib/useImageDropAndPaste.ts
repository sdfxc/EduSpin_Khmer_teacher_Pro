import { useState, useEffect, useCallback, DragEvent } from 'react';
import { compressAndResizeImage } from './imageUtils';
import { formatGoogleDriveImageUrl } from './driveUtils';

interface UseImageDropAndPasteOptions {
  isOpen: boolean;
  onImageReady: (dataUrlOrUrl: string) => void;
  setIsProcessing: (loading: boolean) => void;
  setStatusMsg: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export function useImageDropAndPaste({
  isOpen,
  onImageReady,
  setIsProcessing,
  setStatusMsg,
}: UseImageDropAndPasteOptions) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Process a File or Blob image
  const processImageFile = useCallback(async (file: File | Blob, source: 'drop' | 'paste' | 'upload') => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const compressed = await compressAndResizeImage(file as File, 512, 0.85);
      onImageReady(compressed);
      setStatusMsg({
        type: 'success',
        text: source === 'paste' 
          ? 'បានបិទភ្ជាប់រូបភាពពី Clipboard ជោគជ័យ! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
          : source === 'drop'
          ? 'បានទម្លាក់រូបភាពជោគជ័យ! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
          : 'បានជ្រើសរើសរូបភាពជោគជ័យ! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
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
  }, [onImageReady, setIsProcessing, setStatusMsg]);

  // Process a URL or web image source
  const processImageUrl = useCallback((rawUrl: string, source: 'drop' | 'paste') => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    const formatted = formatGoogleDriveImageUrl(trimmed);
    onImageReady(formatted);
    setStatusMsg({
      type: 'success',
      text: source === 'paste'
        ? 'បានបិទភ្ជាប់ Link រូបភាពជោគជ័យ! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
        : 'បានទម្លាក់ Link រូបភាពជោគជ័យ! សូមចុច "រក្សាទុកការផ្លាស់ប្ដូរ"'
    });
  }, [onImageReady, setStatusMsg]);

  // Handle Drag Over & Enter
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  }, [isDraggingOver]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if left the actual container, not moving to a child
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  }, []);

  // Handle Drop
  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // 1. Check for files dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      const file = droppedFiles.find(f => f.type.startsWith('image/')) || droppedFiles[0];
      if (file && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(file.name))) {
        await processImageFile(file, 'drop');
        return;
      }
    }

    // 2. Check for HTML <img> dropped from another tab/browser
    const html = e.dataTransfer.getData('text/html');
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        processImageUrl(match[1], 'drop');
        return;
      }
    }

    // 3. Check for uri-list or plain text URL dropped
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image/'))) {
      processImageUrl(uri, 'drop');
      return;
    }
  }, [processImageFile, processImageUrl]);

  // Handle Clipboard Paste (Ctrl+V / Cmd+V)
  const handlePasteEvent = useCallback(async (e: globalThis.ClipboardEvent) => {
    if (!isOpen) return;

    // Check clipboard items for image blob (e.g. screenshot or copied image file)
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await processImageFile(file, 'paste');
            return;
          }
        }
      }
    }

    // If focus is inside a text input or textarea, let normal text paste proceed unless not in an input
    const activeEl = document.activeElement;
    const isEditingText = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    // Check for pasted image/drive URL
    const pastedText = e.clipboardData?.getData('text/plain')?.trim();
    if (pastedText && !isEditingText) {
      if (
        pastedText.startsWith('data:image/') ||
        pastedText.includes('drive.google.com') ||
        pastedText.includes('googleusercontent.com') ||
        /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(pastedText) ||
        (pastedText.startsWith('http') && (pastedText.includes('photo') || pastedText.includes('image') || pastedText.includes('avatar') || pastedText.includes('img')))
      ) {
        e.preventDefault();
        processImageUrl(pastedText, 'paste');
      }
    }
  }, [isOpen, processImageFile, processImageUrl]);

  // Manual Trigger: Paste from Clipboard button
  const pasteFromClipboard = useCallback(async () => {
    setStatusMsg(null);
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            await processImageFile(blob, 'paste');
            return;
          }
        }
      }

      // Fallback: check text for URL
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (
          text.startsWith('http://') || 
          text.startsWith('https://') || 
          text.startsWith('data:image/') ||
          text.includes('drive.google.com') ||
          text.includes('googleusercontent.com')
        ) {
          processImageUrl(text, 'paste');
          return;
        }
      }

      setStatusMsg({
        type: 'error',
        text: 'ពុំមានរូបភាព ឬ Link រូបភាពក្នុង Clipboard ទេ។ សូមចុច Copy រូបភាព រួចចុចបិទភ្ជាប់ (Paste) ម្ដងទៀត!'
      });
    } catch (err) {
      console.warn('Clipboard read failed or permission denied:', err);
      setStatusMsg({
        type: 'error',
        text: 'សូមចុច Ctrl+V (ឬ Cmd+V) ដើម្បីបិទភ្ជាប់រូបភាពពី Clipboard ដោយផ្ទាល់!'
      });
    }
  }, [processImageFile, processImageUrl, setStatusMsg]);

  // Global window paste listener when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const listener = (e: globalThis.ClipboardEvent) => {
      handlePasteEvent(e);
    };
    window.addEventListener('paste', listener);
    return () => {
      window.removeEventListener('paste', listener);
    };
  }, [isOpen, handlePasteEvent]);

  return {
    isDraggingOver,
    dragProps: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    pasteFromClipboard,
    processImageFile,
    processImageUrl,
  };
}
