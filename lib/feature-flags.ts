import type { PrismaClient } from "@prisma/client"

/**
 * Feature flags for the dual-mode (Auto + Manual) overtime transition.
 *
 * Safe defaults:
 * - AUTO overtime is OFF by default → behaviour is unchanged until explicitly enabled.
 * - MANUAL overtime is ON by default → the manual fallback is always available.
 *
 * Source of truth (in order of precedence when using the *WithSettings helpers):
 *   1. `Setting` row in DB (runtime toggle, no redeploy) — key ENABLE_AUTO_OVERTIME / ENABLE_MANUAL_OVERTIME
 *   2. process.env.ENABLE_AUTO_OVERTIME / ENABLE_MANUAL_OVERTIME
 *   3. hard default above
 */

const truthy = (value: string | null | undefined): boolean => {
  if (value == null) return false
  const v = value.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

const explicitlySet = (value: string | null | undefined): boolean =>
  value != null && value.trim() !== ""

export interface OvertimeFlags {
  auto: boolean
  manual: boolean
}

/** Env-only flags (synchronous). Use on the server where DB lookup is undesirable. */
export function getOvertimeFlags(): OvertimeFlags {
  const autoEnv = process.env.ENABLE_AUTO_OVERTIME
  const manualEnv = process.env.ENABLE_MANUAL_OVERTIME
  return {
    auto: explicitlySet(autoEnv) ? truthy(autoEnv) : true,
    manual: explicitlySet(manualEnv) ? truthy(manualEnv) : true,
  }
}

export function isAutoOvertimeEnabled(): boolean {
  return getOvertimeFlags().auto
}

export function isManualOvertimeEnabled(): boolean {
  return getOvertimeFlags().manual
}

/**
 * Flags overlaid with DB `Setting` rows so they can be toggled at runtime during the
 * trial period without a redeploy. Falls back to env/defaults on any error.
 */
export async function getOvertimeFlagsWithSettings(
  prisma: PrismaClient
): Promise<OvertimeFlags> {
  const base = getOvertimeFlags()
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ["ENABLE_AUTO_OVERTIME", "ENABLE_MANUAL_OVERTIME"] } },
      select: { key: true, value: true },
    })
    const map = new Map(rows.map((r) => [r.key, r.value]))
    const autoVal = map.get("ENABLE_AUTO_OVERTIME")
    const manualVal = map.get("ENABLE_MANUAL_OVERTIME")
    return {
      auto: explicitlySet(autoVal) ? truthy(autoVal) : base.auto,
      manual: explicitlySet(manualVal) ? truthy(manualVal) : base.manual,
    }
  } catch {
    return base
  }
}

/** Default minutes added to regularEndTime when the user provides no estimated finish (Auto mode). */
export const AUTO_DEFAULT_OVERTIME_MINUTES = 120
