"use client";

import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localDb } from "@/lib/local/client";
import { useSettings } from "@/lib/settings/store";
import { Toggle } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Tables } from "@/lib/db/types";

const permissionListeners = new Set<() => void>();

const CATEGORY_LABELS: Record<string, string> = {
  tasks: "Tasks and priorities",
  calendar: "Calendar events",
  focus: "Focus sessions",
  nerfchess: "NerfChess publishing",
  workouts: "Workouts",
  skincare: "Skincare",
  resets: "Reset routines",
  checkins: "Mental check-ins",
  review: "Weekly review",
};

function usePrefs() {
  return useQuery({
    queryKey: ["notification_prefs"],
    queryFn: async (): Promise<Tables<"notification_prefs">[]> => {
      const { data, error } = await localDb()
        .from("notification_prefs")
        .select("*")
        .order("category");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useHistory() {
  return useQuery({
    queryKey: ["notification_log"],
    queryFn: async (): Promise<Tables<"notification_log">[]> => {
      const { data, error } = await localDb()
        .from("notification_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function NotificationsPage() {
  const { data: prefs = [] } = usePrefs();
  const { data: history = [] } = useHistory();
  const qc = useQueryClient();
  const { settings, set } = useSettings();
  const { toast } = useToast();
  const permission = useSyncExternalStore(
    (onChange) => {
      permissionListeners.add(onChange);
      return () => permissionListeners.delete(onChange);
    },
    () => (typeof Notification === "undefined" ? ("unsupported" as const) : Notification.permission),
    () => "default" as const,
  );

  const togglePref = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await localDb()
        .from("notification_prefs")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: ["notification_prefs"] });
      const prev = qc.getQueryData<Tables<"notification_prefs">[]>(["notification_prefs"]);
      qc.setQueryData(
        ["notification_prefs"],
        (prev ?? []).map((p) => (p.id === id ? { ...p, enabled } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(["notification_prefs"], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notification_prefs"] }),
  });

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    permissionListeners.forEach((l) => l());
    if (p === "granted") toast("Notifications enabled on this device", "success");
  };

  const sendTest = async () => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      toast("Allow notifications on this device first", "error");
      return;
    }
    try {
      new Notification("Orbit", { body: "This is how a reminder will look.", silent: true });
    } catch {
      // mobile browsers only allow notifications from the service worker
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) {
        toast("This browser can't show a test notification here", "error");
        return;
      }
      await reg.showNotification("Orbit", { body: "This is how a reminder will look.", silent: true });
    }
    const supabase = localDb();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("notification_log").insert({
        user_id: user.id,
        category: "tasks",
        title: "Test notification",
        body: "This is how a reminder will look.",
      });
      qc.invalidateQueries({ queryKey: ["notification_log"] });
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <section className="surface p-5" aria-label="Device permission">
        <h2 className="eyebrow mb-2">This device</h2>
        {permission === "unsupported" ? (
          <p className="text-sm text-ink-faint">This browser does not support notifications.</p>
        ) : permission === "granted" ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-dim">Notifications are allowed on this device.</p>
            <Button variant="secondary" size="sm" onClick={sendTest}>
              Send a test
            </Button>
          </div>
        ) : permission === "denied" ? (
          <p className="text-sm text-ink-faint">
            Notifications are blocked in the browser settings for this site. Allow them
            there, then return here.
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-dim">Orbit will only notify you for what you choose below.</p>
            <Button variant="primary" size="sm" onClick={requestPermission}>
              Allow notifications
            </Button>
          </div>
        )}
      </section>

      <section className="surface p-5" aria-label="Categories">
        <h2 className="eyebrow mb-2">Categories</h2>
        <div className="divide-y divide-(--line)">
          {prefs.map((p) => (
            <Toggle
              key={p.id}
              checked={p.enabled}
              onChange={(enabled) => togglePref.mutate({ id: p.id, enabled })}
              label={CATEGORY_LABELS[p.category] ?? p.category}
            />
          ))}
          {prefs.length === 0 && (
            <p className="py-2 text-sm text-ink-faint">Categories appear after first sign-in.</p>
          )}
        </div>
      </section>

      <section className="surface p-5" aria-label="Quiet hours">
        <h2 className="eyebrow mb-2">Quiet hours</h2>
        <Toggle
          checked={settings.quietHours.enabled}
          onChange={(enabled) => set({ quietHours: { ...settings.quietHours, enabled } })}
          label="Silence reminders overnight"
        />
        {settings.quietHours.enabled && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">From</span>
              <input
                type="time"
                value={settings.quietHours.start}
                onChange={(e) =>
                  set({ quietHours: { ...settings.quietHours, start: e.target.value } })
                }
                className="tnum h-11 rounded-xl border border-line bg-bg1 px-3 font-mono text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">Until</span>
              <input
                type="time"
                value={settings.quietHours.end}
                onChange={(e) =>
                  set({ quietHours: { ...settings.quietHours, end: e.target.value } })
                }
                className="tnum h-11 rounded-xl border border-line bg-bg1 px-3 font-mono text-sm text-ink"
              />
            </label>
          </div>
        )}
      </section>

      <section className="surface p-5" aria-label="History">
        <h2 className="eyebrow mb-2">Recent</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-faint">Nothing sent yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {history.map((n) => (
              <li key={n.id} className="flex items-baseline gap-3">
                <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">
                  {new Date(n.sent_at).toLocaleString("en-CA", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
                <span className="text-sm text-ink-dim">{n.title}</span>
                <span className="truncate text-[13px] text-ink-faint">{n.body}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
