'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], action?: Toast['action']) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    type: Toast['type'] = 'success',
    action?: Toast['action']
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, action };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after 5 seconds if no action
    if (!action) {
      setTimeout(() => {
        hideToast(id);
      }, 5000);
    } else {
      // Keep longer if there's an action button
      setTimeout(() => {
        hideToast(id);
      }, 8000);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : undefined}
            className="pointer-events-auto animate-slide-up bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-[500px]"
          >
            {/* Icon */}
            {toast.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
            )}

            {/* Message */}
            <span className="flex-1 text-sm">{toast.message}</span>

            {/* Action Button */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  hideToast(toast.id);
                }}
                className="px-3 py-1 bg-white text-gray-900 rounded font-medium text-sm hover:bg-gray-100 transition-colors"
              >
                {toast.action.label}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => hideToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
