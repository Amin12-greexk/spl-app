import { prisma } from "@/lib/prisma"
import { sendNotificationToMultiple } from "@/lib/firebase-admin"

export interface NotificationSummary {
  total: number
  successful: number
  failed: number
}

const normalizeTokens = (tokens: string[]) => {
  const cleaned = tokens
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
  return Array.from(new Set(cleaned))
}

const sendToTokens = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<NotificationSummary> => {
  const uniqueTokens = normalizeTokens(tokens)
  if (uniqueTokens.length === 0) {
    return { total: 0, successful: 0, failed: 0 }
  }

  const results = await sendNotificationToMultiple(uniqueTokens, title, body, data)
  return {
    total: results.total,
    successful: results.successful,
    failed: results.failed,
  }
}

export const sendNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<NotificationSummary> => {
  const tokens = await prisma.userNotification.findMany({
    where: { userId },
    select: { endpoint: true },
  })

  return sendToTokens(tokens.map((token) => token.endpoint), title, body, data)
}

export const sendNotificationToRoles = async (
  roles: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<NotificationSummary> => {
  const tokens = await prisma.userNotification.findMany({
    where: {
      user: {
        role: { in: roles },
      },
    },
    select: { endpoint: true },
  })

  return sendToTokens(tokens.map((token) => token.endpoint), title, body, data)
}
