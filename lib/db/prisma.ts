import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { clearStepsPrisma?: PrismaClient };

export function databaseConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url && /^postgres(?:ql)?:\/\//i.test(url));
}

export function getPrisma(): PrismaClient | null {
  if (!databaseConfigured()) return null;
  if (globalForPrisma.clearStepsPrisma) return globalForPrisma.clearStepsPrisma;

  const connectionString = process.env.DATABASE_URL as string;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.clearStepsPrisma = prisma;
  return prisma;
}
