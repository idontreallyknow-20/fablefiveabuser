"use client";

// Quick capture — the PWA share target and a standalone add box. Shared
// title/text/url prefill the input; NL dates apply on save.

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCreateTask } from "@/lib/data/tasks";
import { Button } from "@/components/ui/Button";
import { parseEntry } from "@/lib/nlp/date";

function CaptureForm() {
  const params = useSearchParams();
  const router = useRouter();
  const createTask = useCreateTask();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => {
    const title = params.get("title") ?? "";
    const text = params.get("text") ?? "";
    return [title, text].filter(Boolean).join(" — ").slice(0, 300);
  });
  const sharedUrl = params.get("url");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || saved) return;
    setSaved(true);
    const parsed = parseEntry(trimmed);
    await createTask.mutateAsync({
      title: parsed.title || trimmed,
      due_date: parsed.dueDate,
      scheduled_at: parsed.scheduledAt,
      ...(sharedUrl ? { links: [sharedUrl] } : {}),
    });
    router.replace("/today");
  };

  const parsed = parseEntry(value);

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col justify-center">
      <p className="eyebrow rise mb-3">Capture</p>
      <div className="rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
          aria-label="Task"
          placeholder="Type a task"
          className="h-13 w-full rounded-2xl border border-line bg-bg1 px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-(--accent)/50 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="tnum font-mono text-[11px] text-ink-faint">
            {parsed.dueDate ?? ""}
          </span>
          {sharedUrl && (
            <span className="max-w-[60%] truncate font-mono text-[11px] text-ink-faint">
              {sharedUrl}
            </span>
          )}
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={!value.trim() || saved}
            loading={saved}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense>
      <CaptureForm />
    </Suspense>
  );
}
