import {
  addDays,
  getJakartaDayOfWeek,
  parseDateOnly,
  SECURITY_FINA_SHIFT_CODE,
  SECURITY_OFF_SHIFT_CODE,
  SecurityShiftCode,
} from "@/lib/spl-time"

export interface SecurityScheduleUser {
  id: string
  name: string
  email: string
  role: string
  departmentName: string | null
  department: { name: string } | null
}

export interface HolidayItem {
  date: string
  name: string
}

export interface GeneratedScheduleDay {
  date: Date
  dateKey: string
  dayOfWeek: number
  dayName: string
  dayNumber: number
  shiftCode: SecurityShiftCode
  isHoliday: boolean
  holidayName: string | null
  isSunday: boolean
  isWeekend: boolean
}

export interface GeneratedScheduleUser {
  id: string
  name: string
  email: string
  type: "ROTATION" | "FIXED"
  anchorShift: SecurityShiftCode | null
  days: GeneratedScheduleDay[]
}

const ANCHOR_DATE_KEY = "2026-01-01"
const ROTATION_CYCLE: SecurityShiftCode[] = [
  "P1",
  "P2",
  "M1",
  "M2",
  SECURITY_OFF_SHIFT_CODE,
]

const ROTATION_RULES: Array<{
  aliases: string[]
  anchorShift: SecurityShiftCode
}> = [
  { aliases: ["TEGUH"], anchorShift: SECURITY_OFF_SHIFT_CODE },
  { aliases: ["WAHYU"], anchorShift: "P2" },
  { aliases: ["JOKO"], anchorShift: "P1" },
  { aliases: ["BIBIT"], anchorShift: "M1" },
  { aliases: ["DAVID", "DAFID"], anchorShift: "M2" },
]

const FIXED_FINA_WEEKDAY_RULES = [{ aliases: ["FINA"] }]

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
]

const normalizeName = (value: string) => value.trim().toUpperCase()

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor

export const formatJakartaDateKey = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)

  const partMap = new Map(parts.map((part) => [part.type, part.value]))
  return `${partMap.get("year")}-${partMap.get("month")}-${partMap.get("day")}`
}

export const getMonthDays = (year: number, month: number) => {
  const firstDate = parseDateOnly(
    `${year}-${String(month).padStart(2, "0")}-01`
  )
  if (!firstDate) return []

  const days: Date[] = []
  let cursor = firstDate

  while (formatJakartaDateKey(cursor).startsWith(`${year}-${String(month).padStart(2, "0")}`)) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return days
}

const findUserByAliases = (
  users: SecurityScheduleUser[],
  aliases: string[],
  usedUserIds: Set<string>
) => {
  return users.find((user) => {
    if (usedUserIds.has(user.id)) return false
    const name = normalizeName(user.name)
    return aliases.some((alias) => name.includes(normalizeName(alias)))
  })
}

const buildDayPayload = (
  date: Date,
  shiftCode: SecurityShiftCode,
  holidaysByDate: Map<string, string>
): GeneratedScheduleDay => {
  const dateKey = formatJakartaDateKey(date)
  const dayOfWeek = getJakartaDayOfWeek(date)

  return {
    date,
    dateKey,
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek],
    dayNumber: Number(dateKey.slice(-2)),
    shiftCode,
    isHoliday: holidaysByDate.has(dateKey),
    holidayName: holidaysByDate.get(dateKey) || null,
    isSunday: dayOfWeek === 0,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  }
}

export const buildSecuritySchedule = (
  users: SecurityScheduleUser[],
  year: number,
  month: number,
  holidays: HolidayItem[]
) => {
  const dates = getMonthDays(year, month)
  const anchorDate = parseDateOnly(ANCHOR_DATE_KEY)
  const holidaysByDate = new Map(holidays.map((holiday) => [holiday.date, holiday.name]))
  const usedUserIds = new Set<string>()
  const missingRules: string[] = []
  const generatedUsers: GeneratedScheduleUser[] = []

  if (!anchorDate) {
    throw new Error("Anchor jadwal security tidak valid")
  }

  for (const rule of ROTATION_RULES) {
    const user = findUserByAliases(users, rule.aliases, usedUserIds)
    if (!user) {
      missingRules.push(rule.aliases.join("/"))
      continue
    }

    usedUserIds.add(user.id)
    const anchorIndex = ROTATION_CYCLE.indexOf(rule.anchorShift)

    generatedUsers.push({
      id: user.id,
      name: user.name,
      email: user.email,
      type: "ROTATION",
      anchorShift: rule.anchorShift,
      days: dates.map((date) => {
        const diffDays = Math.floor(
          (date.getTime() - anchorDate.getTime()) / 86400000
        )
        const cycleIndex = positiveModulo(anchorIndex + diffDays, ROTATION_CYCLE.length)
        return buildDayPayload(date, ROTATION_CYCLE[cycleIndex], holidaysByDate)
      }),
    })
  }

  for (const rule of FIXED_FINA_WEEKDAY_RULES) {
    const user = findUserByAliases(users, rule.aliases, usedUserIds)
    if (!user) {
      missingRules.push(rule.aliases.join("/"))
      continue
    }

    usedUserIds.add(user.id)

    generatedUsers.push({
      id: user.id,
      name: user.name,
      email: user.email,
      type: "FIXED",
      anchorShift: SECURITY_FINA_SHIFT_CODE,
      days: dates.map((date) => {
        const dayOfWeek = getJakartaDayOfWeek(date)
        const shiftCode =
          dayOfWeek === 0 || dayOfWeek === 6
            ? SECURITY_OFF_SHIFT_CODE
            : SECURITY_FINA_SHIFT_CODE
        return buildDayPayload(date, shiftCode, holidaysByDate)
      }),
    })
  }

  return {
    anchorDate: ANCHOR_DATE_KEY,
    cycle: ROTATION_CYCLE,
    dates: dates.map((date) => buildDayPayload(date, "P1", holidaysByDate)),
    users: generatedUsers,
    unassignedUsers: users.filter((user) => !usedUserIds.has(user.id)),
    missingRules,
  }
}

export const serializeGeneratedSchedule = (
  schedule: ReturnType<typeof buildSecuritySchedule>
) => ({
  ...schedule,
  users: schedule.users.map((user) => ({
    ...user,
    days: user.days.map((day) => ({
      ...day,
      date: day.date.toISOString(),
    })),
  })),
  dates: schedule.dates.map((day) => ({
    ...day,
    date: day.date.toISOString(),
  })),
})
