import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOvertimeFlagsWithSettings, AUTO_DEFAULT_OVERTIME_MINUTES } from "@/lib/feature-flags"

export const dynamic = "force-dynamic"

/**
 * GET /api/settings/overtime-flags
 * Public (any session) — lets the client decide whether to show the Auto/Manual toggle.
 */
export async function GET() {
  try {
    const flags = await getOvertimeFlagsWithSettings(prisma)
    return NextResponse.json({
      auto: flags.auto,
      manual: flags.manual,
      autoDefaultMinutes: AUTO_DEFAULT_OVERTIME_MINUTES,
    })
  } catch (error) {
    console.error("Error reading overtime flags:", error)
    // Safe fallback: manual on, auto off.
    return NextResponse.json({ auto: false, manual: true, autoDefaultMinutes: AUTO_DEFAULT_OVERTIME_MINUTES })
  }
}
