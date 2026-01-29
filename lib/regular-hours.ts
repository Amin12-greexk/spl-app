const OVERRIDE_PREFIX = "REGULAR_HOURS_OVERRIDE";

export interface RegularHoursOverrideValue {
  startTime: string;
  endTime: string;
}

export const SATURDAY_DAY = 6;

export function makeRegularOverrideKey(userId: string, dayOfWeek: number) {
  return `${OVERRIDE_PREFIX}:${userId}:${dayOfWeek}`;
}

export function parseRegularOverrideKey(key: string) {
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  if (parts[0] !== OVERRIDE_PREFIX) return null;
  const dayOfWeek = Number(parts[2]);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return null;
  }
  return { userId: parts[1], dayOfWeek };
}

export function parseRegularOverrideValue(
  value: string | null | undefined
): RegularHoursOverrideValue | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    const startTime =
      typeof parsed?.startTime === "string" ? parsed.startTime.trim() : "";
    const endTime =
      typeof parsed?.endTime === "string" ? parsed.endTime.trim() : "";
    if (!startTime || !endTime) return null;
    return { startTime, endTime };
  } catch {
    return null;
  }
}

export function serializeRegularOverrideValue(value: RegularHoursOverrideValue) {
  return JSON.stringify(value);
}

export function windowsOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
) {
  return a.start < b.end && b.start < a.end;
}

