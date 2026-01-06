import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const spls = await prisma.spl.findMany({
      where: {
        requesterId: session.user.id,
        isManualEntry: true,
        requesterSignedAt: null,
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
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(spls)
  } catch (error) {
    console.error("Error fetching telat input SPLs:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil SPL telat input" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { splId, signature } = body

    if (!splId || typeof signature !== "string" || signature.trim().length < 30) {
      return NextResponse.json(
        { error: "Tanda tangan tidak valid" },
        { status: 400 }
      )
    }

    const spl = await prisma.spl.findUnique({
      where: { id: splId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            supervisorId: true,
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

    if (!spl) {
      return NextResponse.json({ error: "SPL tidak ditemukan" }, { status: 404 })
    }

    if (spl.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!spl.isManualEntry) {
      return NextResponse.json(
        { error: "SPL ini bukan input manual" },
        { status: 400 }
      )
    }

    if (spl.requesterSignedAt) {
      return NextResponse.json(
        { error: "SPL ini sudah ditandatangani" },
        { status: 400 }
      )
    }

    const updatedSpl = await prisma.spl.update({
      where: { id: splId },
      data: {
        signature: signature.trim(),
        requesterSignedAt: new Date(),
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            supervisorId: true,
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
      const splDate = new Date(updatedSpl.date)
      const formattedDate = splDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      const notificationTitle = "SPL Manual Ditandatangani"
      const notificationBody = `${updatedSpl.requester.name} menandatangani SPL ${formattedDate} (${updatedSpl.startTime}-${updatedSpl.endTime}).`
      const notificationPromises: Promise<any>[] = []

      if (updatedSpl.supervisorId) {
        const supervisor = await prisma.user.findUnique({
          where: { id: updatedSpl.supervisorId },
          include: { notifications: true },
        })

        if (supervisor) {
          supervisor.notifications.forEach((token) => {
            notificationPromises.push(
              sendNotification(
                token.endpoint,
                notificationTitle,
                notificationBody,
                { splId: updatedSpl.id, click_action: "/dashboard/ga/persetujuan" }
              )
            )
          })
        }
      } else {
        const managers = await prisma.user.findMany({
          where: {
            role: {
              in: ["HR", "MANAGER"],
            },
          },
          include: { notifications: true },
        })

        managers.forEach((manager) => {
          manager.notifications.forEach((token) => {
            notificationPromises.push(
              sendNotification(
                token.endpoint,
                notificationTitle,
                notificationBody,
                { splId: updatedSpl.id, click_action: "/dashboard/hr/persetujuan" }
              )
            )
          })
        })
      }

      await Promise.allSettled(notificationPromises)
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi telat input:", notificationError)
    }

    return NextResponse.json({
      message: "Tanda tangan berhasil disimpan",
      spl: updatedSpl,
    })
  } catch (error) {
    console.error("Error signing telat input SPL:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan tanda tangan" },
      { status: 500 }
    )
  }
}
