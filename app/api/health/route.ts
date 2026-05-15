import { prisma } from "@/lib/prisma";
import { ok, problem } from "@/lib/http";

export async function GET() {
  try {
    const paidDemoSession = await prisma.quizSession.findUnique({
      where: { id: "paid_demo_session_001" },
      select: { id: true, status: true }
    });

    return ok({
      status: "ok",
      database: "reachable",
      paidDemoSessionReady: paidDemoSession?.status === "COMPLETED",
      checkedAt: new Date().toISOString()
    });
  } catch {
    return problem(503, "DATABASE_UNREACHABLE", "Health check could not reach the database.");
  }
}
