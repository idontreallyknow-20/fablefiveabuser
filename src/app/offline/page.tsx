import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow">Offline</p>
      <h1 className="display text-2xl font-light text-ink">The city is still there.</h1>
      <p className="max-w-sm text-sm text-ink-faint">
        Orbit needs a connection to reach your data. It will pick up where you left off
        as soon as you are back online.
      </p>
      <Link href="/today" className="mt-2 text-sm text-accent hover:underline">
        Try again
      </Link>
    </main>
  );
}
