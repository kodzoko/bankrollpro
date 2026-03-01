"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
};

type ToastContextValue = {
  push: (toast: Omit<ToastItem, "id"> & { durationMs?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, "id"> & { durationMs?: number }) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const durationMs = toast.durationMs ?? 2200;

      const item: ToastItem = {
        id,
        type: toast.type,
        title: toast.title,
        message: toast.message,
      };

      setToasts((prev) => [...prev, item]);

      window.setTimeout(() => remove(id), durationMs);
    },
    [remove]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast stack */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            role="button"
            style={{
              cursor: "pointer",
              borderRadius: 12,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              background: "white",
              boxShadow: "0 10px 30px rgba(2, 6, 23, 0.12)",
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background:
                    t.type === "success"
                      ? "#16a34a"
                      : t.type === "error"
                      ? "#dc2626"
                      : "#2563eb",
                }}
              />
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {t.title ?? (t.type === "success" ? "Success" : t.type === "error" ? "Error" : "Info")}
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15, 23, 42, 0.8)" }}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ✅ default export da veriyoruz ki import hatası olmasın
export default ToastProvider;