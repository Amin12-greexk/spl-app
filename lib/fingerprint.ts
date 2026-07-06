import { prisma } from "@/lib/prisma"
import {
  clampRealizationMinutes,
  parseJakartaDateTime,
} from "@/lib/spl-time"
import { recordSplAudit } from "@/lib/spl-audit"
import { sendNotificationToRoles } from "@/lib/notification-utils"
import { getOvertimeFlagsWithSettings } from "@/lib/feature-flags"

const ATTENDANCE_TIMEOUT_MS = 15000

/** How long after plannedEnd we still accept a departure scan (covers overrun). */
const OVERRUN_GRACE_MINUTES = 8 * 60

export interface AttendanceScan {
  pin: string
  scan_date: string
  at: Date
}

const getApiConfig = () => ({
  baseUrl: process.env.ABSEN_API_URL,
  token: process.env.ABSEN_API_TOKEN,
})

/** Pull raw attendance scans for a PIN from the external ABSEN API. Returns [] on any failure. */
export async function fetchAttendanceScans(pin: string): Promise<AttendanceScan[]> {
  const { baseUrl, token } = getApiConfig()
  if (!baseUrl || !token || !pin) return []

  const url = `${baseUrl}?pin=${encodeURIComponent(pin)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ATTENDANCE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) return []
    const json = await res.json()
    const rows: any[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.records)
      ? json.records
      : Array.isArray(json?.results)
      ? json.results
      : []
    const scans: AttendanceScan[] = []
    for (const row of rows) {
      const scanDate = typeof row?.scan_date === "string" ? row.scan_date : ""
      const at = parseJakartaDateTime(scanDate)
      if (at) {
        scans.push({ pin: String(row?.pin ?? pin), scan_date: scanDate, at })
      }
    }
    return scans
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Pick the "departure" (jam pulang) scan: the LATEST scan within
 * [windowStart, windowEnd]. Returns null if none qualify.
 */
export function pickDepartureScan(
  scans: AttendanceScan[],
  windowStart: Date,
  windowEnd: Date
): AttendanceScan | null {
  let best: AttendanceScan | null = null
  for (const scan of scans) {
    if (scan.at < windowStart || scan.at > windowEnd) continue
    if (!best || scan.at > best.at) best = scan
  }
  return best
}

export interface AutoRealizationResult {
  actualStartAt: Date
  actualEndAt: Date
  realizedMinutes: number
  actualTotalHours: number
  overrun: boolean
}

/**
 * Compute auto realization for a single SPL given its planned window and a departure time.
 * - actualStartAt = plannedStartAt (overtime begins at the regular end).
 * - actualEndAt = departure scan.
 * - realizedMinutes is clamped to the planned window (same semantics as manual realization).
 * Returns null if the departure does not represent any overtime.
 */
export function computeAutoRealization(
  plannedStartAt: Date,
  plannedEndAt: Date,
  departure: Date
): AutoRealizationResult | null {
  const actualStartAt = plannedStartAt
  const actualEndAt = departure
  if (actualEndAt <= actualStartAt) return null
  const realizedMinutes = clampRealizationMinutes(
    plannedStartAt,
    plannedEndAt,
    actualStartAt,
    actualEndAt
  )
  if (realizedMinutes <= 0) return null
  const actualTotalHours = parseFloat((realizedMinutes / 60).toFixed(2))
  return {
    actualStartAt,
    actualEndAt,
    realizedMinutes,
    actualTotalHours,
    overrun: actualEndAt > plannedEndAt,
  }
}

export interface FinalizeOutcome {
  splId: string
  status: "finalized" | "no_scan" | "skipped" | "error"
  reason?: string
  realizedMinutes?: number
  overrun?: boolean
}

/** Internal: finalize one already-loaded candidate SPL. */
async function finalizeOne(
  spl: {
    id: string
    status: string
    source: string
    plannedStartAt: Date | null
    plannedEndAt: Date | null
    overrunReason: string | null
    requester: { id: string; name: string | null; pin: string | null }
  },
  now: Date,
  notify: boolean
): Promise<FinalizeOutcome> {
  try {
    if (!spl.plannedStartAt || !spl.plannedEndAt) {
      return { splId: spl.id, status: "skipped", reason: "no_planned_window" }
    }
    const pin = spl.requester.pin
    if (!pin) {
      return { splId: spl.id, status: "skipped", reason: "no_pin" }
    }

    const scans = await fetchAttendanceScans(pin)
    if (scans.length === 0) {
      return { splId: spl.id, status: "no_scan", reason: "empty_or_unreachable" }
    }

    const windowEnd = new Date(
      spl.plannedEndAt.getTime() + OVERRUN_GRACE_MINUTES * 60000
    )
    // Don't finalize before the overtime has actually started.
    if (now < spl.plannedStartAt) {
      return { splId: spl.id, status: "skipped", reason: "not_started" }
    }
    const departure = pickDepartureScan(scans, spl.plannedStartAt, windowEnd)
    if (!departure) {
      return { splId: spl.id, status: "no_scan", reason: "no_departure_in_window" }
    }

    const realization = computeAutoRealization(
      spl.plannedStartAt,
      spl.plannedEndAt,
      departure.at
    )
    if (!realization) {
      return { splId: spl.id, status: "no_scan", reason: "departure_before_start" }
    }

    const overrunReason = realization.overrun
      ? spl.overrunReason ||
        "(Otomatis) Realisasi melebihi rencana berdasarkan data fingerprint"
      : spl.overrunReason

    // Idempotent guard: only set realization when actualEndAt is still null.
    const updated = await prisma.spl.updateMany({
      where: { id: spl.id, actualEndAt: null },
      data: {
        actualStartAt: realization.actualStartAt,
        actualEndAt: realization.actualEndAt,
        actualTotalHours: realization.actualTotalHours,
        realizedMinutes: realization.realizedMinutes,
        realizationCounted: realization.realizedMinutes > 0,
        realizationSource: "AUTO_FINGER",
        fingerprintMatchedAt: now,
        overrunReason,
        realizationCancelReason: null,
      },
    })

    if (updated.count === 0) {
      // Another process (or manual input) already realized it → no-op (double event safe).
      return { splId: spl.id, status: "skipped", reason: "already_realized" }
    }

    await recordSplAudit({
      splId: spl.id,
      action: "REALIZATION_AUTO_FINGER",
      actorId: null,
      oldStatus: spl.status,
      newStatus: spl.status,
      source: "AUTO_FINGER",
      note: realization.overrun
        ? `Realisasi otomatis (fingerprint), overrun. Pulang ${departure.scan_date}`
        : `Realisasi otomatis (fingerprint). Pulang ${departure.scan_date}`,
    })

    if (notify) {
      try {
        await sendNotificationToRoles(
          ["HR", "MANAGER"],
          "Realisasi Lembur Otomatis Siap Disetujui",
          `${spl.requester.name || "Pemohon"} — realisasi lembur terisi otomatis dari fingerprint (${realization.actualTotalHours} jam).`,
          { splId: spl.id, click_action: "/dashboard/hr/persetujuan" }
        )
      } catch {
        /* notification failure must not break finalization */
      }
    }

    return {
      splId: spl.id,
      status: "finalized",
      realizedMinutes: realization.realizedMinutes,
      overrun: realization.overrun,
    }
  } catch (error) {
    console.error(`[Fingerprint] finalize error for SPL ${spl.id}:`, error)
    return { splId: spl.id, status: "error", reason: "exception" }
  }
}

const CANDIDATE_SELECT = {
  id: true,
  status: true,
  source: true,
  plannedStartAt: true,
  plannedEndAt: true,
  overrunReason: true,
  requester: { select: { id: true, name: true, pin: true } },
} as const

/**
 * Finalize realization for all AUTO-mode SPLs that are approved-by-supervisor
 * (PENDING_MANAGER), not yet realized, and whose overtime has started.
 * Safe to run repeatedly (idempotent) — this is the poller entry point.
 */
export async function runFingerprintFinalize(options?: {
  notify?: boolean
  now?: Date
}): Promise<{ enabled: boolean; processed: number; outcomes: FinalizeOutcome[] }> {
  const flags = await getOvertimeFlagsWithSettings(prisma)
  if (!flags.auto) {
    return { enabled: false, processed: 0, outcomes: [] }
  }

  const now = options?.now ?? new Date()
  const notify = options?.notify ?? true

  const candidates = await prisma.spl.findMany({
    where: {
      inputMode: "AUTO",
      status: "PENDING_MANAGER",
      actualEndAt: null,
      source: { not: "LEGACY" },
      plannedStartAt: { not: null, lte: now },
    },
    select: CANDIDATE_SELECT,
    orderBy: { plannedStartAt: "asc" },
    take: 200,
  })

  const outcomes: FinalizeOutcome[] = []
  for (const spl of candidates) {
    outcomes.push(await finalizeOne(spl, now, notify))
  }
  return { enabled: true, processed: outcomes.length, outcomes }
}

/** Finalize a single SPL by id (manual trigger / fallback). Returns the outcome. */
export async function finalizeSplById(
  splId: string,
  options?: { notify?: boolean; now?: Date }
): Promise<FinalizeOutcome> {
  const spl = await prisma.spl.findUnique({
    where: { id: splId },
    select: CANDIDATE_SELECT,
  })
  if (!spl) return { splId, status: "error", reason: "not_found" }
  if (spl.status !== "PENDING_MANAGER") {
    return { splId, status: "skipped", reason: `status_${spl.status}` }
  }
  return finalizeOne(spl, options?.now ?? new Date(), options?.notify ?? true)
}
