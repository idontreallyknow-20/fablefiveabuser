"use client";

import { TodaySession } from "@/components/train/TodaySession";
import { Records } from "@/components/train/Records";
import { BodyNotes } from "@/components/train/BodyNotes";
import { SessionHistory } from "@/components/train/SessionHistory";

export default function TrainPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="rise mb-8 mt-[3vh]">
        <p className="eyebrow mb-2">Train</p>
        <h1 className="display text-[28px] text-ink">Strength, skills, recovery</h1>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
            <TodaySession />
          </div>
          <div className="rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
            <SessionHistory />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
            <Records />
          </div>
          <div className="rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
            <BodyNotes />
          </div>
        </div>
      </div>
    </div>
  );
}
