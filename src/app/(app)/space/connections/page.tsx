"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSpotifyStatus } from "@/lib/spotify/useSpotify";
import { useCalendarStatus } from "@/components/calendar/TodayEvents";
import { useSettings } from "@/lib/settings/store";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { IconGoogle, IconSpotify } from "@/components/ui/Icons";

function SpotifySection() {
  const { data: status, refetch } = useSpotifyStatus();
  const { toast } = useToast();

  if (!status) return <div className="surface h-28 animate-pulse" aria-hidden />;

  return (
    <section className="surface p-5" aria-label="Spotify">
      <div className="mb-3 flex items-center gap-2.5">
        <IconSpotify size={18} className="text-ink-dim" />
        <h2 className="text-sm font-medium text-ink">Spotify</h2>
      </div>

      {!status.configured ? (
        <div className="text-sm text-ink-faint">
          <p className="mb-2">The server is missing Spotify credentials. To finish setup:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Create an app at developer.spotify.com/dashboard</li>
            <li>
              Add redirect URI <code className="tnum font-mono text-[12px]">/api/spotify/callback</code> on
              your deployed domain
            </li>
            <li>Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SUPABASE_SERVICE_ROLE_KEY in Vercel</li>
          </ol>
        </div>
      ) : (
        <>
          {(status.accounts ?? []).map((a) => {
            const active = Boolean((a.meta as { active?: boolean })?.active);
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{a.label || a.email || a.external_id}</p>
                  <p className="text-[12px] text-ink-faint">{active ? "Active profile" : "Connected"}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {!active && (
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={async () => {
                        await fetch(`/api/spotify/accounts/${a.id}`, {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ active: true }),
                        });
                        refetch();
                      }}
                    >
                      Make active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={async () => {
                      const res = await fetch(`/api/spotify/accounts/${a.id}`, { method: "DELETE" });
                      if (res.ok) {
                        toast("Spotify profile disconnected");
                        refetch();
                      }
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="mt-3">
            <a
              href="/api/spotify/auth"
              className="inline-flex h-9 items-center rounded-xl border border-(--accent)/35 bg-accent-soft px-3.5 text-[13px] font-medium text-accent transition-colors hover:bg-(--accent)/22"
            >
              {status.connected ? "Add another profile" : "Connect Spotify"}
            </a>
          </div>
        </>
      )}
    </section>
  );
}

function GoogleSection() {
  const { data: status } = useCalendarStatus();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: calendars } = useQuery({
    queryKey: ["google", "calendars"],
    queryFn: async () => {
      const res = await fetch("/api/google/calendars");
      if (!res.ok) throw new Error("calendars failed");
      return res.json() as Promise<{
        calendars: { id: string; summary: string; backgroundColor: string | null; primary: boolean; selected: boolean }[];
      }>;
    },
    enabled: Boolean(status?.connected),
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

  const syncNow = async () => {
    const res = await fetch("/api/google/sync", { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      toast(`Synced ${d.synced ?? 0} events`, "success");
      qc.invalidateQueries({ queryKey: ["google"] });
    } else {
      toast("Sync failed. Try reconnecting.", "error");
    }
  };

  if (!status) return <div className="surface h-28 animate-pulse" aria-hidden />;

  return (
    <section className="surface p-5" aria-label="Google Calendar">
      <div className="mb-3 flex items-center gap-2.5">
        <IconGoogle size={18} className="text-ink-dim" />
        <h2 className="text-sm font-medium text-ink">Google Calendar</h2>
      </div>

      {!status.configured ? (
        <div className="text-sm text-ink-faint">
          <p className="mb-2">The server is missing Google credentials. To finish setup:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Create OAuth credentials at console.cloud.google.com and enable the Calendar API</li>
            <li>
              Add redirect URI <code className="tnum font-mono text-[12px]">/api/google/callback</code> on
              your deployed domain
            </li>
            <li>Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and SUPABASE_SERVICE_ROLE_KEY in Vercel</li>
          </ol>
        </div>
      ) : !status.connected ? (
        <a
          href="/api/google/auth"
          className="inline-flex h-9 items-center rounded-xl border border-(--accent)/35 bg-accent-soft px-3.5 text-[13px] font-medium text-accent transition-colors hover:bg-(--accent)/22"
        >
          Connect Google Calendar
        </a>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-dim">Connected</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={syncNow}>
                Sync now
              </Button>
            </div>
          </div>
          {calendars && (
            <div className="border-t border-line pt-3">
              <p className="eyebrow mb-2">Calendars shown in Orbit</p>
              <div className="flex flex-col gap-1.5">
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
            </div>
          )}
        </>
      )}
    </section>
  );
}

function LocationSection() {
  const { settings, set } = useSettings();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { name: string; admin1?: string; country: string; latitude: number; longitude: number; timezone: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en`,
      );
      const d = await res.json();
      setResults(d.results ?? []);
      if (!d.results?.length) toast("No places found with that name");
    } catch {
      toast("Location search is unavailable right now", "error");
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="surface p-5" aria-label="Weather location">
      <h2 className="eyebrow mb-2">Weather location</h2>
      <p className="mb-3 text-sm text-ink-dim">
        Currently {settings.location.name}
      </p>
      <form onSubmit={search} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Change location" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" loading={searching}>
          Search
        </Button>
      </form>
      {results.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                set({
                  location: {
                    name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
                    lat: r.latitude,
                    lon: r.longitude,
                    timezone: r.timezone,
                  },
                });
                setResults([]);
                setQuery("");
                toast("Location updated", "success");
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-ink-dim transition-colors hover:bg-bg1 hover:text-ink"
            >
              {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ConnectionsInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const connected = params.get("connected");

  return (
    <div className="space-y-6 pb-8">
      {error && (
        <p className="rounded-xl border border-(--danger)/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {connected && (
        <p className="rounded-xl border border-(--ok)/30 bg-(--ok)/10 px-4 py-3 text-sm text-ok">
          {connected === "spotify" ? "Spotify connected." : "Google Calendar connected."}
        </p>
      )}
      <SpotifySection />
      <GoogleSection />
      <LocationSection />
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense>
      <ConnectionsInner />
    </Suspense>
  );
}
