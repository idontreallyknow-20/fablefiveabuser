import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display text-3xl font-light text-ink">Nothing out here.</h1>
      <p className="max-w-sm text-sm text-ink-faint">
        That page drifted out of orbit. Everything you saved is still on this device.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Link
          href="/today"
          className="rounded-xl border border-(--accent)/35 bg-accent-soft px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-(--accent)/22 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
        >
          Back to today
        </Link>
        <Link href="/about" className="px-2 py-2 text-[13px] text-ink-faint transition-colors hover:text-ink-dim">
          About Orbit
        </Link>
      </div>
    </main>
  );
}
