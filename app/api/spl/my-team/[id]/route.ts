import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["GA", "DEPARTMENT_HEAD", "MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Akses ditolak untuk melihat detail SPL tim" },
        { status: 403 }
      )
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN"
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

    const where: any = isSuperAdmin
      ? {
          id: params.id,
          AND: [...andFilters],
        }
      : {
          id: params.id,
          OR: [
            { supervisorId: session.user.id },
            { supervisorId: null, requester: { supervisorId: session.user.id } },
          ],
          AND: [...andFilters],
        }

    const spl = await prisma.spl.findFirst({
      where,
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
    })

    if (!spl) {
      return NextResponse.json(
        { error: "SPL tidak ditemukan atau tidak dapat diakses" },
        { status: 404 }
      )
    }

    return NextResponse.json(spl)
  } catch (error) {
    console.error("Error fetching team SPL detail:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil detail SPL" },
      { status: 500 }
    )
  }
}
