import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotificationToUser } from "@/lib/notification-utils"
import { JAKARTA_TIME_ZONE } from "@/lib/spl-time"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN"
    const canApproveAsSupervisor = ["GA", "DEPARTMENT_HEAD"].includes(session.user.role)

    // Only GA, DEPARTMENT_HEAD, or SUPER_ADMIN can approve as supervisor
    if (!canApproveAsSupervisor && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Hanya GA, Kepala Departemen, atau Super Admin yang dapat menyetujui SPL di level supervisor" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { splId, signature } = body

    if (!splId || !signature) {
      return NextResponse.json(
        { error: "SPL ID dan tanda tangan diperlukan" },
        { status: 400 }
      )
    }

    // Get the SPL
    const spl = await prisma.spl.findUnique({
      where: { id: splId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            supervisorId: true,
          },
        },
      },
    })

    if (!spl) {
      return NextResponse.json({ error: "SPL tidak ditemukan" }, { status: 404 })
    }

    if ((spl.isManualEntry || spl.source === "LEGACY") && !spl.requesterSignedAt) {
      return NextResponse.json(
        { error: "SPL belum ditandatangani oleh pemohon" },
        { status: 400 }
      )
    }

    // Validate: SPL must be in PENDING_SUPERVISOR status
    if (spl.status !== "PENDING_SUPERVISOR") {
      return NextResponse.json(
        { error: "SPL ini tidak dalam status menunggu persetujuan supervisor" },
        { status: 400 }
      )
    }

    // Determine assigned supervisor for proxy approval by Super Admin
    const assignedSupervisorId = spl.supervisorId || spl.requester.supervisorId || null

    // Validate: Non-super-admin must be the supervisor of the requester
    if (!isSuperAdmin && spl.requester.supervisorId !== session.user.id && spl.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: "Anda bukan atasan dari karyawan ini" },
        { status: 403 }
      )
    }

    if (isSuperAdmin && !assignedSupervisorId) {
      return NextResponse.json(
        { error: "Supervisor untuk SPL ini tidak ditemukan. Assign supervisor terlebih dahulu." },
        { status: 400 }
      )
    }

    const effectiveSupervisorId = isSuperAdmin ? assignedSupervisorId : session.user.id

    // Update SPL: Approve by supervisor
    const updatedSpl = await prisma.spl.update({
      where: { id: splId },
      data: {
        supervisorId: effectiveSupervisorId,
        supervisorApprovalDate: new Date(),
        supervisorSignature: signature,
        status: "PENDING_MANAGER", // Move to next approval level
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
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

    // Send notifications
    try {
      const splDate = new Date(updatedSpl.date)
      const formattedDate = splDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: JAKARTA_TIME_ZONE,
      })

      const supervisorActor = isSuperAdmin
        ? `${updatedSpl.supervisor?.name || "Supervisor"} (diwakili Super Admin ${session.user.name || "-"})`
        : session.user.name || updatedSpl.supervisor?.name || "Supervisor"

      await sendNotificationToUser(
        updatedSpl.requesterId,
        "SPL Disetujui Supervisor",
        `SPL ${formattedDate} (${updatedSpl.startTime}-${updatedSpl.endTime}) disetujui ${supervisorActor}. Silakan input realisasi agar diteruskan ke Manager.`,
        { splId: updatedSpl.id, click_action: "/dashboard/staff" }
      )
      console.log("Notifikasi supervisor approval telah dikirim")
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi:", notificationError)
    }

    return NextResponse.json({
      message: "SPL berhasil disetujui oleh supervisor",
      spl: updatedSpl,
    })
  } catch (error) {
    console.error("Error approving SPL by supervisor:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyetujui SPL" },
      { status: 500 }
    )
  }
}
