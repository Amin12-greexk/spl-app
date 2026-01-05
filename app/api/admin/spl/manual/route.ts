import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Create manual SPL for user (by Super Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { userId, date, startTime, endTime, reason, projectName } = body

    // Validation
    if (!userId || !date || !startTime || !endTime || !reason) {
      return NextResponse.json(
        { error: "User, tanggal, waktu mulai, waktu selesai, dan alasan wajib diisi" },
        { status: 400 }
      )
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        supervisor: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    // Calculate duration
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    const durationMs = end.getTime() - start.getTime()
    const totalHours = durationMs / (1000 * 60 * 60)

    // Determine initial status based on supervisor
    let status = "PENDING_MANAGER"
    let supervisorId = null

    // If user has supervisor, set to PENDING_SUPERVISOR
    if (user.supervisorId) {
      status = "PENDING_SUPERVISOR"
      supervisorId = user.supervisorId
    }

    // Create SPL
    const spl = await prisma.spl.create({
      data: {
        requesterId: userId,
        date: new Date(date),
        startTime,
        endTime,
        totalHours,
        reason,
        projectName: projectName || null,
        status,
        supervisorId,
        isManualEntry: true, // Mark as manual entry
        manualEntryBy: session.user.id, // Track who created it
        requesterSignedAt: null, // User hasn't signed yet
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
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
      },
    })

    return NextResponse.json({
      ...spl,
      message: "SPL manual berhasil dibuat. User perlu menandatangani SPL ini terlebih dahulu.",
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating manual SPL:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
