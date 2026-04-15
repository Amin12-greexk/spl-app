import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay } from "@/lib/spl-time"

export const dynamic = "force-dynamic"

const SUPERVISOR_REQUIRED_ROLES = new Set(["STAFF", "TEKNISI", "DRIVER"])
const LEGACY_SUPERVISED_DEPARTMENTS = new Set([
  "security",
  "teknik",
  "driver",
  "hr",
  "it",
  "lab",
])

const getDepartmentName = (user: {
  departmentName?: string | null
  department?: { name?: string | null } | null
}) => (user.department?.name || user.departmentName || "").trim()

const departmentNeedsSupervisor = (user: {
  role: string
  departmentName?: string | null
  department?: {
    name?: string | null
    supervised?: boolean
    approvalMode?: string | null
  } | null
}) => {
  if (!SUPERVISOR_REQUIRED_ROLES.has(user.role)) {
    return false
  }

  if (user.department) {
    if (!user.department.supervised) return false
    return user.department.approvalMode !== "DIRECT"
  }

  return LEGACY_SUPERVISED_DEPARTMENTS.has(
    getDepartmentName(user).toLowerCase()
  )
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const today = startOfDay(new Date())

    const [
      users,
      departmentsCount,
      securityAssignments,
      unsignedManualSplCount,
      unsignedManualSpls,
      recentManualSpls,
    ] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: {
            not: "SUPER_ADMIN",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentName: true,
          regularStartTime: true,
          regularEndTime: true,
          supervisorId: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true,
              supervised: true,
              approvalMode: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.department.count(),
      prisma.securityShiftAssignment.findMany({
        where: {
          workDate: today,
        },
        select: {
          userId: true,
        },
      }),
      prisma.spl.count({
        where: {
          isManualEntry: true,
          source: "MANUAL",
          requesterSignedAt: null,
        },
      }),
      prisma.spl.findMany({
        where: {
          isManualEntry: true,
          source: "MANUAL",
          requesterSignedAt: null,
        },
        select: {
          id: true,
          requesterId: true,
          date: true,
          startTime: true,
          endTime: true,
          createdAt: true,
          requester: {
            select: {
              id: true,
              name: true,
              departmentName: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
      prisma.spl.findMany({
        where: {
          source: "MANUAL",
        },
        select: {
          id: true,
          requesterId: true,
          date: true,
          startTime: true,
          endTime: true,
          createdAt: true,
          requester: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ])

    const securityAssignedUserIds = new Set(
      securityAssignments.map((assignment) => assignment.userId)
    )

    const securityUsers = users.filter(
      (user) => getDepartmentName(user).toLowerCase() === "security"
    )

    const usersWithoutSupervisorAll = users.filter(
      (user) => !user.supervisorId && departmentNeedsSupervisor(user)
    )

    const usersWithoutRegularHoursAll = users
      .filter(
        (user) =>
          !["SUPER_ADMIN", "MANAGER"].includes(user.role) &&
          (!user.regularStartTime || !user.regularEndTime)
      )

    const securityWithoutShiftTodayAll = securityUsers
      .filter((user) => !securityAssignedUserIds.has(user.id))

    const usersWithoutSupervisor = usersWithoutSupervisorAll.slice(0, 6)
    const usersWithoutRegularHours = usersWithoutRegularHoursAll.slice(0, 6)
    const securityWithoutShiftToday = securityWithoutShiftTodayAll.slice(0, 6)

    const recentUserUpdates = users.slice(0, 5).map((user) => ({
      id: `user-${user.id}`,
      type: "user",
      title: user.name,
      subtitle: `${user.role} | ${getDepartmentName(user) || "-"}`,
      timestamp: user.updatedAt,
      href: `/dashboard/admin/users/${user.id}`,
    }))

    const recentSplActivity = recentManualSpls.map((spl) => ({
      id: `spl-${spl.id}`,
      type: "manual_spl",
      title: spl.requester.name,
      subtitle: `SPL manual ${spl.startTime}-${spl.endTime}`,
      timestamp: spl.createdAt,
      href: `/dashboard/admin/spl-history`,
    }))

    const recentActivity = [...recentUserUpdates, ...recentSplActivity]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 8)

    return NextResponse.json({
      summary: {
        totalUsers: users.length,
        totalDepartments: departmentsCount,
        withoutSupervisor: usersWithoutSupervisorAll.length,
        withoutRegularHours: usersWithoutRegularHoursAll.length,
        securityWithoutShiftToday: securityWithoutShiftTodayAll.length,
        manualUnsignedSpls: unsignedManualSplCount,
      },
      actionItems: {
        usersWithoutSupervisor: usersWithoutSupervisor.map((user) => ({
          id: user.id,
          name: user.name,
          role: user.role,
          departmentName: getDepartmentName(user) || "-",
          href: `/dashboard/admin/users/${user.id}`,
        })),
        usersWithoutRegularHours: usersWithoutRegularHours.map((user) => ({
          id: user.id,
          name: user.name,
          role: user.role,
          departmentName: getDepartmentName(user) || "-",
          href: `/dashboard/admin/regular-hours`,
        })),
        securityWithoutShiftToday: securityWithoutShiftToday.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          href: `/dashboard/admin/security-shifts`,
        })),
        unsignedManualSpls: unsignedManualSpls.map((spl) => ({
          id: spl.id,
          requesterId: spl.requesterId,
          requesterName: spl.requester.name,
          date: spl.date,
          startTime: spl.startTime,
          endTime: spl.endTime,
          href: `/dashboard/admin/spl-history`,
        })),
      },
      recentActivity: recentActivity.map((item) => ({
        ...item,
        timestamp: item.timestamp.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching admin dashboard summary:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
