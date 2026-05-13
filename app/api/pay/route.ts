import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, parseJson, problem, validationProblem } from "@/lib/http";
import { paySchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = paySchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationProblem(parsed.error);

  const session = await prisma.quizSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: { user: { include: { subscription: true } } }
  });

  if (!session) {
    return problem(404, "SESSION_NOT_FOUND", "No quiz session exists for this sessionId.");
  }

  const idempotencyKey = parsed.data.idempotencyKey ?? `mock-pay-${parsed.data.sessionId}-${randomUUID()}`;
  const existingPayment = await prisma.paymentEvent.findUnique({
    where: { idempotencyKey },
    include: { subscription: true }
  });

  if (existingPayment) {
    return ok({
      status: "ALREADY_PROCESSED",
      subscriptionStatus: existingPayment.subscription.status,
      sessionId: parsed.data.sessionId,
      resultsUrl: `/api/sessions/${parsed.data.sessionId}/results`
    });
  }

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const subscription = await prisma.subscription.upsert({
    where: { userId: session.userId },
    update: {
      status: "ACTIVE",
      provider: "mock",
      currentPeriodEnd: periodEnd,
      user: parsed.data.email ? { update: { email: parsed.data.email } } : undefined
    },
    create: {
      userId: session.userId,
      status: "ACTIVE",
      provider: "mock",
      currentPeriodEnd: periodEnd
    }
  });

  const payment = await prisma.paymentEvent.create({
    data: {
      subscriptionId: subscription.id,
      sessionId: parsed.data.sessionId,
      idempotencyKey,
      amountCents: parsed.data.amountCents,
      currency: parsed.data.currency.toUpperCase(),
      status: "SUCCEEDED",
      rawPayload: parsed.data
    }
  });

  return ok(
    {
      status: "PAID",
      paymentId: payment.id,
      idempotencyKey,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
      sessionId: parsed.data.sessionId,
      resultsUrl: `/api/sessions/${parsed.data.sessionId}/results`
    },
    201
  );
}
