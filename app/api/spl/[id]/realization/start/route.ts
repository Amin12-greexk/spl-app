import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  buildOvertimeWindowFromTimes,
  makeWindow,
  startOfDay,
} from "@/lib/spl-time"

const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])
const REJECTED_STATUSES = new Set([
  "REJECTED",
  "REJECTED_BY_SUPERVISOR",
  "REJECTED_BY_MANAGER",
])
const GA_BLOCKED_STATUSES = new Set(["PENDING_SUPERVISOR", "PENDING"])

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

    const spl = await prisma.spl.findUnique({
      where: { id: params.id },
      include: {
        requester: {
          select: {
            id: true,
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
        { error: "Data lama tidak dapat memulai realisasi" },
        { status: 400 }
      )
    }

    if (REJECTED_STATUSES.has(spl.status)) {
      return NextResponse.json(
        { error: "SPL ini sudah ditolak" },
        { status: 400 }
      )
    }

    if (spl.actualStartAt) {
      return NextResponse.json(
        { error: "Realisasi sudah dimulai sebelumnya" },
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

    if (isGaSupervised && GA_BLOCKED_STATUSES.has(spl.status)) {
      return NextResponse.json(
        { error: "Menunggu persetujuan GA sebelum mulai lembur" },
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
    const now = new Date()
    if (now < plannedStart) {
      return NextResponse.json(
        { error: "Realisasi belum bisa dimulai sebelum jadwal lembur" },
        { status: 400 }
      )
    }
    if (now >= plannedEnd) {
      return NextResponse.json(
        { error: "Jadwal lembur sudah berakhir" },
        { status: 400 }
      )
    }

    const updatedSpl = await prisma.spl.update({
      where: { id: spl.id },
      data: {
        actualStartAt: now,
        status: spl.status === "APPROVED" ? spl.status : "IN_PROGRESS",
      },
    })

    return NextResponse.json(updatedSpl)
  } catch (error) {
    console.error("Error starting SPL realization:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
