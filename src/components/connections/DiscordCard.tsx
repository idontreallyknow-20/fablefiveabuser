"use client";

// Discord webhook: paste a channel webhook, test it, and send a day
// summary on demand. Notifications elsewhere use the same stored hook.

import { useState } from "react";
import { useSettings } from "@/lib/settings/store";
import { isDiscordWebhook, postDiscord } from "@/lib/integrations/discord";
import { todayISO, useTasks } from "@/lib/data/tasks";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function DiscordCard() {
  const webhook = useSettings((s) => s.settings.integrations.discordWebhook);
  const set = useSettings((s) => s.set);
  const [value, setValue] = useState(webhook);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { data: tasks = [] } = useTasks();

  const connected = isDiscordWebhook(webhook);
  const dirty = value.trim() !== webhook;

  const save = () => {
    const v = value.trim();
    if (v && !isDiscordWebhook(v)) {
      toast("Not a webhook URL", "error");
      return;
    }
    set({ integrations: { discordWebhook: v } });
  };

  const test = async () => {
    setBusy(true);
    const ok = await postDiscord(webhook, "Orbit connected");
    toast(ok ? "Sent" : "Failed", ok ? "success" : "error");
    setBusy(false);
  };

  const sendSummary = async () => {
    setBusy(true);
    const today = todayISO();
    const done = tasks.filter((t) => t.completed_at?.startsWith(today));
    const open = tasks.filter((t) => !t.completed_at && t.due_date && t.due_date <= today);
    const lines = [
      `**${today}** — ${done.length} done, ${open.length} due`,
      ...done.slice(0, 8).map((t) => `✓ ${t.title}`),
      ...open.slice(0, 8).map((t) => `· ${t.title}`),
    ];
    const ok = await postDiscord(webhook, lines.join("\n"));
    toast(ok ? "Sent" : "Failed", ok ? "success" : "error");
    setBusy(false);
  };

  return (
    <section className="surface p-5" aria-label="Discord">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow">Discord</h2>
        {connected && <span className="h-2 w-2 rounded-full bg-ok" aria-label="Connected" />}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="Webhook"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
            autoComplete="off"
          />
        </div>
        {dirty ? (
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        ) : (
          connected && (
            <>
              <Button variant="secondary" loading={busy} onClick={test}>
                Test
              </Button>
              <Button variant="secondary" loading={busy} onClick={sendSummary}>
                Day summary
              </Button>
            </>
          )
        )}
      </div>
    </section>
  );
}
