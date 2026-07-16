"use client";

import { useState } from "react";
import {
  NERF_PLATFORMS,
  NERF_STAGES,
  parseMetrics,
  useDeleteNerfItem,
  useUpdateNerfItem,
  type NerfItem,
  type NerfMetrics,
} from "@/lib/data/nerf";
import type { Json } from "@/lib/db/types";
import { Modal, Confirm } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const selectCls =
  "h-9 rounded-lg border border-line bg-bg1 px-2 text-[13px] text-ink " +
  "transition-colors duration-[var(--dur-base)] hover:border-line-strong focus:outline-none";

const METRIC_FIELDS: { key: keyof NerfMetrics; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "followers_gained", label: "Followers gained" },
];

const REPURPOSE_OPTIONS = [
  { value: "", label: "not planned" },
  { value: "planned", label: "planned" },
  { value: "in_progress", label: "in progress" },
  { value: "done", label: "done" },
];

export function ContentEditor({
  item,
  onClose,
}: {
  item: NerfItem | null;
  onClose: () => void;
}) {
  if (!item) return null;
  return <ContentEditorForm key={item.id} item={item} onClose={onClose} />;
}

function ContentEditorForm({ item, onClose }: { item: NerfItem; onClose: () => void }) {
  const update = useUpdateNerfItem();
  const del = useDeleteNerfItem();
  const { toast } = useToast();

  const [stage, setStage] = useState<string>(item.stage);
  const [hook, setHook] = useState(item.hook);
  const [concept, setConcept] = useState(item.concept);
  const [platforms, setPlatforms] = useState<string[]>(item.platforms);
  const [format, setFormat] = useState(item.format);
  const [caption, setCaption] = useState(item.caption);
  const [cta, setCta] = useState(item.cta);
  const [link, setLink] = useState(item.link);
  const [publishDate, setPublishDate] = useState(item.publish_date ?? "");
  const [nextAction, setNextAction] = useState(item.next_action);
  const [notes, setNotes] = useState(item.notes);
  const [repurpose, setRepurpose] = useState(item.repurpose_status);
  const [metrics, setMetrics] = useState<NerfMetrics>(() => parseMetrics(item.metrics));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showMetrics = stage === "posted" || stage === "review";

  const togglePlatform = (p: string) => {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };

  const save = async () => {
    await update.mutateAsync({
      id: item.id,
      patch: {
        stage,
        hook,
        concept,
        platforms,
        format: format.trim(),
        caption,
        cta: cta.trim(),
        link: link.trim(),
        publish_date: publishDate || null,
        next_action: nextAction.trim(),
        notes,
        repurpose_status: repurpose,
        metrics: metrics as unknown as Json,
      },
    });
    onClose();
  };

  return (
    <>
      <Modal open onClose={onClose} title="Content item" wide>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nerf-next-action" className="text-[13px] font-medium text-ink-dim">
              Next action
            </label>
            <input
              id="nerf-next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="h-11 w-full rounded-xl border border-(--accent)/30 bg-accent-soft px-3.5 text-accent placeholder:text-ink-faint transition-colors duration-[var(--dur-base)] hover:border-(--accent)/50 focus:border-(--accent)/60 focus:outline-none"
            />
            <p className="text-[13px] text-ink-faint">The single next step for this piece.</p>
          </div>

          <TextArea label="Hook" value={hook} onChange={(e) => setHook(e.target.value)} rows={2} />
          <TextArea
            label="Concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            rows={2}
          />

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nerf-stage" className="text-[13px] font-medium text-ink-dim">
                Stage
              </label>
              <select
                id="nerf-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className={selectCls}
              >
                {NERF_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">Platforms</span>
              <div className="flex gap-1.5" role="group" aria-label="Platforms">
                {NERF_PLATFORMS.map((p) => {
                  const active = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePlatform(p)}
                      className={`h-9 rounded-lg border px-3 text-[13px] transition-colors duration-[var(--dur-base)] ${
                        active
                          ? "border-(--accent)/40 bg-accent-soft text-accent"
                          : "border-line bg-bg1 text-ink-faint hover:border-line-strong hover:text-ink-dim"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-36">
              <Field
                label="Format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="talking head"
                className="!h-9 text-[13px]"
              />
            </div>

            <div className="w-40">
              <Field
                label="Publish date"
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="tnum !h-9 font-mono text-[13px]"
              />
            </div>
          </div>

          <TextArea
            label="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Call to action" value={cta} onChange={(e) => setCta(e.target.value)} />
            <Field
              label="Link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
            />
          </div>

          <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nerf-repurpose" className="text-[13px] font-medium text-ink-dim">
              Repurpose status
            </label>
            <select
              id="nerf-repurpose"
              value={REPURPOSE_OPTIONS.some((o) => o.value === repurpose) ? repurpose : ""}
              onChange={(e) => setRepurpose(e.target.value)}
              className={`${selectCls} w-44`}
            >
              {REPURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {showMetrics && (
            <fieldset className="rounded-xl border border-line p-3">
              <legend className="eyebrow px-1">Metrics</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {METRIC_FIELDS.map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    type="number"
                    min={0}
                    value={String(metrics[f.key])}
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0);
                      setMetrics((m) => ({ ...m, [f.key]: v }));
                    }}
                    className="tnum !h-9 font-mono text-[13px]"
                  />
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-1 flex items-center justify-between gap-2">
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="quiet" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save} loading={update.isPending}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await del.mutateAsync(item.id);
          toast("Content item deleted");
          onClose();
        }}
        title="Delete content item"
        body="This idea and its metrics will be removed for good."
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
