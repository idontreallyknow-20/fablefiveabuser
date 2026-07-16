"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLocalDisplayId } from "@/lib/displays/useDisplays";

export default function DisplayRedirect() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const id = getLocalDisplayId();
    if (id) router.replace(`/display/${id}`);
    else setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-ink-dim">This screen is not registered yet.</p>
      <Link href="/space/displays" className="text-sm text-accent hover:underline">
        Register it in Space
      </Link>
    </main>
  );
}
