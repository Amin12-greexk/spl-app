import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, makeWindow } from "@/lib/spl-time"
import { recordSplAudit } from "@/lib/spl-audit"

// Batas maksimal hari tanpa input realisasi sebelum auto-fill
const MAX_DAYS_WITHOUT_REALIZATION = 3

export async function GET(req: NextRequest) {
    // Keamanan: hanya Vercel Cron atau request dengan CRON_SECRET yang bisa memanggil
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    try {
        const now = new Date()
        // Cari batas waktu: 3 hari yang lalu
        const deadlineDate = new Date(now)
        deadlineDate.setDate(deadlineDate.getDate() - MAX_DAYS_WITHOUT_REALIZATION)

        // Cari semua SPL PENDING_MANAGER yang belum ada realisasi
        // dan tanggal lembur sudah lebih dari 3 hari yang lalu
        const overdueSpls = await prisma.spl.findMany({
            where: {
                status: "PENDING_MANAGER",
                actualEndAt: null,
                // Tanggal lembur lebih dari 3 hari yang lalu
                OR: [
                    // Jika ada plannedEndAt, gunakan itu
                    {
                        plannedEndAt: {
                            not: null,
                            lt: deadlineDate,
                        },
                    },
                    // Jika tidak ada plannedEndAt, gunakan tanggal lembur (date)
                    {
                        plannedEndAt: null,
                        date: {
                            lt: deadlineDate,
                        },
                    },
                ],
            },
            select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                totalHours: true,
                plannedStartAt: true,
                plannedEndAt: true,
                requester: {
                    select: { name: true },
                },
            },
        })

        if (overdueSpls.length === 0) {
            return NextResponse.json({
                message: "Tidak ada SPL yang perlu auto-fill",
                filled: 0,
            })
        }

        let filled = 0
        const filledIds: string[] = []
        const updateOps = []
        const validSpls = []

        for (const spl of overdueSpls) {
            let actualStartAt: Date
            let actualEndAt: Date

            if (spl.plannedStartAt && spl.plannedEndAt) {
                actualStartAt = new Date(spl.plannedStartAt)
                actualEndAt = new Date(spl.plannedEndAt)
            } else {
                const baseDay = startOfDay(new Date(spl.date))
                const window = makeWindow(baseDay, spl.startTime, spl.endTime)
                if (!window) continue
                actualStartAt = window.start
                actualEndAt = window.end
            }

            const durationMinutes = Math.round(
                (actualEndAt.getTime() - actualStartAt.getTime()) / 60000
            )
            const actualTotalHours = durationMinutes / 60

            updateOps.push(
                prisma.spl.update({
                    where: { id: spl.id },
                    data: {
                        actualStartAt,
                        actualEndAt,
                        actualTotalHours,
                        plannedStartAt: spl.plannedStartAt ?? actualStartAt,
                        plannedEndAt: spl.plannedEndAt ?? actualEndAt,
                    },
                })
            )
            validSpls.push(spl)
        }

        if (updateOps.length > 0) {
            try {
                await prisma.$transaction(updateOps)
                for (const spl of validSpls) {
                    await recordSplAudit({
                        splId: spl.id,
                        action: "REALIZATION_AUTOFILL",
                        actorId: null,
                        oldStatus: "PENDING_MANAGER",
                        newStatus: "PENDING_MANAGER",
                        source: "SYSTEM_CRON",
                        note: `Auto-fill realisasi dari rencana (>${MAX_DAYS_WITHOUT_REALIZATION} hari tanpa realisasi)`,
                    })
                    filled++
                    filledIds.push(spl.id)
                }
            } catch (err) {
                console.error(`[AutoFill] Gagal melakukan batch update SPL:`, err)
            }
        }

        console.log(
            `[AutoFill Realization] ${filled} SPL berhasil di-fill dari ${overdueSpls.length} kandidat`
        )

        return NextResponse.json({
            message: `Auto-fill selesai: ${filled} SPL berhasil diisi dengan jam yang diajukan`,
            filled,
            total: overdueSpls.length,
            filledIds,
        })
    } catch (error) {
        console.error("[AutoFill Realization] Error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan saat auto-fill realisasi" },
            { status: 500 }
        )
    }
}
