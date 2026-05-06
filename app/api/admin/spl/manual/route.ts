import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupervisorForDepartment } from "@/lib/supervisor-mapping"
import { sendNotificationToUser } from "@/lib/notification-utils"
import {
  getJakartaDayOfWeek,
  isSecurityOffShift,
  isSecurityWorkShiftCode,
  JAKARTA_TIME_ZONE,
  makeWindowWithOffset,
  makeWindow,
  parseDateOnly,
  parseTimeToMinutes,
  SECURITY_SHIFT_DEFINITIONS,
  startOfDay,
} from "@/lib/spl-time"
import {
  makeRegularOverrideKey,
  parseRegularOverrideValue,
  windowsOverlap,
} from "@/lib/regular-hours"

// POST - Create manual SPL for user (by Super Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { userId, date, startTime, endTime, reason, projectName } = body
    const bypassWorkSchedule = body?.bypassWorkSchedule === true

    // Validation
    if (!userId || !date || !startTime || !endTime || !reason) {
      return NextResponse.json(
        { error: "User, tanggal, waktu mulai, waktu selesai, dan alasan wajib diisi" },
        { status: 400 }
      )
    }

    const requestedDate = parseDateOnly(date)
    if (!requestedDate) {
      return NextResponse.json(
        { error: "Tanggal lembur tidak valid" },
        { status: 400 }
      )
    }

    const today = startOfDay(new Date())
    if (requestedDate > today) {
      return NextResponse.json(
        { error: "Tanggal lembur manual tidak boleh melebihi hari ini" },
        { status: 400 }
      )
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        supervisorId: true,
        departmentId: true,
        departmentName: true,
        department: { select: { name: true } },
        regularStartTime: true,
        regularEndTime: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)
    if (startMinutes === null || endMinutes === null) {
      return NextResponse.json(
        { error: "Format jam lembur tidak valid (HH:MM)" },
        { status: 400 }
      )
    }
    if (startMinutes === endMinutes) {
      return NextResponse.json(
        { error: "Jam lembur akhir harus > jam lembur mulai" },
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
        { error: "Durasi hari lembur tidak valid" },
        { status: 400 }
      )
    }

    const departmentName =
      user.department?.name || user.departmentName || ""
    const departmentKey = departmentName.toLowerCase()
    const isSecurityDepartment = departmentKey === "security"

    let regularStartAt: Date | null = null
    let regularEndAt: Date | null = null
    let isSecurityWeeklyHoliday = false

    if (!bypassWorkSchedule && isSecurityDepartment) {
      const dayOfWeek = getJakartaDayOfWeek(requestedDate)
      const shiftAssignment = await prisma.securityShiftAssignment.findUnique({
        where: {
          userId_workDate: {
            userId: user.id,
            workDate: requestedDate,
          },
        },
        select: { shiftCode: true },
      })

      if (isSecurityOffShift(shiftAssignment?.shiftCode)) {
        isSecurityWeeklyHoliday = true
      } else if (shiftAssignment?.shiftCode) {
        if (!isSecurityWorkShiftCode(shiftAssignment.shiftCode)) {
          return NextResponse.json(
            { error: "Shift security tidak valid" },
            { status: 400 }
          )
        }

        const shiftDefinition = SECURITY_SHIFT_DEFINITIONS[shiftAssignment.shiftCode]
        const regularWindow = makeWindow(
          requestedDate,
          shiftDefinition.start,
          shiftDefinition.end
        )
        if (!regularWindow) {
          return NextResponse.json(
            { error: "Jam reguler security tidak valid" },
            { status: 400 }
          )
        }
        regularStartAt = regularWindow.start
        regularEndAt = regularWindow.end
      } else if (dayOfWeek === 6) {
        // Security 5-day rule: Saturday without assigned shift is treated as weekly holiday.
        isSecurityWeeklyHoliday = true
      } else if (user.regularStartTime && user.regularEndTime) {
        const regularStartMinutes = parseTimeToMinutes(
          user.regularStartTime
        )
        const regularEndMinutes = parseTimeToMinutes(user.regularEndTime)
        if (regularStartMinutes === null || regularEndMinutes === null) {
          return NextResponse.json(
            { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
            { status: 400 }
          )
        }
        if (regularStartMinutes === regularEndMinutes) {
          return NextResponse.json(
            { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
            { status: 400 }
          )
        }
        const regularWindow = makeWindow(
          requestedDate,
          user.regularStartTime,
          user.regularEndTime
        )
        if (!regularWindow) {
          return NextResponse.json(
            { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
            { status: 400 }
          )
        }
        regularStartAt = regularWindow.start
        regularEndAt = regularWindow.end
      } else {
        return NextResponse.json(
          { error: "Shift security belum diatur untuk tanggal ini" },
          { status: 400 }
        )
      }
    } else if (!bypassWorkSchedule) {
      const dayOfWeek = getJakartaDayOfWeek(requestedDate)
      const overrideKey = makeRegularOverrideKey(user.id, dayOfWeek)
      const overrideSetting = await prisma.setting.findUnique({
        where: { key: overrideKey },
        select: { value: true },
      })
      const overrideValue = parseRegularOverrideValue(overrideSetting?.value)

      const effectiveStartTime = overrideValue?.startTime || user.regularStartTime
      const effectiveEndTime = overrideValue?.endTime || user.regularEndTime

      if (!effectiveStartTime || !effectiveEndTime) {
        return NextResponse.json(
          { error: "Jam reguler user belum diatur. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      const regularStartMinutes = parseTimeToMinutes(effectiveStartTime)
      const regularEndMinutes = parseTimeToMinutes(effectiveEndTime)
      if (regularStartMinutes === null || regularEndMinutes === null) {
        return NextResponse.json(
          { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      if (regularStartMinutes === regularEndMinutes) {
        return NextResponse.json(
          { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      const regularWindow = makeWindow(
        requestedDate,
        effectiveStartTime,
        effectiveEndTime
      )
      if (!regularWindow) {
        return NextResponse.json(
          { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      regularStartAt = regularWindow.start
      regularEndAt = regularWindow.end
    }

    const hasRegularWindow = Boolean(regularStartAt && regularEndAt)

    if (!bypassWorkSchedule && !hasRegularWindow && !isSecurityWeeklyHoliday) {
      return NextResponse.json(
        { error: "Jam reguler tidak valid. Hubungi Super Admin." },
        { status: 400 }
      )
    }

    const plannedWindow = makeWindowWithOffset(
      requestedDate,
      startTime,
      endTime,
      endDayOffset
    )
    if (!plannedWindow) {
      return NextResponse.json(
        { error: "Waktu lembur tidak valid" },
        { status: 400 }
      )
    }

    const { start: plannedStartAt, end: plannedEndAt } = plannedWindow
    if (plannedEndAt <= plannedStartAt) {
      return NextResponse.json(
        { error: "Jam lembur akhir harus > jam lembur mulai" },
        { status: 400 }
      )
    }

    if (!bypassWorkSchedule && hasRegularWindow) {
      const overlapsRegular = windowsOverlap(
        { start: regularStartAt!, end: regularEndAt! },
        { start: plannedStartAt, end: plannedEndAt }
      )
      if (overlapsRegular) {
        return NextResponse.json(
          { error: "Jam lembur tidak boleh bentrok dengan jam reguler" },
          { status: 400 }
        )
      }
    }

    const overlap = await prisma.spl.findFirst({
      where: {
        requesterId: user.id,
        actualEndAt: null,
        status: {
          notIn: ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"],
        },
        plannedStartAt: { not: null },
        plannedEndAt: { not: null },
        AND: [
          { plannedStartAt: { lt: plannedEndAt } },
          { plannedEndAt: { gt: plannedStartAt } },
        ],
      },
      select: { id: true },
    })

    if (overlap) {
      return NextResponse.json(
        { error: "Ada pengajuan lembur lain yang overlap" },
        { status: 400 }
      )
    }

    const totalMinutes = Math.max(
      0,
      Math.floor((plannedEndAt.getTime() - plannedStartAt.getTime()) / 60000)
    )

    if (totalMinutes <= 0) {
      return NextResponse.json(
        { error: "Waktu mulai dan selesai tidak valid" },
        { status: 400 }
      )
    }

    const totalHours = parseFloat((totalMinutes / 60).toFixed(2))

    // Determine initial status based on department approval rules
    let status = "PENDING_MANAGER"
    let supervisorId: string | null = null
    const routingDepartmentName = user.department?.name || user.departmentName || null

    if (user.supervisorId) {
      status = "PENDING_SUPERVISOR"
      supervisorId = user.supervisorId
    } else if (user.role === "STAFF" || user.role === "TEKNISI" || user.role === "DRIVER") {
      const supervisor = await getSupervisorForDepartment({
        departmentId: user.departmentId || null,
        departmentName: routingDepartmentName,
      })
      if (supervisor) {
        status = "PENDING_SUPERVISOR"
        supervisorId = supervisor.id
      }
    }

    // Create SPL
    const spl = await prisma.spl.create({
      data: {
        requesterId: userId,
        date: requestedDate,
        startTime,
        endTime,
        totalHours,
        reason,
        projectName: projectName || null,
        status,
        supervisorId,
        regularStartAt,
        regularEndAt,
        plannedStartAt,
        plannedEndAt,
        isManualEntry: true, // Mark as manual entry
        manualEntryBy: session.user.id, // Track who created it
        requesterSignedAt: null, // User hasn't signed yet
        source: "MANUAL",
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            departmentId: true,
            departmentName: true,
            department: { select: { id: true, name: true } },
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
    })

    try {
      const splDate = requestedDate
      const formattedDate = splDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: JAKARTA_TIME_ZONE,
      })
      const notificationTitle = "SPL Telat Input Baru"
      const notificationBody = `SPL ${formattedDate} (${startTime}-${endTime}) telah dibuat oleh Super Admin. Silakan tanda tangan di menu Telat Input.`

      await sendNotificationToUser(userId, notificationTitle, notificationBody, {
        splId: spl.id,
        click_action: "/dashboard/telat-input",
      })
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi SPL manual:", notificationError)
    }

    return NextResponse.json({
      ...spl,
      message: "SPL manual berhasil dibuat. User perlu menandatangani SPL ini terlebih dahulu.",
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating manual SPL:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
