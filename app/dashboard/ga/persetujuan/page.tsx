"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Spl } from "@/types"
import Modal from "@/components/ui/Modal"
import SplCard from "@/components/spl/SplCard"
import SplDetailModal from "@/components/spl/SplDetailModal"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"
import SignatureCanvas from "react-signature-canvas"
import Image from "next/image"

export default function GAApprovalPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const isSuperAdminQueue = session?.user.role === "SUPER_ADMIN"
  const pendingStatus = isSuperAdminQueue ? "PENDING_SUPERADMIN" : "PENDING_SUPERVISOR"
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedSpl, setSelectedSpl] = useState<Spl | null>(null)
  const [isLoadingSelectedSpl, setIsLoadingSelectedSpl] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailSpl, setDetailSpl] = useState<Spl | null>(null)
  const detailCacheRef = useRef<Record<string, Spl>>({})

  // Check authorization
  useEffect(() => {
    if (session && !["GA", "DEPARTMENT_HEAD", "SUPER_ADMIN"].includes(session.user.role)) {
      toast.error("Akses ditolak!")
      router.push("/dashboard")
    }
  }, [session, router])

  const fetchPendingSpls = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const response = await fetch(
        `/api/spl/my-team?status=${pendingStatus}&lite=1&skipCount=1&page=1&limit=30`,
        { cache: "no-store" }
      )
      if (!response.ok) throw new Error("Gagal mengambil data")

      const data = await response.json()
      const pendingSpls = Array.isArray(data) ? data : data?.data || []
      setSpls(pendingSpls)
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      if (showLoader) {
        setIsLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }, [pendingStatus])

  const fetchSplDetail = async (splId: string): Promise<Spl> => {
    const cached = detailCacheRef.current[splId]
    if (cached) {
      return cached
    }

    const response = await fetch(`/api/spl/my-team/${splId}`, {
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error("Gagal mengambil detail SPL")
    }

    const detailData = (await response.json()) as Spl
    detailCacheRef.current[splId] = detailData
    return detailData
  }

  useEffect(() => {
    if (
      session?.user.role === "GA" ||
      session?.user.role === "DEPARTMENT_HEAD" ||
      session?.user.role === "SUPER_ADMIN"
    ) {
      fetchPendingSpls()
    }
  }, [session, fetchPendingSpls])

  const handleApprove = async (spl: Spl) => {
    const cached = detailCacheRef.current[spl.id]
    setSelectedSpl(cached || spl)
    setShowApproveModal(true)

    if (cached) return

    setIsLoadingSelectedSpl(true)
    try {
      const detailData = await fetchSplDetail(spl.id)
      setSelectedSpl(detailData)
    } catch {
      // fallback tetap pakai payload lite jika detail gagal
    } finally {
      setIsLoadingSelectedSpl(false)
    }
  }

  const handleReject = (spl: Spl) => {
    const cached = detailCacheRef.current[spl.id]
    setSelectedSpl(cached || spl)
    setRejectionReason("")
    setShowRejectModal(true)
  }

  const handleOpenDetail = async (spl: Spl) => {
    const cached = detailCacheRef.current[spl.id]
    setDetailSpl(cached || spl)
    setShowDetailModal(true)

    if (cached) return

    try {
      const detailData = await fetchSplDetail(spl.id)
      setDetailSpl(detailData)
    } catch {
      // fallback tetap pakai payload lite jika detail gagal
    }
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

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error("Tanda tangan diperlukan!")
      return
    }

    setIsSubmitting(true)
    try {
      const signature = signatureRef.current.toDataURL()

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

      const approvedId = selectedSpl.id
      setSpls((prev) => prev.filter((item) => item.id !== approvedId))
      delete detailCacheRef.current[approvedId]
      toast.success("SPL berhasil disetujui!")
      setShowApproveModal(false)
      setIsLoadingSelectedSpl(false)
      setSelectedSpl(null)
      await fetchPendingSpls(false)
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

      const rejectedId = selectedSpl.id
      setSpls((prev) => prev.filter((item) => item.id !== rejectedId))
      delete detailCacheRef.current[rejectedId]
      toast.success("SPL berhasil ditolak")
      setShowRejectModal(false)
      setSelectedSpl(null)
      setRejectionReason("")
      await fetchPendingSpls(false)
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
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          {isSuperAdminQueue ? "Review SPL Telat" : "Persetujuan SPL Tim"}
        </h1>
        <p className="text-green-100">
          {isSuperAdminQueue
            ? "Tahan, review, lalu teruskan pengajuan SPL telat ke Manager"
            : "Review dan setujui pengajuan lembur dari tim Anda"}
        </p>
        {isRefreshing && (
          <p className="text-xs text-green-100/90 mt-2">Memperbarui data...</p>
        )}
      </div>

      {spls.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Semua SPL Sudah Diproses</h3>
              <p className="text-gray-500 text-sm">
                {isSuperAdminQueue
                  ? "Tidak ada SPL telat yang menunggu review Super Admin saat ini"
                  : "Tidak ada SPL yang menunggu persetujuan Anda saat ini"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {spls.map((spl) => (
            <div key={spl.id} className="flex flex-col gap-2">
              <div onClick={() => handleOpenDetail(spl)}>
                <SplCard
                  spl={spl}
                  userRole={session?.user.role}
                  showActions={false}
                  mini={true}
                  showExpiredBadge
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(spl)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2"
                  disabled={isSubmitting || isRefreshing}
                >
                  Setujui
                </Button>
                <Button
                  onClick={() => handleReject(spl)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-600 hover:bg-red-50 text-xs py-2"
                  disabled={isSubmitting || isRefreshing}
                >
                  Tolak
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

      {showApproveModal && selectedSpl && (
        <Modal
          isOpen={showApproveModal}
          onClose={() => {
            setShowApproveModal(false)
            setIsLoadingSelectedSpl(false)
            setSelectedSpl(null)
          }}
          title={isSuperAdminQueue ? "Review SPL Telat" : "Setujui SPL"}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Anda akan menyetujui SPL dari <strong>{selectedSpl.requester.name}</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {isSuperAdminQueue
                  ? "Setelah direview, SPL telat akan diteruskan ke Manager untuk persetujuan final."
                  : "Setelah disetujui, SPL akan diteruskan ke Manager untuk persetujuan final."}
              </p>
            </div>

            {isLoadingSelectedSpl && !selectedSpl.proofImage && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Memuat detail SPL...
              </div>
            )}

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
                  ref={(ref) => {
                    signatureRef.current = ref
                  }}
                  canvasProps={{
                    className: "w-full h-40 rounded-lg cursor-crosshair",
                  }}
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => signatureRef.current?.clear()}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Hapus
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowApproveModal(false)
                  setIsLoadingSelectedSpl(false)
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
                disabled={isSubmitting || isLoadingSelectedSpl}
              >
                {isSubmitting ? "Memproses..." : isSuperAdminQueue ? "Review & Teruskan" : "Setujui SPL"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showRejectModal && selectedSpl && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false)
            setSelectedSpl(null)
            setRejectionReason("")
          }}
          title={isSuperAdminQueue ? "Tolak SPL Telat" : "Tolak SPL"}
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
                {isSubmitting ? "Memproses..." : isSuperAdminQueue ? "Tolak SPL Telat" : "Tolak SPL"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <SplDetailModal
        spl={detailSpl}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
