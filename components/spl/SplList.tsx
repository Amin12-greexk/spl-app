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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      {showFilters && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === "PENDING"
                ? "bg-yellow-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Menunggu
          </button>
          <button
            onClick={() => setFilterStatus("APPROVED")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === "APPROVED"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Disetujui
          </button>
          <button
            onClick={() => setFilterStatus("REJECTED")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === "REJECTED"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ditolak
          </button>
        </div>
      )}

      {spls.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Tidak ada data SPL</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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