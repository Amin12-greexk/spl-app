import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only GA, DEPARTMENT_HEAD, or MANAGER can view team SPLs
    if (!["GA", "DEPARTMENT_HEAD", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Hanya GA, Kepala Departemen, atau Manager yang dapat melihat SPL tim" },
        { status: 403 }
      )
    }

    // Get all SPLs from subordinates (users who have this user as supervisor)
    const andFilters: any[] = [
      {
        NOT: {
          OR: [
            { isManualEntry: true, requesterSignedAt: null },
            { source: "LEGACY", requesterSignedAt: null },
          ],
        },
      },
    ]

    if (session.user.role === "MANAGER") {
      andFilters.push({
        NOT: { AND: [{ status: "PENDING_MANAGER" }, { actualEndAt: null }] },
      })
    }

    const spls = await prisma.spl.findMany({
      where: {
        OR: [
          { supervisorId: session.user.id },
          { supervisorId: null, requester: { supervisorId: session.user.id } },
        ],
        AND: andFilters,
      },
      include: {
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
          },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(spls)
  } catch (error) {
    console.error("Error fetching team SPLs:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPL" },
      { status: 500 }
    )
  }
}
