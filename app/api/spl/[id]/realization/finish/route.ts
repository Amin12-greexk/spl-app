import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotificationToRoles, sendNotificationToUser } from "@/lib/notification-utils"
import {
  buildOvertimeWindowFromTimes,
  clampRealizationMinutes,
  JAKARTA_TIME_ZONE,
  makeWindow,
  startOfDay,
} from "@/lib/spl-time"

const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])
const EARLY_FINISH_GRACE_MINUTES = 30

const formatTime = (value: Date) =>
  value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JAKARTA_TIME_ZONE,
  })

const resolvePlannedWindow = (spl: {
  date: Date
  startTime: string
  endTime: string
  plannedStartAt?: Date | null
  plannedEndAt?: Date | null
  regularEndAt?: Date | null
}) => {
  if (spl.plannedStartAt && spl.plannedEndAt) {
    const plannedStart = new Date(spl.plannedStartAt)
    const plannedEnd = new Date(spl.plannedEndAt)
    if (!Number.isNaN(plannedStart.getTime()) && !Number.isNaN(plannedEnd.getTime())) {
      return { plannedStart, plannedEnd }
    }
  }

  if (spl.regularEndAt) {
    const plannedWindow = buildOvertimeWindowFromTimes(
      new Date(spl.regularEndAt),
      spl.startTime,
      spl.endTime
    )
    if (plannedWindow) {
      return { plannedStart: plannedWindow.start, plannedEnd: plannedWindow.end }
    }
  }

  const baseDay = startOfDay(new Date(spl.date))
  const fallbackWindow = makeWindow(baseDay, spl.startTime, spl.endTime)
  if (!fallbackWindow) return null
  return { plannedStart: fallbackWindow.start, plannedEnd: fallbackWindow.end }
}

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
    const confirmEarlyFinish = body.confirmEarlyFinish === true

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

    if (spl.source === "LEGACY") {
      return NextResponse.json(
        { error: "Data lama tidak dapat menyelesaikan realisasi" },
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

    const plannedWindow = resolvePlannedWindow(spl)
    if (!plannedWindow) {
      return NextResponse.json(
        { error: "Waktu lembur tidak valid" },
        { status: 400 }
      )
    }

    const { plannedStart, plannedEnd } = plannedWindow
    if (plannedEnd <= plannedStart) {
      return NextResponse.json(
        { error: "Waktu lembur tidak valid" },
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

    const rawMinutes = Math.floor(diffMs / 60000)
    if (diffMs <= EARLY_FINISH_GRACE_MINUTES * 60 * 1000 && !confirmEarlyFinish) {
      return NextResponse.json(
        {
          error: "Durasi realisasi masih <= 30 menit. Konfirmasi untuk mengakhiri tanpa dihitung.",
          code: "CONFIRM_EARLY_FINISH_REQUIRED",
          minutes: rawMinutes,
        },
        { status: 409 }
      )
    }

    let updatedSpl
    let hasOverrun = false
    const nextStatus = spl.status === "APPROVED" ? spl.status : "DONE"
    if (diffMs <= EARLY_FINISH_GRACE_MINUTES * 60 * 1000 && confirmEarlyFinish) {
      updatedSpl = await prisma.spl.update({
        where: { id: spl.id },
        data: {
          actualEndAt: endAt,
          actualTotalHours: 0,
          realizedMinutes: 0,
          realizationCounted: false,
          realizationCancelReason: "EARLY_FINISH_WITHIN_30M",
          realizationNote: noteValue,
          realizationProofImage: proofValue || null,
          overrunReason: null,
          plannedStartAt: spl.plannedStartAt ?? plannedStart,
          plannedEndAt: spl.plannedEndAt ?? plannedEnd,
          status: nextStatus,
        },
      })
    } else {
      hasOverrun = endAt > plannedEnd

      if (hasOverrun && !overrunValue) {
        return NextResponse.json(
          { error: "Alasan melebihi rencana wajib diisi" },
          { status: 400 }
        )
      }

      const realizedMinutes = clampRealizationMinutes(
        plannedStart,
        plannedEnd,
        startAt,
        endAt
      )
      const actualTotalHours = parseFloat(
        (realizedMinutes / 60).toFixed(2)
      )

      updatedSpl = await prisma.spl.update({
        where: { id: spl.id },
        data: {
          actualEndAt: endAt,
          actualTotalHours,
          realizedMinutes,
          realizationCounted: realizedMinutes > 0,
          realizationCancelReason: null,
          realizationNote: noteValue,
          realizationProofImage: proofValue || null,
          overrunReason: hasOverrun ? overrunValue : null,
          plannedStartAt: spl.plannedStartAt ?? plannedStart,
          plannedEndAt: spl.plannedEndAt ?? plannedEnd,
          status: nextStatus,
        },
      })
    }

    try {
      const formattedDate = new Date(spl.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: JAKARTA_TIME_ZONE,
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
