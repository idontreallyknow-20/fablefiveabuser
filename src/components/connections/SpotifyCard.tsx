"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSpotifyStatus, type SpotifyStatus } from "@/lib/spotify/useSpotify";
import { ActionButton, Button } from "@/components/ui/Button";
import { IconSpotify } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { ConnectLink, EnvKeys, Stepper } from "./Stepper";

const STEPS = ["Keys", "Connect", "Play"];

function missingKeys(status: SpotifyStatus): string[] {
  const keys: string[] = [];
  if (status.missing?.clientId) keys.push("SPOTIFY_CLIENT_ID");
  if (status.missing?.clientSecret) keys.push("SPOTIFY_CLIENT_SECRET");
  if (status.missing?.serviceRole) keys.push("SUPABASE_SERVICE_ROLE_KEY");
  return keys;
}

interface Device {
  id: string | null;
  name: string;
  type: string;
  isActive: boolean;
}

function useSpotifyDevices(enabled: boolean) {
  return useQuery<{ devices: Device[] }>({
    queryKey: ["spotify", "devices"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/devices");
      if (!res.ok) throw new Error("devices failed");
      return res.json();
    },
    enabled,
    retry: false,
    refetchInterval: 30_000,
  });
}

export function SpotifyCard({ error }: { error?: string | null }) {
  const { data: status, refetch } = useSpotifyStatus();
  const devices = useSpotifyDevices(Boolean(status?.connected));
  const qc = useQueryClient();
  const { toast } = useToast();

  if (!status) return <div className="surface h-28 animate-pulse" aria-hidden />;

  const step = !status.configured ? 0 : !status.connected ? 1 : 2;
  const activeDevice = devices.data?.devices.find((d) => d.isActive) ?? null;

  return (
    <section className="surface p-5" aria-label="Spotify">
      <div className="mb-3 flex items-center gap-2.5">
        <IconSpotify size={18} className="text-ink-dim" />
        <h2 className="text-sm font-medium text-ink">Spotify</h2>
      </div>

      <Stepper steps={STEPS} current={step} label="Spotify setup" />

      {error && <p className="mb-3 font-mono text-[12px] text-danger">{error}</p>}

      {step === 0 && <EnvKeys keys={missingKeys(status)} />}

      {step === 1 && <ConnectLink href="/api/spotify/auth">Connect Spotify</ConnectLink>}

      {step === 2 && (
        <>
          {(status.accounts ?? []).map((a) => {
            const active = Boolean((a.meta as { active?: boolean })?.active);
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm text-ink">
                    {a.label || a.email || a.external_id}
                    {active && (
                      <span className="font-mono text-[11px] text-accent" aria-label="Active profile">
                        active
                      </span>
                    )}
                  </p>
                  {a.email && (
                    <p className="truncate font-mono text-[11px] text-ink-faint">{a.email}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {!active && (
                    <Button
                      size="sm"
                      variant="quiet"
                      aria-label={`Make ${a.label || a.email} active`}
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
                    aria-label={`Disconnect ${a.label || a.email}`}
                    onClick={async () => {
                      const res = await fetch(`/api/spotify/accounts/${a.id}`, {
                        method: "DELETE",
                      });
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

          <p className="mt-1 flex items-center gap-2 border-t border-line pt-2.5 font-mono text-[12px] text-ink-faint">
            <span
              className={`h-1.5 w-1.5 rounded-full ${activeDevice ? "bg-(--ok)" : "bg-line-strong"}`}
              aria-hidden
            />
            {activeDevice
              ? `device ${activeDevice.name}`
              : devices.data?.devices.length
                ? "device idle"
                : "device none"}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <ActionButton
              size="sm"
              variant="primary"
              onAction={async () => {
                const res = await fetch("/api/spotify/control", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "play" }),
                });
                if (!res.ok) {
                  const d = (await res.json().catch(() => null)) as { error?: string } | null;
                  toast(d?.error ?? "Playback test failed", "error");
                  throw new Error("test failed");
                }
                devices.refetch();
                qc.invalidateQueries({ queryKey: ["spotify", "playback"] });
              }}
            >
              Test playback
            </ActionButton>
            <a
              href="/api/spotify/auth"
              className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-dim transition-colors duration-[var(--dur-base)] hover:bg-bg1 hover:text-ink"
            >
              Add profile
            </a>
          </div>
        </>
      )}
    </section>
  );
}
