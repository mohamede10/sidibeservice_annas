'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_EVENT = 'sidibe-toast';

export function emitToast(message: string, type: ToastType = 'info', title?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type, title } }));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, message, title, type, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title || 'Succès');
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast(message, 'error', title || 'Erreur', 6000);
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', title || 'Attention', 5000);
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title || 'Information');
  }, [showToast]);

  useEffect(() => {
    const onToastEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; type?: ToastType; title?: string }>).detail;
      if (!detail?.message) return;
      showToast(detail.message, detail.type || 'info', detail.title);
    };
    window.addEventListener(TOAST_EVENT, onToastEvent);
    return () => window.removeEventListener(TOAST_EVENT, onToastEvent);
  }, [showToast]);

  // Intercepter window.alert pour que RIEN n'affiche jamais la boîte Chrome "localhost:3000 indique :"
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (msg?: any) => {
        const text = String(msg ?? '');
        // Détecter automatiquement le type d'après le message
        const isErr = /erreur|échoué|impossible|invalide|requis|manquant/i.test(text);
        const isSuccess = /succès|enregistré|supprimé|validé|effectué/i.test(text);
        const isWarn = /attention|stock insuffisant|max atteint/i.test(text);

        if (isErr) {
          showError(text);
        } else if (isSuccess) {
          showSuccess(text);
        } else if (isWarn) {
          showWarning(text);
        } else {
          showInfo(text);
        }
      };

      return () => {
        window.alert = originalAlert;
      };
    }
  }, [showError, showSuccess, showWarning, showInfo]);

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showWarning, showInfo, removeToast }}
    >
      {children}

      {/* Toast Notification Container — Always on top of modals */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            const isWarning = toast.type === 'warning';

            const bgClass = isSuccess
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-emerald-500/10'
              : isError
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-rose-500/10'
              : isWarning
              ? 'bg-amber-950/95 border-amber-500/40 text-amber-100 shadow-amber-500/10'
              : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-900/40';

            const iconClass = isSuccess
              ? 'text-emerald-400'
              : isError
              ? 'text-rose-400'
              : isWarning
              ? 'text-amber-400'
              : 'text-sky-400';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
                className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all ${bgClass}`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${iconClass}`}>
                  {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                  {isError && <XCircle className="w-5 h-5" />}
                  {isWarning && <AlertTriangle className="w-5 h-5" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  {toast.title && (
                    <h5 className="text-xs font-black uppercase tracking-wider mb-0.5 opacity-90">
                      {toast.title}
                    </h5>
                  )}
                  <p className="text-xs font-medium leading-relaxed break-words">{toast.message}</p>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-colors flex-shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
