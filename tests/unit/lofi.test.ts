import { describe, expect, it } from "vitest";
import {
  BEATS_PER_CHORD,
  LOFI_BPM,
  LOFI_PROGRESSION,
  chordAt,
  chordFrequencies,
  chordStartTime,
  clampGain,
  midiToFreq,
  secondsPerChord,
} from "@/lib/sound/lofi";

// Pure functions only — no AudioContext is ever constructed here.

describe("lofi progression", () => {
  it("is a ii–V–I–vi in F major", () => {
    expect(LOFI_PROGRESSION.map((c) => c.name)).toEqual(["Gm7", "C7", "Fmaj7", "Dm7"]);
  });

  it("voices every chord as a four-note seventh, low to high", () => {
    for (const chord of LOFI_PROGRESSION) {
      expect(chord.midi).toHaveLength(4);
      for (let i = 1; i < chord.midi.length; i++) {
        expect(chord.midi[i]).toBeGreaterThan(chord.midi[i - 1]);
      }
    }
  });

  it("converts midi to equal-temperament frequencies", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
    expect(midiToFreq(57)).toBeCloseTo(220, 6);
  });

  it("returns the expected frequencies for Fmaj7", () => {
    const fmaj7 = LOFI_PROGRESSION.find((c) => c.name === "Fmaj7")!;
    const freqs = chordFrequencies(fmaj7);
    expect(freqs[0]).toBeCloseTo(174.614, 2); // F3
    expect(freqs[1]).toBeCloseTo(220, 2); // A3
    expect(freqs[2]).toBeCloseTo(261.626, 2); // C4
    expect(freqs[3]).toBeCloseTo(329.628, 2); // E4
  });

  it("wraps chordAt around the progression, including negative steps", () => {
    expect(chordAt(0).name).toBe("Gm7");
    expect(chordAt(4).name).toBe("Gm7");
    expect(chordAt(7).name).toBe("Dm7");
    expect(chordAt(-1).name).toBe("Dm7");
  });
});

describe("lofi scheduler math", () => {
  it("derives seconds per chord from bpm and beats", () => {
    expect(secondsPerChord(LOFI_BPM, BEATS_PER_CHORD)).toBeCloseTo((4 * 60) / 74, 6);
    expect(secondsPerChord(60, 4)).toBe(4);
  });

  it("produces strictly increasing, evenly spaced chord times", () => {
    const start = 12.34;
    const spc = secondsPerChord();
    let prev = -Infinity;
    for (let step = 0; step < 32; step++) {
      const t = chordStartTime(start, step, spc);
      expect(t).toBeGreaterThan(prev);
      expect(t).toBeCloseTo(start + step * spc, 9);
      prev = t;
    }
  });
});

describe("layer gain clamping", () => {
  it("passes in-range values through", () => {
    expect(clampGain(0)).toBe(0);
    expect(clampGain(0.42)).toBe(0.42);
    expect(clampGain(1)).toBe(1);
  });

  it("clamps out-of-range and junk values", () => {
    expect(clampGain(-0.5)).toBe(0);
    expect(clampGain(2)).toBe(1);
    expect(clampGain(Infinity)).toBe(1);
    expect(clampGain(-Infinity)).toBe(0);
    expect(clampGain(NaN)).toBe(0);
  });
});
