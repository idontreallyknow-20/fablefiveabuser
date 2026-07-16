"use client";

import { useState } from "react";
import {
  useCreateRelationshipItem,
  useDeleteRelationshipItem,
  useRelationshipItems,
  useUpdateRelationshipItem,
  type RelationshipItem,
} from "@/lib/data/selfcare";
import { ActionButton, Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { LabeledSelect } from "@/components/train/Select";
import { IconCheck, IconTrash } from "@/components/ui/Icons";

const KINDS: { value: string; label: string }[] = [
  { value: "meaningful_checkin", label: "Meaningful check-in" },
  { value: "quality_time", label: "Quality time" },
  { value: "planned_activity", label: "Planned activity" },
  { value: "important_date", label: "Important date" },
  { value: "personal_reminder", label: "Personal reminder" },
  { value: "private_note", label: "Private note" },
];

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  KINDS.map((k) => [k.value, k.label]),
);

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function CloseToYou() {
  const { data: items = [], isLoading } = useRelationshipItems();
  const create = useCreateRelationshipItem();
  const update = useUpdateRelationshipItem();
  const del = useDeleteRelationshipItem();

  const [kind, setKind] = useState("meaningful_checkin");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  return (
    <section className="surface p-5" aria-label="Close to you">
      <p className="eyebrow mb-1.5">Close to you</p>
      <p className="mb-4 text-[13px] text-ink-faint">
        This stays private. It is a place to be thoughtful, not a scoreboard.
      </p>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LabeledSelect label="Kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </LabeledSelect>
          <Field
            label="Date (optional)"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Field
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          
        />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <ActionButton
            variant="primary"
            size="md"
            disabled={!title.trim()}
            onAction={async () => {
              await create.mutateAsync({
                kind,
                title: title.trim(),
                note: note.trim(),
                date: date || null,
              });
              setTitle("");
              setNote("");
              setDate("");
            }}
          >
            Add
          </ActionButton>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-ink-faint">Loading</p>
      ) : items.length > 0 ? (
        <ul className="mt-4">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={() => update.mutate({ id: item.id, patch: { done: !item.done } })}
              onDelete={() => del.mutate(item.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">Nothing here yet.</p>
      )}
    </section>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: RelationshipItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-start gap-3 border-t border-line py-2.5 first:border-t-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
        onClick={onToggle}
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          "transition-colors duration-[var(--dur-base)]",
          item.done
            ? "border-(--accent)/50 bg-accent-soft text-accent"
            : "border-line-strong bg-bg1 text-transparent hover:border-(--accent)/40",
        ].join(" ")}
      >
        <IconCheck size={11} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`text-sm ${item.done ? "text-ink-faint" : "text-ink"}`}>
            {item.title}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            {KIND_LABELS[item.kind] ?? item.kind}
          </span>
          {item.date && (
            <span className="tnum text-[12px] text-ink-faint">{fmtDate(item.date)}</span>
          )}
        </div>
        {item.note && <p className="text-[13px] text-ink-faint">{item.note}</p>}
      </div>
      <Button
        variant="icon"
        size="sm"
        aria-label={`Delete "${item.title}"`}
        onClick={onDelete}
      >
        <IconTrash size={14} />
      </Button>
    </li>
  );
}
