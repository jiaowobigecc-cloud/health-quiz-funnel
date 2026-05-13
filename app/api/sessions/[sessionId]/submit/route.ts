import { prisma } from "@/lib/prisma";
import { calculateAssessment } from "@/lib/assessment";
import { ok, problem, readRouteParams } from "@/lib/http";
import { decimalToNumber, presentSession } from "@/lib/session-presenter";

export async function POST(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await readRouteParams(context);
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { assessment: true, user: { include: { subscription: true } } }
  });

  if (!session) {
    return problem(404, "SESSION_NOT_FOUND", "No quiz session exists for this sessionId.");
  }

  const missing = getMissingFields(session);
  if (missing.length > 0) {
    return problem(409, "SESSION_INCOMPLETE", "Complete all quiz steps before submitting.", { missing });
  }

  const assessment = calculateAssessment({
    gender: session.gender!,
    primaryGoal: session.primaryGoal!,
    age: session.age!,
    heightCm: decimalToNumber(session.heightCm)!,
    weightKg: decimalToNumber(session.weightKg)!,
    targetWeightKg: decimalToNumber(session.targetWeightKg)!,
    activityFrequency: session.activityFrequency!
  });

  const [updatedSession, savedAssessment] = await prisma.$transaction([
    prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        currentStep: "results",
        completedAt: new Date()
      },
      include: { assessment: true, user: { include: { subscription: true } } }
    }),
    prisma.assessment.upsert({
      where: { sessionId },
      update: {
        bmi: assessment.bmi,
        bmiCategory: assessment.bmiCategory,
        bmr: assessment.bmr,
        dailyCalories: assessment.dailyCalories,
        estimatedWeeks: assessment.estimatedWeeks,
        targetDate: assessment.targetDate,
        targetWeightKg: assessment.targetWeightKg,
        recommendation: assessment.recommendation,
        predictionCurve: assessment.predictionCurve
      },
      create: {
        sessionId,
        userId: session.userId,
        bmi: assessment.bmi,
        bmiCategory: assessment.bmiCategory,
        bmr: assessment.bmr,
        dailyCalories: assessment.dailyCalories,
        estimatedWeeks: assessment.estimatedWeeks,
        targetDate: assessment.targetDate,
        targetWeightKg: assessment.targetWeightKg,
        recommendation: assessment.recommendation,
        predictionCurve: assessment.predictionCurve
      }
    })
  ]);

  return ok({
    session: presentSession({
      ...updatedSession,
      assessment: savedAssessment,
      user: session.user
    }),
    assessmentId: savedAssessment.id
  });
}

function getMissingFields(session: {
  gender: unknown;
  primaryGoal: unknown;
  age: unknown;
  heightCm: unknown;
  weightKg: unknown;
  targetWeightKg: unknown;
  activityFrequency: unknown;
}) {
  return Object.entries({
    gender: session.gender,
    primaryGoal: session.primaryGoal,
    age: session.age,
    heightCm: session.heightCm,
    weightKg: session.weightKg,
    targetWeightKg: session.targetWeightKg,
    activityFrequency: session.activityFrequency
  })
    .filter(([, value]) => value == null)
    .map(([key]) => key);
}
