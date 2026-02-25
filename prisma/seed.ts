import * as bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const JAKARTA_OFFSET_MINUTES = 7 * 60
const MINUTES_PER_DAY = 24 * 60

type GanesSplInput = {
  date: string
  jamMasuk: string
  jamMulaiLembur: string
  jamPulang: string
  alasan: string
}

const GANES_SPL_DATA: GanesSplInput[] = [
  {
    date: "2026-01-21",
    jamMasuk: "09:23",
    jamMulaiLembur: "16:00",
    jamPulang: "19:28",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-01-22",
    jamMasuk: "06:34",
    jamMulaiLembur: "16:00",
    jamPulang: "18:43",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-01-23",
    jamMasuk: "07:48",
    jamMulaiLembur: "16:00",
    jamPulang: "19:58",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-01-24",
    jamMasuk: "07:46",
    jamMulaiLembur: "13:00",
    jamPulang: "17:30",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-01-26",
    jamMasuk: "07:49",
    jamMulaiLembur: "16:00",
    jamPulang: "20:40",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-01-27",
    jamMasuk: "10:33",
    jamMulaiLembur: "16:00",
    jamPulang: "21:54",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-01-29",
    jamMasuk: "07:48",
    jamMulaiLembur: "16:00",
    jamPulang: "17:26",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-01-30",
    jamMasuk: "07:52",
    jamMulaiLembur: "16:00",
    jamPulang: "22:00",
    alasan: "TUGAS KUNJUNGAN KE SUB TEMANGGUNG",
  },
  {
    date: "2026-01-31",
    jamMasuk: "07:43",
    jamMulaiLembur: "13:00",
    jamPulang: "20:51",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-02-02",
    jamMasuk: "07:46",
    jamMulaiLembur: "16:00",
    jamPulang: "23:07",
    alasan: "PERSIAPAN AUDIT",
  },
  {
    date: "2026-02-03",
    jamMasuk: "10:12",
    jamMulaiLembur: "16:00",
    jamPulang: "18:24",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-02-04",
    jamMasuk: "07:44",
    jamMulaiLembur: "16:00",
    jamPulang: "18:12",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-02-05",
    jamMasuk: "07:58",
    jamMulaiLembur: "16:00",
    jamPulang: "19:32",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-02-06",
    jamMasuk: "07:50",
    jamMulaiLembur: "16:00",
    jamPulang: "17:38",
    alasan: "MENGAWASI PRODUKSI BAGIAN INDOMIE",
  },
  {
    date: "2026-02-07",
    jamMasuk: "07:54",
    jamMulaiLembur: "13:00",
    jamPulang: "19:45",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
  {
    date: "2026-02-09",
    jamMasuk: "08:45",
    jamMulaiLembur: "16:00",
    jamPulang: "21:01",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
  {
    date: "2026-02-10",
    jamMasuk: "07:54",
    jamMulaiLembur: "16:00",
    jamPulang: "18:31",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
  {
    date: "2026-02-11",
    jamMasuk: "07:49",
    jamMulaiLembur: "16:00",
    jamPulang: "19:54",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
  {
    date: "2026-02-12",
    jamMasuk: "07:43",
    jamMulaiLembur: "16:00",
    jamPulang: "18:50",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
  {
    date: "2026-02-13",
    jamMasuk: "07:41",
    jamMulaiLembur: "16:00",
    jamPulang: "20:27",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
  {
    date: "2026-02-14",
    jamMasuk: "09:55",
    jamMulaiLembur: "13:00",
    jamPulang: "18:13",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
  {
    date: "2026-02-18",
    jamMasuk: "07:48",
    jamMulaiLembur: "16:00",
    jamPulang: "18:32",
    alasan:
      "MENGAWASI PRODUKSI BAGIAN INDOMIE DAN SUPPORT BAGIAN KOREKSI KERING",
  },
]

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number)
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Format jam tidak valid: ${value}`)
  }
  return { hours, minutes }
}

const makeJakartaDate = (dateValue: string, timeValue: string) => {
  const [year, month, day] = dateValue.split("-").map(Number)
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    throw new Error(`Format tanggal tidak valid: ${dateValue}`)
  }

  const { hours, minutes } = parseTime(timeValue)
  const utcMs =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    JAKARTA_OFFSET_MINUTES * 60_000
  return new Date(utcMs)
}

const toMinutes = (value: string) => {
  const { hours, minutes } = parseTime(value)
  return hours * 60 + minutes
}

const getDurationMinutes = (startTime: string, endTime: string) => {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  const diff = end - start
  return diff >= 0 ? diff : diff + MINUTES_PER_DAY
}

const addDay = (value: Date) => {
  return new Date(value.getTime() + 24 * 60 * 60 * 1000)
}

async function main() {
  console.log("Mulai tambah data SPL Ganes tanpa reset database...")

  const defaultPassword = await bcrypt.hash("12345678", 10)

  const produksiDepartment = await prisma.department.upsert({
    where: { name: "Produksi" },
    update: {},
    create: {
      name: "Produksi",
      supervised: true,
      approvalMode: "DIRECT",
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: "tiyas.indah.setyowuri@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "tiyas.indah.setyowuri@tunasestaindonesia.com",
      password: defaultPassword,
      pin: "001",
      name: "TIYAS INDAH SETYOWURI",
      role: "MANAGER",
      departmentId: produksiDepartment.id,
      departmentName: produksiDepartment.name,
      position: "Manager",
      regularStartTime: "08:00",
      regularEndTime: "16:00",
    },
  })

  const ganes = await prisma.user.upsert({
    where: { email: "ganes@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "ganes@tunasestaindonesia.com",
      password: defaultPassword,
      pin: "137",
      name: "GANES TIRZA YEMIMA",
      role: "STAFF",
      departmentId: produksiDepartment.id,
      departmentName: produksiDepartment.name,
      position: "Produksi",
      regularStartTime: "08:00",
      regularEndTime: "16:00",
      supervisorId: manager.id,
    },
  })

  let insertedCount = 0
  let skippedCount = 0

  for (const row of GANES_SPL_DATA) {
    const date = makeJakartaDate(row.date, "00:00")
    const regularStartAt = makeJakartaDate(row.date, row.jamMasuk)
    const regularEndAt = makeJakartaDate(row.date, row.jamMulaiLembur)
    const plannedStartAt = makeJakartaDate(row.date, row.jamMulaiLembur)
    let plannedEndAt = makeJakartaDate(row.date, row.jamPulang)

    if (plannedEndAt <= plannedStartAt) {
      plannedEndAt = addDay(plannedEndAt)
    }

    const totalMinutes = getDurationMinutes(row.jamMulaiLembur, row.jamPulang)
    const totalHours = Number((totalMinutes / 60).toFixed(2))

    const existingSpl = await prisma.spl.findFirst({
      where: {
        requesterId: ganes.id,
        date,
        startTime: row.jamMulaiLembur,
        endTime: row.jamPulang,
        source: "MANUAL",
        isManualEntry: true,
      },
      select: { id: true },
    })

    if (existingSpl) {
      skippedCount += 1
      continue
    }

    await prisma.spl.create({
      data: {
      requesterId: ganes.id,
      date,
      startTime: row.jamMulaiLembur,
      endTime: row.jamPulang,
      totalHours,
      reason: row.alasan,
      projectName: null,
      status: "PENDING_SUPERVISOR",
      source: "MANUAL",
      signature: null,
      proofImage: null,
      actualStartAt: null,
      actualEndAt: null,
      actualTotalHours: null,
      realizationNote: null,
      realizationProofImage: null,
      overrunReason: null,
      regularStartAt,
      regularEndAt,
      plannedStartAt,
      plannedEndAt,
      realizedMinutes: null,
      realizationCounted: null,
      realizationCancelReason: null,
      supervisorId: manager.id,
      supervisorApprovalDate: null,
      supervisorSignature: null,
      supervisorRejectionReason: null,
      approverId: null,
      approvalDate: null,
      rejectionReason: null,
      isManualEntry: true,
      manualEntryBy: manager.id,
      requesterSignedAt: null,
      },
    })

    insertedCount += 1
  }

  const [userCount, splCount] = await Promise.all([
    prisma.user.count(),
    prisma.spl.count(),
  ])

  console.log(
    `Selesai. SPL baru ditambahkan: ${insertedCount}, dilewati (sudah ada): ${skippedCount}`
  )
  console.log(`Total user saat ini: ${userCount}, total SPL saat ini: ${splCount}`)
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
