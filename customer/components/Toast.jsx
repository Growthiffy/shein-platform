"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";

const ToastCtx = createContext(() => {});
export function useToast() { return useContext(ToastCtx); }

const ICON = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: XCircle };
const ACCENT = { success: "#34d399", info: "#ff3e6d", warning: "#f6c453", error: "#f87171" };

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  const toast = useCallback(({ text, type = "info", duration = 4000 }) => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, text, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-20 md:bottom-5 right-4 z-[100] flex flex-col gap-2 max-w-[90vw]">
        {toasts.map(t => {
          const Icon = ICON[t.type] || Info;
          return (
            <div key={t.id} className="toast-in flex items-start gap-3 rounded-xl bg-ink text-cream shadow-xl border w-80 max-w-full p-3"
              style={{ borderColor: (ACCENT[t.type] || ACCENT.info) + "55", boxShadow: "0 12px 30px -12px rgba(0,0,0,.4)" }}>
              <Icon size={18} style={{ color: ACCENT[t.type] || ACCENT.info }} className="mt-0.5 shrink-0" />
              <div className="text-sm flex-1">{t.text}</div>
              <button onClick={() => remove(t.id)} className="text-cream/40 hover:text-cream shrink-0"><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
