"use client";

import { useEffect, useRef, useState } from "react";
import { useCheckin, useUpsertCheckin, type Checkin as CheckinRow } from "@/lib/data/selfcare";
import { todayISO } from "@/lib/data/tasks";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { DotScale } from "@/components/reflect/DotScale";
import { useToast } from "@/components/ui/Toast";

interface FormState {
  mood: number | null;
  energy: number | null;
  stress: number | null;
  sleep_quality: number | null;
  note: string;
  what_helped: string;
  what_was_hard: string;
}

function toForm(c: CheckinRow | null): FormState {
  return {
    mood: c?.mood ?? null,
    energy: c?.energy ?? null,
    stress: c?.stress ?? null,
    sleep_quality: c?.sleep_quality ?? null,
    note: c?.note ?? "",
    what_helped: c?.what_helped ?? "",
    what_was_hard: c?.what_was_hard ?? "",
  };
}

export function Checkin() {
  const date = todayISO();
  const { data: checkin, isLoading } = useCheckin(date);

  return (
    <section className="surface p-5" aria-label="Check-in">
      <p className="eyebrow mb-3">Check-in</p>
      {isLoading ? (
        <p className="text-sm text-ink-faint">Loading</p>
      ) : (
        <CheckinForm key={date} date={date} initial={checkin ?? null} />
      )}
    </section>
  );
}

function CheckinForm({ date, initial }: { date: string; initial: CheckinRow | null }) {
  const upsert = useUpsertCheckin();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const persist = async (values: FormState) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await upsert.mutateAsync({ date, patch: { ...values } });
  };

  const scheduleWith = (values: FormState) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist(values).catch(() => {
        /* quiet; the next change or the save button will retry */
      });
    }, 900);
  };

  const commit = (patch: Partial<FormState>) => {
    const next = { ...form, ...patch };
    setForm(next);
    scheduleWith(next);
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <DotScale label="Mood" value={form.mood} onChange={(v) => commit({ mood: v })} />
        <DotScale label="Energy" value={form.energy} onChange={(v) => commit({ energy: v })} />
        <DotScale label="Stress" value={form.stress} onChange={(v) => commit({ stress: v })} />
        <DotScale
          label="Sleep quality"
          value={form.sleep_quality}
          onChange={(v) => commit({ sleep_quality: v })}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
        <TextArea
          label="A short note"
          rows={2}
          value={form.note}
          onChange={(e) => commit({ note: e.target.value })}
          
        />
        <Field
          label="What helped"
          value={form.what_helped}
          onChange={(e) => commit({ what_helped: e.target.value })}
        />
        <Field
          label="What made the day harder"
          value={form.what_was_hard}
          onChange={(e) => commit({ what_was_hard: e.target.value })}
        />
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          variant="quiet"
          size="sm"
          disabled={upsert.isPending}
          onClick={async () => {
            try {
              await persist(form);
              toast("Saved", "success");
            } catch {
              toast("Could not save just now", "error");
            }
          }}
        >
          Save
        </Button>
      </div>
    </>
  );
}
