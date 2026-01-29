"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Spl } from "@/types"
import SplCard from "./SplCard"
import SplDetailModal from "./SplDetailModal"
import toast from "react-hot-toast"
import { useStaggerAnimation } from "@/hooks/useGSAP"
import gsap from "gsap"

interface SplListProps {
  userRole?: string
  userId?: string // Optional userId untuk HR yang ingin lihat SPL mereka sendiri
}

export default function SplList({
  userRole,
  userId,
}: SplListProps) {
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailSpl, setDetailSpl] = useState<Spl | null>(null)

  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [totalItems, setTotalItems] = useState(0)

  // GSAP stagger animation for cards
  const gridRef = useStaggerAnimation<HTMLDivElement>({
    stagger: 0.08,
    duration: 0.4,
    delay: 0.1,
    direction: "up",
    distance: 25,
  })

  // Track item being deleted for animation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const fetchSpls = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (userId) {
        params.append("userId", userId)
      }
      params.set("page", String(currentPage))
      params.set("limit", String(itemsPerPage))

      const response = await fetch(`/api/spl?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Gagal mengambil data SPL")
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        setSpls(data)
        setTotalItems(data.length)
      } else {
        setSpls(data.data || [])
        setTotalItems(data.pagination?.total || 0)
      }
    } catch (error: any) {
      setSpls([])
      setTotalItems(0)
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }, [userId, currentPage, itemsPerPage])

  useEffect(() => {
    fetchSpls()
  }, [fetchSpls])

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengajuan SPL ini?")) {
      return
    }

    // Start delete animation
    setDeletingId(id)
    const cardElement = cardRefs.current.get(id)

    // Animate card removal with GSAP
    if (cardElement && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await gsap.to(cardElement, {
        opacity: 0,
        scale: 0.8,
        x: -20,
        duration: 0.3,
        ease: "power2.in",
      })
    }

    try {
      const response = await fetch(`/api/spl/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        // Reset animation if delete failed
        if (cardElement) {
          gsap.to(cardElement, { opacity: 1, scale: 1, x: 0, duration: 0.2 })
        }
        throw new Error(data.error || "Gagal menghapus SPL")
      }

      toast.success("SPL berhasil dihapus")
      fetchSpls()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setDeletingId(null)
    }
  }

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + spls.length, totalItems)

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

  if (isLoading) {
    return (
      <div className="space-y-6">
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
              Menampilkan <span className="font-semibold text-gray-900">{totalItems === 0 ? 0 : startIndex + 1}</span> - <span className="font-semibold text-gray-900">{endIndex}</span> dari <span className="font-semibold text-gray-900">{totalItems}</span> SPL
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
                Belum Ada SPL
              </h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Belum ada pengajuan SPL yang dibuat. Mulai dengan membuat pengajuan baru.
              </p>
            </div>
            {userRole === "STAFF" && (
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
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6"
          >
          {spls.map((spl) => (
              <div
                key={spl.id}
                data-animate
                className={`transform-gpu ${deletingId === spl.id ? 'pointer-events-none' : ''}`}
                ref={(el) => {
                  if (el) {
                    cardRefs.current.set(spl.id, el)
                  } else {
                    cardRefs.current.delete(spl.id)
                  }
                }}
              >
                <SplCard
                  spl={spl}
                  userRole={userRole}
                  onDelete={userRole === "STAFF" ? handleDelete : undefined}
                  mini={true}
                  onClick={() => handleOpenDetail(spl)}
                />
              </div>
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
                    <span className="font-medium">{endIndex}</span> dari{" "}
                    <span className="font-medium">{totalItems}</span> hasil
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
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
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

      {/* Detail Modal - Untuk melihat informasi lengkap SPL dari riwayat */}
      <SplDetailModal
        spl={detailSpl}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
