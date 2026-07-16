"use client";

import { forwardRef, useState, type ButtonHTMLAttributes } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "quiet"
  | "destructive"
  | "icon"
  | "media"
  | "floating";

type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** brief success/error feedback set by the caller after an action resolves */
  feedback?: "success" | "error" | null;
}

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium select-none " +
  "transition-[background,border-color,color,transform,opacity] duration-[var(--dur-base)] ease-(--ease-out) " +
  "focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2 " +
  "disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-soft text-accent border border-(--accent)/35 hover:bg-(--accent)/22 rounded-xl",
  secondary:
    "bg-bg1 text-ink border border-line hover:bg-bg2 hover:border-line-strong rounded-xl",
  quiet: "bg-transparent text-ink-dim hover:text-ink hover:bg-bg1 rounded-lg",
  destructive:
    "bg-danger-soft text-danger border border-(--danger)/35 hover:bg-(--danger)/24 rounded-xl",
  icon: "bg-transparent text-ink-dim hover:text-ink hover:bg-bg1 rounded-lg",
  media:
    "bg-bg2 text-ink border border-line hover:bg-bg3 hover:border-line-strong rounded-full",
  floating: "floating text-ink rounded-full hover:border-line-strong",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

const iconSizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    feedback = null,
    className = "",
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const isIconLike = variant === "icon" || variant === "media";
  return (
    <button
      ref={ref}
      className={[
        base,
        variants[variant],
        isIconLike ? iconSizes[size] : sizes[size],
        feedback === "success" ? "!text-ok !border-(--ok)/40" : "",
        feedback === "error" ? "!text-danger !border-(--danger)/40" : "",
        className,
      ].join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
            style={{ animation: "spin 0.7s linear infinite" }}
            aria-hidden
          />
          <span className="sr-only">Working</span>
          <span className="invisible contents">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

/** async action button: shows loading, then brief success/error feedback */
export function ActionButton({
  onAction,
  children,
  ...props
}: Omit<ButtonProps, "onClick" | "loading" | "feedback"> & {
  onAction: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  return (
    <Button
      {...props}
      loading={loading}
      feedback={feedback}
      onClick={async () => {
        setLoading(true);
        try {
          await onAction();
          setFeedback("success");
        } catch {
          setFeedback("error");
        } finally {
          setLoading(false);
          setTimeout(() => setFeedback(null), 1600);
        }
      }}
    >
      {children}
    </Button>
  );
}
