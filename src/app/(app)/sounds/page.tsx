"use client";

import { SoundBoard } from "@/components/soundboard/SoundBoard";

export default function SoundsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
      <h1 className="display mt-2 text-[26px] font-medium tracking-tight text-ink">Sounds</h1>
      <div className="surface rounded-2xl p-5">
        <SoundBoard cols={4} />
      </div>
    </div>
  );
}
