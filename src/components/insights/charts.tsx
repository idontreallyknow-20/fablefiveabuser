"use client";

// Hand-rolled SVG chart primitives for Insights. No libraries, no animation
// loops — quiet marks in the theme accent over bg2 tracks. Each chart fills
// its container (width 100%) and scales through its viewBox.

import type { ReactNode } from "react";

const r2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------- sparkline -- */

/**
 * Smooth single-series line (Catmull-Rom smoothed) with an optional soft
 * area fill. Stretches to its container; the stroke stays crisp via
 * non-scaling-stroke.
 */
export function Sparkline({
  values,
  height = 40,
  stroke = "var(--accent)",
  fill = true,
  strokeWidth = 1.5,
  className,
}: {
  values: number[];
  /** viewBox height in user units */
  height?: number;
  stroke?: string;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  const w = 100;
  const pad = 3;
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts: [number, number][] = values.map((v, i) => [
    n > 1 ? (i / (n - 1)) * w : w / 2,
    pad + (1 - Math.max(0, v) / max) * (height - pad * 2),
  ]);

  const clampY = (y: number) => Math.min(height - pad, Math.max(pad, y));
  let line = "";
  if (pts.length >= 2) {
    line = `M ${r2(pts[0][0])} ${r2(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6);
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6);
      line += ` C ${r2(c1x)} ${r2(c1y)}, ${r2(c2x)} ${r2(c2y)}, ${r2(p2[0])} ${r2(p2[1])}`;
    }
  }
  const area = line
    ? `${line} L ${w} ${height} L 0 ${height} Z`
    : "";

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden
    >
      {fill && area && <path d={area} fill={stroke} opacity={0.1} stroke="none" />}
      {line && (
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ bars -- */

/**
 * Rounded-top bars anchored to a hairline baseline. The `highlight` index
 * (today / current period) is full accent; the rest sit back. Zero values
 * keep a faint bg2 stub so the rhythm of the axis stays readable. Optional
 * labels render as a mono row under the plot.
 */
export function Bars({
  values,
  labels,
  highlight,
  height = 56,
  color = "var(--accent)",
  className,
}: {
  values: number[];
  /** one per bar; empty strings keep the slot but stay blank */
  labels?: string[];
  /** index drawn at full accent */
  highlight?: number;
  /** viewBox height in user units */
  height?: number;
  color?: string;
  className?: string;
}) {
  const slot = 12;
  const barW = 8;
  const inset = (slot - barW) / 2;
  const w = Math.max(slot, values.length * slot);
  const max = Math.max(1, ...values);
  const base = height - 1;

  const bar = (v: number, i: number) => {
    const x = i * slot + inset;
    const h = (Math.max(0, v) / max) * (base - 4);
    if (h < 0.5) {
      return (
        <rect
          key={i}
          x={x}
          y={base - 1.5}
          width={barW}
          height={1.5}
          rx={0.75}
          fill="var(--bg2)"
        />
      );
    }
    const top = base - h;
    const r = Math.min(2.5, h / 2, barW / 2);
    const d = [
      `M ${r2(x)} ${r2(base)}`,
      `L ${r2(x)} ${r2(top + r)}`,
      `Q ${r2(x)} ${r2(top)} ${r2(x + r)} ${r2(top)}`,
      `L ${r2(x + barW - r)} ${r2(top)}`,
      `Q ${r2(x + barW)} ${r2(top)} ${r2(x + barW)} ${r2(top + r)}`,
      `L ${r2(x + barW)} ${r2(base)}`,
      "Z",
    ].join(" ");
    const active = highlight === i;
    return <path key={i} d={d} fill={color} opacity={active ? 1 : 0.32} />;
  };

  return (
    <div className={`flex h-full min-h-0 flex-col ${className ?? ""}`}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block", minHeight: 0 }}
        aria-hidden
      >
        {values.map(bar)}
        <line
          x1={0}
          y1={base}
          x2={w}
          y2={base}
          stroke="var(--line-strong)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {labels && labels.length > 0 && (
        <div
          className="mt-1.5 grid shrink-0"
          style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
        >
          {labels.map((l, i) => (
            <span
              key={i}
              className={`tnum text-center font-mono text-[10px] uppercase ${
                highlight === i ? "text-accent" : "text-ink-faint"
              }`}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ ring gauge -- */

/** single progress ring on a bg2 track, content centered inside */
export function RingGauge({
  value,
  thickness = 7,
  color = "var(--accent)",
  className,
  children,
}: {
  /** 0..1 */
  value: number;
  /** stroke width in user units (viewBox is 72) */
  thickness?: number;
  color?: string;
  className?: string;
  children?: ReactNode;
}) {
  const size = 72;
  const c = size / 2;
  const radius = c - thickness / 2 - 1;
  const circ = 2 * Math.PI * radius;
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

  return (
    <div className={`relative aspect-square ${className ?? ""}`}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden
      >
        <circle cx={c} cy={c} r={radius} fill="none" stroke="var(--bg2)" strokeWidth={thickness} />
        {v > 0 && (
          <circle
            cx={c}
            cy={c}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${r2(circ * v)} ${r2(circ)}`}
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
