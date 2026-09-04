"use client";

import * as React from "react";

interface ToastProps {
  children: React.ReactNode;
  className?: string;
}

const ToastContext = React.createContext<{
  toast: (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<
    { id: number; title?: string; description?: string; variant?: "default" | "destructive" }[]
  >([]);

  const toast = React.useCallback(
    (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, ...props }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 shadow-lg animate-slide-up ${
              t.variant === "destructive"
                ? "border-destructive/20 bg-destructive text-destructive-foreground"
                : "border-border bg-card text-card-foreground"
            }`}
          >
            {t.title && <div className="text-sm font-semibold">{t.title}</div>}
            {t.description && <div className="text-xs opacity-80">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Toaster() {
  return <ToastProvider><div /></ToastProvider>;
}
