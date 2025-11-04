import { PrismaClient } from '@prisma/client'

declare global {
  // Untuk mencegah multiple instances di development
  var prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
