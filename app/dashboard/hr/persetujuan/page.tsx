"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Spl } from "@/types"
import SplCard from "@/components/spl/SplCard"
import SplDetailModal from "@/components/spl/SplDetailModal"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"
import { useSession } from "next-auth/react"

export default function PersetujuanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSpl, setSelectedSpl] = useState<string | null>(null)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailSpl, setDetailSpl] = useState<Spl | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  const fetchPendingSpls = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        "/api/spl?status=PENDING_MANAGER,IN_PROGRESS,DONE"
      )
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
    if (!session?.user?.role) {
      return
    }
    if (session.user.role !== "MANAGER") {
      toast.error("Hanya Manager yang dapat menyetujui SPL")
      router.push("/dashboard/hr")
      return
    }
    fetchPendingSpls()
  }, [session, router])

  const handleApprove = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menyetujui pengajuan SPL ini?")) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/spl/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "APPROVED",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Gagal menyetujui SPL")
      }

      toast.success("SPL berhasil disetujui")
      fetchPendingSpls()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectClick = (id: string) => {
    setSelectedSpl(id)
    setIsRejectModalOpen(true)
  }

  const handleRejectSubmit = async () => {
    if (!selectedSpl) return

    if (!rejectionReason.trim()) {
      toast.error("Alasan penolakan harus diisi")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/spl/${selectedSpl}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "REJECTED_BY_MANAGER",
          rejectionReason: rejectionReason.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Gagal menolak SPL")
      }

      toast.success("SPL berhasil ditolak")
      setIsRejectModalOpen(false)
      setRejectionReason("")
      setSelectedSpl(null)
      fetchPendingSpls()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenDetail = (spl: Spl) => {
    setDetailSpl(spl)
    setShowDetailModal(true)
  }

  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setDetailSpl(null)
  }

  // Calculate pagination
  const totalPages = Math.ceil(spls.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSpls = spls.slice(startIndex, endIndex)

  // Reset to page 1 when spls change
  useEffect(() => {
    setCurrentPage(1)
  }, [spls.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Persetujuan SPL
          </h1>
          <p className="text-gray-600 mt-1">
            Kelola pengajuan SPL yang menunggu persetujuan
          </p>
        </div>
        {spls.length > 0 && (
          <div className="text-sm sm:text-base text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
            Total: <span className="font-semibold text-blue-700">{spls.length}</span> pengajuan
          </div>
        )}
      </div>

      {/* Items per page selector */}
      {spls.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-600">Tampilkan per halaman:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-900"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}

      {spls.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-2">
            Tidak ada pengajuan SPL yang menunggu persetujuan
          </p>
          <p className="text-gray-400 text-sm">
            Semua pengajuan telah diproses
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {currentSpls.map((spl) => (
              <div key={spl.id} className="flex flex-col gap-2">
                {/* Compact SPL Card - Click to view detail */}
                <div onClick={() => handleOpenDetail(spl)}>
                  <SplCard
                    spl={spl}
                    userRole={session?.user?.role}
                    showActions={false}
                    mini={true}
                  />
                </div>

                {/* Action Buttons - Always visible for approval */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(spl.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2"
                  >
                    ✓ Setujui
                  </Button>
                  <Button
                    onClick={() => handleRejectClick(spl.id)}
                    variant="outline"
                    className="flex-1 border-red-600 text-red-600 hover:bg-red-50 text-xs py-2"
                  >
                    ✗ Tolak
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
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
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                            onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          if (!isProcessing) {
            setIsRejectModalOpen(false)
            setRejectionReason("")
            setSelectedSpl(null)
          }
        }}
        title="Tolak Pengajuan SPL"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsRejectModalOpen(false)
                setRejectionReason("")
                setSelectedSpl(null)
              }}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSubmit}
              disabled={isProcessing}
            >
              {isProcessing ? "Memproses..." : "Tolak"}
            </Button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alasan Penolakan <span className="text-red-500">*</span>
          </label>
          <textarea
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
          placeholder="Jelaskan alasan penolakan secara detail..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={isProcessing}
          />
        </div>
      </Modal>

      {/* Detail Modal - Untuk melihat informasi lengkap SPL sebelum menyetujui/menolak */}
      <SplDetailModal
        spl={detailSpl}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
