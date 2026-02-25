import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "MANAGER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const now = new Date()

        // ── 1. Tren Bulanan (12 bulan terakhir) ──────────────────────────────────
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        const monthlySplRaw = await prisma.spl.groupBy({
            by: ["date"],
            where: { date: { gte: twelveMonthsAgo } },
            _count: { id: true },
        })

        // Aggregate by YYYY-MM
        const monthlyMap = new Map<string, number>()
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
            monthlyMap.set(key, 0)
        }
        for (const row of monthlySplRaw) {
            const d = new Date(row.date)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
            if (monthlyMap.has(key)) {
                monthlyMap.set(key, (monthlyMap.get(key) || 0) + row._count.id)
            }
        }

        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
            "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
        ]
        const monthlyTrend = Array.from(monthlyMap.entries()).map(([key, count]) => {
            const [y, m] = key.split("-")
            return { month: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`, count }
        })

        // ── 2. Distribusi Status ─────────────────────────────────────────────────
        const statusGroups = await prisma.spl.groupBy({
            by: ["status"],
            _count: { id: true },
        })

        const pendingGaStatuses = ["PENDING_SUPERVISOR"]
        const pendingManagerStatuses = ["PENDING_MANAGER", "IN_PROGRESS", "DONE"]
        const rejectedStatuses = ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"]

        let pendingGaCount = 0
        let pendingManagerCount = 0
        let approvedCount = 0
        let rejectedCount = 0
        for (const g of statusGroups) {
            if (g.status === "APPROVED") approvedCount += g._count.id
            else if (pendingGaStatuses.includes(g.status)) pendingGaCount += g._count.id
            else if (pendingManagerStatuses.includes(g.status)) pendingManagerCount += g._count.id
            else if (rejectedStatuses.includes(g.status)) rejectedCount += g._count.id
        }

        const statusDistribution = [
            { name: "Menunggu GA", value: pendingGaCount, color: "#f59e0b" },
            { name: "Menunggu Manager", value: pendingManagerCount, color: "#f97316" },
            { name: "Disetujui", value: approvedCount, color: "#22c55e" },
            { name: "Ditolak", value: rejectedCount, color: "#ef4444" },
        ]

        // ── 3. Top 5 Departemen ──────────────────────────────────────────────────
        const deptSplRaw = await prisma.spl.findMany({
            select: {
                requester: {
                    select: {
                        department: { select: { name: true } },
                        departmentName: true,
                    },
                },
            },
        })

        const deptMap = new Map<string, number>()
        for (const row of deptSplRaw) {
            const dept =
                row.requester?.department?.name ||
                row.requester?.departmentName ||
                "Tidak Diketahui"
            deptMap.set(dept, (deptMap.get(dept) || 0) + 1)
        }

        const topDepartments = Array.from(deptMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))

        // ── 4. Jam Lembur per Hari (7 hari terakhir) ─────────────────────────────
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const dailySplRaw = await prisma.spl.findMany({
            where: { date: { gte: sevenDaysAgo } },
            select: { date: true, totalHours: true },
        })

        const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
        const dailyMap = new Map<string, { hours: number; label: string }>()
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo)
            d.setDate(d.getDate() + i)
            const key = d.toISOString().slice(0, 10)
            dailyMap.set(key, {
                hours: 0,
                label: `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
            })
        }

        for (const row of dailySplRaw) {
            const key = new Date(row.date).toISOString().slice(0, 10)
            if (dailyMap.has(key)) {
                const entry = dailyMap.get(key)!
                entry.hours = parseFloat((entry.hours + row.totalHours).toFixed(1))
            }
        }

        const dailyOvertime = Array.from(dailyMap.values()).map((v) => ({
            day: v.label,
            hours: v.hours,
        }))

        // ── 5. Summary Cards ─────────────────────────────────────────────────────
        const totalSpl = await prisma.spl.count()
        const totalEmployees = await prisma.spl.findMany({
            select: { requesterId: true },
            distinct: ["requesterId"],
        })
        const avgHoursRaw = await prisma.spl.aggregate({
            _avg: { totalHours: true },
        })

        return NextResponse.json({
            monthlyTrend,
            statusDistribution,
            topDepartments,
            dailyOvertime,
            summary: {
                totalSpl,
                totalEmployees: totalEmployees.length,
                avgHours: parseFloat((avgHoursRaw._avg.totalHours || 0).toFixed(1)),
                pendingSpl: pendingGaCount + pendingManagerCount,
            },
        })
    } catch (error) {
        console.error("Error fetching analytics:", error)
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
