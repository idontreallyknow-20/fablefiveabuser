"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleCard } from "@/components/connections/GoogleCard";
import { SpotifyCard } from "@/components/connections/SpotifyCard";
import { DiscordCard } from "@/components/connections/DiscordCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/settings/store";

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
      if (!d.results?.length) toast("No places found");
    } catch {
      toast("Search unavailable", "error");
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="surface p-5" aria-label="Weather location">
      <h2 className="eyebrow mb-2">Weather location</h2>
      <p className="tnum mb-3 font-mono text-[12px] text-ink-faint">
        {settings.location.name} {settings.location.lat.toFixed(2)},{settings.location.lon.toFixed(2)}
      </p>
      <form onSubmit={search} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Change location" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" loading={searching}>
          Search
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                set({
                  location: {
                    name: "Here",
                    lat: Math.round(pos.coords.latitude * 1000) / 1000,
                    lon: Math.round(pos.coords.longitude * 1000) / 1000,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  },
                });
                toast("Location updated", "success");
              },
              () => toast("Location unavailable", "error"),
            );
          }}
        >
          Locate
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
  const rawError = params.get("error");
  const spotifyError =
    params.get("spotify_error") ?? (rawError && /spotify/i.test(rawError) ? rawError : null);
  const googleError =
    params.get("google_error") ?? (rawError && /google/i.test(rawError) ? rawError : null);
  const pageError = rawError && rawError !== spotifyError && rawError !== googleError ? rawError : null;
  const connected = params.get("connected");

  return (
    <div className="space-y-6 pb-8">
      {pageError && <p className="font-mono text-[12px] text-danger">{pageError}</p>}
      {connected && (
        <p className="font-mono text-[12px] text-ok" role="status">
          {connected} connected
        </p>
      )}
      <SpotifyCard error={spotifyError} />
      <GoogleCard error={googleError} />
      <DiscordCard />
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
