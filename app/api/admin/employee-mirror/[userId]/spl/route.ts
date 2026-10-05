import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const EMPLOYEE_SELF_ONLY_ROLES = [
  "STAFF",
  "TEKNISI",
  "DRIVER",
  "GA",
  "DEPARTMENT_HEAD",
  "PRODUCTION_SUPERVISOR",
]

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentName: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      )
    }

    const baseWhere: any = {
      requesterId: targetUser.id,
    }

    const hideUnsignedManual = !["SUPER_ADMIN", "HR"].includes(targetUser.role)

    if (hideUnsignedManual) {
      baseWhere.NOT = {
        OR: [
          { isManualEntry: true, requesterSignedAt: null },
          { source: "LEGACY", requesterSignedAt: null },
        ],
      }
    }

    const spls = await prisma.spl.findMany({
      where: baseWhere,
      select: {
        id: true,
        requesterId: true,
        date: true,
        startTime: true,
        endTime: true,
        totalHours: true,
        reason: true,
        projectName: true,
        status: true,
        source: true,
        isManualEntry: true,
        requesterSignedAt: true,
        actualStartAt: true,
        actualEndAt: true,
        actualTotalHours: true,
        realizationNote: true,
        overrunReason: true,
        realizedMinutes: true,
        realizationCounted: true,
        regularStartAt: true,
        regularEndAt: true,
        plannedStartAt: true,
        plannedEndAt: true,
        supervisorApprovalDate: true,
        supervisorRejectionReason: true,
        rejectionReason: true,
        approverId: true,
        approvalDate: true,
        createdAt: true,
        updatedAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
            departmentId: true,
            departmentName: true,
            department: { select: { id: true, name: true } },
            position: true,
            regularStartTime: true,
            regularEndTime: true,
          },
        },
        supervisor: {
          select: { id: true, name: true, email: true, role: true },
        },
        approver: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      user: targetUser,
      mirrorMode: EMPLOYEE_SELF_ONLY_ROLES.includes(targetUser.role)
        ? "employee-self"
        : "privileged-self",
      hideUnsignedManual,
      spls,
    })
  } catch (error) {
    console.error("Error fetching mirrored SPL data:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
