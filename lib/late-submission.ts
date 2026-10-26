import type { PrismaClient } from "@prisma/client"
import {
  AttendanceScan,
  fetchAttendanceScans,
  pickDepartureScan,
} from "@/lib/fingerprint"
import { formatJakartaHHMM } from "@/lib/spl-time"

/** Setting key (tabel Setting) untuk batas mundur pengajuan SPL telat oleh karyawan, dalam hari. */
export const LATE_SUBMISSION_MAX_DAYS_KEY = "LATE_SUBMISSION_MAX_DAYS"
export const DEFAULT_LATE_SUBMISSION_MAX_DAYS = 7
export const MAX_LATE_SUBMISSION_MAX_DAYS = 90

/** Panjang minimal alasan lembur dan alasan keterlambatan untuk pengajuan telat. */
export const MIN_LATE_TEXT_LENGTH = 20

/** Toleransi (menit) scan pulang boleh lebih awal dari jam selesai lembur yang diajukan. */
export const LATE_DEPARTURE_TOLERANCE_MINUTES = 15

/** Seberapa lama setelah jam selesai lembur scan pulang masih dianggap bagian dari lembur tsb. */
const DEPARTURE_GRACE_MINUTES = 8 * 60

export type LateFingerprintResult =
  | { status: "MATCHED"; departure: AttendanceScan }
  | { status: "UNVERIFIED"; reason: string }
  | { status: "MISMATCH"; error: string }

/**
 * Cocokkan pengajuan lembur yang sudah lewat dengan data fingerprint.
 * - MATCHED: ada scan pulang yang menutupi jam lembur (selisih <= toleransi).
 * - UNVERIFIED: tidak ada data scan sama sekali pada tanggal itu (API mati / belum sinkron / tanpa PIN);
 *   pengajuan tetap lanjut tetapi ditandai agar atasan tahu.
 * - MISMATCH: ada scan di tanggal itu tetapi tidak mendukung jam lembur yang diajukan.
 */
export async function verifyLateFingerprint(params: {
  pin: string | null | undefined
  dayStart: Date
  plannedStartAt: Date
  plannedEndAt: Date
}): Promise<LateFingerprintResult> {
  const { pin, dayStart, plannedStartAt, plannedEndAt } = params
  if (!pin) return { status: "UNVERIFIED", reason: "PIN fingerprint belum diatur" }

  const scans = await fetchAttendanceScans(pin)
  const windowEnd = new Date(plannedEndAt.getTime() + DEPARTURE_GRACE_MINUTES * 60000)
  const scansThatDay = scans.filter((scan) => scan.at >= dayStart && scan.at <= windowEnd)
  if (scansThatDay.length === 0) {
    return { status: "UNVERIFIED", reason: "Data fingerprint tanggal tersebut tidak ditemukan" }
  }

  const departure = pickDepartureScan(scans, plannedStartAt, windowEnd)
  if (!departure) {
    return {
      status: "MISMATCH",
      error: `Tidak ada scan pulang setelah jam mulai lembur (${formatJakartaHHMM(plannedStartAt)}) pada data fingerprint. Periksa kembali jam lembur, atau hubungi Super Admin.`,
    }
  }

  const earliestAcceptable = new Date(
    plannedEndAt.getTime() - LATE_DEPARTURE_TOLERANCE_MINUTES * 60000
  )
  if (departure.at < earliestAcceptable) {
    return {
      status: "MISMATCH",
      error: `Scan pulang terakhir pukul ${formatJakartaHHMM(departure.at)} lebih awal dari jam selesai lembur yang diajukan (${formatJakartaHHMM(plannedEndAt)}). Sesuaikan jam selesai lembur dengan data fingerprint.`,
    }
  }

  return { status: "MATCHED", departure }
}

export const parseLateMaxDays =(value: string | null | undefined) => {
  if (value == null || value.trim() === "") return DEFAULT_LATE_SUBMISSION_MAX_DAYS
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_LATE_SUBMISSION_MAX_DAYS) {
    return DEFAULT_LATE_SUBMISSION_MAX_DAYS
  }
  return parsed
}

export async function getLateSubmissionMaxDays(prisma: PrismaClient): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: LATE_SUBMISSION_MAX_DAYS_KEY },
      select: { value: true },
    })
    return parseLateMaxDays(setting?.value)
  } catch {
    return DEFAULT_LATE_SUBMISSION_MAX_DAYS
  }
}
