import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const SIGNATURE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="

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
    endTime: "17:08",
    projectName: "Overtime mengelola karyawan baru kontrakan (Karyawan ESTA)",
    reason: "Overtime mengelola karyawan baru kontrakan (Karyawan ESTA)",
  },
  {
    name: "ADINDA RAHMA HABIBAH",
    pin: "218",
    date: "2026-01-07",
    startTime: "16:00",
    endTime: "19:30",
    reason: "Overtime Payroll Cabuto Indomie",
  },
  {
    name: "ADINDA RAHMA HABIBAH",
    pin: "218",
    date: "2026-01-16",
    startTime: "13:40",
    endTime: "16:47",
    projectName: "Laporan produksi",
    reason: "Membuat laporan produksi",
  },
  {
    name: "ADINDA RAHMA HABIBAH",
    pin: "218",
    date: "2026-01-19",
    startTime: "16:00",
    endTime: "20:10",
    projectName: "Payroll",
    reason: "Laporan rekap Payroll",
  },
  {
    name: "FINA OKTAVIANI",
    pin: "111",
    date: "2026-01-19",
    startTime: "16:30",
    endTime: "20:00",
    projectName: "Pengawasan karyawan pulang",
    reason: "Cek body karyawan pulang",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-16",
    startTime: "16:30",
    endTime: "18:28",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-17",
    startTime: "16:30",
    endTime: "18:25",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-18",
    startTime: "16:30",
    endTime: "18:33",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-19",
    startTime: "16:30",
    endTime: "19:20",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-20",
    startTime: "08:00",
    endTime: "21:49",
    reason: "Mengerjakan sample buyer",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-22",
    startTime: "16:30",
    endTime: "18:11",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-23",
    startTime: "16:30",
    endTime: "19:17",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-27",
    startTime: "08:00",
    endTime: "17:35",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-29",
    startTime: "16:30",
    endTime: "17:54",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2025-12-30",
    startTime: "16:30",
    endTime: "22:58",
    reason: "Mengerjakan sample buyer",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-02",
    startTime: "16:00",
    endTime: "19:21",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-03",
    startTime: "14:00",
    endTime: "17:30",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-05",
    startTime: "16:00",
    endTime: "19:49",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-06",
    startTime: "16:00",
    endTime: "20:03",
    projectName: "Indomie",
    reason: "Mengawasi produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-07",
    startTime: "16:00",
    endTime: "19:02",
    projectName: "Produksi",
    reason: "Mengawasi produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-08",
    startTime: "16:00",
    endTime: "17:29",
    projectName: "Produksi",
    reason: "Mengawasi produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-12",
    startTime: "16:00",
    endTime: "18:14",
    projectName: "Produksi",
    reason: "Mengawasi Produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-13",
    startTime: "16:00",
    endTime: "18:42",
    projectName: "Produksi",
    reason: "Mengawasi produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-14",
    startTime: "16:00",
    endTime: "17:35",
    projectName: "Produksi",
    reason: "Mengawasi produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-15",
    startTime: "16:00",
    endTime: "20:16",
    projectName: "Indomie",
    reason: "Mengawasi anak indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-16",
    startTime: "14:00",
    endTime: "23:40",
    projectName: "Indomie",
    reason: "Mengawasi produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-17",
    startTime: "16:00",
    endTime: "20:06",
    projectName: "Indomie",
    reason: "Mengawasi produksi indomie",
  },
  {
    name: "GANES TIRZA YEMIMA",
    pin: "137",
    date: "2026-01-20",
    startTime: "16:00",
    endTime: "19:00",
    projectName: "INDOMIE",
    reason: "Mengawasi produksi bagian Indomie",
  },
  {
    name: "HAJAR ANNISA SEPTIARANI",
    pin: "219",
    date: "2026-01-15",
    startTime: "16:00",
    endTime: "16:40",
    projectName: "Meeting Riset Treatment",
    reason:
      "Meeting dengan Bu tiyas, mba ganes, dan mas aam terkait evaluasi meeting waleta",
  },
  {
    name: "HAYYU SABRINA",
    pin: "212",
    date: "2025-12-30",
    startTime: "16:30",
    endTime: "17:30",
    projectName: "Anak kontrakan",
    reason: "Mengurus perabotan kontrakan",
  },
  {
    name: "JOKO BUDIONO",
    pin: "170",
    date: "2026-01-01",
    startTime: "07:00",
    endTime: "15:00",
    reason: "Menggantikan jadwal wahyu security",
  },
  {
    name: "NIZAR NAZARUDIN",
    pin: "222",
    date: "2026-01-05",
    startTime: "19:00",
    endTime: "20:00",
    projectName: "Antar kasur ke kos an",
    reason: "Antar kasur ke kos an",
  },
  {
    name: "NIZAR NAZARUDIN",
    pin: "222",
    date: "2026-01-13",
    startTime: "18:58",
    endTime: "20:06",
    projectName: "Antar kasur ke kos",
    reason: "Antar kasur ke kos",
  },
  {
    name: "NIZAR NAZARUDIN",
    pin: "222",
    date: "2026-01-17",
    startTime: "10:00",
    endTime: "13:00",
    projectName: "Mengurus anak kontrakan",
    reason: "Menemani pak anton mengurus anak kontrakan",
  },
  {
    name: "PANDU BIRAWANTO",
    pin: "221",
    date: "2026-01-11",
    startTime: "08:20",
    endTime: "14:07",
    reason: "perbaikan stop kontak produksi",
  },
  {
    name: "PANDU BIRAWANTO",
    pin: "221",
    date: "2026-01-13",
    startTime: "18:00",
    endTime: "21:00",
    reason: "Membantu mas nizar ngantar anak alat2 kebutuhan anak kontrakan",
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
    projectName: "Berangkat ke terboyo",
    reason: "Ke terboyo antar dokumen",
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

  const manager =
    (await prisma.user.findUnique({
      where: { email: "tiyas@tunasestaindonesia.com" },
      select: { id: true, name: true },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "MANAGER" },
      select: { id: true, name: true },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { id: true, name: true },
    }))

  if (!manager?.id) {
    throw new Error(
      "Manager tidak ditemukan. Jalankan seed user terlebih dahulu."
    )
  }

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

    const supervisorId = user.supervisorId || null
    const approvedAt = plannedWindow.end
    const status = "APPROVED"

    const existing = await prisma.spl.findFirst({
      where: {
        requesterId: user.id,
        date,
        startTime: plannedWindow.startTime,
        endTime: plannedWindow.endTime,
      },
      select: { id: true, source: true },
    })

    if (existing) {
      console.log(
        `Skip: sudah ada SPL source ${existing.source} (${user.name} ${row.date}).`
      )
      continue
    }

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
        supervisorApprovalDate: supervisorId ? approvedAt : null,
        supervisorSignature: supervisorId ? SIGNATURE_PLACEHOLDER : null,
        approverId: manager.id,
        approvalDate: approvedAt,
        signature: SIGNATURE_PLACEHOLDER,
        requesterSignedAt: approvedAt,
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
