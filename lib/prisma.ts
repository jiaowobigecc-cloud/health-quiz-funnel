import { PrismaClient } from "@prisma/client";
import { createMemoryPrisma } from "./memory-prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const shouldUseMemoryPrisma = !process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  (shouldUseMemoryPrisma
    ? (createMemoryPrisma() as unknown as PrismaClient)
    : new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
      }));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
