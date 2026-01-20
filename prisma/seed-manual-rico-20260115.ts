import { PrismaClient } from "@prisma/client"
import { getSupervisorForDepartment } from "@/lib/supervisor-mapping"
import {
  buildOvertimeWindowFromTimes,
  makeWindow,
  parseDateOnly,
  parseTimeToMinutes,
  SECURITY_SHIFT_DEFINITIONS,
  SecurityShiftCode,
} from "@/lib/spl-time"

const prisma = new PrismaClient()

async function main() {
  const targetEmail = "rico@tunasestaindonesia.com"
  const adminEmail = "admin@tunasestaindonesia.com"
  const payload = {
    date: "2026-01-15",
    startTime: "16:00",
    endTime: "20:30",
    reason: "Telat input lembur driver",
  }

  const admin =
    (await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { id: true },
    }))
  const adminId = admin?.id || null
  if (!adminId) {
    console.warn("Super Admin tidak ditemukan, manualEntryBy akan dikosongkan.")
  }

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
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
    throw new Error("User Rico Effendy tidak ditemukan.")
  }

  const requestedDate = parseDateOnly(payload.date)
  if (!requestedDate) {
    throw new Error("Tanggal tidak valid.")
  }

  const startMinutes = parseTimeToMinutes(payload.startTime)
  const endMinutes = parseTimeToMinutes(payload.endTime)
  if (startMinutes === null || endMinutes === null) {
    throw new Error("Format jam tidak valid (HH:MM).")
  }
  if (startMinutes === endMinutes) {
    throw new Error("Jam lembur akhir harus > jam lembur mulai.")
  }

  const existing = await prisma.spl.findFirst({
    where: {
      requesterId: user.id,
      date: requestedDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      source: "MANUAL",
    },
    select: { id: true },
  })
  if (existing) {
    console.log("SPL manual sudah ada, skip.")
    return
  }

  const departmentName =
    user.department?.name || user.departmentName || ""
  const departmentKey = departmentName.toLowerCase()
  const isSecurityDepartment = departmentKey === "security"

  let regularStartAt: Date | null = null
  let regularEndAt: Date | null = null

  if (isSecurityDepartment) {
    const shiftAssignment = await prisma.securityShiftAssignment.findUnique({
      where: {
        userId_workDate: {
          userId: user.id,
          workDate: requestedDate,
        },
      },
      select: { shiftCode: true },
    })

    if (shiftAssignment?.shiftCode) {
      const shiftDefinition =
        SECURITY_SHIFT_DEFINITIONS[
          shiftAssignment.shiftCode as SecurityShiftCode
        ]
      if (!shiftDefinition) {
        throw new Error("Shift security tidak valid.")
      }
      const regularWindow = makeWindow(
        requestedDate,
        shiftDefinition.start,
        shiftDefinition.end
      )
      if (!regularWindow) {
        throw new Error("Jam reguler security tidak valid.")
      }
      regularStartAt = regularWindow.start
      regularEndAt = regularWindow.end
    } else if (user.regularStartTime && user.regularEndTime) {
      const regularWindow = makeWindow(
        requestedDate,
        user.regularStartTime,
        user.regularEndTime
      )
      if (!regularWindow) {
        throw new Error("Jam reguler user tidak valid.")
      }
      regularStartAt = regularWindow.start
      regularEndAt = regularWindow.end
    } else {
      throw new Error("Shift security belum diatur untuk tanggal ini.")
    }
  } else {
    if (!user.regularStartTime || !user.regularEndTime) {
      throw new Error("Jam reguler user belum diatur.")
    }
    const regularWindow = makeWindow(
      requestedDate,
      user.regularStartTime,
      user.regularEndTime
    )
    if (!regularWindow) {
      throw new Error("Jam reguler user tidak valid.")
    }
    regularStartAt = regularWindow.start
    regularEndAt = regularWindow.end
  }

  if (!regularStartAt || !regularEndAt) {
    throw new Error("Jam reguler tidak valid.")
  }

  const plannedWindow = buildOvertimeWindowFromTimes(
    regularEndAt,
    payload.startTime,
    payload.endTime
  )
  if (!plannedWindow) {
    throw new Error("Waktu lembur tidak valid.")
  }

  if (plannedWindow.start < regularEndAt) {
    regularEndAt = plannedWindow.start
  }

  if (plannedWindow.end <= plannedWindow.start) {
    throw new Error("Jam lembur akhir harus > jam lembur mulai.")
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
        { plannedStartAt: { lt: plannedWindow.end } },
        { plannedEndAt: { gt: plannedWindow.start } },
      ],
    },
    select: { id: true },
  })
  if (overlap) {
    throw new Error("Ada pengajuan lembur lain yang overlap.")
  }

  const totalMinutes = Math.max(
    0,
    Math.floor(
      (plannedWindow.end.getTime() - plannedWindow.start.getTime()) / 60000
    )
  )
  const totalHours = Number((totalMinutes / 60).toFixed(2))

  let status = "PENDING_MANAGER"
  let supervisorId: string | null = null
  const routingDepartmentName = departmentName || null

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

  await prisma.spl.create({
    data: {
      requesterId: user.id,
      date: requestedDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      totalHours,
      reason: payload.reason,
      status,
      supervisorId,
      regularStartAt,
      regularEndAt,
      plannedStartAt: plannedWindow.start,
      plannedEndAt: plannedWindow.end,
      isManualEntry: true,
      manualEntryBy: adminId,
      requesterSignedAt: null,
      source: "MANUAL",
    },
  })

  console.log("SPL manual Rico Effendy berhasil dibuat.")
}

main()
  .catch((error) => {
    console.error("Seed manual Rico gagal:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
