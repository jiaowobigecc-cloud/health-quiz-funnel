import { describe, expect, it } from "vitest";
import { calculateAssessment } from "./assessment";

describe("calculateAssessment", () => {
  it("calculates a complete assessment with a prediction curve", () => {
    const result = calculateAssessment({
      gender: "FEMALE",
      primaryGoal: "LOSE_WEIGHT",
      age: 28,
      heightCm: 166,
      weightKg: 68,
      targetWeightKg: 61,
      activityFrequency: "MODERATE"
    });

    expect(result.bmi).toBe(24.7);
    expect(result.bmiCategory).toBe("OVERWEIGHT");
    expect(result.dailyCalories).toBeGreaterThanOrEqual(1200);
    expect(result.estimatedWeeks).toBe(14);
    expect(result.predictionCurve).toHaveLength(13);
    expect(result.predictionCurve.at(-1)).toMatchObject({ week: 14, weightKg: 61 });
  });

  it("keeps daily calories inside safe product bounds", () => {
    const result = calculateAssessment({
      gender: "FEMALE",
      primaryGoal: "LOSE_WEIGHT",
      age: 80,
      heightCm: 120,
      weightKg: 35,
      targetWeightKg: 35,
      activityFrequency: "SEDENTARY"
    });

    expect(result.dailyCalories).toBe(1200);
  });
});
