"use client";

import { THEME_LIST, type ThemeId } from "@/lib/themes/registry";
import { DEFAULT_SETTINGS, useSettings } from "@/lib/settings/store";
import { Segmented, Toggle } from "@/components/ui/Segmented";
import { LAYOUT_PRESETS } from "@/lib/settings/layout";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

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

export default function AppearancePage() {
  const { settings, set } = useSettings();
  const { toast } = useToast();

  return (
    <div className="space-y-8 pb-8">
      <section aria-label="Theme">
        <h2 className="eyebrow mb-3">Theme</h2>
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

      <section aria-label="Today layout" className="surface p-5">
        <h2 className="eyebrow mb-3">Today layout</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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

      <section aria-label="Motion" className="surface p-5">
        <h2 className="eyebrow mb-3">Motion</h2>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink">Motion level</span>
            <Segmented
              label="Motion level"
              value={settings.motion}
              onChange={(motion) => set({ motion })}
              options={[
                { value: "low", label: "Low" },
                { value: "balanced", label: "Balanced" },
                { value: "cinematic", label: "Cinematic" },
              ]}
            />
          </div>
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
        </div>
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
          label="Background blur"
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
        <Slider
          label="Text size"
          value={settings.textScale}
          min={0.9}
          max={1.2}
          step={0.05}
          onChange={(textScale) => set({ textScale })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-ink">Density</span>
          <Segmented
            label="Density"
            value={settings.density}
            onChange={(density) => set({ density })}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </div>
      </section>

      <section aria-label="Environment" className="surface p-5">
        <h2 className="eyebrow mb-3">Environment</h2>
        <Toggle
          checked={settings.weatherReactive}
          onChange={(weatherReactive) => set({ weatherReactive })}
          label="React to real weather"
        />
        <Toggle
          checked={settings.timeReactive}
          onChange={(timeReactive) => set({ timeReactive })}
          label="React to time of day"
        />
        <Toggle
          checked={settings.albumGlow}
          onChange={(albumGlow) => set({ albumGlow })}
          label="Album light"
        />
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
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
          label="Switch themes on a schedule"
        />
        {settings.autoSchedule.enabled && (
          <div className="mt-3 space-y-3 border-t border-line pt-4">
            <Toggle
              checked={settings.autoSchedule.followSun}
              onChange={(followSun) =>
                set({ autoSchedule: { ...settings.autoSchedule, followSun } })
              }
              label="Follow sunrise and sunset"
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
                      set({ autoSchedule: { ...settings.autoSchedule, dayStart: e.target.value } })
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

      <section aria-label="Ambient mode" className="surface p-5">
        <h2 className="eyebrow mb-3">Ambient mode</h2>
        <Slider
          label="Start after inactivity"
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
          label="Keep the screen awake"
        />
        <Toggle
          checked={settings.ambient.burnInProtection}
          onChange={(burnInProtection) =>
            set({ ambient: { ...settings.ambient, burnInProtection } })
          }
          label="Protect against burn-in"
        />
        <Toggle
          checked={settings.ambient.nightDimming}
          onChange={(nightDimming) => set({ ambient: { ...settings.ambient, nightDimming } })}
          label="Dim late at night"
        />
        <Toggle
          checked={settings.ambient.showReminder}
          onChange={(showReminder) => set({ ambient: { ...settings.ambient, showReminder } })}
          label="Show one gentle reminder"
        />
      </section>

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
