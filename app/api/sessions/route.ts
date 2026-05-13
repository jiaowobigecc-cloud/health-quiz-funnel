import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, parseJson, problem, validationProblem } from "@/lib/http";
import { createSessionSchema } from "@/lib/validation";
import { presentSession } from "@/lib/session-presenter";

export async function POST(request: Request) {
  const parsed = createSessionSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationProblem(parsed.error);

  const clientToken = parsed.data.clientToken ?? randomUUID();
  const user = await prisma.user.upsert({
    where: { clientToken },
    update: parsed.data.email ? { email: parsed.data.email } : {},
    create: {
      clientToken,
      email: parsed.data.email,
      subscription: {
        create: { status: "FREE" }
      }
    },
    include: { subscription: true }
  });

  const subscription =
    user.subscription ??
    (await prisma.subscription.create({
      data: { userId: user.id, status: "FREE" }
    }));

  let session = await prisma.quizSession.findFirst({
    where: { userId: user.id, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    include: { assessment: true, user: { include: { subscription: true } } }
  });

  if (!session) {
    session = await prisma.quizSession.create({
      data: { userId: user.id },
      include: { assessment: true, user: { include: { subscription: true } } }
    });
  }

  return ok(
    {
      clientToken,
      userId: user.id,
      subscriptionStatus: subscription.status,
      session: presentSession(session)
    },
    201
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientToken = url.searchParams.get("clientToken");

  if (!clientToken) {
    return problem(400, "MISSING_CLIENT_TOKEN", "Pass clientToken as a query parameter to restore progress.");
  }

  const parsed = createSessionSchema.shape.clientToken.safeParse(clientToken);
  if (!parsed.success) return validationProblem(parsed.error);

  const user = await prisma.user.findUnique({
    where: { clientToken },
    include: { subscription: true }
  });

  if (!user) {
    return problem(404, "USER_NOT_FOUND", "No quiz progress exists for this clientToken.");
  }

  const session = await prisma.quizSession.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { assessment: true, user: { include: { subscription: true } } }
  });

  if (!session) {
    return problem(404, "SESSION_NOT_FOUND", "No quiz session exists for this user.");
  }

  return ok({
    clientToken,
    userId: user.id,
    subscriptionStatus: user.subscription?.status ?? "FREE",
    session: presentSession(session)
  });
}
