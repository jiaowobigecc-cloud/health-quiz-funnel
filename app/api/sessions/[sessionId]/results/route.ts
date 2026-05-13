import { prisma } from "@/lib/prisma";
import { ok, problem, readRouteParams } from "@/lib/http";
import { decimalToNumber } from "@/lib/session-presenter";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await readRouteParams(context);
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      assessment: true,
      user: { include: { subscription: true } }
    }
  });

  if (!session) {
    return problem(404, "SESSION_NOT_FOUND", "No quiz session exists for this sessionId.");
  }

  if (!session.assessment) {
    return problem(409, "ASSESSMENT_NOT_READY", "Submit the quiz before requesting results.");
  }

  const subscriptionStatus = session.user.subscription?.status ?? "FREE";
  const hasAccess = subscriptionStatus === "ACTIVE";
  const assessment = presentAssessment(session.assessment, hasAccess);

  return ok({
    access: hasAccess ? "FULL" : "LOCKED",
    subscriptionStatus,
    subscriptionRequired: !hasAccess,
    payEndpoint: "/api/pay",
    sessionId,
    assessment
  });
}

function presentAssessment(
  assessment: NonNullable<Awaited<ReturnType<typeof prisma.assessment.findUnique>>>,
  hasAccess: boolean
) {
  const base = {
    bmi: decimalToNumber(assessment.bmi),
    bmiCategory: assessment.bmiCategory,
    dailyCalories: hasAccess ? assessment.dailyCalories : `${Math.floor(assessment.dailyCalories / 100) * 100}-${Math.ceil(assessment.dailyCalories / 100) * 100}`,
    targetDate: hasAccess ? assessment.targetDate.toISOString() : null,
    targetWeightKg: hasAccess ? decimalToNumber(assessment.targetWeightKg) : null
  };

  if (!hasAccess) {
    return {
      ...base,
      lockedFields: ["targetDate", "targetWeightKg", "estimatedWeeks", "recommendation", "predictionCurve"],
      teaser: "Subscribe to unlock your target date, weekly prediction curve, and plan details."
    };
  }

  return {
    ...base,
    bmr: assessment.bmr,
    estimatedWeeks: decimalToNumber(assessment.estimatedWeeks),
    recommendation: assessment.recommendation,
    predictionCurve: assessment.predictionCurve
  };
}
