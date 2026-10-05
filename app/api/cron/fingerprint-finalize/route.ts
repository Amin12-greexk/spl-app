import { NextRequest, NextResponse } from "next/server"
import { runFingerprintFinalize } from "@/lib/fingerprint"

export const dynamic = "force-dynamic"

/**
 * Poller: finalizes AUTO-mode SPL realization from fingerprint data.
 * Secured by CRON_SECRET (Bearer). Idempotent and safe to run frequently.
 * No-op when ENABLE_AUTO_OVERTIME is off.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await runFingerprintFinalize({ notify: true })
    if (!result.enabled) {
      return NextResponse.json({
        message: "Mode otomatis nonaktif (ENABLE_AUTO_OVERTIME=false)",
        enabled: false,
        finalized: 0,
      })
    }
    const finalized = result.outcomes.filter((o) => o.status === "finalized").length
    return NextResponse.json({
      message: `Fingerprint finalize selesai: ${finalized}/${result.processed} terealisasi`,
      enabled: true,
      processed: result.processed,
      finalized,
      outcomes: result.outcomes,
    })
  } catch (error) {
    console.error("[FingerprintFinalize] Error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat finalisasi fingerprint" },
      { status: 500 }
    )
  }
}
