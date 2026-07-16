"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // simple focus trap
        const focusables = ref.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fade fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`rise surface-overlay max-h-[88vh] w-full overflow-y-auto rounded-b-none p-5 md:rounded-2xl ${
          wide ? "md:max-w-2xl" : "md:max-w-md"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-lg text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-bg1 hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  body: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm text-ink-dim">{body}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="h-10 rounded-xl border border-line bg-bg1 px-4 text-sm font-medium text-ink transition-colors hover:bg-bg2"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            await onConfirm();
            onClose();
          }}
          className={`h-10 rounded-xl border px-4 text-sm font-medium transition-colors ${
            destructive
              ? "border-(--danger)/35 bg-danger-soft text-danger hover:bg-(--danger)/24"
              : "border-(--accent)/35 bg-accent-soft text-accent hover:bg-(--accent)/22"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
