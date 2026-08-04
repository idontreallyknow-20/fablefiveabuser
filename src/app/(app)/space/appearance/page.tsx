"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { THEME_LIST, type ThemeId } from "@/lib/themes/registry";
import {
  DEFAULT_SETTINGS,
  useSettings,
  type BackgroundSettings,
  type UiSettings,
} from "@/lib/settings/store";
import { Segmented, Toggle } from "@/components/ui/Segmented";
import { LAYOUT_PRESETS } from "@/lib/settings/layout";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { IconPlus, IconTrash } from "@/components/ui/Icons";
import { AccentSwatches } from "@/components/appearance/AccentSwatches";
import { InspirationChips } from "@/components/appearance/InspirationChips";
import { BUILTIN_BACKGROUNDS } from "@/lib/backgrounds/builtins";
import {
  BACKGROUNDS_KEY,
  useBackgrounds,
  useBackgroundUrl,
  useDeleteBackground,
  type UserBackground,
} from "@/lib/backgrounds/data";
import { uploadBackground } from "@/lib/backgrounds/upload";

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="flex items-center justify-between gap-6 py-1.5">
      <span className="text-sm text-ink">{label}</span>
      <span className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 w-36 cursor-pointer appearance-none rounded-full bg-bg3 accent-(--accent)"
          aria-label={label}
        />
        <span className="tnum w-12 text-right font-mono text-[12px] text-ink-faint">
          {format(value)}
        </span>
      </span>
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-1.5">
      <span className="text-sm text-ink">{label}</span>
      {children}
    </div>
  );
}

const tileClass = (active: boolean) =>
  `w-full overflow-hidden rounded-xl border text-left transition-colors duration-[var(--dur-base)] ${
    active ? "border-(--accent)/60" : "border-line hover:border-line-strong"
  }`;

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function UserBackgroundTile({
  bg,
  active,
  onSelect,
  onDelete,
}: {
  bg: UserBackground;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { data: url } = useBackgroundUrl(bg.kind === "image" ? bg.path : undefined);
  return (
    <div className="group relative">
      <button onClick={onSelect} aria-pressed={active} className={tileClass(active)}>
        <div
          className="relative h-16 w-full overflow-hidden"
          style={{ backgroundColor: bg.avg_color }}
        >
          {bg.kind === "image" && url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          )}
          {bg.kind === "video" && bg.duration_s != null && (
            <span className="tnum absolute bottom-1.5 right-2 font-mono text-[11px] text-white/75">
              {formatDuration(bg.duration_s)}
            </span>
          )}
        </div>
        <div className="bg-bg1 px-3 py-2.5">
          <p className={`text-[13px] font-medium ${active ? "text-accent" : "text-ink"}`}>
            {bg.kind === "video" ? "Video" : "Image"}
          </p>
        </div>
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete background"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white/75 opacity-0 transition-opacity duration-[var(--dur-base)] hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
      >
        <IconTrash size={14} />
      </button>
    </div>
  );
}

export default function AppearancePage() {
  const { settings, set } = useSettings();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: myBackgrounds } = useBackgrounds();
  const deleteBackground = useDeleteBackground();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const bg = settings.background;
  const ui = settings.ui;
  const setBg = (patch: Partial<BackgroundSettings>) =>
    set({ background: { ...bg, ...patch } });
  const setUi = (patch: Partial<UiSettings>) => set({ ui: { ...ui, ...patch } });

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    try {
      const row = await uploadBackground(file);
      qc.invalidateQueries({ queryKey: BACKGROUNDS_KEY });
      setBg({ id: row.id });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const gap = { gap: "calc(2rem * var(--gap-scale, 1))" };
  const cardGap = { gap: "calc(1rem * var(--gap-scale, 1))" };

  return (
    <div className="flex flex-col pb-8" style={gap}>
      <section aria-label="Scene">
        <h2 className="eyebrow mb-3">Scene</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {THEME_LIST.map((t) => {
            const active = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => set({ theme: t.id as ThemeId })}
                aria-pressed={active}
                className={`group overflow-hidden rounded-xl border text-left transition-colors duration-[var(--dur-base)] ${
                  active ? "border-(--accent)/60" : "border-line hover:border-line-strong"
                }`}
              >
                <div
                  className="h-16 w-full"
                  style={{
                    background: `linear-gradient(to bottom, ${t.sky.top}, ${t.sky.mid} 55%, ${t.sky.horizon})`,
                  }}
                  aria-hidden
                />
                <div className="bg-bg1 px-3 py-2.5">
                  <p className={`text-[13px] font-medium ${active ? "text-accent" : "text-ink"}`}>
                    {t.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Accent">
        <h2 className="eyebrow mb-3">Accent</h2>
        <AccentSwatches value={ui.accent} onChange={(accent) => setUi({ accent })} />
      </section>

      <div className="grid items-start lg:grid-cols-2" style={cardGap}>
        <section aria-label="Shape" className="surface p-5">
          <h2 className="eyebrow mb-3">Shape</h2>
          <Row label="Corners">
            <Segmented
              label="Corners"
              size="sm"
              value={ui.radius}
              onChange={(radius) => setUi({ radius })}
              options={[
                { value: "sharp", label: "Sharp" },
                { value: "soft", label: "Soft" },
                { value: "round", label: "Round" },
              ]}
            />
          </Row>
          <Row label="Density">
            <Segmented
              label="Density"
              size="sm"
              value={ui.density}
              onChange={(density) => setUi({ density })}
              options={[
                { value: "compact", label: "Compact" },
                { value: "cozy", label: "Cozy" },
                { value: "airy", label: "Airy" },
              ]}
            />
          </Row>
          <Row label="Type scale">
            <Segmented
              label="Type scale"
              size="sm"
              value={String(ui.fontScale)}
              onChange={(v) => setUi({ fontScale: Number(v) as UiSettings["fontScale"] })}
              options={[
                { value: "0.9", label: "90" },
                { value: "1", label: "100" },
                { value: "1.1", label: "110" },
              ]}
            />
          </Row>
          <Row label="Contrast">
            <Segmented
              label="Contrast"
              size="sm"
              value={ui.contrast}
              onChange={(contrast) => setUi({ contrast })}
              options={[
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
              ]}
            />
          </Row>
        </section>

        <section aria-label="Clock" className="surface p-5">
          <h2 className="eyebrow mb-3">Clock</h2>
          <Toggle
            checked={ui.clockSeconds}
            onChange={(clockSeconds) => setUi({ clockSeconds })}
            label="Seconds"
          />
        </section>

        <section aria-label="Interface" className="surface p-5">
          <h2 className="eyebrow mb-3">Interface</h2>
          <Slider
            label="Brightness"
            value={settings.brightness}
            min={0.6}
            max={1}
            step={0.05}
            onChange={(brightness) => set({ brightness })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="Panel blur"
            value={settings.uiBlur}
            min={0}
            max={16}
            step={1}
            onChange={(uiBlur) => set({ uiBlur })}
            format={(v) => `${v}px`}
          />
          <Slider
            label="Panel opacity"
            value={settings.uiOpacity}
            min={0.7}
            max={1}
            step={0.05}
            onChange={(uiOpacity) => set({ uiOpacity })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </section>

        <section aria-label="Motion" className="surface p-5">
          <h2 className="eyebrow mb-3">Motion</h2>
          <Row label="Level">
            <Segmented
              label="Level"
              size="sm"
              value={settings.motion}
              onChange={(motion) => set({ motion })}
              options={[
                { value: "low", label: "Low" },
                { value: "balanced", label: "Balanced" },
                { value: "cinematic", label: "Cinematic" },
              ]}
            />
          </Row>
          <Toggle
            checked={settings.reducedMotion}
            onChange={(reducedMotion) => set({ reducedMotion })}
            label="Reduce motion"
          />
          <Toggle
            checked={settings.adaptivePerf}
            onChange={(adaptivePerf) => set({ adaptivePerf })}
            label="Adaptive performance"
          />
        </section>
      </div>

      <section aria-label="Background">
        <h2 className="eyebrow mb-3">Background</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <button
            onClick={() => setBg({ id: null })}
            aria-pressed={bg.id === null}
            className={tileClass(bg.id === null)}
          >
            <div
              className="h-16 w-full"
              style={(() => {
                const t = THEME_LIST.find((th) => th.id === settings.theme) ?? THEME_LIST[0];
                return {
                  background: `linear-gradient(to bottom, ${t.sky.top}, ${t.sky.mid} 55%, ${t.sky.horizon})`,
                };
              })()}
              aria-hidden
            />
            <div className="bg-bg1 px-3 py-2.5">
              <p
                className={`text-[13px] font-medium ${bg.id === null ? "text-accent" : "text-ink"}`}
              >
                None
              </p>
            </div>
          </button>
          {BUILTIN_BACKGROUNDS.map((b) => {
            const active = bg.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBg({ id: b.id })}
                aria-pressed={active}
                className={tileClass(active)}
              >
                <div className="h-16 w-full" style={{ backgroundColor: b.avgColor }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.path} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="bg-bg1 px-3 py-2.5">
                  <p className={`text-[13px] font-medium ${active ? "text-accent" : "text-ink"}`}>
                    {b.name}
                  </p>
                </div>
              </button>
            );
          })}
          {(myBackgrounds ?? []).map((row) => (
            <UserBackgroundTile
              key={row.id}
              bg={row}
              active={bg.id === row.id}
              onSelect={() => setBg({ id: row.id })}
              onDelete={() => {
                if (bg.id === row.id) setBg({ id: null });
                deleteBackground.mutate({ id: row.id, path: row.path });
              }}
            />
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full overflow-hidden rounded-xl border border-dashed border-line text-left transition-colors duration-[var(--dur-base)] hover:border-(--accent)/50 disabled:opacity-60"
          >
            <div className="flex h-16 w-full items-center justify-center text-ink-faint">
              <IconPlus size={18} />
            </div>
            <div className="bg-bg1 px-3 py-2.5">
              <p className="text-[13px] font-medium text-ink">
                {uploading ? "Uploading" : "Upload"}
              </p>
            </div>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          onChange={onUploadFile}
          className="hidden"
          aria-label="Upload background"
        />
        {bg.id && (
          <div className="surface mt-3 p-5">
            <Slider
              label="Dim"
              value={bg.dim}
              min={0}
              max={0.8}
              step={0.05}
              onChange={(dim) => setBg({ dim })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="Blur"
              value={bg.blur}
              min={0}
              max={24}
              step={1}
              onChange={(blur) => setBg({ blur })}
              format={(v) => `${v}px`}
            />
            <Slider
              label="Mute color"
              value={bg.desaturate}
              min={0}
              max={1}
              step={0.05}
              onChange={(desaturate) => setBg({ desaturate })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Toggle
              checked={bg.particles}
              onChange={(particles) => setBg({ particles })}
              label="Particles"
            />
          </div>
        )}
        <div className="mt-5">
          <InspirationChips />
        </div>
      </section>

      <div className="grid items-start lg:grid-cols-2" style={cardGap}>
        <section aria-label="Environment" className="surface p-5">
          <h2 className="eyebrow mb-3">Environment</h2>
          <Toggle
            checked={settings.weatherReactive}
            onChange={(weatherReactive) => set({ weatherReactive })}
            label="Live weather"
          />
          <Toggle
            checked={settings.timeReactive}
            onChange={(timeReactive) => set({ timeReactive })}
            label="Live daylight"
          />
          <Toggle
            checked={settings.albumGlow}
            onChange={(albumGlow) => set({ albumGlow })}
            label="Album light"
          />
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-line pt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">Weather override</span>
              <select
                value={settings.weatherOverride ?? ""}
                onChange={(e) =>
                  set({
                    weatherOverride: (e.target.value || null) as typeof settings.weatherOverride,
                  })
                }
                className="h-11 rounded-xl border border-line bg-bg1 px-3 text-sm text-ink"
              >
                <option value="">Follow real weather</option>
                <option value="clear">Clear</option>
                <option value="clouds">Clouds</option>
                <option value="drizzle">Drizzle</option>
                <option value="rain">Rain</option>
                <option value="storm">Storm</option>
                <option value="snow">Snow</option>
                <option value="fog">Fog</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">Time override</span>
              <select
                value={settings.phaseOverride ?? ""}
                onChange={(e) =>
                  set({ phaseOverride: (e.target.value || null) as typeof settings.phaseOverride })
                }
                className="h-11 rounded-xl border border-line bg-bg1 px-3 text-sm text-ink"
              >
                <option value="">Follow the real sky</option>
                <option value="predawn">Predawn</option>
                <option value="sunrise">Sunrise</option>
                <option value="morning">Morning</option>
                <option value="midday">Midday</option>
                <option value="golden">Golden hour</option>
                <option value="sunset">Sunset</option>
                <option value="blue-hour">Blue hour</option>
                <option value="night">Night</option>
              </select>
            </label>
          </div>
        </section>

        <section aria-label="Automatic theme" className="surface p-5">
          <h2 className="eyebrow mb-3">Automatic theme</h2>
          <Toggle
            checked={settings.autoSchedule.enabled}
            onChange={(enabled) => set({ autoSchedule: { ...settings.autoSchedule, enabled } })}
            label="Scheduled themes"
          />
          {settings.autoSchedule.enabled && (
            <div className="mt-3 space-y-3 border-t border-line pt-4">
              <Toggle
                checked={settings.autoSchedule.followSun}
                onChange={(followSun) =>
                  set({ autoSchedule: { ...settings.autoSchedule, followSun } })
                }
                label="Follow the sun"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink-dim">Day theme</span>
                  <select
                    value={settings.autoSchedule.dayTheme}
                    onChange={(e) =>
                      set({
                        autoSchedule: {
                          ...settings.autoSchedule,
                          dayTheme: e.target.value as ThemeId,
                        },
                      })
                    }
                    className="h-11 rounded-xl border border-line bg-bg1 px-3 text-sm text-ink"
                  >
                    {THEME_LIST.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink-dim">Night theme</span>
                  <select
                    value={settings.autoSchedule.nightTheme}
                    onChange={(e) =>
                      set({
                        autoSchedule: {
                          ...settings.autoSchedule,
                          nightTheme: e.target.value as ThemeId,
                        },
                      })
                    }
                    className="h-11 rounded-xl border border-line bg-bg1 px-3 text-sm text-ink"
                  >
                    {THEME_LIST.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {!settings.autoSchedule.followSun && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-ink-dim">Day starts</span>
                    <input
                      type="time"
                      value={settings.autoSchedule.dayStart}
                      onChange={(e) =>
                        set({
                          autoSchedule: { ...settings.autoSchedule, dayStart: e.target.value },
                        })
                      }
                      className="tnum h-11 rounded-xl border border-line bg-bg1 px-3 font-mono text-sm text-ink"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-ink-dim">Night starts</span>
                    <input
                      type="time"
                      value={settings.autoSchedule.nightStart}
                      onChange={(e) =>
                        set({
                          autoSchedule: { ...settings.autoSchedule, nightStart: e.target.value },
                        })
                      }
                      className="tnum h-11 rounded-xl border border-line bg-bg1 px-3 font-mono text-sm text-ink"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </section>

        <section aria-label="Today layout" className="surface p-5">
          <h2 className="eyebrow mb-3">Today layout</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LAYOUT_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => set({ todayLayout: p.build() })}
                className="rounded-xl border border-line px-3.5 py-3 text-left transition-colors duration-[var(--dur-base)] hover:border-(--accent)/50"
              >
                <p className="text-[13.5px] font-medium text-ink">{p.name}</p>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Ambient mode" className="surface p-5">
          <h2 className="eyebrow mb-3">Ambient mode</h2>
          <Slider
            label="Start after"
            value={settings.ambient.autoAfterMin}
            min={0}
            max={60}
            step={5}
            onChange={(autoAfterMin) => set({ ambient: { ...settings.ambient, autoAfterMin } })}
            format={(v) => (v === 0 ? "Off" : `${v}m`)}
          />
          <Toggle
            checked={settings.ambient.wakeLock}
            onChange={(wakeLock) => set({ ambient: { ...settings.ambient, wakeLock } })}
            label="Keep awake"
          />
          <Toggle
            checked={settings.ambient.burnInProtection}
            onChange={(burnInProtection) =>
              set({ ambient: { ...settings.ambient, burnInProtection } })
            }
            label="Burn-in shield"
          />
          <Toggle
            checked={settings.ambient.nightDimming}
            onChange={(nightDimming) => set({ ambient: { ...settings.ambient, nightDimming } })}
            label="Night dimming"
          />
          <Toggle
            checked={settings.ambient.showReminder}
            onChange={(showReminder) => set({ ambient: { ...settings.ambient, showReminder } })}
            label="Ambient reminders"
          />
        </section>
      </div>

      <div className="flex justify-end">
        <Button
          variant="quiet"
          onClick={() => {
            const { location } = settings;
            useSettings.getState().replaceAll({ ...DEFAULT_SETTINGS, location });
            toast("Appearance reset to defaults");
          }}
        >
          Reset appearance
        </Button>
      </div>
    </div>
  );
}
