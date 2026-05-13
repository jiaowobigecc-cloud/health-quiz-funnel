import { z } from "zod";

export const stepOrder = ["gender", "goal", "body", "activity"] as const;
export type QuizStep = (typeof stepOrder)[number];

export const clientTokenSchema = z
  .string()
  .min(8)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/, "clientToken may only contain letters, numbers, underscores, and dashes");

export const createSessionSchema = z.object({
  clientToken: clientTokenSchema.optional(),
  email: z.string().email().max(160).optional()
});

export const answerPatchSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("gender"),
    data: z.object({
      gender: z.enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"])
    })
  }),
  z.object({
    step: z.literal("goal"),
    data: z.object({
      primaryGoal: z.enum(["LOSE_WEIGHT", "BUILD_STRENGTH", "IMPROVE_MOBILITY", "FEEL_HEALTHIER"])
    })
  }),
  z.object({
    step: z.literal("body"),
    data: z
      .object({
        age: z.coerce.number().int().min(18).max(80),
        heightCm: z.coerce.number().min(120).max(230),
        weightKg: z.coerce.number().min(35).max(250),
        targetWeightKg: z.coerce.number().min(35).max(250)
      })
      .refine((data) => Math.abs(data.weightKg - data.targetWeightKg) <= 80, {
        message: "targetWeightKg must be within 80kg of current weight",
        path: ["targetWeightKg"]
      })
  }),
  z.object({
    step: z.literal("activity"),
    data: z.object({
      activityFrequency: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "ATHLETE"])
    })
  })
]);

export const paySchema = z.object({
  sessionId: z.string().min(10),
  idempotencyKey: z.string().min(8).max(120).optional(),
  email: z.string().email().max(160).optional(),
  amountCents: z.coerce.number().int().min(100).max(99900).default(1900),
  currency: z.string().length(3).default("CNY")
});

export function nextStepAfter(step: QuizStep) {
  const index = stepOrder.indexOf(step);
  return stepOrder[index + 1] ?? "submit";
}

export function mergeCompletedSteps(existing: string[], step: QuizStep) {
  return Array.from(new Set([...existing, step])).sort((a, b) => stepOrder.indexOf(a as QuizStep) - stepOrder.indexOf(b as QuizStep));
}

export function getZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}
