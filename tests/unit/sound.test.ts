import { describe, expect, it } from "vitest";
import { parseSynthParams, SYNTH_PRESETS } from "@/lib/sound/synth";

describe("parseSynthParams", () => {
  it("round-trips every preset's defaults", () => {
    for (const preset of SYNTH_PRESETS) {
      const parsed = parseSynthParams(JSON.parse(JSON.stringify(preset.defaults)));
      expect(parsed?.preset).toBe(preset.id);
    }
  });
  it("rejects unknown presets and junk", () => {
    expect(parseSynthParams({ preset: "airhorn" })).toBeNull();
    expect(parseSynthParams(null)).toBeNull();
    expect(parseSynthParams("rain")).toBeNull();
  });
  it("drops non-numeric knobs", () => {
    const parsed = parseSynthParams({ preset: "chime", pitch: "high", decay: 2 });
    expect(parsed).toEqual({ preset: "chime", pitch: undefined, decay: 2, filter: undefined });
  });
});
