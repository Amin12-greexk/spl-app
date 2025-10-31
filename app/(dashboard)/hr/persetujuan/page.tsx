"use client"

import { useEffect, useState } from "react"
import { Spl } from "@/types"
import SplCard from "@/components/spl/SplCard"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"
import { useSession } from "next-auth/react"

export default function PersetujuanPage() {
  const { data: session } = useSession()
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSpl, setSelectedSpl] = useState<string | null>(null)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchPendingSpls = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/spl?status=PENDING")
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
    fetchPendingSpls()
  }, [])

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
          status: "REJECTED",
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
        <h1 className="text-2xl font-bold text-gray-900">
          Persetujuan SPL
        </h1>
        <p className="text-gray-600 mt-1">
          Kelola pengajuan SPL yang menunggu persetujuan
        </p>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spls.map((spl) => (
            <SplCard
              key={spl.id}
              spl={spl}
              userRole={session?.user?.role}
              onApprove={handleApprove}
              onReject={handleRejectClick}
            />
          ))}
        </div>
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
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
            placeholder="Jelaskan alasan penolakan secara detail..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={isProcessing}
          />
        </div>
      </Modal>
    </div>
  )
}