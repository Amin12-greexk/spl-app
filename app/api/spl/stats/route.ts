import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    const userRole = session.user.role as Role
    const selfOnlyRoles: Role[] = [
      "STAFF",
      "TEKNISI",
      "DRIVER",
      "GA",
      "DEPARTMENT_HEAD",
      "PRODUCTION_SUPERVISOR",
    ]
    const canViewAllRoles: Role[] = ["HR", "MANAGER", "SUPER_ADMIN"]
    const hideUnsignedManual = !["SUPER_ADMIN", "HR"].includes(userRole)
    const hideUnrealizedForManager = userRole === "MANAGER"
    const notConditions: any[] = []

    if (hideUnsignedManual) {
      notConditions.push(
        { isManualEntry: true, requesterSignedAt: null },
        { source: "LEGACY", requesterSignedAt: null }
      )
    }

    if (hideUnrealizedForManager) {
      notConditions.push({ status: "PENDING_MANAGER", actualEndAt: null })
    }

    const baseWhere: any = {}

    if (notConditions.length > 0) {
      baseWhere.NOT = { OR: notConditions }
    }

    if (selfOnlyRoles.includes(userRole)) {
      baseWhere.requesterId = session.user.id
    } else if (canViewAllRoles.includes(userRole)) {
      if (userId) {
        baseWhere.requesterId = userId
      }
    } else {
      baseWhere.requesterId = session.user.id
    }

    const grouped = await prisma.spl.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    })

    const statusMap = new Map(
      grouped.map((item) => [item.status, item._count._all])
    )
    const sumStatuses = (statuses: string[]) =>
      statuses.reduce((acc, status) => acc + (statusMap.get(status) || 0), 0)

    const total = grouped.reduce((acc, item) => acc + item._count._all, 0)
    const approved = statusMap.get("APPROVED") || 0
    const pending = sumStatuses([
      "PENDING_SUPERVISOR",
      "PENDING_MANAGER",
      "IN_PROGRESS",
      "DONE",
      "PENDING",
    ])
    const rejected = sumStatuses([
      "REJECTED",
      "REJECTED_BY_SUPERVISOR",
      "REJECTED_BY_MANAGER",
    ])

    return NextResponse.json({ total, pending, approved, rejected })
  } catch (error) {
    console.error("Error fetching SPL stats:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
