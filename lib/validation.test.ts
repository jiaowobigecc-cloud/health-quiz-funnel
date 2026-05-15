import { describe, expect, it } from "vitest";
import { answerPatchSchema, mergeCompletedSteps, nextStepAfter } from "./validation";

describe("answerPatchSchema", () => {
  it("accepts a valid body step", () => {
    const result = answerPatchSchema.safeParse({
      step: "body",
      data: {
        age: 28,
        heightCm: 166,
        weightKg: 68,
        targetWeightKg: 61
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe body values", () => {
    const result = answerPatchSchema.safeParse({
      step: "body",
      data: {
        age: 12,
        heightCm: 80,
        weightKg: 20,
        targetWeightKg: 260
      }
    });

    expect(result.success).toBe(false);
  });
});

describe("quiz step helpers", () => {
  it("moves through the expected funnel order", () => {
    expect(nextStepAfter("gender")).toBe("goal");
    expect(nextStepAfter("activity")).toBe("submit");
  });

  it("deduplicates completed steps while preserving funnel order", () => {
    expect(mergeCompletedSteps(["body", "gender"], "goal")).toEqual(["gender", "goal", "body"]);
  });
});
