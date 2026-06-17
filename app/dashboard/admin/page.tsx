"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface SummaryData {
  totalUsers: number
  totalDepartments: number
  withoutSupervisor: number
  withoutRegularHours: number
  securityWithoutShiftToday: number
  manualUnsignedSpls: number
}

interface ActionLinkItem {
  id: string
  href: string
  name?: string
  role?: string
  departmentName?: string
  email?: string
  requesterName?: string
  date?: string
  startTime?: string
  endTime?: string
}

interface ActivityItem {
  id: string
  type: string
  title: string
  subtitle: string
  timestamp: string
  href: string
}

interface DashboardData {
  summary: SummaryData
  actionItems: {
    usersWithoutSupervisor: ActionLinkItem[]
    pendingSupervisorSpls: ActionLinkItem[]
    securityWithoutShiftToday: ActionLinkItem[]
    unsignedManualSpls: ActionLinkItem[]
  }
  recentActivity: ActivityItem[]
}

interface PurgeResult {
  totalRows: number
  uniqueTokensChecked: number
  malformedRowsRemoved: number
  invalidRowsRemoved: number
  validRowsKept: number
  durationMs: number
  processedAt: string
}

const quickActions = [
  { title: "Kelola User", href: "/dashboard/admin/users", icon: "US", color: "from-blue-500 to-blue-600" },
  { title: "Mirror Karyawan", href: "/dashboard/admin/employee-mirror", icon: "MR", color: "from-slate-700 to-slate-900" },
  { title: "Kelola Departemen", href: "/dashboard/admin/departments", icon: "DP", color: "from-orange-500 to-orange-600" },
  { title: "Cek Absensi", href: "/dashboard/admin/absensi", icon: "AB", color: "from-slate-700 to-red-700" },
  { title: "Jam Reguler", href: "/dashboard/admin/regular-hours", icon: "JR", color: "from-emerald-500 to-emerald-600" },
  { title: "Shift Security", href: "/dashboard/admin/security-shifts", icon: "SS", color: "from-indigo-500 to-indigo-600" },
  { title: "Input SPL Manual", href: "/dashboard/admin/spl-manual", icon: "SP", color: "from-green-500 to-green-600" },
  { title: "Riwayat SPL", href: "/dashboard/admin/spl-history", icon: "RH", color: "from-purple-500 to-purple-600" },
]

const formatRelativeTime = (value: string) => {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return "-"
  const diffMs = Date.now() - target.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 1) return "Baru saja"
  if (diffMinutes < 60) return `${diffMinutes}m lalu`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}j lalu`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}h lalu`
  return target.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "slate" | "blue" | "amber" | "rose" | "emerald" | "violet"
}) {
  const toneMap = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  }
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] opacity-60">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isPurgingTokens, setIsPurgingTokens] = useState(false)
  const [purgeResult, setPurgeResult] = useState<PurgeResult | null>(null)
  const [purgeError, setPurgeError] = useState("")
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    else if (session?.user?.role && session.user.role !== "SUPER_ADMIN") router.push("/dashboard")
  }, [router, session?.user?.role, status])

  useEffect(() => {
    if (session?.user?.role !== "SUPER_ADMIN") return
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/admin/dashboard-summary", { cache: "no-store" })
        if (!response.ok) throw new Error("Gagal memuat ringkasan admin")
        setDashboardData(await response.json())
      } catch (error) {
        console.error("Error fetching admin dashboard summary:", error)
        setDashboardData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [session?.user?.role])

  if (status === "loading" || loading || session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600" />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-800">
        Dashboard admin gagal dimuat. Coba refresh halaman.
      </div>
    )
  }

  const { summary, actionItems, recentActivity } = dashboardData

  const handlePurgeInvalidTokens = async () => {
    setIsPurgingTokens(true)
    setPurgeError("")
    try {
      const response = await fetch("/api/admin/notifications/purge-invalid", { method: "POST" })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Gagal purge token notifikasi invalid")
      setPurgeResult(data)
    } catch (error) {
      console.error("Error purging invalid notification tokens:", error)
      setPurgeError(error instanceof Error ? error.message : "Gagal purge token notifikasi invalid")
    } finally {
      setIsPurgingTokens(false)
    }
  }

  // --- Tab config ---
  const tabs = [
    {
      label: "Supervisor",
      subtitle: "User belum punya atasan",
      items: actionItems.usersWithoutSupervisor,
      emptyText: "Tidak ada temuan.",
      hoverBg: "hover:bg-amber-50",
    },
    {
      label: "SPL Supervisor",
      subtitle: "Menunggu persetujuan",
      items: actionItems.pendingSupervisorSpls,
      emptyText: "Tidak ada SPL pending supervisor.",
      hoverBg: "hover:bg-amber-50",
    },
    {
      label: "Security",
      subtitle: "Belum punya shift hari ini",
      items: actionItems.securityWithoutShiftToday,
      emptyText: "Semua shift security sudah terisi.",
      hoverBg: "hover:bg-violet-50",
    },
    {
      label: "SPL Manual",
      subtitle: "Menunggu tanda tangan",
      items: actionItems.unsignedManualSpls,
      emptyText: "Tidak ada SPL manual pending.",
      hoverBg: "hover:bg-emerald-50",
    },
  ]

  const currentTab = tabs[activeTab]
  const totalActions = tabs.reduce((sum, t) => sum + t.items.length, 0)

  const renderTabItems = () => {
    if (currentTab.items.length === 0) {
      return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
          <span className="text-green-500">✓</span>
          {currentTab.emptyText}
        </div>
      )
    }

    if (activeTab === 0) {
      return actionItems.usersWithoutSupervisor.map((item) => (
        <Link key={item.id} href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${currentTab.hoverBg}`}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-500">{item.role} · {item.departmentName}</p>
          </div>
          <span className="flex-shrink-0 text-gray-300 text-xl">›</span>
        </Link>
      ))
    }
    if (activeTab === 1) {
      return actionItems.pendingSupervisorSpls.map((item) => (
        <Link key={item.id} href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${currentTab.hoverBg}`}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{item.requesterName}</p>
            <p className="text-xs text-gray-500">
              {item.departmentName} · {new Date(item.date || "").toLocaleDateString("id-ID")} · {item.startTime}–{item.endTime}
            </p>
          </div>
          <span className="flex-shrink-0 text-gray-300 text-xl">›</span>
        </Link>
      ))
    }
    if (activeTab === 2) {
      return actionItems.securityWithoutShiftToday.map((item) => (
        <Link key={item.id} href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${currentTab.hoverBg}`}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-500">{item.email}</p>
          </div>
          <span className="flex-shrink-0 text-gray-300 text-xl">›</span>
        </Link>
      ))
    }
    return actionItems.unsignedManualSpls.map((item) => (
      <Link key={item.id} href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${currentTab.hoverBg}`}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{item.requesterName}</p>
          <p className="text-xs text-gray-500">
            {new Date(item.date || "").toLocaleDateString("id-ID")} · {item.startTime}–{item.endTime}
          </p>
        </div>
        <span className="flex-shrink-0 text-gray-300 text-xl">›</span>
      </Link>
    ))
  }

  const purgeStats = purgeResult
    ? [
        { label: "Total Row", value: purgeResult.totalRows, color: "text-slate-900" },
        { label: "Token Dicek", value: purgeResult.uniqueTokensChecked, color: "text-slate-900" },
        { label: "Malformed", value: purgeResult.malformedRowsRemoved, color: "text-amber-600" },
        { label: "Invalid", value: purgeResult.invalidRowsRemoved, color: "text-rose-600" },
        { label: "Valid Tersisa", value: purgeResult.validRowsKept, color: "text-emerald-600" },
        { label: "Durasi", value: `${(purgeResult.durationMs / 1000).toFixed(2)}s`, color: "text-slate-900" },
      ]
    : []

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-200">
              Super Admin Control Tower
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Dashboard Admin</h1>
            <p className="mt-1.5 text-sm text-red-100">
              Validitas data, kelengkapan setup, dan jalur cepat untuk audit user maupun SPL.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
            <p className="font-semibold">Akses penuh aktif</p>
            <p className="mt-0.5 text-xs text-red-100">Cek data mentah, setup jadwal, dan koreksi cepat.</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <SummaryCard label="User Operasional" value={summary.totalUsers} tone="slate" />
        <SummaryCard label="Departemen" value={summary.totalDepartments} tone="blue" />
        <SummaryCard label="Tanpa Supervisor" value={summary.withoutSupervisor} tone="amber" />
        <SummaryCard label="Tanpa Jam Reguler" value={summary.withoutRegularHours} tone="rose" />
        <SummaryCard label="Security Belum Shift" value={summary.securityWithoutShiftToday} tone="violet" />
        <SummaryCard label="SPL Manual Belum TTD" value={summary.manualUnsignedSpls} tone="emerald" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">

        {/* LEFT: Tabbed action items */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 pt-5 pb-4">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">Perlu Tindakan</h3>
              <span className="text-xs text-gray-400">
                {totalActions === 0 ? "Semua beres" : `${totalActions} item`}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors
                    ${activeTab === i
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                    }`}
                >
                  {tab.label}
                  <span className={`text-[10px] font-bold tabular-nums ${activeTab === i ? "text-white/60" : "text-gray-400"}`}>
                    {tab.items.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 py-2 min-h-[220px]">
            {currentTab.items.length > 0 && (
              <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {currentTab.subtitle}
              </p>
            )}
            <div className="space-y-0.5">
              {renderTabItems()}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="space-y-5">

          {/* Quick Actions - 2 col grid */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-gray-900">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${action.color} text-[9px] font-bold text-white shadow-sm`}>
                    {action.icon}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 leading-tight group-hover:text-red-600">
                    {action.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Token Maintenance */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3">
              <h3 className="text-base font-bold text-gray-900">Token Notifikasi</h3>
              <p className="text-xs text-gray-400">Bersihkan FCM token invalid dari database.</p>
            </div>
            <div className="space-y-3">
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                Gunakan saat log server penuh error token invalid atau banyak user ganti device.
              </p>
              <button
                type="button"
                onClick={handlePurgeInvalidTokens}
                disabled={isPurgingTokens}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPurgingTokens ? "Memproses..." : "Purge Token Invalid"}
              </button>

              {purgeError && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {purgeError}
                </p>
              )}

              {purgeResult && purgeStats.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    {purgeStats.map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p className={`text-base font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-slate-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-right text-[10px] text-slate-400">
                    {new Date(purgeResult.processedAt).toLocaleString("id-ID")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3">
              <h3 className="text-base font-bold text-gray-900">Aktivitas Terbaru</h3>
              <p className="text-xs text-gray-400">Perubahan user dan SPL manual terbaru.</p>
            </div>
            <div className="space-y-0.5">
              {recentActivity.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Belum ada aktivitas.</p>
              ) : (
                recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}