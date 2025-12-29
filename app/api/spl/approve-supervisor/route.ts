import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only GA or DEPARTMENT_HEAD can approve as supervisor
    if (!["GA", "DEPARTMENT_HEAD"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Hanya GA atau Kepala Departemen yang dapat menyetujui SPL di level supervisor" },
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

    // Update SPL: Approve by supervisor
    const updatedSpl = await prisma.spl.update({
      where: { id: splId },
      data: {
        supervisorId: session.user.id,
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
      const notificationPromises: Promise<any>[] = []

      // 1. Notify MANAGER/HR about new SPL to approve
      const managers = await prisma.user.findMany({
        where: {
          role: {
            in: ["HR", "MANAGER"],
          },
        },
        include: {
          notifications: true,
        },
      })

      managers.forEach((manager) => {
        manager.notifications.forEach((token) => {
          notificationPromises.push(
            sendNotification(
              token.endpoint,
              "SPL Baru Menunggu Persetujuan",
              `${updatedSpl.requester.name} - SPL telah disetujui supervisor dan menunggu persetujuan Anda.`,
              { splId: updatedSpl.id, click_action: '/dashboard/hr/persetujuan' }
            )
          )
        })
      })

      // 2. Notify requester that supervisor approved
      const requester = await prisma.user.findUnique({
        where: { id: updatedSpl.requesterId },
        include: { notifications: true },
      })

      if (requester && requester.notifications.length > 0) {
        requester.notifications.forEach((token) => {
          notificationPromises.push(
            sendNotification(
              token.endpoint,
              "SPL Disetujui Supervisor",
              `Pengajuan lembur Anda telah disetujui oleh ${session.user.name} dan diteruskan ke Manager.`,
              { splId: updatedSpl.id, click_action: '/dashboard/staff' }
            )
          )
        })
      }

      await Promise.allSettled(notificationPromises)
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
