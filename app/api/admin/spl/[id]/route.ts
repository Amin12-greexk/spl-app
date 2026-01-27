import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  buildOvertimeWindowFromTimes,
  getMinutesDiff,
  JAKARTA_TIME_ZONE,
  makeWindow,
  parseDateOnly,
  parseTimeToMinutes,
} from "@/lib/spl-time"

// DELETE - Delete SPL (by Super Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if SPL exists
    const spl = await prisma.spl.findUnique({
      where: { id: params.id },
      include: {
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!spl) {
      return NextResponse.json({ error: "SPL tidak ditemukan" }, { status: 404 })
    }

    // Delete SPL
    await prisma.spl.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      message: "SPL berhasil dihapus",
      deleted: {
        id: spl.id,
        requester: spl.requester.name,
        date: spl.date,
      },
    })
  } catch (error) {
    console.error("Error deleting SPL:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

const formatHHMM = (value: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value)

// PATCH - Update SPL details (by Super Admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const {
      date,
      startTime,
      endTime,
      actualStartTime,
      actualEndTime,
      reason,
      projectName,
    } = body

    if (!date || !startTime || !endTime || !reason) {
      return NextResponse.json(
        { error: "Tanggal, jam mulai, jam selesai, dan alasan wajib diisi" },
        { status: 400 }
      )
    }
    if ((actualStartTime && !actualEndTime) || (!actualStartTime && actualEndTime)) {
      return NextResponse.json(
        { error: "Jam realisasi mulai dan selesai harus diisi berpasangan" },
        { status: 400 }
      )
    }

    const requestedDate = parseDateOnly(date)
    if (!requestedDate) {
      return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 })
    }

    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)
    if (startMinutes === null || endMinutes === null) {
      return NextResponse.json(
        { error: "Format jam tidak valid (HH:MM)" },
        { status: 400 }
      )
    }
    if (startMinutes === endMinutes) {
      return NextResponse.json(
        { error: "Jam lembur akhir harus > jam lembur mulai" },
        { status: 400 }
      )
    }

    const existing = await prisma.spl.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        regularStartAt: true,
        regularEndAt: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "SPL tidak ditemukan" }, { status: 404 })
    }

    let plannedWindow = makeWindow(requestedDate, startTime, endTime)
    if (!plannedWindow) {
      return NextResponse.json(
        { error: "Waktu lembur tidak valid" },
        { status: 400 }
      )
    }

    let regularWindow:
      | {
          start: Date
          end: Date
        }
      | null = null

    if (existing.regularStartAt && existing.regularEndAt) {
      const regularStartTime = formatHHMM(existing.regularStartAt)
      const regularEndTime = formatHHMM(existing.regularEndAt)
      regularWindow = makeWindow(requestedDate, regularStartTime, regularEndTime)
      if (regularWindow) {
        const anchored = buildOvertimeWindowFromTimes(
          regularWindow.end,
          startTime,
          endTime
        )
        if (anchored) {
          plannedWindow = anchored
        }
      }
    }

    const totalMinutes = getMinutesDiff(plannedWindow.start, plannedWindow.end)
    const totalHours = Number((totalMinutes / 60).toFixed(2))

    const updateData: any = {
      date: requestedDate,
      startTime,
      endTime,
      totalHours,
      reason: String(reason).trim(),
      projectName: projectName ? String(projectName).trim() : null,
      plannedStartAt: plannedWindow.start,
      plannedEndAt: plannedWindow.end,
    }

    if (regularWindow) {
      updateData.regularStartAt = regularWindow.start
      updateData.regularEndAt = regularWindow.end
    }

    if (actualStartTime && actualEndTime) {
      const actualStartMinutes = parseTimeToMinutes(actualStartTime)
      const actualEndMinutes = parseTimeToMinutes(actualEndTime)
      if (actualStartMinutes === null || actualEndMinutes === null) {
        return NextResponse.json(
          { error: "Format jam realisasi tidak valid (HH:MM)" },
          { status: 400 }
        )
      }
      if (actualStartMinutes === actualEndMinutes) {
        return NextResponse.json(
          { error: "Jam realisasi akhir harus > jam realisasi mulai" },
          { status: 400 }
        )
      }

      const actualWindow = makeWindow(requestedDate, actualStartTime, actualEndTime)
      if (!actualWindow) {
        return NextResponse.json(
          { error: "Waktu realisasi tidak valid" },
          { status: 400 }
        )
      }

      const actualMinutes = getMinutesDiff(actualWindow.start, actualWindow.end)
      const actualHours = Number((actualMinutes / 60).toFixed(2))

      updateData.actualStartAt = actualWindow.start
      updateData.actualEndAt = actualWindow.end
      updateData.realizedMinutes = actualMinutes
      updateData.actualTotalHours = actualHours
      updateData.realizationCounted = actualMinutes > 0
    }

    const updated = await prisma.spl.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      message: "SPL berhasil diperbarui",
      spl: updated,
    })
  } catch (error) {
    console.error("Error updating SPL:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
