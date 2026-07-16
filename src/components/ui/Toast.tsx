"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  kind: "info" | "success" | "error";
  action?: { label: string; onClick: () => void };
}

interface ToastCtx {
  toast: (message: string, kind?: Toast["kind"], action?: Toast["action"]) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback(
    (message: string, kind: Toast["kind"] = "info", action?: Toast["action"]) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, kind, action }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6500 : 3500);
    },
    [],
  );

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rise pointer-events-auto flex w-auto items-center gap-3 rounded-xl surface-overlay px-4 py-2.5 text-sm"
          >
            <span
              className={
                t.kind === "success"
                  ? "text-ok"
                  : t.kind === "error"
                    ? "text-danger"
                    : "text-ink-dim"
              }
            >
              {t.message}
            </span>
            {t.action && (
              <button
                className="shrink-0 font-medium text-accent hover:underline"
                onClick={() => {
                  t.action?.onClick();
                  setToasts((x) => x.filter((y) => y.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
