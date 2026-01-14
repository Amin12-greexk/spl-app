import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type LegacySeedRow = {
  name: string
  pin: string
  date: string
  startTime: string
  endTime: string
  reason: string
  projectName?: string | null
}

const legacyRows: LegacySeedRow[] = [
  {
    name: "ADINDA RAHMA HABIBAH",
    pin: "218",
    date: "2025-12-31",
    startTime: "16:00",
    endTime: "17:57",
    reason: "Overtime payroll indomie",
  },
  {
    name: "ADINDA RAHMA HABIBAH",
    pin: "218",
    date: "2026-01-05",
    startTime: "16:00",
    endTime: "18:58",
    reason: "Overtime mengelola karyawan baru kontrakan (Karyawan ESTA)",
  },
  {
    name: "ADINDA RAHMA HABIBAH",
    pin: "218",
    date: "2026-01-07",
    startTime: "16:00",
    endTime: "19:09",
    reason: "Overtimpe payroll indomie",
  },
  {
    name: "PANDU BIRAWANTO",
    pin: "221",
    date: "2026-01-15",
    startTime: "8:20",
    endTime: "14:07",
    reason: "perbaikan stop kontak produksi",
  },
  {
    name: "HAYYU SABRINA",
    pin: "212",
    date: "2025-12-30",
    startTime: "16:30",
    endTime: "17:30",
    reason: "HR",
  },
  {
    name: "RICO EFFENDY",
    pin: "206",
    date: "2026-01-05",
    startTime: "16:00",
    endTime: "20:00",
    reason: "antar kasur ke kos an",
  },
  {
    name: "RICO EFFENDY",
    pin: "206",
    date: "2026-01-07",
    startTime: "16:00",
    endTime: "18:02",
    reason: "Standby driver",
  },
  {
    name: "NIZAR NAZARUDIN",
    pin: "222",
    date: "2026-01-05",
    startTime: "16:00",
    endTime: "20:00",
    reason: "antar kasur ke kos an",
  },
  {
    name: "JOKO BUDIONO",
    pin: "170",
    date: "2026-01-01",
    startTime: "7:00",
    endTime: "15:00",
    reason: "Menggantikan jadwal wahyu security",
  },
]

const parseDateOnly = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const parseTime = (value: string) => {
  const trimmed = value.trim()
  const parts = trimmed.split(":")
  if (parts.length !== 2) return null
  const hour = Number(parts[0])
  const minute = Number(parts[1])
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
  const normalized = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  return { hour, minute, normalized }
}

const buildPlannedWindow = (date: Date, startTime: string, endTime: string) => {
  const startMeta = parseTime(startTime)
  const endMeta = parseTime(endTime)
  if (!startMeta || !endMeta) return null

  const plannedStart = new Date(date)
  plannedStart.setHours(startMeta.hour, startMeta.minute, 0, 0)

  const plannedEnd = new Date(date)
  plannedEnd.setHours(endMeta.hour, endMeta.minute, 0, 0)

  if (plannedEnd <= plannedStart) {
    plannedEnd.setDate(plannedEnd.getDate() + 1)
  }

  return {
    start: plannedStart,
    end: plannedEnd,
    startTime: startMeta.normalized,
    endTime: endMeta.normalized,
  }
}

async function seedLegacy() {
  console.log("Seeding legacy data (legacy-1)...")

  for (const row of legacyRows) {
    const date = parseDateOnly(row.date)
    if (!date) {
      throw new Error(`Tanggal tidak valid: ${row.date} (${row.name})`)
    }

    const plannedWindow = buildPlannedWindow(date, row.startTime, row.endTime)
    if (!plannedWindow) {
      throw new Error(
        `Jam tidak valid: ${row.startTime}-${row.endTime} (${row.name})`
      )
    }

    const totalMinutes = Math.max(
      0,
      Math.floor((plannedWindow.end.getTime() - plannedWindow.start.getTime()) / 60000)
    )
    const totalHours = Number((totalMinutes / 60).toFixed(2))

    const user = await prisma.user.findFirst({
      where: { pin: row.pin },
      select: { id: true, name: true, pin: true, supervisorId: true },
    })

    if (!user) {
      throw new Error(`User dengan PIN ${row.pin} tidak ditemukan (${row.name}).`)
    }

    const existing = await prisma.spl.findFirst({
      where: {
        requesterId: user.id,
        date,
        startTime: plannedWindow.startTime,
        endTime: plannedWindow.endTime,
        source: "LEGACY",
      },
      select: { id: true },
    })

    if (existing) {
      console.log(`Skip: legacy SPL sudah ada (${user.name} ${row.date}).`)
      continue
    }

    const supervisorId = user.supervisorId || null
    const status = supervisorId ? "PENDING_SUPERVISOR" : "PENDING_MANAGER"

    await prisma.spl.create({
      data: {
        requesterId: user.id,
        date,
        startTime: plannedWindow.startTime,
        endTime: plannedWindow.endTime,
        totalHours,
        reason: row.reason.trim(),
        projectName: row.projectName || null,
        status,
        supervisorId,
        source: "LEGACY",
        plannedStartAt: plannedWindow.start,
        plannedEndAt: plannedWindow.end,
      },
    })

    console.log(`Inserted legacy SPL: ${user.name} ${row.date}`)
  }

  console.log("Legacy seed (legacy-1) selesai.")
}

seedLegacy()
  .catch((error) => {
    console.error("Legacy seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
