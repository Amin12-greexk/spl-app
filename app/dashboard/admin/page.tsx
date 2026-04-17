"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
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
  {
    title: "Kelola User",
    description: "Edit role, supervisor, dan data akun",
    href: "/dashboard/admin/users",
    icon: "US",
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Mirror Karyawan",
    description: "Verifikasi data mentah tabel user",
    href: "/dashboard/admin/employee-mirror",
    icon: "MR",
    color: "from-slate-700 to-slate-900",
  },
  {
    title: "Kelola Departemen",
    description: "Tambah departemen dan atur mode approval",
    href: "/dashboard/admin/departments",
    icon: "DP",
    color: "from-orange-500 to-orange-600",
  },
  {
    title: "Cek Absensi",
    description: "Lihat absensi dengan tampilan super admin",
    href: "/dashboard/admin/absensi",
    icon: "AB",
    color: "from-slate-700 to-red-700",
  },
  {
    title: "Jam Reguler",
    description: "Lengkapi jam kerja harian user",
    href: "/dashboard/admin/regular-hours",
    icon: "JR",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Shift Security",
    description: "Atur shift security untuk hari ini",
    href: "/dashboard/admin/security-shifts",
    icon: "SS",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    title: "Input SPL Manual",
    description: "Buat SPL telat input dan bypass bila perlu",
    href: "/dashboard/admin/spl-manual",
    icon: "SP",
    color: "from-green-500 to-green-600",
  },
  {
    title: "Riwayat SPL",
    description: "Audit seluruh data lembur",
    href: "/dashboard/admin/spl-history",
    icon: "RH",
    color: "from-purple-500 to-purple-600",
  },
]

const formatRelativeTime = (value: string) => {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return "-"

  const diffMs = Date.now() - target.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return "Baru saja"
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam lalu`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} hari lalu`

  return target.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
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
    <div className={`rounded-2xl border p-5 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      {children}
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [router, session?.user?.role, status])

  useEffect(() => {
    if (session?.user?.role !== "SUPER_ADMIN") return

    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/admin/dashboard-summary", {
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error("Gagal memuat ringkasan admin")
        }

        const data = await response.json()
        setDashboardData(data)
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
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
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
      const response = await fetch("/api/admin/notifications/purge-invalid", {
        method: "POST",
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Gagal purge token notifikasi invalid")
      }

      setPurgeResult(data)
    } catch (error) {
      console.error("Error purging invalid notification tokens:", error)
      setPurgeError(
        error instanceof Error
          ? error.message
          : "Gagal purge token notifikasi invalid"
      )
    } finally {
      setIsPurgingTokens(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
              Super Admin Control Tower
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Dashboard Admin
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-red-100 sm:text-base">
              Fokus utama dashboard ini adalah validitas data, kelengkapan setup,
              dan jalur cepat untuk audit user maupun SPL.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm backdrop-blur-sm">
            <p className="font-semibold">Akses penuh aktif</p>
            <p className="mt-1 text-red-100">
              Gunakan panel ini untuk cek data mentah, setup jadwal, dan koreksi cepat.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <SummaryCard label="User Operasional" value={summary.totalUsers} tone="slate" />
        <SummaryCard label="Departemen" value={summary.totalDepartments} tone="blue" />
        <SummaryCard label="Tanpa Supervisor" value={summary.withoutSupervisor} tone="amber" />
        <SummaryCard label="Tanpa Jam Reguler" value={summary.withoutRegularHours} tone="rose" />
        <SummaryCard label="Security Belum Shift" value={summary.securityWithoutShiftToday} tone="violet" />
        <SummaryCard label="SPL Manual Belum TTD" value={summary.manualUnsignedSpls} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard
            title="Perlu Tindakan: Supervisor"
            subtitle="User yang seharusnya punya atasan tetapi masih kosong."
          >
            <div className="space-y-3">
              {actionItems.usersWithoutSupervisor.length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada temuan.</p>
              ) : (
                actionItems.usersWithoutSupervisor.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 hover:bg-amber-100/60"
                  >
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-600">
                      {item.role} | {item.departmentName}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Perlu Tindakan: SPL Pending Supervisor"
            subtitle="Daftar SPL yang masih menunggu persetujuan di level supervisor."
          >
            <div className="space-y-3">
              {actionItems.pendingSupervisorSpls.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Tidak ada SPL yang sedang menunggu persetujuan supervisor.
                </p>
              ) : (
                actionItems.pendingSupervisorSpls.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 hover:bg-amber-100/60"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {item.requesterName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.departmentName} |{" "}
                      {new Date(item.date || "").toLocaleDateString("id-ID")} |{" "}
                      {item.startTime} - {item.endTime}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Perlu Tindakan: Shift Security Hari Ini"
            subtitle="Anggota security yang belum punya shift harian."
          >
            <div className="space-y-3">
              {actionItems.securityWithoutShiftToday.length === 0 ? (
                <p className="text-sm text-gray-500">Semua shift security sudah terisi.</p>
              ) : (
                actionItems.securityWithoutShiftToday.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 hover:bg-violet-100/60"
                  >
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-600">{item.email}</p>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Perlu Tindakan: SPL Manual"
            subtitle="Data telat input yang masih menunggu tanda tangan user."
          >
            <div className="space-y-3">
              {actionItems.unsignedManualSpls.length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada SPL manual pending tanda tangan.</p>
              ) : (
                actionItems.unsignedManualSpls.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 hover:bg-emerald-100/60"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {item.requesterName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(item.date || "").toLocaleDateString("id-ID")} | {item.startTime} - {item.endTime}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Quick Actions"
            subtitle="Pintu masuk cepat ke modul admin yang paling sering dipakai."
          >
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-start gap-3 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50"
                >
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-xs font-bold text-white shadow-sm`}
                  >
                    {action.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-red-600">
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Maintenance: Token Notifikasi"
            subtitle="Bersihkan token FCM yang malformed atau sudah tidak valid dari database."
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Gunakan hanya saat log server mulai penuh error token invalid atau setelah banyak user ganti device/browser.
              </div>

              <button
                type="button"
                onClick={handlePurgeInvalidTokens}
                disabled={isPurgingTokens}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPurgingTokens
                  ? "Memproses purge token..."
                  : "Purge Token Notifikasi Invalid"}
              </button>

              {purgeError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {purgeError}
                </div>
              ) : null}

              {purgeResult ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Total Row
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {purgeResult.totalRows}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Token Dicek
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {purgeResult.uniqueTokensChecked}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Malformed Dihapus
                      </p>
                      <p className="mt-1 text-lg font-bold text-amber-600">
                        {purgeResult.malformedRowsRemoved}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Invalid Dihapus
                      </p>
                      <p className="mt-1 text-lg font-bold text-rose-600">
                        {purgeResult.invalidRowsRemoved}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Row Tersisa Valid
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-600">
                        {purgeResult.validRowsKept}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Durasi
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {(purgeResult.durationMs / 1000).toFixed(2)}s
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Terakhir diproses:{" "}
                    {new Date(purgeResult.processedAt).toLocaleString("id-ID")}
                  </p>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Aktivitas Terbaru"
            subtitle="Perubahan user dan SPL manual terbaru di sistem."
          >
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada aktivitas terbaru.</p>
              ) : (
                recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500">{item.subtitle}</p>
                      </div>
                      <span className="text-[11px] font-medium text-gray-400">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
