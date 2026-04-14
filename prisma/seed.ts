import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const JAKARTA_OFFSET_MINUTES = 7 * 60

const LEGACY_DEPARTMENT_SUPERVISOR_MAPPING: Record<string, "GA" | "DEPARTMENT_HEAD"> = {
  Security: "GA",
  Teknik: "GA",
  Driver: "GA",
  HR: "DEPARTMENT_HEAD",
  IT: "DEPARTMENT_HEAD",
  Lab: "DEPARTMENT_HEAD",
}

type SeedEntry = {
  date: string
  startTime: string
  endTime: string
  reason: string
}

const TARGET_NAME = "FINA OKTAVIANI"
const MANUAL_ENTRY_BY = "seed-fina-telat-input-20260407"
const TARGET_ENTRIES: SeedEntry[] = [
  {
    date: "2026-04-03",
    startTime: "07:00",
    endTime: "18:00",
    reason: "Cek body",
  },
  {
    date: "2026-04-04",
    startTime: "07:30",
    endTime: "15:30",
    reason: "Backup ke Esta",
  },
]

const makeJakartaDate = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
) =>
  new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) -
      JAKARTA_OFFSET_MINUTES * 60000
  )

const getJakartaParts = (value: Date) => {
  const adjusted = new Date(value.getTime() + JAKARTA_OFFSET_MINUTES * 60000)
  return {
    year: adjusted.getUTCFullYear(),
    month: adjusted.getUTCMonth() + 1,
    day: adjusted.getUTCDate(),
  }
}

const parseDateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error(`Format tanggal tidak valid: ${value}`)
  }

  return makeJakartaDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    0,
    0,
    0
  )
}

const addDays = (value: Date, days: number) =>
  new Date(value.getTime() + days * 24 * 60 * 60 * 1000)

const parseTimeToMinutes = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim())
  if (!match) {
    throw new Error(`Format jam tidak valid: ${value}`)
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Nilai jam tidak valid: ${value}`)
  }

  return hour * 60 + minute
}

const setTimeOnDate = (baseDate: Date, timeValue: string) => {
  const minutes = parseTimeToMinutes(timeValue)
  const parts = getJakartaParts(baseDate)
  return makeJakartaDate(
    parts.year,
    parts.month,
    parts.day,
    Math.floor(minutes / 60),
    minutes % 60,
    0
  )
}

const makeWindow = (baseDay: Date, startTime: string, endTime: string) => {
  const start = setTimeOnDate(baseDay, startTime)
  let end = setTimeOnDate(baseDay, endTime)

  if (end <= start) {
    end = addDays(end, 1)
  }

  return { start, end }
}

const getSupervisorForDepartment = async (params: {
  departmentId?: string | null
  departmentName?: string | null
}) => {
  const departmentName = params.departmentName?.trim() || null
  let approvalMode: "GA" | "DEPARTMENT_HEAD" | null = null

  if (params.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: params.departmentId },
      select: {
        id: true,
        name: true,
        supervised: true,
        approvalMode: true,
      },
    })

    if (department?.supervised) {
      if (department.approvalMode === "GA" || department.approvalMode === "DEPARTMENT_HEAD") {
        approvalMode = department.approvalMode
      }
    }

    if (department && approvalMode === null && departmentName) {
      approvalMode = LEGACY_DEPARTMENT_SUPERVISOR_MAPPING[department.name] || null
    }
  }

  if (!approvalMode && departmentName) {
    approvalMode = LEGACY_DEPARTMENT_SUPERVISOR_MAPPING[departmentName] || null
  }

  if (!approvalMode) {
    return null
  }

  if (approvalMode === "GA") {
    return prisma.user.findFirst({
      where: { role: "GA" },
      select: { id: true },
    })
  }

  return prisma.user.findFirst({
    where: {
      role: "DEPARTMENT_HEAD",
      OR: [
        params.departmentId ? { departmentId: params.departmentId } : undefined,
        departmentName
          ? {
              departmentName: {
                equals: departmentName,
                mode: "insensitive",
              },
            }
          : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    select: { id: true },
  })
}

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      name: {
        equals: TARGET_NAME,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      departmentId: true,
      departmentName: true,
      regularStartTime: true,
      regularEndTime: true,
      supervisorId: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!user) {
    throw new Error(`User ${TARGET_NAME} tidak ditemukan`)
  }

  let status = "PENDING_MANAGER"
  let supervisorId: string | null = null
  const routingDepartmentName = user.department?.name || user.departmentName || null

  if (user.supervisorId) {
    status = "PENDING_SUPERVISOR"
    supervisorId = user.supervisorId
  } else if (["STAFF", "TEKNISI", "DRIVER"].includes(user.role)) {
    const supervisor = await getSupervisorForDepartment({
      departmentId: user.departmentId,
      departmentName: routingDepartmentName,
    })

    if (supervisor) {
      status = "PENDING_SUPERVISOR"
      supervisorId = supervisor.id
    }
  }

  const createdRows = await prisma.$transaction(async (tx) => {
    const rows = []

    for (const entry of TARGET_ENTRIES) {
      const requestedDate = parseDateOnly(entry.date)
      const nextDate = addDays(requestedDate, 1)
      const plannedWindow = makeWindow(requestedDate, entry.startTime, entry.endTime)
      const totalHours = Number(
        (
          (plannedWindow.end.getTime() - plannedWindow.start.getTime()) /
          (60 * 60 * 1000)
        ).toFixed(2)
      )

      const regularStartAt =
        user.regularStartTime && user.regularEndTime
          ? setTimeOnDate(requestedDate, user.regularStartTime)
          : null
      const regularEndAt =
        user.regularStartTime && user.regularEndTime
          ? setTimeOnDate(requestedDate, user.regularEndTime)
          : null

      await tx.spl.deleteMany({
        where: {
          requesterId: user.id,
          source: "MANUAL",
          isManualEntry: true,
          startTime: entry.startTime,
          endTime: entry.endTime,
          date: {
            gte: requestedDate,
            lt: nextDate,
          },
        },
      })

      const created = await tx.spl.create({
        data: {
          requesterId: user.id,
          date: requestedDate,
          startTime: entry.startTime,
          endTime: entry.endTime,
          totalHours,
          reason: entry.reason,
          status,
          source: "MANUAL",
          isManualEntry: true,
          manualEntryBy: MANUAL_ENTRY_BY,
          requesterSignedAt: null,
          supervisorId,
          regularStartAt,
          regularEndAt,
          plannedStartAt: plannedWindow.start,
          plannedEndAt: plannedWindow.end,
        },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          totalHours: true,
          status: true,
          source: true,
          isManualEntry: true,
          requesterSignedAt: true,
        },
      })

      rows.push(created)
    }

    return rows
  })

  console.log(
    JSON.stringify(
      {
        requester: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        status,
        supervisorId,
        seededCount: createdRows.length,
        rows: createdRows,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
