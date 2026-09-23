"use client";

import { useRef, useState } from "react";
import { localAdmin, localDb } from "@/lib/local/client";
import { toCsv, downloadCsv } from "@/lib/export/csv";
import { Button, ActionButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const stamp = () => new Date().toISOString().slice(0, 10);

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const exportAll = async () => {
    const data = await localAdmin.dump();
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)],
      { type: "application/json" },
    );
    download(`orbit-backup-${stamp()}.json`, blob);
  };

  const exportTasksCsv = async () => {
    const supabase = localDb();
    const [{ data: tasks, error }, { data: projects }] = await Promise.all([
      supabase.from("tasks").select("*").limit(10000),
      supabase.from("projects").select("id,name"),
    ]);
    if (error) throw new Error(error.message);
    const projectName = new Map((projects ?? []).map((p) => [p.id, p.name]));
    const csv = toCsv(
      ["title", "status", "due", "scheduled", "completed", "project", "tags", "importance", "note"],
      (tasks ?? []).map((t) => [
        t.title,
        t.status,
        t.due_date,
        t.scheduled_at,
        t.completed_at,
        t.project_id ? (projectName.get(t.project_id) ?? "") : "",
        t.tags,
        t.importance,
        t.note,
      ]),
    );
    downloadCsv(`orbit-tasks-${stamp()}.csv`, csv);
  };

  const restore = async (file: File) => {
    setRestoring(true);
    try {
      const parsed = JSON.parse(await file.text()) as { data?: Record<string, unknown[]> };
      if (!parsed || typeof parsed.data !== "object" || parsed.data === null) {
        throw new Error("That file isn't an Orbit backup");
      }
      const count = await localAdmin.restore(parsed.data);
      if (count === 0) throw new Error("Nothing to restore in that file");
      // let the restored profile settings win over this device's copy
      try {
        localStorage.removeItem("orbit-settings-modified-at");
      } catch {
        // storage unavailable; settings stay as they are
      }
      toast(`Restored ${count} items`, "success");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Could not read that file", "error");
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const eraseEverything = async () => {
    await localAdmin.erase();
    try {
      localStorage.clear();
    } catch {
      // nothing else to clear
    }
    window.location.reload();
  };

  return (
    <div className="space-y-8 pb-8">
      <section className="surface p-5" aria-label="Where your data lives">
        <h2 className="eyebrow mb-2">Where your data lives</h2>
        <p className="max-w-xl text-sm text-ink-dim">
          Everything you add stays in this browser, on this device. There are no
          accounts and nothing is sent to a server. Export a backup to move to
          another device or keep a copy safe.
        </p>
      </section>

      <section className="surface flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Export">
        <h2 className="eyebrow">Export</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="secondary" onAction={exportTasksCsv}>
            Tasks CSV
          </ActionButton>
          <ActionButton variant="primary" onAction={exportAll}>
            Full backup
          </ActionButton>
        </div>
      </section>

      <section className="surface flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Restore">
        <div>
          <h2 className="eyebrow mb-1">Restore</h2>
          <p className="max-w-md text-sm text-ink-faint">
            Load an Orbit backup file. Its items are added to what&apos;s already here.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void restore(f);
          }}
        />
        <Button variant="secondary" loading={restoring} onClick={() => fileRef.current?.click()}>
          Choose backup
        </Button>
      </section>

      <section className="surface p-5" aria-label="Erase">
        <h2 className="eyebrow mb-1 text-danger">Erase this device</h2>
        <p className="mb-4 max-w-md text-sm text-ink-faint">
          Removes all of your Orbit data from this browser permanently. Export a backup
          first if you might want any of it back.
        </p>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          Erase my data
        </Button>
      </section>

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmText("");
        }}
        title="Erase everything"
      >
        <p className="mb-4 text-sm text-ink-dim">
          This removes every task, project, workout, check-in and setting on this device.
          It cannot be undone.
        </p>
        <Field
          label="Type erase to confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <ActionButton
            variant="destructive"
            disabled={confirmText.trim().toLowerCase() !== "erase"}
            onAction={eraseEverything}
          >
            Erase permanently
          </ActionButton>
        </div>
      </Modal>
    </div>
  );
}
