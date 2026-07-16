"use client";

import {
  averageViews,
  bestFormats,
  bestHooks,
  overallEngagementRate,
  overallFollowConversion,
  platformGrowth,
  postedWithMetrics,
  postingConsistency,
  type NerfItem,
} from "@/lib/data/nerf";

const intFmt = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });

function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="eyebrow">{label}</span>
      <span className="tnum font-mono text-sm text-ink">{value}</span>
    </div>
  );
}

export function NerfAnalytics({ items }: { items: NerfItem[] }) {
  const posted = postedWithMetrics(items);

  if (posted.length === 0) {
    return (
      <section aria-label="Analytics" className="mt-10">
        <h2 className="eyebrow mb-2">Analytics</h2>
        <p className="max-w-md text-sm text-ink-faint">
          Analytics appear once items are marked posted and their metrics are
          filled in. Nothing is estimated.
        </p>
      </section>
    );
  }

  const hooks = bestHooks(items, 3);
  const formats = bestFormats(items);
  const growth = platformGrowth(items);

  return (
    <section aria-label="Analytics" className="mt-10">
      <h2 className="eyebrow mb-3">Analytics</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="surface divide-y divide-line px-4 py-1">
          <StatRow label="Average views" value={intFmt.format(Math.round(averageViews(items)))} />
          <StatRow label="Engagement rate" value={pct(overallEngagementRate(items))} />
          <StatRow label="Follow conversion" value={pct(overallFollowConversion(items), 2)} />
          <StatRow
            label="Posting consistency"
            value={`${postingConsistency(items).toFixed(1)} per week`}
          />
          <div className="py-2.5">
            <p className="eyebrow mb-1.5">Platform growth</p>
            {growth.length === 0 ? (
              <p className="text-[13px] text-ink-faint">No follower gains recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {growth.map((g) => (
                  <div key={g.platform} className="flex items-baseline justify-between">
                    <span className="text-[13px] text-ink-dim">{g.platform}</span>
                    <span className="tnum font-mono text-[13px] text-ink">
                      +{intFmt.format(Math.round(g.followers))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="surface px-4 py-3">
            <p className="eyebrow mb-2">Best hooks</p>
            {hooks.length === 0 ? (
              <p className="text-[13px] text-ink-faint">
                Hooks rank once posted items have views.
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {hooks.map((h, i) => (
                  <li key={h.id} className="flex items-baseline gap-3">
                    <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-dim">
                      {h.hook}
                    </span>
                    <span className="tnum shrink-0 font-mono text-[12px] text-ink">
                      {pct(h.rate)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="surface px-4 py-3">
            <p className="eyebrow mb-2">Best formats</p>
            {formats.length === 0 ? (
              <p className="text-[13px] text-ink-faint">
                Formats rank once posted items name one.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {formats.map((f) => (
                  <div key={f.format} className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-dim">
                      {f.format}
                    </span>
                    <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">
                      {f.count} {f.count === 1 ? "post" : "posts"}
                    </span>
                    <span className="tnum shrink-0 font-mono text-[12px] text-ink">
                      {pct(f.avgEngagement)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
