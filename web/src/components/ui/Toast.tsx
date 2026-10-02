import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastItem[];
  show: (options: ToastOptions) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const show = useCallback(
    ({ type = 'info', title, message, duration = 4000 }: ToastOptions): string => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, title: string = 'Éxito') => show({ type: 'success', title, message }),
    [show]
  );

  const error = useCallback(
    (message: string, title: string = 'Error') => show({ type: 'error', title, message }),
    [show]
  );

  const warning = useCallback(
    (message: string, title: string = 'Advertencia') => show({ type: 'warning', title, message }),
    [show]
  );

  const info = useCallback(
    (message: string, title: string = 'Información') => show({ type: 'info', title, message }),
    [show]
  );

  return (
    <ToastContext.Provider value={{ toasts, show, success, error, warning, info, dismiss, clear }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-primary-600 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/50',
    error: 'border-red-200 bg-red-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
    info: 'border-primary-200 bg-primary-50/50',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border bg-white shadow-lg shadow-slate-200/50 transition-all duration-200 ease-out',
        borders[toast.type]
      )}
      role="alert"
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        {toast.title && <h4 className="text-xs font-semibold text-slate-900 leading-tight mb-0.5">{toast.title}</h4>}
        <p className="text-xs text-slate-700 leading-normal break-words">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors shrink-0"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
