import { prisma } from "@/lib/prisma";
import { ok, parseJson, problem, readRouteParams, validationProblem } from "@/lib/http";
import { presentSession } from "@/lib/session-presenter";
import { answerPatchSchema, mergeCompletedSteps, nextStepAfter } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await readRouteParams(context);
  const parsed = answerPatchSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationProblem(parsed.error);

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { assessment: true, user: { include: { subscription: true } } }
  });

  if (!session) {
    return problem(404, "SESSION_NOT_FOUND", "No quiz session exists for this sessionId.");
  }

  if (session.status === "COMPLETED") {
    return problem(409, "SESSION_ALREADY_SUBMITTED", "Submitted sessions are immutable. Create a new session to retake the quiz.");
  }

  const completedSteps = mergeCompletedSteps(session.completedSteps, parsed.data.step);
  const data = {
    ...getStepUpdate(parsed.data),
    completedSteps,
    currentStep: nextStepAfter(parsed.data.step)
  };

  const updatedSession = await prisma.quizSession.update({
    where: { id: sessionId },
    data,
    include: { assessment: true, user: { include: { subscription: true } } }
  });

  return ok({ session: presentSession(updatedSession) });
}

function getStepUpdate(input: ReturnType<typeof answerPatchSchema.parse>) {
  if (input.step === "gender") {
    return { gender: input.data.gender };
  }

  if (input.step === "goal") {
    return { primaryGoal: input.data.primaryGoal };
  }

  if (input.step === "activity") {
    return { activityFrequency: input.data.activityFrequency };
  }

  return {
    age: input.data.age,
    heightCm: input.data.heightCm,
    weightKg: input.data.weightKg,
    targetWeightKg: input.data.targetWeightKg
  };
}
