"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useLocalDisplayId,
  ROLE_LABELS,
  useDeleteDisplay,
  useDisplays,
  useDisplaysRealtime,
  useRegisterDisplay,
  useUpdateDisplay,
} from "@/lib/displays/useDisplays";
import { THEME_LIST } from "@/lib/themes/registry";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Confirm } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconDisplay } from "@/components/ui/Icons";

export default function DisplaysPage() {
  useDisplaysRealtime();
  const { data: displays = [] } = useDisplays();
  const register = useRegisterDisplay();
  const update = useUpdateDisplay();
  const remove = useDeleteDisplay();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const localId = useLocalDisplayId();

  const thisRegistered = displays.some((d) => d.id === localId);

  const arrange = async () => {
    const sorted = [...displays].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const plan: { role: string; name: string }[] = [
      { role: "command", name: "Center display" },
      { role: "calendar", name: "Left display" },
      { role: "music", name: "Right display" },
    ];
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      await update.mutateAsync({
        id: sorted[i].id,
        patch: { role: plan[i].role },
      });
    }
    toast("Screens arranged: center commands, left plans, right plays", "success");
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="surface p-5" aria-label="This screen">
        <h2 className="eyebrow mb-2">This screen</h2>
        {thisRegistered ? (
          <p className="text-sm text-ink-dim">
            This screen is registered. Open its view at{" "}
            <Link href={`/display/${localId}`} className="text-accent hover:underline">
              /display
            </Link>
            .
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              await register.mutateAsync({ name: name.trim(), role: "command" });
              setName("");
              toast("Screen registered", "success");
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Field
                label="Name this screen"
                hint="For example: Center monitor, Left monitor, Phone"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" className="mb-[22px]" loading={register.isPending}>
              Register
            </Button>
          </form>
        )}
      </section>

      {displays.length >= 2 && (
        <section className="surface flex flex-wrap items-center justify-between gap-3 p-5" aria-label="Arrange">
          <div>
            <h2 className="eyebrow mb-1">Arrange my screens</h2>
            <p className="max-w-md text-sm text-ink-faint">
              Recommended for three screens: Command Center in the middle, Calendar and
              priorities on the left, Music and Ambient on the right.
            </p>
          </div>
          <Button variant="primary" onClick={arrange}>
            Apply arrangement
          </Button>
        </section>
      )}

      <section aria-label="Registered screens" className="space-y-3">
        {displays.map((d) => {
          const online =
            d.last_seen_at &&
            // eslint-disable-next-line react-hooks/purity -- coarse online check; list re-renders on realtime updates
            Date.now() - new Date(d.last_seen_at).getTime() < 3 * 60 * 1000;
          return (
            <div key={d.id} className="surface p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <IconDisplay size={17} className="text-ink-faint" />
                  <span className="text-sm font-medium text-ink">{d.name}</span>
                  {d.id === localId && (
                    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
                      this screen
                    </span>
                  )}
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${online ? "bg-ok" : "bg-ink-faint/40"}`}
                    title={online ? "Online" : "Offline"}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/display/${d.id}`}
                    className="rounded-lg px-2.5 py-1.5 text-[13px] text-accent transition-colors hover:bg-accent-soft"
                  >
                    Open view
                  </Link>
                  <Button size="sm" variant="quiet" onClick={() => setDeleteId(d.id)}>
                    Remove
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-ink-faint">Role</span>
                  <select
                    value={d.role}
                    onChange={(e) => update.mutate({ id: d.id, patch: { role: e.target.value } })}
                    className="h-10 rounded-xl border border-line bg-bg1 px-3 text-sm text-ink"
                  >
                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-ink-faint">Theme</span>
                  <select
                    value={d.theme ?? ""}
                    onChange={(e) =>
                      update.mutate({ id: d.id, patch: { theme: e.target.value || null } })
                    }
                    className="h-10 rounded-xl border border-line bg-bg1 px-3 text-sm text-ink"
                  >
                    <option value="">Follow my theme</option>
                    {THEME_LIST.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-ink-faint">Motion</span>
                  <select
                    value={d.motion}
                    onChange={(e) => update.mutate({ id: d.id, patch: { motion: e.target.value } })}
                    className="h-10 rounded-xl border border-line bg-bg1 px-3 text-sm text-ink"
                  >
                    <option value="low">Low</option>
                    <option value="balanced">Balanced</option>
                    <option value="cinematic">Cinematic</option>
                  </select>
                </label>
              </div>
            </div>
          );
        })}
        {displays.length === 0 && (
          <p className="px-1 text-sm text-ink-faint">
            Register each screen you use, then give it a role. Changes apply live over
            all your displays.
          </p>
        )}
      </section>

      <Confirm
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await remove.mutateAsync(deleteId);
            toast("Screen removed");
          }
        }}
        title="Remove screen"
        body="This forgets the screen's role and settings. The device itself is unaffected."
        confirmLabel="Remove"
        destructive
      />
    </div>
  );
}
