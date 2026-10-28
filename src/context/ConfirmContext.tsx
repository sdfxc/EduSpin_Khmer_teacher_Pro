import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm?: () => void | Promise<void>;
}

export type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

export interface ConfirmContextType {
  confirmAction: (options: ConfirmOptions) => void;
  confirm: ConfirmFunction;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode; isDarkMode?: boolean }> = ({ 
  children, 
  isDarkMode = false 
}) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: 'តើអ្នកពិតជាចង់លុបមែនឬទេ?',
    message: '',
    confirmText: 'លុប',
    cancelText: 'ទេ',
    variant: 'danger',
    onConfirm: () => {}
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirmAction = useCallback((options: ConfirmOptions) => {
    resolverRef.current = null;
    setModalState({
      isOpen: true,
      title: options.title || 'តើអ្នកពិតជាចង់លុបមែនឬទេ?',
      message: options.message,
      confirmText: options.confirmText || 'លុប',
      cancelText: options.cancelText || 'ទេ',
      variant: options.variant || 'danger',
      onConfirm: options.onConfirm || (() => {})
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title: options.title || 'តើអ្នកពិតជាចង់លុបមែនឬទេ?',
        message: options.message,
        confirmText: options.confirmText || 'លុប',
        cancelText: options.cancelText || 'ទេ',
        variant: options.variant || 'danger',
        onConfirm: async () => {
          if (options.onConfirm) {
            await options.onConfirm();
          }
          resolve(true);
        }
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
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
    <ConfirmContext.Provider value={{ confirmAction, confirm }}>
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
  // Return a callable function that also has .confirmAction and .confirm properties
  const callable = (options: ConfirmOptions) => context.confirm(options);
  callable.confirmAction = context.confirmAction;
  callable.confirm = context.confirm;
  return callable as unknown as ConfirmFunction & ConfirmContextType;
};

