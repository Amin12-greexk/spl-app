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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Selamat datang, {session?.user?.name}!
        </p>
      </div>

      {/* Notification Settings */}
      <NotificationToggle />

      {/* Development Testing (Only in development) */}
      {process.env.NODE_ENV === "development" && (
        <NotificationTester />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Informasi Akun
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-gray-600 font-medium w-32">Nama:</span>
            <span className="text-gray-900">{session?.user?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 font-medium w-32">Email:</span>
            <span className="text-gray-900">{session?.user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 font-medium w-32">Role:</span>
            <span className="text-gray-900">{session?.user?.role}</span>
          </div>
          {session?.user?.department && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600 font-medium w-32">Departemen:</span>
              <span className="text-gray-900">{session.user.department}</span>
            </div>
          )}
        </div>
      </div>

      {userRole === "STAFF" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📝 Mulai Pengajuan SPL
          </h3>
          <p className="text-blue-700 mb-4">
            Ajukan Surat Perintah Lembur Anda dengan mudah dan cepat.
          </p>
          <a
            href="/dashboard/staff/pengajuan"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Buat Pengajuan Baru
          </a>
        </div>
      )}

      {(userRole === "HR" || userRole === "MANAGER") && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            ✅ Review Pengajuan SPL
          </h3>
          <p className="text-green-700 mb-4">
            Terdapat {stats.pending} pengajuan yang menunggu persetujuan Anda.
          </p>
          <a
            href="/dashboard/hr/persetujuan"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Lihat Pengajuan
          </a>
        </div>
      )}
    </div>
  )
}