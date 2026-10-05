import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotificationToRoles } from "@/lib/notification-utils"
import {
  clampRealizationMinutes,
  JAKARTA_TIME_ZONE,
  makeWindow,
  makeWindowWithOffset,
  startOfDay,
} from "@/lib/spl-time"
import { recordSplAudit } from "@/lib/spl-audit"

const REJECTED_STATUSES = new Set([
  "REJECTED",
  "REJECTED_BY_SUPERVISOR",
  "REJECTED_BY_MANAGER",
])

const resolvePlannedWindow = (spl: {
  date: Date
  startTime: string
  endTime: string
  plannedStartAt?: Date | null
  plannedEndAt?: Date | null
}) => {
  if (spl.plannedStartAt && spl.plannedEndAt) {
    const plannedStart = new Date(spl.plannedStartAt)
    const plannedEnd = new Date(spl.plannedEndAt)
    if (
      !Number.isNaN(plannedStart.getTime()) &&
      !Number.isNaN(plannedEnd.getTime())
    ) {
      return { plannedStart, plannedEnd }
    }
  }

  const baseDay = startOfDay(new Date(spl.date))
  const fallbackWindow = makeWindow(baseDay, spl.startTime, spl.endTime)
  if (!fallbackWindow) return null
  return { plannedStart: fallbackWindow.start, plannedEnd: fallbackWindow.end }
}

const buildActualWindow = (
  baseDate: Date,
  startTime: string,
  endTime: string,
  endDayOffset = 0
) => {
  const baseDay = startOfDay(baseDate)
  return makeWindowWithOffset(baseDay, startTime, endTime, endDayOffset)
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
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : ""
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : ""
    const noteValue = typeof body.note === "string" ? body.note.trim() : ""
    const overrunValue =
      typeof body.overrunReason === "string" ? body.overrunReason.trim() : ""

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Jam mulai dan jam selesai realisasi wajib diisi" },
        { status: 400 }
      )
    }

    const rawEndDayOffset = body?.endDayOffset
    const endDayOffset =
      rawEndDayOffset === undefined || rawEndDayOffset === null
        ? 0
        : Number(rawEndDayOffset)
    if (!Number.isFinite(endDayOffset) || (endDayOffset !== 0 && endDayOffset !== 1)) {
      return NextResponse.json(
        { error: "Durasi hari realisasi tidak valid" },
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
        { error: "Data lama tidak dapat mengisi realisasi" },
        { status: 400 }
      )
    }

    if (REJECTED_STATUSES.has(spl.status)) {
      return NextResponse.json(
        { error: "SPL ini sudah ditolak" },
        { status: 400 }
      )
    }

    if (spl.status === "PENDING_SUPERVISOR") {
      return NextResponse.json(
        { error: "Menunggu persetujuan GA sebelum input realisasi" },
        { status: 400 }
      )
    }

    if (spl.status !== "PENDING_MANAGER") {
      return NextResponse.json(
        { error: "Status SPL tidak valid untuk input realisasi" },
        { status: 400 }
      )
    }

    if (spl.actualEndAt) {
      return NextResponse.json(
        { error: "Realisasi sudah diinput sebelumnya" },
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

    const anchorDate = spl.plannedStartAt ?? spl.date
    const actualWindow = buildActualWindow(
      new Date(anchorDate),
      startTime,
      endTime,
      endDayOffset
    )
    if (!actualWindow) {
      return NextResponse.json(
        { error: "Jam realisasi tidak valid" },
        { status: 400 }
      )
    }

    const { plannedStart, plannedEnd } = plannedWindow
    const { start: actualStart, end: actualEnd } = actualWindow

    if (plannedEnd <= plannedStart || actualEnd <= actualStart) {
      return NextResponse.json(
        { error: "Waktu realisasi tidak valid" },
        { status: 400 }
      )
    }

    const hasOverrun = actualEnd > plannedEnd
    if (!overrunValue) {
      return NextResponse.json(
        { error: "Alasan realisasi wajib diisi" },
        { status: 400 }
      )
    }

    const realizedMinutes = clampRealizationMinutes(
      plannedStart,
      plannedEnd,
      actualStart,
      actualEnd
    )
    const actualTotalHours = parseFloat((realizedMinutes / 60).toFixed(2))

    const updatedSpl = await prisma.spl.update({
      where: { id: spl.id },
      data: {
        actualStartAt: actualStart,
        actualEndAt: actualEnd,
        actualTotalHours,
        realizedMinutes,
        realizationCounted: realizedMinutes > 0,
        realizationCancelReason: null,
        realizationNote: noteValue || null,
        realizationProofImage: null,
        overrunReason: overrunValue || null,
        plannedStartAt: spl.plannedStartAt ?? plannedStart,
        plannedEndAt: spl.plannedEndAt ?? plannedEnd,
        realizationSource: "MANUAL",
        status: "PENDING_MANAGER",
      },
    })

    await recordSplAudit({
      splId: spl.id,
      action: "REALIZATION_MANUAL",
      actorId: session.user.id,
      oldStatus: spl.status,
      newStatus: "PENDING_MANAGER",
      source: spl.source,
      note: hasOverrun ? `Overrun: ${overrunValue}` : undefined,
    })

    try {
      const formattedDate = new Date(spl.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: JAKARTA_TIME_ZONE,
      })
      const notificationTitle = "Realisasi Lembur Siap Disetujui"
      const notificationBody = `${spl.requester?.name || "Pemohon"} telah menginput realisasi lembur ${formattedDate} (${startTime}-${endTime}).`
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
    console.error("Error saving manual realization:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
