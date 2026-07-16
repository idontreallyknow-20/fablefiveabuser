"use client";

import { Checkin } from "@/components/reflect/Checkin";
import { SelfcareToday } from "@/components/reflect/SelfcareToday";
import { CloseToYou } from "@/components/reflect/CloseToYou";
import { LookingBack } from "@/components/reflect/LookingBack";

export default function ReflectPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="rise mb-8 mt-[3vh]">
        <p className="eyebrow mb-2">Reflect</p>
        <h1 className="display text-[28px] text-ink">A quiet look at the day</h1>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
            <Checkin />
          </div>
          <div className="rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
            <LookingBack />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
            <SelfcareToday />
          </div>
          <div className="rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
            <CloseToYou />
          </div>
        </div>
      </div>
    </div>
  );
}
