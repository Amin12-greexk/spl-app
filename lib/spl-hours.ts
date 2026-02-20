import { parseTimeToMinutes } from "@/lib/spl-time";

const MINUTES_PER_DAY = 24 * 60;

export interface SplHoursInput {
  startTime: string;
  endTime: string;
  totalHours: number;
  actualStartAt?: string | Date | null;
  actualEndAt?: string | Date | null;
  plannedStartAt?: string | Date | null;
  plannedEndAt?: string | Date | null;
  realizedMinutes?: number | null;
  actualTotalHours?: number | null;
  realizationCounted?: boolean | null;
}

function diffMinutes(start: number, end: number) {
  const diff = end - start;
  return diff >= 0 ? diff : diff + MINUTES_PER_DAY;
}

export function getRealizationMinutes(spl: SplHoursInput): number | null {
  if (spl.actualStartAt && spl.actualEndAt) {
    const start = new Date(spl.actualStartAt);
    const end = new Date(spl.actualEndAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
      if (Number.isFinite(minutes)) {
        return minutes >= 0 ? minutes : minutes + MINUTES_PER_DAY;
      }
    }
  }

  const realizationCounted = spl.realizationCounted === true;
  const realizedMinutes = Number(spl.realizedMinutes);
  if (
    Number.isFinite(realizedMinutes) &&
    (realizationCounted || realizedMinutes > 0)
  ) {
    return realizedMinutes;
  }

  const realizedHours = Number(spl.actualTotalHours);
  if (Number.isFinite(realizedHours) && (realizationCounted || realizedHours > 0)) {
    return Math.round(realizedHours * 60);
  }

  return null;
}

export function getPlannedMinutes(spl: SplHoursInput): number | null {
  if (spl.plannedStartAt && spl.plannedEndAt) {
    const start = new Date(spl.plannedStartAt);
    const end = new Date(spl.plannedEndAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
      if (Number.isFinite(minutes) && minutes >= 0) {
        return minutes;
      }
    }
  }

  const startMinutes = parseTimeToMinutes(spl.startTime);
  const endMinutes = parseTimeToMinutes(spl.endTime);
  if (startMinutes === null || endMinutes === null) {
    return null;
  }
  return diffMinutes(startMinutes, endMinutes);
}

export function getEffectiveMinutes(spl: SplHoursInput): number | null {
  const realizationMinutes = getRealizationMinutes(spl);
  if (realizationMinutes !== null) {
    return realizationMinutes;
  }

  const plannedMinutes = getPlannedMinutes(spl);
  if (plannedMinutes !== null) {
    return plannedMinutes;
  }

  const fallbackHours = Number(spl.totalHours);
  if (!Number.isFinite(fallbackHours)) {
    return null;
  }
  return Math.round(fallbackHours * 60);
}

export function getEffectiveHours(spl: SplHoursInput): number | null {
  const minutes = getEffectiveMinutes(spl);
  if (minutes === null) {
    return null;
  }
  return minutes / 60;
}
