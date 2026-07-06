import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { finalizeSplById } from "@/lib/fingerprint"
import { getOvertimeFlagsWithSettings } from "@/lib/feature-flags"

/**
 * POST /api/spl/[id]/realization/auto
 * Trigger fingerprint-based realization for one SPL (manual trigger / "Tarik Realisasi" button).
 * Allowed: the requester (owner) or HR/MANAGER/SUPER_ADMIN.
 * Idempotent — if realization already exists it returns a skipped outcome.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const flags = await getOvertimeFlagsWithSettings(prisma)
    if (!flags.auto) {
      return NextResponse.json(
        { error: "Mode lembur otomatis belum diaktifkan." },
        { status: 400 }
      )
    }

    const spl = await prisma.spl.findUnique({
      where: { id: params.id },
      select: { id: true, requesterId: true, inputMode: true },
    })
    if (!spl) {
      return NextResponse.json({ error: "SPL tidak ditemukan" }, { status: 404 })
    }

    const role = session.user.role
    const isPrivileged = ["HR", "MANAGER", "SUPER_ADMIN"].includes(role)
    if (spl.requesterId !== session.user.id && !isPrivileged) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (spl.inputMode !== "AUTO") {
      return NextResponse.json(
        { error: "SPL ini bukan mode otomatis. Gunakan input realisasi manual." },
        { status: 400 }
      )
    }

    const outcome = await finalizeSplById(params.id, { notify: true })

    if (outcome.status === "finalized") {
      return NextResponse.json({
        message: "Realisasi otomatis berhasil diisi dari fingerprint.",
        outcome,
      })
    }
    if (outcome.status === "no_scan") {
      return NextResponse.json(
        {
          error:
            "Data fingerprint belum tersedia. Coba lagi nanti atau gunakan input manual.",
          outcome,
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Realisasi otomatis tidak dapat diproses.", outcome },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error auto realization:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
