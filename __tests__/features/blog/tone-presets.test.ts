import { describe, it, expect } from "vitest";
import { TONE_PRESETS, getTonePreset } from "@/features/blog/tone-presets";

describe("TONE_PRESETS", () => {
  it("has 3 presets", () => {
    expect(TONE_PRESETS).toHaveLength(3);
  });

  it("each preset has required fields", () => {
    for (const preset of TONE_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.promptInstruction).toBeTruthy();
    }
  });
});

describe("getTonePreset", () => {
  it("returns preset by id", () => {
    const preset = getTonePreset("friendly");
    expect(preset?.name).toBe("친근체");
  });

  it("returns undefined for unknown id", () => {
    expect(getTonePreset("unknown" as any)).toBeUndefined();
  });
});
