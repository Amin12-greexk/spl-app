"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import StatsCard from "@/components/dashboard/StatsCard"
import NotificationToggle from "@/components/notifications/NotificationToggle"
import NotificationTester from "@/components/notifications/NotificationTester"
import { Spl, Role } from "@/types"
import toast from "react-hot-toast"

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
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
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const userRole = session?.user?.role as Role

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-gray-600 text-sm">Memuat dashboard...</p>
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {getGreeting()}, {session?.user?.name}! 👋
            </h1>
            <p className="text-green-100 text-sm sm:text-base">
              Selamat datang di Sistem Pengajuan Surat Perintah Lembur
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                {session?.user?.role}
              </span>
              {session?.user?.department && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                  </svg>
                  {session.user.department}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:block w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">TE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <NotificationToggle />

      {/* Development Testing */}
      {process.env.NODE_ENV === "development" && (
        <NotificationTester />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total SPL"
          value={stats.total}
          icon="📊"
          color="blue"
          subtitle={
            userRole === "STAFF"
              ? "Total pengajuan Anda"
              : "Total semua pengajuan"
          }
        />
        <StatsCard
          title="Menunggu Persetujuan"
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
          subtitle="SPL yang disetujui"
        />
        <StatsCard
          title="Ditolak"
          value={stats.rejected}
          icon="❌"
          color="red"
          subtitle="SPL yang ditolak"
        />
      </div>

      {/* Quick Actions & Account Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Informasi Akun
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-600 font-medium w-full sm:w-32 mb-1 sm:mb-0">Nama:</span>
              <span className="text-gray-900 font-medium">{session?.user?.name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-600 font-medium w-full sm:w-32 mb-1 sm:mb-0">Email:</span>
              <span className="text-gray-900 break-all">{session?.user?.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-600 font-medium w-full sm:w-32 mb-1 sm:mb-0">Role:</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {session?.user?.role}
              </span>
            </div>
            {session?.user?.department && (
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-600 font-medium w-full sm:w-32 mb-1 sm:mb-0">Departemen:</span>
                <span className="text-gray-900 font-medium">{session.user.department}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {userRole === "STAFF" && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-1">
                    Buat Pengajuan SPL
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Ajukan Surat Perintah Lembur dengan mudah dan cepat
                  </p>
                </div>
              </div>
              <a
                href="/dashboard/staff/pengajuan"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Buat Pengajuan Baru
              </a>
            </div>
          )}

          {(userRole === "HR" || userRole === "MANAGER") && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-1">
                    Review Pengajuan SPL
                  </h3>
                  <p className="text-green-700 text-sm">
                    {stats.pending} pengajuan menunggu persetujuan Anda
                  </p>
                </div>
              </div>
              <a
                href="/dashboard/hr/persetujuan"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Lihat Pengajuan
                {stats.pending > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-green-600 bg-white rounded-full">
                    {stats.pending}
                  </span>
                )}
              </a>
            </div>
          )}

          {/* Recent Activity Preview */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h3>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-600">System ready untuk pengajuan SPL</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Notifikasi aktif dan berfungsi</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Dashboard siap digunakan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}