import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow">Offline</p>
      <h1 className="display text-2xl font-light text-ink">The city is still there.</h1>
      <p className="max-w-sm text-sm text-ink-faint">
        This page hasn&apos;t been saved for offline use yet. Your data is safe on this
        device and will be right here once you&apos;re back online.
      </p>
      <Link href="/today" className="mt-2 text-sm text-accent hover:underline">
        Try again
      </Link>
    </main>
  );
}
