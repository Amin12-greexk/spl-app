"use client"

import { useState, useEffect, useCallback } from "react"
import { Spl, SplStatus } from "@/types"
import SplCard from "./SplCard"
import toast from "react-hot-toast"

interface SplListProps {
  userRole?: string
  showFilters?: boolean
  initialStatus?: SplStatus
  userId?: string // Optional userId untuk HR yang ingin lihat SPL mereka sendiri
}

export default function SplList({
  userRole,
  showFilters = true,
  initialStatus,
  userId,
}: SplListProps) {
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<SplStatus | "ALL">(
    initialStatus || "ALL"
  )

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  const fetchSpls = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== "ALL") {
        params.append("status", filterStatus)
      }
      if (userId) {
        params.append("userId", userId)
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
  }, [filterStatus, userId])

  useEffect(() => {
    fetchSpls()
  }, [fetchSpls])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
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
      pending: spls.filter(spl =>
        spl.status === "PENDING" ||
        spl.status === "PENDING_SUPERVISOR" ||
        spl.status === "PENDING_MANAGER"
      ).length,
      approved: spls.filter(spl => spl.status === "APPROVED").length,
      rejected: spls.filter(spl =>
        spl.status === "REJECTED" ||
        spl.status === "REJECTED_BY_SUPERVISOR" ||
        spl.status === "REJECTED_BY_MANAGER"
      ).length,
    }
  }

  const stats = getFilterStats()

  // Pagination logic
  const totalPages = Math.ceil(spls.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSpls = spls.slice(startIndex, endIndex)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

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

      {/* Items per page selector */}
      {spls.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per halaman</span>
            </div>

            <div className="text-sm text-gray-600">
              Menampilkan <span className="font-semibold text-gray-900">{startIndex + 1}</span> - <span className="font-semibold text-gray-900">{Math.min(endIndex, spls.length)}</span> dari <span className="font-semibold text-gray-900">{spls.length}</span> SPL
            </div>
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
            {currentSpls.map((spl) => (
              <SplCard
                key={spl.id}
                spl={spl}
                userRole={userRole}
                onDelete={userRole === "STAFF" ? handleDelete : undefined}
                compact={true}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
              {/* Mobile Pagination */}
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <div className="text-sm text-gray-700 flex items-center">
                  Hal. {currentPage} dari {totalPages}
                </div>
                <button
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>

              {/* Desktop Pagination */}
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Menampilkan <span className="font-medium">{startIndex + 1}</span> sampai{" "}
                    <span className="font-medium">{Math.min(endIndex, spls.length)}</span> dari{" "}
                    <span className="font-medium">{spls.length}</span> hasil
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Sebelumnya</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              currentPage === page
                                ? "z-10 bg-green-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">...</span>
                      }
                      return null
                    })}

                    <button
                      onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Selanjutnya</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
