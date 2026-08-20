"use client";

import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionButton, Button } from "@/components/ui/Button";
import { IconGoogle } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { ConnectLink, EnvKeys, Stepper } from "./Stepper";

const STEPS = ["Keys", "Connect", "Import"];

interface GoogleAccount {
  id: string;
  label: string;
  external_id: string;
  email: string;
  is_active: boolean;
  meta: Record<string, unknown>;
}

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  accounts?: GoogleAccount[];
  missing?: { clientId: boolean; clientSecret: boolean; serviceRole: boolean };
}

interface CalendarRow {
  id: string;
  summary: string;
  backgroundColor: string | null;
  primary: boolean;
  selected: boolean;
}

function useGoogleStatus() {
  return useQuery<GoogleStatus>({
    queryKey: ["google", "status"],
    queryFn: async () => {
      const res = await fetch("/api/google/status");
      if (!res.ok) throw new Error("status failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function missingKeys(status: GoogleStatus): string[] {
  const keys: string[] = [];
  if (status.missing?.clientId) keys.push("GOOGLE_CLIENT_ID");
  if (status.missing?.clientSecret) keys.push("GOOGLE_CLIENT_SECRET");
  if (status.missing?.serviceRole) keys.push("SUPABASE_SERVICE_ROLE_KEY");
  return keys;
}

function lastSyncOf(status: GoogleStatus): string {
  const accounts = status.accounts ?? [];
  const account =
    accounts.find((a) => (a.meta as { active?: boolean })?.active) ?? accounts[0];
  const raw = (account?.meta as { lastSyncedAt?: unknown })?.lastSyncedAt;
  if (typeof raw !== "string") return "last sync never";
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return "last sync never";
  return `last sync ${format(new Date(ms), "yyyy-MM-dd HH:mm")}`;
}

export function GoogleCard({ error }: { error?: string | null }) {
  const { data: status, refetch } = useGoogleStatus();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: calendars } = useQuery<{ calendars: CalendarRow[] }>({
    queryKey: ["google", "calendars"],
    queryFn: async () => {
      const res = await fetch("/api/google/calendars");
      if (!res.ok) throw new Error("calendars failed");
      return res.json();
    },
    enabled: Boolean(status?.connected),
    retry: false,
  });

  const updateSelection = useMutation({
    mutationFn: async (selected: string[]) => {
      const res = await fetch("/api/google/calendars", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedCalendars: selected }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["google"] });
    },
  });

  const runSync = async (successPrefix: string) => {
    const res = await fetch("/api/google/sync", { method: "POST" });
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: string } | null;
      toast(d?.error ?? "Sync failed", "error");
      throw new Error("sync failed");
    }
    const d = (await res.json()) as { synced?: number };
    toast(`${successPrefix} ${d.synced ?? 0} events`, "success");
    qc.invalidateQueries({ queryKey: ["google"] });
  };

  if (!status) return <div className="surface h-28 animate-pulse" aria-hidden />;

  const step = !status.configured ? 0 : !status.connected ? 1 : 2;

  return (
    <section className="surface p-5" aria-label="Google Calendar">
      <div className="mb-3 flex items-center gap-2.5">
        <IconGoogle size={18} className="text-ink-dim" />
        <h2 className="text-sm font-medium text-ink">Google Calendar</h2>
      </div>

      <Stepper steps={STEPS} current={step} label="Google Calendar setup" />

      {error && <p className="mb-3 font-mono text-[12px] text-danger">{error}</p>}

      {step === 0 && <EnvKeys keys={missingKeys(status)} />}

      {step === 1 && <ConnectLink href="/api/google/auth">Connect Google</ConnectLink>}

      {step === 2 && (
        <>
          <p className="tnum mb-3 font-mono text-[12px] text-ink-faint">{lastSyncOf(status)}</p>

          {calendars && (
            <div className="mb-3 flex flex-col gap-1.5">
              {calendars.calendars.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={c.selected}
                    onChange={(e) => {
                      const next = calendars.calendars
                        .filter((x) => (x.id === c.id ? e.target.checked : x.selected))
                        .map((x) => x.id);
                      updateSelection.mutate(next.length > 0 ? next : ["primary"]);
                    }}
                    className="h-4 w-4 accent-(--accent)"
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c.backgroundColor ?? "var(--accent)" }}
                    aria-hidden
                  />
                  <span className="text-sm text-ink-dim">
                    {c.summary}
                    {c.primary ? " (primary)" : ""}
                  </span>
                </label>
              ))}
            </div>
          )}

          <ActionButton size="sm" variant="primary" onAction={() => runSync("Imported")}>
            Import events
          </ActionButton>

          <details className="mt-4 border-t border-line pt-3">
            <summary className="cursor-pointer list-none font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase transition-colors duration-[var(--dur-base)] hover:text-ink-dim">
              Advanced
            </summary>
            <div className="mt-3 flex flex-col gap-2.5">
              {(status.accounts ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <p className="truncate font-mono text-[12px] text-ink-faint">
                    {a.email || a.label || a.external_id}
                  </p>
                  <Button
                    size="sm"
                    variant="quiet"
                    aria-label={`Disconnect ${a.email || a.label}`}
                    onClick={async () => {
                      const res = await fetch(`/api/google/accounts/${a.id}`, {
                        method: "DELETE",
                      });
                      if (res.ok) {
                        toast("Google account disconnected");
                        refetch();
                        qc.invalidateQueries({ queryKey: ["google"] });
                      }
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <ActionButton size="sm" variant="secondary" onAction={() => runSync("Synced")}>
                  Two-way sync
                </ActionButton>
                <a
                  href="/api/google/auth"
                  className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-dim transition-colors duration-[var(--dur-base)] hover:bg-bg1 hover:text-ink"
                >
                  Add account
                </a>
              </div>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
