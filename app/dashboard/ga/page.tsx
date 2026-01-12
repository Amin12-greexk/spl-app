"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Spl } from "@/types"
import SplCard from "@/components/spl/SplCard"
import SplDetailModal from "@/components/spl/SplDetailModal"
import Input from "@/components/ui/Input"
import toast from "react-hot-toast"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isWithinInterval } from "date-fns"

export default function GADashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("ALL")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailSpl, setDetailSpl] = useState<Spl | null>(null)

  // Check authorization
  useEffect(() => {
    if (session && !["GA", "DEPARTMENT_HEAD"].includes(session.user.role)) {
      toast.error("Akses ditolak! Hanya GA/Kepala Dept yang dapat mengakses halaman ini.")
      router.push("/dashboard")
    }
  }, [session, router])

  // Fetch team SPLs
  useEffect(() => {
    const fetchTeamSpls = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/spl/my-team")
        if (!response.ok) {
          throw new Error("Gagal mengambil data SPL tim")
        }
        const data = await response.json()
        setSpls(data)
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan")
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === "GA" || session?.user.role === "DEPARTMENT_HEAD") {
      fetchTeamSpls()
    }
  }, [session])

  // Filter logic
  const filteredSpls = spls.filter(spl => {
    // Filter by status
    if (filterStatus !== "ALL" && spl.status !== filterStatus) {
      return false
    }

    // Filter by search query (nama atau PIN)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      if (
        !spl.requester.name.toLowerCase().includes(query) &&
        !(spl.requester.pin && spl.requester.pin.toLowerCase().includes(query))
      ) {
        return false
      }
    }

    // Filter by date
    const now = new Date()
    const splDate = new Date(spl.date)

    switch (dateFilter) {
      case "THIS_WEEK":
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        return isWithinInterval(splDate, { start: weekStart, end: weekEnd })

      case "THIS_MONTH":
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        return isWithinInterval(splDate, { start: monthStart, end: monthEnd })

      case "LAST_MONTH":
        const lastMonth = subMonths(now, 1)
        const lastMonthStart = startOfMonth(lastMonth)
        const lastMonthEnd = endOfMonth(lastMonth)
        return isWithinInterval(splDate, { start: lastMonthStart, end: lastMonthEnd })

      case "CUSTOM":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate)
          const end = new Date(customEndDate)
          return isWithinInterval(splDate, { start, end })
        }
        return true

      default:
        return true
    }
  })

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, searchQuery, dateFilter, customStartDate, customEndDate])

  // Pagination
  const totalPages = Math.ceil(filteredSpls.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSpls.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const handleOpenDetail = (spl: Spl) => {
    setDetailSpl(spl)
    setShowDetailModal(true)
  }

  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setDetailSpl(null)
  }

  const getStats = () => {
    return {
      total: spls.length,
      pendingSupervisor: spls.filter(spl => spl.status === "PENDING_SUPERVISOR").length,
      pendingManager: spls.filter(spl =>
        spl.status === "PENDING_MANAGER" ||
        spl.status === "IN_PROGRESS" ||
        spl.status === "DONE"
      ).length,
      approved: spls.filter(spl => spl.status === "APPROVED").length,
      rejected: spls.filter(spl =>
        spl.status === "REJECTED_BY_SUPERVISOR" || spl.status === "REJECTED_BY_MANAGER"
      ).length,
    }
  }

  const stats = getStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-gray-600 text-sm">Memuat data SPL tim...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              👥 Dashboard {session?.user.role === "GA" ? "GA" : "Kepala Departemen"}
            </h1>
            <p className="text-blue-100">
              Data SPL dari tim Anda
            </p>
            <div className="mt-2 text-sm text-blue-100">
              Total: {stats.total} SPL
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total SPL</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingSupervisor}</div>
            <div className="text-sm text-gray-600">Menunggu Anda</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pendingManager}</div>
            <div className="text-sm text-gray-600">Di Manager</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Disetujui</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Ditolak</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter & Pencarian</h3>

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cari Nama atau PIN:</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama karyawan atau PIN..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Status:</label>
          <div className="flex flex-wrap gap-2">
            {[
              "ALL",
              "PENDING_SUPERVISOR",
              "PENDING_MANAGER",
              "IN_PROGRESS",
              "DONE",
              "APPROVED",
              "REJECTED_BY_SUPERVISOR",
              "REJECTED_BY_MANAGER",
            ].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status === "ALL" ? "Semua" :
                 status === "PENDING_SUPERVISOR" ? "Menunggu Anda" :
                 status === "PENDING_MANAGER" ? "Di Manager" :
                 status === "IN_PROGRESS" ? "Berjalan" :
                 status === "DONE" ? "Selesai" :
                 status === "APPROVED" ? "Disetujui" :
                 status === "REJECTED_BY_SUPERVISOR" ? "Ditolak (Anda)" : "Ditolak (Manager)"}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Periode:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
            {[
              { value: "ALL", label: "Semua" },
              { value: "THIS_WEEK", label: "Minggu Ini" },
              { value: "THIS_MONTH", label: "Bulan Ini" },
              { value: "LAST_MONTH", label: "Bulan Lalu" },
              { value: "CUSTOM", label: "Pilih Tanggal" }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setDateFilter(period.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === period.value
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {dateFilter === "CUSTOM" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <Input
                label="Tanggal Mulai"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <Input
                label="Tanggal Selesai"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600 pt-3 border-t border-gray-200">
          Menampilkan <span className="font-semibold text-gray-900">{filteredSpls.length}</span> dari <span className="font-semibold text-gray-900">{spls.length}</span> SPL
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredSpls.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
              <span className="text-sm text-gray-700">per halaman</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-gray-700">
              {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredSpls.length)} dari {filteredSpls.length}
            </div>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNumber
                  if (totalPages <= 5) {
                    pageNumber = i + 1
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i
                  } else {
                    pageNumber = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                        currentPage === pageNumber
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPL List */}
      {currentItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tidak Ada Data
              </h3>
              <p className="text-gray-500 text-sm">
                Belum ada SPL dari tim Anda dengan status ini
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {currentItems.map((spl) => (
            <SplCard
              key={spl.id}
              spl={spl}
              userRole={session?.user.role}
              showActions={false}
              mini={true}
              onClick={() => handleOpenDetail(spl)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal - Untuk melihat informasi lengkap SPL tim */}
      <SplDetailModal
        spl={detailSpl}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
