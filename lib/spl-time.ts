export const SECURITY_SHIFT_DEFINITIONS = {
  P1: { start: "07:00", end: "15:00" },
  P2: { start: "11:00", end: "19:00" },
  M1: { start: "16:00", end: "04:00" },
  M2: { start: "23:00", end: "07:00" },
  F1: { start: "08:00", end: "16:30" },
} as const

export const SECURITY_OFF_SHIFT_CODE = "OFF" as const
export const SECURITY_FINA_SHIFT_CODE = "F1" as const

export type SecurityWorkShiftCode = keyof typeof SECURITY_SHIFT_DEFINITIONS
export type SecurityShiftCode = SecurityWorkShiftCode | typeof SECURITY_OFF_SHIFT_CODE

export const isSecurityOffShift = (value?: string | null) =>
  value?.trim().toUpperCase() === SECURITY_OFF_SHIFT_CODE

export const isSecurityWorkShiftCode = (
  value?: string | null
): value is SecurityWorkShiftCode => {
  const normalized = value?.trim().toUpperCase()
  return Boolean(
    normalized &&
      Object.prototype.hasOwnProperty.call(SECURITY_SHIFT_DEFINITIONS, normalized)
  )
}

export const isValidSecurityShiftCode = (value?: string | null) =>
  isSecurityOffShift(value) || isSecurityWorkShiftCode(value)

const JAKARTA_OFFSET_MINUTES = 7 * 60
export const JAKARTA_TIME_ZONE = "Asia/Jakarta"

const getJakartaParts = (value: Date) => {
  const adjusted = new Date(value.getTime() + JAKARTA_OFFSET_MINUTES * 60000)
  return {
    year: adjusted.getUTCFullYear(),
    month: adjusted.getUTCMonth() + 1,
    day: adjusted.getUTCDate(),
    hour: adjusted.getUTCHours(),
    minute: adjusted.getUTCMinutes(),
    second: adjusted.getUTCSeconds(),
  }
}

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

export const parseTimeToMinutes = (value: string) => {
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

export const parseDateOnly = (value: string) => {
  if (typeof value !== "string") return null
  const datePart = value.split("T")[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null
  const [year, month, day] = datePart.split("-").map(Number)
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }
  return makeJakartaDate(year, month, day, 0, 0, 0)
}

export const startOfDay = (value: Date) => {
  const parts = getJakartaParts(value)
  return makeJakartaDate(parts.year, parts.month, parts.day, 0, 0, 0)
}

export const addDays = (value: Date, days: number) => {
  const parts = getJakartaParts(value)
  return makeJakartaDate(
    parts.year,
    parts.month,
    parts.day + days,
    parts.hour,
    parts.minute,
    parts.second
  )
}

export const setTimeOnDate = (baseDate: Date, timeValue: string) => {
  const minutes = parseTimeToMinutes(timeValue)
  if (minutes === null) return null
  const parts = getJakartaParts(baseDate)
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return makeJakartaDate(parts.year, parts.month, parts.day, hour, minute, 0)
}

export const makeWindow = (baseDay: Date, startTime: string, endTime: string) => {
  const start = setTimeOnDate(baseDay, startTime)
  const endBase = setTimeOnDate(baseDay, endTime)
  if (!start || !endBase) return null
  let end = endBase
  if (end <= start) {
    end = addDays(end, 1)
  }
  return { start, end }
}

export const makeWindowWithOffset = (
  baseDay: Date,
  startTime: string,
  endTime: string,
  endDayOffset = 0
) => {
  const start = setTimeOnDate(baseDay, startTime)
  const endBase = setTimeOnDate(baseDay, endTime)
  if (!start || !endBase) return null
  let end = endBase
  if (endDayOffset > 0) {
    end = addDays(end, endDayOffset)
  } else if (end <= start) {
    end = addDays(end, 1)
  }
  return { start, end }
}

export const buildOvertimeWindowFromTimes = (
  regularEndAt: Date,
  startTime: string,
  endTime: string
) => {
  const anchorDay = startOfDay(regularEndAt)
  return makeWindow(anchorDay, startTime, endTime)
}

export const getJakartaTimeMinutes = (value: Date = new Date()) => {
  const parts = getJakartaParts(value)
  return parts.hour * 60 + parts.minute
}

/** Format a Date as "HH:MM" in Asia/Jakarta. */
export const formatJakartaHHMM = (value: Date) => {
  const parts = getJakartaParts(value)
  const hh = String(parts.hour).padStart(2, "0")
  const mm = String(parts.minute).padStart(2, "0")
  return `${hh}:${mm}`
}

/**
 * Parse an attendance scan timestamp expressed as Asia/Jakarta wall-clock,
 * e.g. "2026-06-18 17:42:10" or "2026-06-18T17:42:10". Returns a Date (UTC-correct), or null.
 */
export const parseJakartaDateTime = (value: string): Date | null => {
  if (typeof value !== "string") return null
  const normalized = value.trim().replace("T", " ")
  const [datePart, timePart = "00:00:00"] = normalized.split(/\s+/)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null
  const [y, mo, d] = datePart.split("-").map(Number)
  const [hStr = "0", mStr = "0", sStr = "0"] = timePart.split(":")
  const h = Number(hStr)
  const mi = Number(mStr)
  const s = Number(sStr)
  if (
    [y, mo, d, h, mi, s].some((n) => Number.isNaN(n)) ||
    mo < 1 || mo > 12 || d < 1 || d > 31 ||
    h < 0 || h > 23 || mi < 0 || mi > 59 || s < 0 || s > 59
  ) {
    return null
  }
  return makeJakartaDate(y, mo, d, h, mi, s)
}

export const getJakartaDayOfWeek = (value: Date) => {
  const parts = getJakartaParts(value)
  // Use noon UTC to avoid any timezone edge cases when computing weekday.
  const noonUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0))
  return noonUtc.getUTCDay()
}

export const getMinutesDiff = (start: Date, end: Date) => {
  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / 60000)
}

export const clampRealizationMinutes = (
  plannedStart: Date,
  plannedEnd: Date,
  actualStart: Date,
  actualEnd: Date
) => {
  const realizedStart = actualStart < plannedStart ? plannedStart : actualStart
  const realizedEnd = actualEnd > plannedEnd ? plannedEnd : actualEnd
  if (realizedEnd <= realizedStart) return 0
  return getMinutesDiff(realizedStart, realizedEnd)
}
