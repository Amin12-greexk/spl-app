"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Spl } from "@/types"
import Modal from "@/components/ui/Modal"
import SplCard from "@/components/spl/SplCard"
import SplDetailModal from "@/components/spl/SplDetailModal"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import SignatureCanvas from "react-signature-canvas"
import Image from "next/image"

export default function GAApprovalPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSpl, setSelectedSpl] = useState<Spl | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailSpl, setDetailSpl] = useState<Spl | null>(null)

  const formatRealizationTime = (value?: string | Date | null) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return format(date, "HH:mm", { locale: id })
  }

  const formatTotalHours = (value?: number | string | null) => {
    if (value === null || value === undefined) return "-"
    const numericValue = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(numericValue)) return "-"
    const totalMinutes = Math.round(numericValue * 60)
    if (totalMinutes <= 0) return "0 menit"
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} menit`
    if (minutes === 0) return `${hours} jam`
    return `${hours} jam ${minutes} menit`
  }

  // Check authorization
  useEffect(() => {
    if (session && !["GA", "DEPARTMENT_HEAD"].includes(session.user.role)) {
      toast.error("Akses ditolak!")
      router.push("/dashboard")
    }
  }, [session, router])

  // Fetch pending SPLs
  const fetchPendingSpls = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        "/api/spl/my-team?status=PENDING_SUPERVISOR&page=1&limit=50"
      )
      if (!response.ok) throw new Error("Gagal mengambil data")

      const data = await response.json()
      const pendingSpls = Array.isArray(data) ? data : data?.data || []
      setSpls(pendingSpls)
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user.role === "GA" || session?.user.role === "DEPARTMENT_HEAD") {
      fetchPendingSpls()
    }
  }, [session])

  const handleApprove = (spl: Spl) => {
    setSelectedSpl(spl)
    setShowApproveModal(true)
  }

  const handleReject = (spl: Spl) => {
    setSelectedSpl(spl)
    setRejectionReason("")
    setShowRejectModal(true)
  }

  const handleOpenDetail = (spl: Spl) => {
    setDetailSpl(spl)
    setShowDetailModal(true)
  }

  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setDetailSpl(null)
  }

  const openPreview = (src?: string | null, title = "") => {
    if (!src) return
    setPreviewImage(src)
    setPreviewTitle(title)
  }

  const closePreview = () => {
    setPreviewImage(null)
    setPreviewTitle("")
  }

  const submitApproval = async () => {
    if (!selectedSpl) return

    if (!signatureRef || signatureRef.isEmpty()) {
      toast.error("Tanda tangan diperlukan!")
      return
    }

    setIsSubmitting(true)
    try {
      const signature = signatureRef.toDataURL()

      const response = await fetch("/api/spl/approve-supervisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splId: selectedSpl.id,
          signature,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Gagal menyetujui")

      toast.success("SPL berhasil disetujui!")
      setShowApproveModal(false)
      setSelectedSpl(null)
      fetchPendingSpls()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitRejection = async () => {
    if (!selectedSpl) return

    if (!rejectionReason.trim()) {
      toast.error("Alasan penolakan harus diisi!")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/spl/reject-supervisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splId: selectedSpl.id,
          rejectionReason: rejectionReason.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Gagal menolak")

      toast.success("SPL berhasil ditolak")
      setShowRejectModal(false)
      setSelectedSpl(null)
      setRejectionReason("")
      fetchPendingSpls()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-gray-600 text-sm">Memuat SPL...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          ✅ Persetujuan SPL Tim
        </h1>
        <p className="text-green-100">
          Review dan setujui pengajuan lembur dari tim Anda
        </p>
      </div>

      {/* SPL Cards */}
      {spls.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Semua SPL Sudah Diproses
              </h3>
              <p className="text-gray-500 text-sm">
                Tidak ada SPL yang menunggu persetujuan Anda saat ini
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {spls.map((spl) => (
            <div key={spl.id} className="flex flex-col gap-2">
              {/* Compact SPL Card - Click to view detail */}
              <div onClick={() => handleOpenDetail(spl)}>
                <SplCard
                  spl={spl}
                  userRole={session?.user.role}
                  showActions={false}
                  mini={true}
                  showExpiredBadge
                />
              </div>

              {/* Action Buttons - Always visible for approval */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(spl)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2"
                >
                  ✓ Setujui
                </Button>
                <Button
                  onClick={() => handleReject(spl)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-600 hover:bg-red-50 text-xs py-2"
                >
                  ✗ Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewImage && (
        <Modal
          isOpen={Boolean(previewImage)}
          onClose={closePreview}
          title={previewTitle || "Preview Foto"}
        >
          <div className="space-y-3">
            <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={previewImage}
                alt={previewTitle || "Preview foto"}
                fill
                sizes="(max-width: 768px) 100vw, 700px"
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={closePreview}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedSpl && (
        <Modal
          isOpen={showApproveModal}
          onClose={() => {
            setShowApproveModal(false)
            setSelectedSpl(null)
          }}
          title="Setujui SPL"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Anda akan menyetujui SPL dari <strong>{selectedSpl.requester.name}</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Setelah disetujui, SPL akan diteruskan ke Manager untuk persetujuan final.
              </p>
            </div>

            {/* Show proof image in modal */}
            {selectedSpl.proofImage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto Bukti Pengerjaan:
                </label>
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                  <Image
                    src={selectedSpl.proofImage}
                    alt="Foto bukti pengerjaan"
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-contain cursor-pointer"
                    unoptimized
                    onClick={() => openPreview(selectedSpl.proofImage, "Foto bukti pengerjaan")}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">Klik untuk melihat ukuran penuh</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanda Tangan Anda <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-gray-300 rounded-lg bg-white">
                <SignatureCanvas
                  ref={(ref) => setSignatureRef(ref)}
                  canvasProps={{
                    className: "w-full h-40 rounded-lg cursor-crosshair",
                  }}
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => signatureRef?.clear()}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedSpl(null)
                }}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                onClick={submitApproval}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Setujui SPL"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedSpl && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false)
            setSelectedSpl(null)
            setRejectionReason("")
          }}
          title="Tolak SPL"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                Anda akan menolak SPL dari <strong>{selectedSpl.requester.name}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                placeholder="Jelaskan alasan penolakan..."
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedSpl(null)
                  setRejectionReason("")
                }}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                onClick={submitRejection}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Tolak SPL"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal - Untuk melihat informasi lengkap SPL */}
      <SplDetailModal
        spl={detailSpl}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
