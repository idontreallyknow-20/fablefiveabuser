"use client";

import { useState } from "react";
import {
  useCreateRecoveryNote,
  useDeleteRecoveryNote,
  useRecoveryNotes,
} from "@/lib/data/fitness";
import { todayISO } from "@/lib/data/tasks";
import { ActionButton, Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { DotScale } from "@/components/reflect/DotScale";
import { IconTrash } from "@/components/ui/Icons";

type NoteKind = "pain" | "tension" | "physio" | "mobility" | "recovery";

const KIND_OPTIONS: { value: NoteKind; label: string }[] = [
  { value: "pain", label: "Pain" },
  { value: "tension", label: "Tension" },
  { value: "physio", label: "Physio" },
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
];

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  KIND_OPTIONS.map((k) => [k.value, k.label]),
);

export function BodyNotes() {
  const { data: notes = [], isLoading } = useRecoveryNotes(20);
  const create = useCreateRecoveryNote();
  const del = useDeleteRecoveryNote();

  const [kind, setKind] = useState<NoteKind>("recovery");
  const [bodyArea, setBodyArea] = useState("");
  const [severity, setSeverity] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const withSeverity = kind === "pain" || kind === "tension";
  const canAdd = bodyArea.trim().length > 0 || note.trim().length > 0;

  return (
    <section className="surface p-5" aria-label="Body notes">
      <p className="eyebrow mb-3">Body notes</p>

      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <Segmented
            label="Kind of note"
            value={kind}
            onChange={setKind}
            options={KIND_OPTIONS}
            size="sm"
          />
        </div>
        <Field
          label="Body area"
          value={bodyArea}
          onChange={(e) => setBodyArea(e.target.value)}
          
        />
        {withSeverity && <DotScale label="Severity" value={severity} onChange={setSeverity} />}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              
            />
          </div>
          <ActionButton
            variant="primary"
            size="md"
            disabled={!canAdd}
            onAction={async () => {
              await create.mutateAsync({
                kind,
                body_area: bodyArea.trim(),
                severity: withSeverity ? severity : null,
                note: note.trim(),
                date: todayISO(),
              });
              setBodyArea("");
              setSeverity(null);
              setNote("");
            }}
          >
            Add
          </ActionButton>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-ink-faint">Loading</p>
      ) : notes.length > 0 ? (
        <ul className="mt-4">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                    {KIND_LABELS[n.kind] ?? n.kind}
                  </span>
                  {n.body_area && <span className="text-sm text-ink">{n.body_area}</span>}
                  {n.severity != null && (
                    <span className="tnum text-[12px] text-ink-faint">{n.severity}/5</span>
                  )}
                  <span className="tnum text-[11px] text-ink-faint">{n.date}</span>
                </div>
                {n.note && <p className="text-[13px] text-ink-dim">{n.note}</p>}
              </div>
              <Button
                variant="icon"
                size="sm"
                aria-label={`Delete note about ${n.body_area || KIND_LABELS[n.kind] || n.kind}`}
                onClick={() => del.mutate(n.id)}
              >
                <IconTrash size={14} />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">Nothing noted. That is good news too.</p>
      )}

      <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-faint">
        Pain is information, not a challenge. Train around it, not through it.
      </p>
    </section>
  );
}
