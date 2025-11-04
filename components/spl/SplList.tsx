"use client"

import { useState, useEffect } from "react"
import { Spl, SplStatus } from "@/types"
import SplCard from "./SplCard"
import toast from "react-hot-toast"

interface SplListProps {
  userRole?: string
  showFilters?: boolean
  initialStatus?: SplStatus
}

export default function SplList({
  userRole,
  showFilters = true,
  initialStatus,
}: SplListProps) {
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<SplStatus | "ALL">(
    initialStatus || "ALL"
  )

  const fetchSpls = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== "ALL") {
        params.append("status", filterStatus)
      }

      const response = await fetch(`/api/spl?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Gagal mengambil data SPL")
      }

      const data = await response.json()
      setSpls(data)
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSpls()
  }, [filterStatus])

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengajuan SPL ini?")) {
      return
    }

    try {
      const response = await fetch(`/api/spl/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Gagal menghapus SPL")
      }

      toast.success("SPL berhasil dihapus")
      fetchSpls()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    }
  }

  const getFilterStats = () => {
    return {
      all: spls.length,
      pending: spls.filter(spl => spl.status === "PENDING").length,
      approved: spls.filter(spl => spl.status === "APPROVED").length,
      rejected: spls.filter(spl => spl.status === "REJECTED").length,
    }
  }

  const stats = getFilterStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded-lg w-20"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-22"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-18"></div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
            <p className="text-gray-600 text-sm font-medium">Memuat data SPL...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Status</h3>
            <div className="text-sm text-gray-500">
              Total: {spls.length} SPL
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`relative p-4 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                filterStatus === "ALL"
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white border-green-600 shadow-lg transform scale-105"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filterStatus === "ALL" ? "bg-white/20" : "bg-gray-200"
                }`}>
                  <svg className={`w-5 h-5 ${filterStatus === "ALL" ? "text-white" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span>Semua</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  filterStatus === "ALL" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {stats.all}
                </span>
              </div>
            </button>

            <button
              onClick={() => setFilterStatus("PENDING")}
              className={`relative p-4 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                filterStatus === "PENDING"
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-500 shadow-lg transform scale-105"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filterStatus === "PENDING" ? "bg-white/20" : "bg-yellow-100"
                }`}>
                  <svg className={`w-5 h-5 ${filterStatus === "PENDING" ? "text-white" : "text-yellow-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Menunggu</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  filterStatus === "PENDING" ? "bg-white/20 text-white" : "bg-yellow-100 text-yellow-600"
                }`}>
                  {stats.pending}
                </span>
              </div>
            </button>

            <button
              onClick={() => setFilterStatus("APPROVED")}
              className={`relative p-4 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                filterStatus === "APPROVED"
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white border-green-600 shadow-lg transform scale-105"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filterStatus === "APPROVED" ? "bg-white/20" : "bg-green-100"
                }`}>
                  <svg className={`w-5 h-5 ${filterStatus === "APPROVED" ? "text-white" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Disetujui</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  filterStatus === "APPROVED" ? "bg-white/20 text-white" : "bg-green-100 text-green-600"
                }`}>
                  {stats.approved}
                </span>
              </div>
            </button>

            <button
              onClick={() => setFilterStatus("REJECTED")}
              className={`relative p-4 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                filterStatus === "REJECTED"
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white border-red-600 shadow-lg transform scale-105"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filterStatus === "REJECTED" ? "bg-white/20" : "bg-red-100"
                }`}>
                  <svg className={`w-5 h-5 ${filterStatus === "REJECTED" ? "text-white" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span>Ditolak</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  filterStatus === "REJECTED" ? "bg-white/20 text-white" : "bg-red-100 text-red-600"
                }`}>
                  {stats.rejected}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {spls.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filterStatus === "ALL" ? "Belum Ada SPL" : `Tidak Ada SPL ${filterStatus === "PENDING" ? "Menunggu" : filterStatus === "APPROVED" ? "Disetujui" : "Ditolak"}`}
              </h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {filterStatus === "ALL" 
                  ? "Belum ada pengajuan SPL yang dibuat. Mulai dengan membuat pengajuan baru."
                  : `Tidak ada SPL dengan status ${filterStatus === "PENDING" ? "menunggu persetujuan" : filterStatus === "APPROVED" ? "disetujui" : "ditolak"}.`
                }
              </p>
            </div>
            {userRole === "STAFF" && filterStatus === "ALL" && (
              <a
                href="/dashboard/staff/pengajuan"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl hover:from-green-700 hover:to-green-800 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Buat SPL Pertama
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {spls.map((spl) => (
            <SplCard
              key={spl.id}
              spl={spl}
              userRole={userRole}
              onDelete={userRole === "STAFF" ? handleDelete : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}