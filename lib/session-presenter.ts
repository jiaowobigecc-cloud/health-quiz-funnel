import type { QuizSession, Assessment, Subscription } from "@prisma/client";

type SessionWithRelations = QuizSession & {
  assessment?: Assessment | null;
  user?: {
    subscription?: Subscription | null;
  } | null;
};

export function presentSession(session: SessionWithRelations) {
  return {
    sessionId: session.id,
    userId: session.userId,
    status: session.status,
    currentStep: session.currentStep,
    completedSteps: session.completedSteps,
    answers: {
      gender: session.gender,
      primaryGoal: session.primaryGoal,
      age: session.age,
      heightCm: decimalToNumber(session.heightCm),
      weightKg: decimalToNumber(session.weightKg),
      targetWeightKg: decimalToNumber(session.targetWeightKg),
      activityFrequency: session.activityFrequency
    },
    subscriptionStatus: session.user?.subscription?.status ?? "FREE",
    hasAssessment: Boolean(session.assessment),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}

export function decimalToNumber(value: unknown) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}
