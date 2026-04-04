import { PrismaClient } from '@prisma/client'

// Force-clear any stale cached Prisma client to avoid schema mismatch
const g = globalThis as unknown as { prisma: PrismaClient | undefined }
if (g.prisma) {
  try { g.prisma.$disconnect().catch(() => {}) } catch {}
  delete g.prisma
}

export const db = new PrismaClient({
  log: ['query'],
})

// Cache for production reuse
if (process.env.NODE_ENV !== 'production') {
  (globalThis as unknown as { prisma: PrismaClient }).prisma = db
}
