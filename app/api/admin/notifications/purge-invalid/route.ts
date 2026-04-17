import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isLikelyFcmToken, validateToken } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

const VALIDATION_BATCH_SIZE = 10

type TokenGroup = {
  token: string
  ids: string[]
}

async function validateTokenGroups(groups: TokenGroup[]) {
  const invalidIds: string[] = []
  let checkedTokens = 0

  for (let index = 0; index < groups.length; index += VALIDATION_BATCH_SIZE) {
    const batch = groups.slice(index, index + VALIDATION_BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (group) => ({
        ids: group.ids,
        isValid: await validateToken(group.token),
      }))
    )

    checkedTokens += batch.length

    for (const result of results) {
      if (!result.isValid) {
        invalidIds.push(...result.ids)
      }
    }
  }

  return { invalidIds, checkedTokens }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const startedAt = Date.now()
    const notificationRows = await prisma.userNotification.findMany({
      select: {
        id: true,
        endpoint: true,
      },
    })

    if (notificationRows.length === 0) {
      return NextResponse.json({
        totalRows: 0,
        uniqueTokensChecked: 0,
        malformedRowsRemoved: 0,
        invalidRowsRemoved: 0,
        validRowsKept: 0,
        durationMs: Date.now() - startedAt,
        processedAt: new Date().toISOString(),
      })
    }

    const malformedIds: string[] = []
    const groupedTokens = new Map<string, string[]>()

    for (const row of notificationRows) {
      const normalizedToken = row.endpoint.trim()

      if (!isLikelyFcmToken(normalizedToken)) {
        malformedIds.push(row.id)
        continue
      }

      const existingIds = groupedTokens.get(normalizedToken)
      if (existingIds) {
        existingIds.push(row.id)
      } else {
        groupedTokens.set(normalizedToken, [row.id])
      }
    }

    const tokenGroups = Array.from(groupedTokens.entries()).map(([token, ids]) => ({
      token,
      ids,
    }))

    const { invalidIds, checkedTokens } = await validateTokenGroups(tokenGroups)

    if (malformedIds.length > 0) {
      await prisma.userNotification.deleteMany({
        where: {
          id: {
            in: malformedIds,
          },
        },
      })
    }

    if (invalidIds.length > 0) {
      await prisma.userNotification.deleteMany({
        where: {
          id: {
            in: invalidIds,
          },
        },
      })
    }

    const removedCount = malformedIds.length + invalidIds.length

    return NextResponse.json({
      totalRows: notificationRows.length,
      uniqueTokensChecked: checkedTokens,
      malformedRowsRemoved: malformedIds.length,
      invalidRowsRemoved: invalidIds.length,
      validRowsKept: Math.max(0, notificationRows.length - removedCount),
      durationMs: Date.now() - startedAt,
      processedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error purging invalid notification tokens:", error)
    return NextResponse.json(
      { error: "Gagal purge token notifikasi invalid" },
      { status: 500 }
    )
  }
}
