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

    // Only GA or DEPARTMENT_HEAD can reject as supervisor
    if (!["GA", "DEPARTMENT_HEAD"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Hanya GA atau Kepala Departemen yang dapat menolak SPL di level supervisor" },
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

    // Validate: Current user must be the supervisor of the requester
    if (spl.requester.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: "Anda bukan atasan dari karyawan ini" },
        { status: 403 }
      )
    }

    // Update SPL: Reject by supervisor
    const updatedSpl = await prisma.spl.update({
      where: { id: splId },
      data: {
        supervisorId: session.user.id,
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

      await sendNotificationToUser(
        updatedSpl.requesterId,
        "SPL Ditolak Supervisor",
        `SPL ${formattedDate} (${updatedSpl.startTime}-${updatedSpl.endTime}) ditolak oleh ${session.user.name}. Alasan: ${updatedSpl.supervisorRejectionReason}`,
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
