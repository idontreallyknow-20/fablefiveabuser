"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";

/** labeled native select styled to match Field inputs */
export function LabeledSelect({
  label,
  children,
  className = "",
  id,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-[13px] font-medium text-ink-dim">
        {label}
      </label>
      <select
        id={selectId}
        className={
          "h-11 w-full rounded-xl border border-line bg-bg1 px-3 text-sm text-ink " +
          "transition-colors duration-[var(--dur-base)] hover:border-line-strong " +
          "focus:border-(--accent)/50 focus:outline-none disabled:opacity-45 " +
          className
        }
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
