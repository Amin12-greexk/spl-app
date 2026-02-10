import { makeWindow, startOfDay } from "@/lib/spl-time"

export interface SplMorningInput {
  date: Date | string
  startTime: string
  endTime: string
  plannedStartAt?: Date | string | null
  plannedEndAt?: Date | string | null
  regularStartAt?: Date | string | null
}

const toDate = (value?: Date | string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const resolvePlannedWindow = (spl: SplMorningInput) => {
  const plannedStart = toDate(spl.plannedStartAt)
  const plannedEnd = toDate(spl.plannedEndAt)
  if (plannedStart && plannedEnd && plannedEnd > plannedStart) {
    return { plannedStart, plannedEnd }
  }

  const baseDate = toDate(spl.date)
  if (!baseDate) return null
  const baseDay = startOfDay(baseDate)
  const fallbackWindow = makeWindow(baseDay, spl.startTime, spl.endTime)
  if (!fallbackWindow) return null
  return { plannedStart: fallbackWindow.start, plannedEnd: fallbackWindow.end }
}

export const isMorningOvertime = (spl: SplMorningInput) => {
  const plannedWindow = resolvePlannedWindow(spl)
  if (!plannedWindow) return false
  const regularStart = toDate(spl.regularStartAt)
  if (!regularStart) return false
  return plannedWindow.plannedEnd <= regularStart
}
