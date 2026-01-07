import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupervisorForDepartment } from "@/lib/supervisor-mapping"
import { sendNotificationToUser } from "@/lib/notification-utils"

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

    const datePart = date.split("T")[0]
    const requestedDate = new Date(`${datePart}T00:00:00`)
    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { error: "Tanggal lembur tidak valid" },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (requestedDate > today) {
      return NextResponse.json(
        { error: "Tanggal lembur manual tidak boleh melebihi hari ini" },
        { status: 400 }
      )
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        departmentId: true,
        departmentName: true,
        department: { select: { name: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    // Calculate duration (handle overnight shifts)
    const start = new Date(`2000-01-01T${startTime}`)
    let end = new Date(`2000-01-01T${endTime}`)

    // If end time is earlier than start time, it's an overnight shift - add 1 day
    if (end <= start) {
      end = new Date(`2000-01-02T${endTime}`)
    }

    const durationMs = end.getTime() - start.getTime()
    const totalHours = durationMs / (1000 * 60 * 60)

    // Determine initial status based on department approval rules
    let status = "PENDING_MANAGER"
    let supervisorId: string | null = null
    const routingDepartmentName = user.department?.name || user.departmentName || null

    if (user.role === "STAFF" || user.role === "TEKNISI" || user.role === "DRIVER") {
      const supervisor = await getSupervisorForDepartment({
        departmentId: user.departmentId || null,
        departmentName: routingDepartmentName,
      })
      if (supervisor) {
        status = "PENDING_SUPERVISOR"
        supervisorId = supervisor.id
      }
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
      },
    })

    try {
      const splDate = new Date(date)
      const formattedDate = splDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      const notificationTitle = "SPL Telat Input Baru"
      const notificationBody = `SPL ${formattedDate} (${startTime}-${endTime}) telah dibuat oleh Super Admin. Silakan tanda tangan di menu Telat Input.`

      await sendNotificationToUser(userId, notificationTitle, notificationBody, {
        splId: spl.id,
        click_action: "/dashboard/telat-input",
      })
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi SPL manual:", notificationError)
    }

    return NextResponse.json({
      ...spl,
      message: "SPL manual berhasil dibuat. User perlu menandatangani SPL ini terlebih dahulu.",
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating manual SPL:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
