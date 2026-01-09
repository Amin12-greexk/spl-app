import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])
const REJECTED_STATUSES = new Set([
  "REJECTED",
  "REJECTED_BY_SUPERVISOR",
  "REJECTED_BY_MANAGER",
])
const GA_BLOCKED_STATUSES = new Set(["PENDING_SUPERVISOR", "PENDING"])

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

const getPlannedStartDate = (dateValue: Date, startTime: string) => {
  const startMinutes = parseTimeToMinutes(startTime)
  if (startMinutes === null) return null
  const planned = new Date(dateValue)
  if (Number.isNaN(planned.getTime())) return null
  planned.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
  return planned
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

    const plannedStart = getPlannedStartDate(spl.date, spl.startTime)
    if (!plannedStart) {
      return NextResponse.json(
        { error: "Waktu mulai lembur tidak valid" },
        { status: 400 }
      )
    }

    const now = new Date()
    if (now < plannedStart) {
      return NextResponse.json(
        { error: "Realisasi belum bisa dimulai sebelum jadwal lembur" },
        { status: 400 }
      )
    }

    const updatedSpl = await prisma.spl.update({
      where: { id: spl.id },
      data: {
        actualStartAt: now,
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
