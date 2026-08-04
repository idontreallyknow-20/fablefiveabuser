"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toCsv, downloadCsv } from "@/lib/export/csv";
import { Button, ActionButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const EXPORT_TABLES = [
  "profiles",
  "projects",
  "tasks",
  "nerf_content",
  "exercises",
  "workout_sessions",
  "workout_entries",
  "recovery_notes",
  "selfcare_logs",
  "checkins",
  "relationship_items",
  "routines",
  "routine_logs",
  "displays",
  "notification_prefs",
] as const;

export default function DataPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const exportAll = async () => {
    const supabase = supabaseBrowser();
    const out: Record<string, unknown[]> = {};
    for (const table of EXPORT_TABLES) {
      const { data, error } = await supabase.from(table).select("*").limit(10000);
      if (error) throw new Error(`Export failed at ${table}: ${error.message}`);
      out[table] = data ?? [];
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: out }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTasksCsv = async () => {
    const supabase = supabaseBrowser();
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
    downloadCsv(`orbit-tasks-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const deleteEverything = async () => {
    const supabase = supabaseBrowser();
    // order respects foreign keys; profiles last
    const order = [
      "routine_logs",
      "routines",
      "workout_entries",
      "workout_sessions",
      "recovery_notes",
      "exercises",
      "selfcare_logs",
      "checkins",
      "relationship_items",
      "nerf_content",
      "tasks",
      "projects",
      "displays",
      "notification_prefs",
      "push_subscriptions",
    ] as const;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    for (const table of order) {
      await supabase.from(table).delete().eq("user_id", user.id);
    }
    await supabase.auth.signOut();
    toast("Your data has been deleted");
    router.replace("/login");
  };

  return (
    <div className="space-y-8 pb-8">
      <section className="surface flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Export">
        <h2 className="eyebrow">Export</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="secondary" onAction={exportTasksCsv}>
            Tasks CSV
          </ActionButton>
          <ActionButton variant="primary" onAction={exportAll}>
            Everything JSON
          </ActionButton>
        </div>
      </section>

      <section className="surface p-5" aria-label="Delete">
        <h2 className="eyebrow mb-1 text-danger">Delete everything</h2>
        <p className="mb-4 max-w-md text-sm text-ink-faint">
          Removes all of your Orbit data permanently and signs you out. Export first if
          you might want any of it back.
        </p>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          Delete my data
        </Button>
      </section>

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmText("");
        }}
        title="Delete everything"
      >
        <p className="mb-4 text-sm text-ink-dim">
          This removes every task, project, workout, check-in and setting permanently.
          It cannot be undone.
        </p>
        <Field
          label="Type delete to confirm"
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
            disabled={confirmText !== "delete"}
            onAction={deleteEverything}
          >
            Delete permanently
          </ActionButton>
        </div>
      </Modal>
    </div>
  );
}
