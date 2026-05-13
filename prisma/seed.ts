import { ActivityFrequency, FitnessGoal, Gender, PrismaClient, QuizStatus } from "@prisma/client";
import { calculateAssessment } from "../lib/assessment";

const prisma = new PrismaClient();

async function main() {
  const clientToken = "paid-demo-client";
  const paidDemoSessionId = "paid_demo_session_001";

  const user = await prisma.user.upsert({
    where: { clientToken },
    update: {},
    create: {
      clientToken,
      email: "paid-demo@example.com",
      subscription: {
        create: {
          status: "ACTIVE",
          provider: "mock",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }
    },
    include: { subscription: true }
  });

  const sessionData = {
      userId: user.id,
      status: QuizStatus.COMPLETED,
      currentStep: "results",
      completedSteps: ["gender", "goal", "body", "activity"],
      gender: Gender.FEMALE,
      primaryGoal: FitnessGoal.FEEL_HEALTHIER,
      age: 28,
      heightCm: 166,
      weightKg: 68,
      targetWeightKg: 61,
      activityFrequency: ActivityFrequency.MODERATE,
      completedAt: new Date()
  };

  const session = await prisma.quizSession.upsert({
    where: { id: paidDemoSessionId },
    update: sessionData,
    create: {
      id: paidDemoSessionId,
      ...sessionData
    }
  });

  const result = calculateAssessment({
    gender: "FEMALE",
    primaryGoal: "FEEL_HEALTHIER",
    age: 28,
    heightCm: 166,
    weightKg: 68,
    targetWeightKg: 61,
    activityFrequency: "MODERATE"
  });

  await prisma.assessment.upsert({
    where: { sessionId: session.id },
    update: {
      bmi: result.bmi,
      bmiCategory: result.bmiCategory,
      bmr: result.bmr,
      dailyCalories: result.dailyCalories,
      estimatedWeeks: result.estimatedWeeks,
      targetDate: result.targetDate,
      targetWeightKg: result.targetWeightKg,
      recommendation: result.recommendation,
      predictionCurve: result.predictionCurve
    },
    create: {
      sessionId: session.id,
      userId: user.id,
      bmi: result.bmi,
      bmiCategory: result.bmiCategory,
      bmr: result.bmr,
      dailyCalories: result.dailyCalories,
      estimatedWeeks: result.estimatedWeeks,
      targetDate: result.targetDate,
      targetWeightKg: result.targetWeightKg,
      recommendation: result.recommendation,
      predictionCurve: result.predictionCurve
    }
  });

  console.log(`Paid demo sessionId: ${paidDemoSessionId}`);
  console.log(`Paid demo clientToken: ${clientToken}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
