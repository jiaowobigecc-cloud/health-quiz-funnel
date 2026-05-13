import { prisma } from "@/lib/prisma";
import { ok, problem, readRouteParams } from "@/lib/http";
import { presentSession } from "@/lib/session-presenter";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await readRouteParams(context);
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { assessment: true, user: { include: { subscription: true } } }
  });

  if (!session) {
    return problem(404, "SESSION_NOT_FOUND", "No quiz session exists for this sessionId.");
  }

  return ok({ session: presentSession(session) });
}
