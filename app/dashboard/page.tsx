"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import StatsCard from "@/components/dashboard/StatsCard"
import NotificationToggle from "@/components/notifications/NotificationToggle"
import { Spl, Role } from "@/types"
import Swal from "sweetalert2"
import Link from "next/link" // <-- TAMBAHAN: Import Link
import TimePicker from "@/components/ui/TimePicker"

const DIRECT_TO_MANAGER_ROLES: Role[] = [
  "GA",
  "DEPARTMENT_HEAD",
  "PRODUCTION_SUPERVISOR",
  "HR",
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentSpls, setRecentSpls] = useState<Spl[]>([])
  const [userSpls, setUserSpls] = useState<Spl[]>([])
  const [minOvertime, setMinOvertime] = useState("16:30")
  const [isSavingMin, setIsSavingMin] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [managerName, setManagerName] = useState<string | null>(null)
  const [supervisorName, setSupervisorName] = useState<string | null>(null)
  const [supervisorLabel, setSupervisorLabel] = useState<string | null>(null)
  const [hasSupervisor, setHasSupervisor] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) {
      return
    }

    const fetchData = async () => {
      try {
        const response = await fetch("/api/spl")
        if (!response.ok) {
          throw new Error("Gagal mengambil data")
        }

        const data: Spl[] = await response.json()
        const requesterId = session.user.id
        const ownSpls = data.filter(
          (spl) => (spl.requesterId || spl.requester?.id) === requesterId
        )

        const pendingStatuses = ["PENDING", "PENDING_SUPERVISOR", "PENDING_MANAGER"]
        const rejectedStatuses = ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"]

        setStats({
          total: data.length,
          pending: data.filter((spl) => pendingStatuses.includes(spl.status)).length,
          approved: data.filter((spl) => spl.status === "APPROVED").length,
          rejected: data.filter((spl) => rejectedStatuses.includes(spl.status)).length,
        })
        setUserSpls(ownSpls)

        // Get current week range (Monday - Saturday)
        // Reset on Sunday (no activity shown)
        const now = new Date()
        const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Start of week (Monday 00:00:00)
        const startOfWeek = new Date(now)
        if (currentDay === 0) {
          // If Sunday, show no activities (reset day)
          startOfWeek.setDate(now.getDate() + 1) // Set to next Monday (future)
        } else {
          // Otherwise, go back to Monday of this week
          const daysFromMonday = currentDay - 1 // Monday = 0 days back, Tuesday = 1 day back, etc.
          startOfWeek.setDate(now.getDate() - daysFromMonday)
        }
        startOfWeek.setHours(0, 0, 0, 0)

        // End of week (Saturday 23:59:59)
        const endOfWeek = new Date(startOfWeek)
        if (currentDay === 0) {
          // If Sunday, set end before start (no results)
          endOfWeek.setDate(startOfWeek.getDate() - 1)
        } else {
          // Otherwise, set to Saturday of this week
          endOfWeek.setDate(startOfWeek.getDate() + 5) // Monday + 5 days = Saturday
        }
        endOfWeek.setHours(23, 59, 59, 999)

        // Filter SPL for current week only, per user, and get 3 most recent
        const recent = ownSpls
          .filter((spl) => {
            const splDate = new Date(spl.createdAt)
            return splDate >= startOfWeek && splDate <= endOfWeek
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 3)
        setRecentSpls(recent)
      } catch (error: any) {
        await Swal.fire({
          icon: "error",
          title: "Gagal memuat data",
          text: error.message || "Terjadi kesalahan",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    if (session.user.role !== "MANAGER") {
      const visibleManagerName = (value: unknown) =>
        typeof value === "string" && value.trim().length > 0

      const fetchManager = async () => {
        try {
          const response = await fetch("/api/manager")
          if (!response.ok) {
            return
          }
          const data = await response.json()
          if (visibleManagerName(data?.name)) {
            setManagerName(data.name)
          }
        } catch (error) {
          // ignore manager name failure
        }
      }

      fetchManager()
    }
  }, [session])

  useEffect(() => {
    if (!session || session.user.role === "MANAGER") {
      setHasSupervisor(null)
      setSupervisorName(null)
      setSupervisorLabel(null)
      return
    }

    if (DIRECT_TO_MANAGER_ROLES.includes(session.user.role as Role)) {
      setHasSupervisor(false)
      setSupervisorName(null)
      setSupervisorLabel(null)
      return
    }

    const departmentId = session.user.departmentId
    const departmentName = session.user.department

    if (!departmentId && (!departmentName || departmentName.trim().length === 0)) {
      setHasSupervisor(null)
      setSupervisorName(null)
      setSupervisorLabel(null)
      return
    }

    const fetchSupervisorInfo = async () => {
      try {
        const query = departmentId
          ? `departmentId=${encodeURIComponent(departmentId)}`
          : `department=${encodeURIComponent(departmentName || "")}`
        const response = await fetch(`/api/auth/supervisor-info?${query}`)
        if (!response.ok) {
          setHasSupervisor(null)
          setSupervisorName(null)
          setSupervisorLabel(null)
          return
        }
        const data = await response.json()
        const hasSupervisorValue =
          typeof data?.hasSupervisor === "boolean" ? data.hasSupervisor : null
        setHasSupervisor(hasSupervisorValue)
        setSupervisorName(
          typeof data?.supervisor?.name === "string" && data.supervisor.name.trim().length > 0
            ? data.supervisor.name
            : null
        )
        setSupervisorLabel(
          typeof data?.supervisor?.position === "string" && data.supervisor.position.trim().length > 0
            ? data.supervisor.position
            : null
        )
      } catch (error) {
        setHasSupervisor(null)
        setSupervisorName(null)
        setSupervisorLabel(null)
      }
    }

    fetchSupervisorInfo()
  }, [session?.user?.departmentId, session?.user?.department, session?.user?.role])

  useEffect(() => {
    setHistoryPage(1)
  }, [userSpls.length])

  // Load minimal lembur for manager view
  useEffect(() => {
    const loadMin = async () => {
      try {
        const res = await fetch("/api/settings/min-overtime")
        const data = await res.json()
        if (res.ok && data?.value) {
          setMinOvertime(data.value)
        }
      } catch (err) {
        // Failed to load minimal overtime setting
      }
    }
    loadMin()
  }, [])

  const userRole = session?.user?.role as Role
  const historyItemsPerPage = 10
  const sortedHistory = [...userSpls].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(sortedHistory.length / historyItemsPerPage)
  )
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages)
  const historyStartIndex = (currentHistoryPage - 1) * historyItemsPerPage
  const historyItems = sortedHistory.slice(
    historyStartIndex,
    historyStartIndex + historyItemsPerPage
  )
  const showHistoryTable = userRole !== "MANAGER"
  const showManagerWidgets = userRole === "MANAGER"

  const getLeaderName = (spl: Spl) => {
    if (hasSupervisor === true) {
      if (supervisorName) return supervisorName
      if (spl.supervisor?.name) return spl.supervisor.name
      return supervisorLabel || "Atasan"
    }

    if (hasSupervisor === false) {
      if (managerName) return managerName
      if (spl.approver?.name) return spl.approver.name
      return "Manager"
    }

    if (spl.supervisor?.name) return spl.supervisor.name
    if (managerName) return managerName
    if (spl.approver?.name) return spl.approver.name
    return "Manager"
  }

  const getRegularHoursLabel = (spl: Spl) => {
    const start =
      spl.requester?.regularStartTime || session?.user?.regularStartTime || ""
    const end =
      spl.requester?.regularEndTime || session?.user?.regularEndTime || ""
    if (start && end) {
      return `${start} - ${end}`
    }
    return "-"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
          <div className="text-center">
            <p className="text-gray-700 font-medium">Memuat dashboard...</p>
            <p className="text-gray-500 text-sm mt-1">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    )
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Selamat pagi"
    if (hour < 17) return "Selamat siang"
    return "Selamat sore"
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
      },
      PENDING_SUPERVISOR: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
      },
      PENDING_MANAGER: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
      },
      APPROVED: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Disetujui",
      },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", label: "Ditolak" },
      REJECTED_BY_SUPERVISOR: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak",
      },
      REJECTED_BY_MANAGER: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak",
      },
    }
    const c = config[status as keyof typeof config] || config.PENDING
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}
      >
        {c.label}
      </span>
    )
  }

  const getHeaderGradient = () => {
    switch (userRole) {
      case "HR":
        return "from-green-600 via-green-700 to-green-800"
      case "MANAGER":
        return "from-purple-600 via-purple-700 to-purple-800"
      default:
        return "from-blue-600 via-blue-700 to-blue-800"
    }
  }

  const getStatsSubtitle = () => {
    switch (userRole) {
      case "STAFF":
      case "TEKNISI":
        return "Total pengajuan Anda"
      case "HR":
        return "Semua pengajuan di sistem"
      case "MANAGER":
        return "Pengajuan yang perlu direview"
      default:
        return "Total di sistem"
    }
  }

  const getHeaderIcon = () => {
    switch (userRole) {
      case "HR":
        return "📊"
      case "MANAGER":
        return "👔"
      default:
        return "👋"
    }
  }

  const getHeaderDescription = () => {
    switch (userRole) {
      case "HR":
        return "Kelola data dan laporan SPL seluruh karyawan"
      case "MANAGER":
        return "Review dan setujui pengajuan lembur karyawan"
      default:
        return "Selamat datang di Sistem Pengajuan Surat Perintah Lembur"
    }
  }

  const saveMinOvertime = async () => {
    if (!/^\d{2}:\d{2}$/.test(minOvertime)) {
      await Swal.fire({
        icon: "warning",
        title: "Format salah",
        text: "Format waktu harus HH:MM (contoh 13:30).",
      })
      return
    }
    try {
      setIsSavingMin(true)
      const res = await fetch("/api/settings/min-overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: minOvertime }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan waktu minimal")
      }
      setMinOvertime(data.value)
      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Waktu minimal lembur diset ke ${data.value}`,
      })
    } catch (err: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menyimpan",
        text: err.message || "Gagal menyimpan setting",
      })
    } finally {
      setIsSavingMin(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Enhanced Header Section */}
      <div
        className={`relative bg-gradient-to-br ${getHeaderGradient()} rounded-2xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">{getHeaderIcon()}</span>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                    {getGreeting()}!
                  </h1>
                  <p className="text-xl sm:text-2xl font-medium text-white/90 mt-1">
                    {session?.user?.name}
                  </p>
                </div>
              </div>

              <p className="text-white/80 text-sm sm:text-base mb-4 max-w-2xl">
                {getHeaderDescription()}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {userRole === "STAFF"
                    ? "Staff"
                    : userRole === "TEKNISI"
                    ? "Teknisi"
                    : userRole === "HR"
                    ? "Human Resources"
                    : userRole === "MANAGER"
                    ? "Manager"
                    : userRole === "GA"
                    ? "General Affair"
                    : userRole === "DEPARTMENT_HEAD"
                    ? "Kepala Departemen"
                    : userRole === "PRODUCTION_SUPERVISOR"
                    ? "Pengawas Produksi"
                    : userRole}
                </span>
                {session?.user?.department && (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {session.user.department}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex w-20 h-20 bg-white/20 rounded-2xl items-center justify-center backdrop-blur-sm">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-green-600 font-bold text-2xl">TEI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total SPL"
          value={stats.total}
          icon="📊"
          color="blue"
          subtitle={getStatsSubtitle()}
        />
        <StatsCard
          title="Menunggu"
          value={stats.pending}
          icon="⏳"
          color="yellow"
          subtitle="Belum diproses"
        />
        <StatsCard
          title="Disetujui"
          value={stats.approved}
          icon="✅"
          color="green"
          subtitle="SPL approved"
        />
        <StatsCard
          title="Ditolak"
          value={stats.rejected}
          icon="❌"
          color="red"
          subtitle="SPL rejected"
        />
      </div>

      {/* Enhanced Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Actions & Profile */}
        <div className="xl:col-span-2 space-y-6">
          {showHistoryTable && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Riwayat Lembur Saya
                  </h2>
                </div>
                <div className="text-sm text-gray-500">
                  Total: {sortedHistory.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Tgl Lembur
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Pimpinan
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Jam Reguler
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Alasan Lembur
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyItems.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-gray-500"
                          colSpan={5}
                        >
                          Belum ada riwayat lembur
                        </td>
                      </tr>
                    ) : (
                      historyItems.map((spl) => (
                        <tr key={spl.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">
                            {new Date(spl.date).toLocaleDateString("id-ID")}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {getLeaderName(spl)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {getRegularHoursLabel(spl)}
                          </td>
                          <td
                            className="px-4 py-3 text-gray-700 max-w-xs truncate"
                            title={spl.reason}
                          >
                            {spl.reason}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(spl.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {sortedHistory.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
                  <span>
                    Menampilkan {historyStartIndex + 1}-
                    {Math.min(
                      historyStartIndex + historyItemsPerPage,
                      sortedHistory.length
                    )}{" "}
                    dari {sortedHistory.length}
                  </span>
                  {totalHistoryPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryPage(Math.max(1, currentHistoryPage - 1))
                        }
                        disabled={currentHistoryPage === 1}
                        className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <span>
                        Hal {currentHistoryPage} dari {totalHistoryPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryPage(
                            Math.min(totalHistoryPages, currentHistoryPage + 1)
                          )
                        }
                        disabled={currentHistoryPage === totalHistoryPages}
                        className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Berikutnya
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {showManagerWidgets && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                Aksi Cepat
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Batas Waktu Pengajuan
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Pengajuan setelah jam ini akan ditolak
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <TimePicker
                      value={minOvertime}
                      onChange={(value) => setMinOvertime(value)}
                      showWib
                      selectClassName="focus:ring-purple-200 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={saveMinOvertime}
                      disabled={isSavingMin}
                      className="w-full px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
                    >
                      {isSavingMin ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </div>

                <Link
                  href="/dashboard/hr/persetujuan"
                  className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Persetujuan SPL
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Review pengajuan lembur
                        </p>
                      </div>
                    </div>
                    {stats.pending > 0 && (
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {stats.pending}
                      </span>
                    )}
                  </div>
                </Link>

                <Link
                  href="/dashboard/hr"
                  className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Data & Laporan
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Lihat data SPL tim
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <NotificationToggle />
        </div>

        {/* Right Column - Recent Activity & Profile */}
        <div className="space-y-6">
          {/* Account Information */}
          {showManagerWidgets && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 bg-purple-100">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Informasi Akun
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-600 to-purple-700">
                  {session?.user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {session?.user?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Role:</span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    Manager
                  </span>
                </div>

                {session?.user?.department && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">
                      Departemen:
                    </span>
                    <span className="text-gray-900 font-medium">
                      {session.user.department}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Recent SPL Activity */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Aktivitas Minggu Ini
                </h3>
              </div>
              <p className="text-xs text-gray-500 ml-11">
                Senin - Sabtu (Reset setiap Minggu)
              </p>
            </div>

            {recentSpls.length > 0 ? (
              <div className="space-y-3">
                {recentSpls.map((spl) => (
                  <div
                    key={spl.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {spl.requester.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(spl.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    {getStatusBadge(spl.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  Belum ada aktivitas minggu ini
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Aktivitas akan ditampilkan Senin - Sabtu
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
