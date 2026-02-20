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
    const canRejectAsSupervisor = ["GA", "DEPARTMENT_HEAD"].includes(session.user.role)

    // Only GA, DEPARTMENT_HEAD, or SUPER_ADMIN can reject as supervisor
    if (!canRejectAsSupervisor && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Hanya GA, Kepala Departemen, atau Super Admin yang dapat menolak SPL di level supervisor" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { splId, rejectionReason } = body

    if (!splId || !rejectionReason) {
      return NextResponse.json(
        { error: "SPL ID dan alasan penolakan diperlukan" },
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

    // Determine assigned supervisor for proxy rejection by Super Admin
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

    // Update SPL: Reject by supervisor
    const updatedSpl = await prisma.spl.update({
      where: { id: splId },
      data: {
        supervisorId: effectiveSupervisorId,
        supervisorApprovalDate: new Date(),
        supervisorRejectionReason: rejectionReason,
        status: "REJECTED_BY_SUPERVISOR",
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

    // Send notification to requester
    try {
      // Format tanggal SPL
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
        "SPL Ditolak Supervisor",
        `SPL ${formattedDate} (${updatedSpl.startTime}-${updatedSpl.endTime}) ditolak oleh ${supervisorActor}. Alasan: ${updatedSpl.supervisorRejectionReason}`,
        { splId: updatedSpl.id, click_action: "/dashboard/staff" }
      )
      console.log("Notifikasi supervisor rejection telah dikirim")
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi:", notificationError)
    }

    return NextResponse.json({
      message: "SPL berhasil ditolak oleh supervisor",
      spl: updatedSpl,
    })
  } catch (error) {
    console.error("Error rejecting SPL by supervisor:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menolak SPL" },
      { status: 500 }
    )
  }
}
