"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import StatsCard from "@/components/dashboard/StatsCard"
import NotificationToggle from "@/components/notifications/NotificationToggle"
import { Spl, Role } from "@/types"
import Swal from "sweetalert2"
import Link from "next/link" // <-- TAMBAHAN: Import Link

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
  const [minOvertime, setMinOvertime] = useState("16:30")
  const [isSavingMin, setIsSavingMin] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/spl")
        if (!response.ok) {
          throw new Error("Gagal mengambil data")
        }

        const data: Spl[] = await response.json()

        setStats({
          total: data.length,
          pending: data.filter((spl) => spl.status === "PENDING").length,
          approved: data.filter((spl) => spl.status === "APPROVED").length,
          rejected: data.filter((spl) => spl.status === "REJECTED").length,
        })

        // Get 3 most recent SPLs
        const recent = data
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
  }, [])

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
        console.error("Gagal mengambil setting minimal lembur", err)
      }
    }
    loadMin()
  }, [])

  const userRole = session?.user?.role as Role

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
      APPROVED: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Disetujui",
      },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", label: "Ditolak" },
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
                    : userRole === "HR"
                    ? "Human Resources"
                    : "Manager"}
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
          {/* Quick Actions */}
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
              {/* STAFF ACTIONS */}
              {userRole === "STAFF" && (
                <>
                  <div className="group bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-blue-900">
                          Buat SPL Baru
                        </h3>
                        <p className="text-blue-700 text-sm">
                          Ajukan lembur sekarang
                        </p>
                      </div>
                    </div>

                    {/* DIPERBAIKI: Menggunakan Link component */}
                    <Link
                      href="/dashboard/staff/pengajuan"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Buat Pengajuan
                    </Link>
                  </div>

                  <div className="group bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <svg
                          className="w-6 h-6 text-white"
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
                      <div>
                        <h3 className="text-lg font-bold text-green-900">
                          Riwayat SPL
                        </h3>
                        <p className="text-green-700 text-sm">
                          Lihat pengajuan Anda
                        </p>
                      </div>
                    </div>

                    {/* DIPERBAIKI: Menggunakan Link component */}
                    <Link
                      href="/dashboard/staff"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
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
                      Lihat Riwayat
                    </Link>
              </div>
            </>
          )}

          {/* MANAGER ACTIONS */}
          {userRole === "MANAGER" && (
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
                <input
                  type="time"
                  value={minOvertime}
                  onChange={(e) => setMinOvertime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
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
          )}

          {/* HR ACTIONS */}
          {userRole === "HR" && (
            <>
                  <div className="group bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <svg
                          className="w-6 h-6 text-white"
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
                        <h3 className="text-lg font-bold text-green-900">
                          Data & Laporan
                        </h3>
                        <p className="text-green-700 text-sm">
                          Export dan analisis SPL
                        </p>
                      </div>
                    </div>

                    {/* DIPERBAIKI: Menggunakan Link component */}
                    <Link
                      href="/dashboard/hr"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
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
                      Lihat Data
                    </Link>
                  </div>

                  <div className="group bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-blue-900">
                          Manajemen Karyawan
                        </h3>
                        <p className="text-blue-700 text-sm">
                          Lihat data karyawan
                        </p>
                      </div>
                    </div>
                    <button
                      disabled
                      className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-600 font-medium rounded-lg cursor-not-allowed"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Coming Soon
                    </button>
                  </div>
                </>
              )}

              {/* MANAGER ACTIONS */}
              {userRole === "MANAGER" && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <NotificationToggle />
        </div>

        {/* Right Column - Recent Activity & Profile */}
        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
                  userRole === "HR"
                    ? "bg-green-100"
                    : userRole === "MANAGER"
                    ? "bg-purple-100"
                    : "bg-blue-100"
                }`}
              >
                <svg
                  className={`w-6 h-6 ${
                    userRole === "HR"
                      ? "text-green-600"
                      : userRole === "MANAGER"
                      ? "text-purple-600"
                      : "text-blue-600"
                  }`}
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
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    userRole === "HR"
                      ? "bg-gradient-to-br from-green-600 to-green-700"
                      : userRole === "MANAGER"
                      ? "bg-gradient-to-br from-purple-600 to-purple-700"
                      : "bg-gradient-to-br from-blue-600 to-blue-700"
                  }`}
                >
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
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      userRole === "HR"
                        ? "bg-green-100 text-green-800"
                        : userRole === "MANAGER"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {userRole === "HR"
                      ? "Human Resources"
                      : userRole === "MANAGER"
                      ? "Manager"
                      : "Staff"}
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

          {/* Recent SPL Activity */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
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
                Aktivitas Terbaru
              </h3>
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
                <p className="text-gray-500 text-sm">
                  Belum ada aktivitas SPL
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
