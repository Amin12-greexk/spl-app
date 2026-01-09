import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotificationToRoles, sendNotificationToUser } from "@/lib/notification-utils"

const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])
const parseTimeToMinutes = (value: string) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return null
  const [hour, minute] = trimmed.split(":").map(Number)
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }
  return hour * 60 + minute
}

const formatTime = (value: Date) =>
  value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const noteValue =
      typeof body.note === "string" ? body.note.trim() : ""
    const proofValue =
      typeof body.proofImage === "string" ? body.proofImage.trim() : ""
    const overrunValue =
      typeof body.overrunReason === "string" ? body.overrunReason.trim() : ""

    if (!noteValue) {
      return NextResponse.json(
        { error: "Catatan realisasi wajib diisi" },
        { status: 400 }
      )
    }

    const spl = await prisma.spl.findUnique({
      where: { id: params.id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            departmentName: true,
            department: { select: { name: true } },
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

    if (spl.isManualEntry && !spl.requesterSignedAt) {
      return NextResponse.json(
        { error: "SPL manual belum ditandatangani oleh pemohon" },
        { status: 400 }
      )
    }

    if (!spl.actualStartAt) {
      return NextResponse.json(
        { error: "Realisasi belum dimulai" },
        { status: 400 }
      )
    }

    if (spl.actualEndAt) {
      return NextResponse.json(
        { error: "Realisasi sudah diselesaikan" },
        { status: 400 }
      )
    }

    const departmentName =
      spl.requester?.department?.name || spl.requester?.departmentName || ""
    const departmentKey = departmentName.toLowerCase()
    const isGaSupervised = GA_SUPERVISED_DEPARTMENTS.has(departmentKey)

    if (isGaSupervised && proofValue.length < 30) {
      return NextResponse.json(
        { error: "Foto bukti realisasi wajib diunggah untuk departemen ini" },
        { status: 400 }
      )
    }

    const startAt = new Date(spl.actualStartAt)
    const endAt = new Date()
    const diffMs = endAt.getTime() - startAt.getTime()
    if (Number.isNaN(startAt.getTime()) || diffMs <= 0) {
      return NextResponse.json(
        { error: "Waktu realisasi tidak valid" },
        { status: 400 }
      )
    }

    const actualMinutes = Math.round(diffMs / 60000)
    if (actualMinutes <= 0) {
      return NextResponse.json(
        { error: "Durasi realisasi tidak valid" },
        { status: 400 }
      )
    }

    const plannedStartMinutes = parseTimeToMinutes(spl.startTime)
    const plannedEndMinutes = parseTimeToMinutes(spl.endTime)
    let plannedMinutes: number | null = null
    if (plannedStartMinutes !== null && plannedEndMinutes !== null) {
      plannedMinutes = plannedEndMinutes - plannedStartMinutes
      if (plannedMinutes < 0) {
        plannedMinutes += 24 * 60
      }
      if (plannedMinutes <= 0) {
        plannedMinutes = null
      }
    }

    const hasOverrun =
      plannedMinutes !== null && actualMinutes > plannedMinutes

    if (hasOverrun && !overrunValue) {
      return NextResponse.json(
        { error: "Alasan melebihi rencana wajib diisi" },
        { status: 400 }
      )
    }

    const actualTotalHours = parseFloat(
      (actualMinutes / 60).toFixed(2)
    )

    const updatedSpl = await prisma.spl.update({
      where: { id: spl.id },
      data: {
        actualEndAt: endAt,
        actualTotalHours,
        realizationNote: noteValue,
        realizationProofImage: proofValue || null,
        overrunReason: hasOverrun ? overrunValue : null,
      },
    })

    try {
      const formattedDate = new Date(spl.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      const actualRange = `${formatTime(startAt)} - ${formatTime(endAt)}`
      const plannedRange = `${spl.startTime} - ${spl.endTime}`
      const overrunText = hasOverrun
        ? ` | Melebihi rencana: ${overrunValue}`
        : ""
      const notificationTitle = "Realisasi Lembur Dicatat"
      const notificationBody = `${spl.requester?.name || "Pemohon"} mencatat realisasi lembur ${formattedDate}. Rencana ${plannedRange}, realisasi ${actualRange}. Catatan: ${noteValue}${overrunText}`

      if (spl.supervisorId) {
        await sendNotificationToUser(
          spl.supervisorId,
          notificationTitle,
          notificationBody,
          { splId: spl.id, click_action: "/dashboard/ga/persetujuan" }
        )
      }

      await sendNotificationToRoles(
        ["HR", "MANAGER"],
        notificationTitle,
        notificationBody,
        { splId: spl.id, click_action: "/dashboard/hr/persetujuan" }
      )
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi realisasi:", notificationError)
    }

    return NextResponse.json(updatedSpl)
  } catch (error) {
    console.error("Error finishing SPL realization:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
