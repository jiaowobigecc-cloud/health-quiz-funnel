type Gender = "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
type FitnessGoal = "LOSE_WEIGHT" | "BUILD_STRENGTH" | "IMPROVE_MOBILITY" | "FEEL_HEALTHIER";
type ActivityFrequency = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "ATHLETE";

export type AssessmentInput = {
  gender: Gender;
  primaryGoal: FitnessGoal;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityFrequency: ActivityFrequency;
};

const activityFactor: Record<ActivityFrequency, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  ATHLETE: 1.9
};

const goalAdjustment: Record<FitnessGoal, number> = {
  LOSE_WEIGHT: -450,
  BUILD_STRENGTH: 250,
  IMPROVE_MOBILITY: -100,
  FEEL_HEALTHIER: -250
};

export function calculateAssessment(input: AssessmentInput) {
  const heightM = input.heightCm / 100;
  const bmi = round(input.weightKg / (heightM * heightM), 1);
  const bmiCategory = getBmiCategory(bmi);
  const sexConstant = input.gender === "MALE" ? 5 : -161;
  const bmr = Math.round(10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexConstant);
  const maintenanceCalories = Math.round(bmr * activityFactor[input.activityFrequency]);
  const dailyCalories = clamp(maintenanceCalories + goalAdjustment[input.primaryGoal], 1200, 3600);
  const weightDelta = Math.abs(input.weightKg - input.targetWeightKg);
  const weeklyPaceKg = input.primaryGoal === "BUILD_STRENGTH" && input.targetWeightKg > input.weightKg ? 0.25 : 0.5;
  const estimatedWeeks = round(Math.max(2, weightDelta / weeklyPaceKg), 1);
  const targetDate = addDays(new Date(), Math.ceil(estimatedWeeks * 7));
  const predictionCurve = buildPredictionCurve(input.weightKg, input.targetWeightKg, estimatedWeeks);

  return {
    bmi,
    bmiCategory,
    bmr,
    dailyCalories,
    estimatedWeeks,
    targetDate,
    targetWeightKg: input.targetWeightKg,
    recommendation: {
      headline: getHeadline(input.primaryGoal, bmiCategory),
      calorieStrategy: dailyCalories < maintenanceCalories ? "MODERATE_DEFICIT" : "CONTROLLED_SURPLUS",
      proteinGrams: Math.round(input.weightKg * 1.6),
      weeklyWorkouts: suggestedWorkoutDays(input.activityFrequency),
      notes: [
        "Keep the plan sustainable and reassess weight trend every 2 weeks.",
        "Pair nutrition targets with low-impact strength and mobility sessions."
      ]
    },
    predictionCurve
  };
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return "UNDERWEIGHT";
  if (bmi < 24) return "NORMAL";
  if (bmi < 28) return "OVERWEIGHT";
  return "OBESE";
}

function getHeadline(goal: FitnessGoal, bmiCategory: string) {
  if (goal === "BUILD_STRENGTH") return "Build strength with a steady calorie and protein target.";
  if (goal === "IMPROVE_MOBILITY") return "Improve mobility while keeping weight change gentle.";
  if (bmiCategory === "NORMAL") return "You are in a healthy BMI range; focus on consistency.";
  return "A moderate plan can move you toward your target without crash dieting.";
}

function suggestedWorkoutDays(activity: ActivityFrequency) {
  if (activity === "SEDENTARY") return 3;
  if (activity === "LIGHT") return 4;
  return 5;
}

function buildPredictionCurve(startWeight: number, targetWeight: number, estimatedWeeks: number) {
  const points = Math.min(12, Math.max(4, Math.ceil(estimatedWeeks)));

  return Array.from({ length: points + 1 }, (_, index) => {
    const progress = index / points;
    const eased = 1 - Math.pow(1 - progress, 1.5);
    return {
      week: Math.round(progress * estimatedWeeks),
      weightKg: round(startWeight + (targetWeight - startWeight) * eased, 1)
    };
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
