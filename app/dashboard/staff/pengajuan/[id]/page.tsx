"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Spl } from "@/types"
import Button from "@/components/ui/Button"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import toast from "react-hot-toast"
import { getEffectiveHours } from "@/lib/spl-hours"

export default function SplDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [spl, setSpl] = useState<Spl | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSpl = async () => {
      try {
        const response = await fetch(`/api/spl/${params.id}`)
        if (!response.ok) {
          throw new Error("Gagal mengambil data SPL")
        }

        const data = await response.json()
        setSpl(data)
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan")
        router.push("/dashboard/staff")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpl()
  }, [params.id, router])

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengajuan SPL ini?")) {
      return
    }

    try {
      const response = await fetch(`/api/spl/${params.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Gagal menghapus SPL")
      }

      toast.success("SPL berhasil dihapus")
      router.push("/dashboard/staff")
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!spl) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data SPL tidak ditemukan</p>
      </div>
    )
  }

  const formatHoursDisplay = (value?: number | null) => {
    if (value === null || value === undefined) return "-"
    if (!Number.isFinite(value)) return "-"
    const totalMinutes = Math.round(value * 60)
    if (totalMinutes < 30) return "0 menit"
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} menit`
    if (minutes === 0) return `${hours} jam`
    return `${hours} jam ${minutes} menit`
  }

  const effectiveHours = getEffectiveHours(spl)
  const displayHoursText = formatHoursDisplay(effectiveHours ?? spl.totalHours)

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu Persetujuan",
      },
      PENDING_SUPERVISOR: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        label: "Menunggu Supervisor",
      },
      PENDING_MANAGER: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "Menunggu Manager",
      },
      APPROVED: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Disetujui",
      },
      IN_PROGRESS: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Sedang Berjalan",
      },
      DONE: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Selesai",
      },
      REJECTED: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak",
      },
      REJECTED_BY_SUPERVISOR: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak oleh Supervisor",
      },
      REJECTED_BY_MANAGER: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak oleh Manager",
      },
    }

    const config = statusConfig[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: status,
    }

    return (
      <span
        className={`px-4 py-2 text-sm font-semibold rounded-full ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Detail SPL</h1>
        <Button variant="secondary" onClick={() => router.back()}>
          Kembali
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {spl.requester.name}
            </h2>
            <p className="text-gray-600">{spl.requester.email}</p>
          </div>
          {getStatusBadge(spl.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500 block mb-2">
              Tanggal Lembur
            </label>
            <p className="text-gray-900 font-medium">
              {format(new Date(spl.date), "dd MMMM yyyy", { locale: id })}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 block mb-2">
              Total Jam
            </label>
            <p className="text-gray-900 font-medium">{displayHoursText}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 block mb-2">
              Waktu Mulai
            </label>
            <p className="text-gray-900 font-medium">{spl.startTime}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 block mb-2">
              Waktu Selesai
            </label>
            <p className="text-gray-900 font-medium">{spl.endTime}</p>
          </div>

          {spl.projectName && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500 block mb-2">
                Nama Proyek
              </label>
              <p className="text-gray-900 font-medium">{spl.projectName}</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 block mb-2">
            Alasan Lembur
          </label>
          <p className="text-gray-900 bg-gray-50 p-4 rounded-md">
            {spl.reason}
          </p>
        </div>

        {spl.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <label className="text-sm font-medium text-red-900 block mb-2">
              Alasan Penolakan
            </label>
            <p className="text-red-800">{spl.rejectionReason}</p>
          </div>
        )}

        {spl.approver && (
          <div className="pt-4 border-t">
            <label className="text-sm font-medium text-gray-500 block mb-2">
              Diproses oleh
            </label>
            <p className="text-gray-900">
              {spl.approver.name} ({spl.approver.email})
            </p>
            {spl.approvalDate && (
              <p className="text-sm text-gray-500 mt-1">
                Pada{" "}
                {format(new Date(spl.approvalDate), "dd MMMM yyyy HH:mm", {
                  locale: id,
                })}
              </p>
            )}
          </div>
        )}

        {(spl.status === "PENDING" || spl.status === "PENDING_SUPERVISOR" || spl.status === "PENDING_MANAGER") && (
          <div className="pt-4 border-t">
            <Button variant="danger" onClick={handleDelete} className="w-full">
              Hapus Pengajuan
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
