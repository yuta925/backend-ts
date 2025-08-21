import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
console.log(`環境: ${process.env.NODE_ENV}`);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;