import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
}

interface ConfirmContextType {
  confirmAction: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode; isDarkMode?: boolean }> = ({ 
  children, 
  isDarkMode = false 
}) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  const confirmAction = useCallback((options: ConfirmOptions) => {
    setModalState({
      isOpen: true,
      title: options.title || 'បញ្ជាក់ការលុប',
      message: options.message,
      confirmText: options.confirmText || 'បាទ/ចាស លុប',
      cancelText: options.cancelText || 'បោះបង់',
      variant: options.variant || 'danger',
      onConfirm: options.onConfirm
    });
  }, []);

  const handleClose = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      await modalState.onConfirm();
    } catch (e) {
      console.error('Error executing confirmed action:', e);
    }
  }, [modalState]);

  return (
    <ConfirmContext.Provider value={{ confirmAction }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
        isDarkMode={isDarkMode}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
