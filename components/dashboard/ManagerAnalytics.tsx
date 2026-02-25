"use client"

import { useEffect, useState } from "react"
import {
    AreaChart, Area,
    PieChart, Pie, Cell,
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

interface AnalyticsData {
    monthlyTrend: { month: string; count: number }[]
    statusDistribution: { name: string; value: number; color: string }[]
    topDepartments: { name: string; count: number }[]
    dailyOvertime: { day: string; hours: number }[]
    summary: {
        totalSpl: number
        totalEmployees: number
        avgHours: number
        pendingSpl: number
    }
}

const DEPT_COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6"]

export default function ManagerAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/spl/analytics")
            .then((r) => r.json())
            .then((d) => setData(d))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-80 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
                        <div className="h-full bg-gray-100 rounded-xl" />
                    </div>
                ))}
            </div>
        )
    }

    if (!data) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center text-gray-500">
                Gagal memuat data analytics.
            </div>
        )
    }

    const { monthlyTrend, statusDistribution, topDepartments, dailyOvertime, summary } = data
    const statusTotal = statusDistribution.reduce((s, d) => s + d.value, 0)

    return (
        <div className="space-y-6">
            {/* ── Summary Cards ────────────────────────────────────────────── */}
            <div id="manager-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard icon="📊" label="Total SPL" value={summary.totalSpl} accent="purple" />
                <SummaryCard icon="👥" label="Karyawan Lembur" value={summary.totalEmployees} accent="blue" />
                <SummaryCard icon="⏱️" label="Rata-rata Jam" value={`${summary.avgHours} jam`} accent="green" />
                <SummaryCard icon="⏳" label="SPL Pending" value={summary.pendingSpl} accent="amber" />
            </div>

            {/* ── Charts Grid ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Tren SPL Bulanan */}
                <div id="manager-trend">
                    <ChartCard title="Tren SPL Bulanan" subtitle="12 bulan terakhir">
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                    labelStyle={{ fontWeight: 600, color: "#111827" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    name="Jumlah SPL"
                                    stroke="#8b5cf6"
                                    strokeWidth={2.5}
                                    fill="url(#areaGrad)"
                                    dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* 2. Distribusi Status */}
                <div id="manager-status">
                    <ChartCard title="Distribusi Status" subtitle="Seluruh periode">
                        <div className="flex items-center justify-center gap-6">
                            <ResponsiveContainer width={200} height={200}>
                                <PieChart>
                                    <Pie
                                        data={statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {statusDistribution.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                        formatter={(value: any) => [`${value} SPL`, ""]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="space-y-3">
                                {statusDistribution.map((item) => (
                                    <div key={item.name} className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                        <div>
                                            <div className="text-sm font-medium text-gray-700">{item.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {item.value} ({statusTotal > 0 ? Math.round((item.value / statusTotal) * 100) : 0}%)
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ChartCard>
                </div>

                {/* 3. Top 5 Departemen */}
                <div id="manager-dept">
                    <ChartCard title="Top 5 Departemen" subtitle="Jumlah SPL terbanyak">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={topDepartments} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: "#374151" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                    formatter={(value: any) => [`${value} SPL`, "Jumlah"]}
                                />
                                <Bar dataKey="count" name="Jumlah SPL" radius={[0, 6, 6, 0]} barSize={24}>
                                    {topDepartments.map((_, idx) => (
                                        <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* 4. Jam Lembur Harian */}
                <div id="manager-daily">
                    <ChartCard title="Jam Lembur Harian" subtitle="7 hari terakhir">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={dailyOvertime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22c55e" />
                                        <stop offset="100%" stopColor="#16a34a" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                    formatter={(value: any) => [`${value} jam`, "Total Lembur"]}
                                    labelStyle={{ fontWeight: 600, color: "#111827" }}
                                />
                                <Bar dataKey="hours" name="Jam Lembur" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        </div>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
    icon,
    label,
    value,
    accent,
}: {
    icon: string
    label: string
    value: string | number
    accent: "purple" | "blue" | "green" | "amber"
}) {
    const accentColors = {
        purple: { bg: "bg-purple-50", ring: "ring-purple-100", icon: "bg-purple-100", text: "text-purple-700" },
        blue: { bg: "bg-blue-50", ring: "ring-blue-100", icon: "bg-blue-100", text: "text-blue-700" },
        green: { bg: "bg-green-50", ring: "ring-green-100", icon: "bg-green-100", text: "text-green-700" },
        amber: { bg: "bg-amber-50", ring: "ring-amber-100", icon: "bg-amber-100", text: "text-amber-700" },
    }
    const c = accentColors[accent]

    return (
        <div className={`${c.bg} rounded-2xl p-5 ring-1 ${c.ring} transition-all hover:shadow-md`}>
            <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center mb-3`}>
                <span className="text-lg">{icon}</span>
            </div>
            <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        </div>
    )
}

function ChartCard({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle: string
    children: React.ReactNode
}) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
            {children}
        </div>
    )
}
