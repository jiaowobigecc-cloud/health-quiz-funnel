/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { calculateAssessment } from "./assessment";

type Store = {
  users: MemoryUser[];
  subscriptions: MemorySubscription[];
  sessions: MemoryQuizSession[];
  assessments: MemoryAssessment[];
  payments: MemoryPaymentEvent[];
};

type MemoryUser = {
  id: string;
  clientToken: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MemorySubscription = {
  id: string;
  userId: string;
  status: string;
  provider: string;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MemoryQuizSession = {
  id: string;
  userId: string;
  status: string;
  currentStep: string;
  completedSteps: string[];
  gender: string | null;
  primaryGoal: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityFrequency: string | null;
  healthContext: unknown | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MemoryAssessment = {
  id: string;
  sessionId: string;
  userId: string;
  bmi: number;
  bmiCategory: string;
  bmr: number;
  dailyCalories: number;
  estimatedWeeks: number;
  targetDate: Date;
  targetWeightKg: number;
  recommendation: unknown;
  predictionCurve: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type MemoryPaymentEvent = {
  id: string;
  subscriptionId: string;
  sessionId: string | null;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
  status: string;
  rawPayload: unknown;
  createdAt: Date;
};

export function createMemoryPrisma() {
  const store = createSeededStore();

  return {
    user: {
      async upsert(args: any) {
        let user = store.users.find((item) => item.clientToken === args.where.clientToken);

        if (user) {
          Object.assign(user, cleanUpdate(args.update), { updatedAt: new Date() });
        } else {
          user = {
            id: args.create.id ?? makeId("user"),
            clientToken: args.create.clientToken,
            email: args.create.email ?? null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          store.users.push(user);

          if (args.create.subscription?.create) {
            store.subscriptions.push({
              id: makeId("sub"),
              userId: user.id,
              status: args.create.subscription.create.status ?? "FREE",
              provider: args.create.subscription.create.provider ?? "mock",
              currentPeriodEnd: args.create.subscription.create.currentPeriodEnd ?? null,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }

        return includeUser(user, args.include, store);
      },
      async findUnique(args: any) {
        const user = store.users.find((item) => item.clientToken === args.where.clientToken || item.id === args.where.id);
        return user ? includeUser(user, args.include, store) : null;
      },
      async create(args: any) {
        const user = {
          id: args.data.id ?? makeId("user"),
          clientToken: args.data.clientToken,
          email: args.data.email ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        store.users.push(user);
        return includeUser(user, args.include, store);
      },
      async update(args: any) {
        const user = store.users.find((item) => item.id === args.where.id || item.clientToken === args.where.clientToken);
        if (!user) throw new Error("User not found");
        Object.assign(user, cleanUpdate(args.data), { updatedAt: new Date() });
        return includeUser(user, args.include, store);
      }
    },
    subscription: {
      async create(args: any) {
        const subscription = {
          id: args.data.id ?? makeId("sub"),
          userId: args.data.userId,
          status: args.data.status ?? "FREE",
          provider: args.data.provider ?? "mock",
          currentPeriodEnd: args.data.currentPeriodEnd ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        store.subscriptions.push(subscription);
        return subscription;
      },
      async upsert(args: any) {
        let subscription = store.subscriptions.find((item) => item.userId === args.where.userId);

        if (subscription) {
          Object.assign(subscription, cleanUpdate(args.update), { updatedAt: new Date() });
          if (args.update.user?.update?.email) {
            const user = store.users.find((item) => item.id === subscription?.userId);
            if (user) user.email = args.update.user.update.email;
          }
        } else {
          subscription = {
            id: args.create.id ?? makeId("sub"),
            userId: args.create.userId,
            status: args.create.status ?? "FREE",
            provider: args.create.provider ?? "mock",
            currentPeriodEnd: args.create.currentPeriodEnd ?? null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          store.subscriptions.push(subscription);
        }

        return subscription;
      }
    },
    quizSession: {
      async findFirst(args: any) {
        const sessions = store.sessions
          .filter((session) => {
            if (args.where?.userId && session.userId !== args.where.userId) return false;
            if (args.where?.status && session.status !== args.where.status) return false;
            return true;
          })
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

        return sessions[0] ? includeSession(sessions[0], args.include, store) : null;
      },
      async findUnique(args: any) {
        const session = store.sessions.find((item) => item.id === args.where.id);
        return session ? includeSession(session, args.include, store) : null;
      },
      async create(args: any) {
        const session = {
          id: args.data.id ?? makeId("session"),
          userId: args.data.userId,
          status: args.data.status ?? "DRAFT",
          currentStep: args.data.currentStep ?? "gender",
          completedSteps: args.data.completedSteps ?? [],
          gender: args.data.gender ?? null,
          primaryGoal: args.data.primaryGoal ?? null,
          age: args.data.age ?? null,
          heightCm: args.data.heightCm ?? null,
          weightKg: args.data.weightKg ?? null,
          targetWeightKg: args.data.targetWeightKg ?? null,
          activityFrequency: args.data.activityFrequency ?? null,
          healthContext: args.data.healthContext ?? null,
          completedAt: args.data.completedAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        store.sessions.push(session);
        return includeSession(session, args.include, store);
      },
      async update(args: any) {
        const session = store.sessions.find((item) => item.id === args.where.id);
        if (!session) throw new Error("Session not found");
        Object.assign(session, cleanUpdate(args.data), { updatedAt: new Date() });
        return includeSession(session, args.include, store);
      },
      async upsert(args: any) {
        const existing = store.sessions.find((item) => item.id === args.where.id);
        if (existing) {
          Object.assign(existing, cleanUpdate(args.update), { updatedAt: new Date() });
          return includeSession(existing, args.include, store);
        }

        return this.create({ data: args.create, include: args.include });
      }
    },
    assessment: {
      async findUnique(args: any) {
        return store.assessments.find((item) => item.sessionId === args.where.sessionId || item.id === args.where.id) ?? null;
      },
      async create(args: any) {
        const assessment = {
          id: args.data.id ?? makeId("assessment"),
          sessionId: args.data.sessionId,
          userId: args.data.userId,
          bmi: args.data.bmi,
          bmiCategory: args.data.bmiCategory,
          bmr: args.data.bmr,
          dailyCalories: args.data.dailyCalories,
          estimatedWeeks: args.data.estimatedWeeks,
          targetDate: args.data.targetDate,
          targetWeightKg: args.data.targetWeightKg,
          recommendation: args.data.recommendation,
          predictionCurve: args.data.predictionCurve,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        store.assessments.push(assessment);
        return assessment;
      },
      async upsert(args: any) {
        const assessment = store.assessments.find((item) => item.sessionId === args.where.sessionId);
        if (assessment) {
          Object.assign(assessment, cleanUpdate(args.update), { updatedAt: new Date() });
          return assessment;
        }

        return this.create({ data: args.create });
      }
    },
    paymentEvent: {
      async findUnique(args: any) {
        const payment = store.payments.find((item) => item.idempotencyKey === args.where.idempotencyKey);
        if (!payment) return null;

        return {
          ...payment,
          subscription: args.include?.subscription
            ? store.subscriptions.find((subscription) => subscription.id === payment.subscriptionId) ?? null
            : undefined
        };
      },
      async create(args: any) {
        const payment = {
          id: args.data.id ?? makeId("payment"),
          subscriptionId: args.data.subscriptionId,
          sessionId: args.data.sessionId ?? null,
          idempotencyKey: args.data.idempotencyKey,
          amountCents: args.data.amountCents,
          currency: args.data.currency ?? "CNY",
          status: args.data.status ?? "SUCCEEDED",
          rawPayload: args.data.rawPayload,
          createdAt: new Date()
        };
        store.payments.push(payment);
        return payment;
      }
    },
    async $transaction(operations: Array<Promise<unknown>>) {
      return Promise.all(operations);
    },
    async $disconnect() {
      return undefined;
    }
  };
}

function createSeededStore(): Store {
  const now = new Date();
  const user: MemoryUser = {
    id: "paid_demo_user_001",
    clientToken: "paid-demo-client",
    email: "paid-demo@example.com",
    createdAt: now,
    updatedAt: now
  };
  const subscription: MemorySubscription = {
    id: "paid_demo_subscription_001",
    userId: user.id,
    status: "ACTIVE",
    provider: "mock",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now
  };
  const session: MemoryQuizSession = {
    id: "paid_demo_session_001",
    userId: user.id,
    status: "COMPLETED",
    currentStep: "results",
    completedSteps: ["gender", "goal", "body", "activity"],
    gender: "FEMALE",
    primaryGoal: "FEEL_HEALTHIER",
    age: 28,
    heightCm: 166,
    weightKg: 68,
    targetWeightKg: 61,
    activityFrequency: "MODERATE",
    healthContext: null,
    completedAt: now,
    createdAt: now,
    updatedAt: now
  };
  const result = calculateAssessment({
    gender: "FEMALE",
    primaryGoal: "FEEL_HEALTHIER",
    age: 28,
    heightCm: 166,
    weightKg: 68,
    targetWeightKg: 61,
    activityFrequency: "MODERATE"
  });

  return {
    users: [user],
    subscriptions: [subscription],
    sessions: [session],
    payments: [],
    assessments: [
      {
        id: "paid_demo_assessment_001",
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
        predictionCurve: result.predictionCurve,
        createdAt: now,
        updatedAt: now
      }
    ]
  };
}

function includeUser(user: MemoryUser, include: any, store: Store) {
  return {
    ...user,
    subscription: include?.subscription ? store.subscriptions.find((item) => item.userId === user.id) ?? null : undefined
  };
}

function includeSession(session: MemoryQuizSession, include: any, store: Store) {
  const user = store.users.find((item) => item.id === session.userId) ?? null;

  return {
    ...session,
    assessment: include?.assessment ? store.assessments.find((item) => item.sessionId === session.id) ?? null : undefined,
    user:
      include?.user && user
        ? {
            ...user,
            subscription: include.user.include?.subscription
              ? store.subscriptions.find((item) => item.userId === user.id) ?? null
              : undefined
          }
        : undefined
  };
}

function cleanUpdate<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function makeId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
