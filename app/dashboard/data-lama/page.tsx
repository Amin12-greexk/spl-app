"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import SignaturePad from "@/components/spl/SignaturePad"
import Button from "@/components/ui/Button"
import Swal from "sweetalert2"

interface LegacySpl {
  id: string
  date: string
  startTime: string
  endTime: string
  totalHours: number
  reason: string
  projectName: string | null
  status: string
  supervisor: {
    id: string
    name: string
    role: string
  } | null
}

export default function DataLamaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [spls, setSpls] = useState<LegacySpl[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSpl, setSelectedSpl] = useState<LegacySpl | null>(null)
  const [signature, setSignature] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (session?.user?.role === "MANAGER") {
      router.push("/dashboard")
      return
    }
    if (session) {
      fetchLegacySpls()
    }
  }, [session, status, router])

  const fetchLegacySpls = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/spl/legacy")
      if (!response.ok) {
        throw new Error("Gagal mengambil data lama")
      }
      const data = await response.json()
      setSpls(data)
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      })
    } finally {
      setLoading(false)
    }
  }

  const openSignature = (spl: LegacySpl) => {
    setSelectedSpl(spl)
    setSignature("")
  }

  const closeSignature = () => {
    setSelectedSpl(null)
    setSignature("")
  }

  const handleSign = async () => {
    if (!selectedSpl) return

    if (!signature || signature.length < 30) {
      await Swal.fire({
        icon: "error",
        title: "Tanda tangan belum diisi",
        text: "Silakan isi tanda tangan sebelum menyimpan.",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/spl/legacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splId: selectedSpl.id,
          signature,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan tanda tangan")
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Tanda tangan berhasil disimpan dan SPL dikirim ke atasan.",
      })
      setSpls((prev) => prev.filter((item) => item.id !== selectedSpl.id))
      closeSignature()
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Data Lama SPL</h1>
        <p className="text-green-100 text-sm mt-1">
          Data lembur sebelum sistem berjalan yang menunggu tanda tangan Anda
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            Data lama sebelum sistem dibuat. Wajib TTD dulu sebelum diproses oleh atasan.
          </div>
        </div>
      </div>

      {spls.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-gray-600">Tidak ada data lama yang menunggu tanda tangan</div>
          <div className="text-xs text-gray-500 mt-1">
            Jika ada data lama, akan tampil di sini untuk ditandatangani.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {spls.map((spl) => (
            <div key={spl.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover-lift glow-green">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {new Date(spl.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {spl.startTime} - {spl.endTime} - {spl.totalHours} jam
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    Data Lama
                  </span>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                    Menunggu TTD
                  </span>
                </div>
              </div>

              {spl.projectName && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Project:</span> {spl.projectName}
                </p>
              )}

              <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                <span className="font-medium">Alasan:</span> {spl.reason}
              </p>

              <p className="text-xs text-gray-500 mb-4">
                Atasan: {spl.supervisor?.name || "Manager"}
              </p>

              <Button
                onClick={() => openSignature(spl)}
                size="sm"
                className="w-full motion-safe:hover:scale-[1.02]"
              >
                Tanda Tangan
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Signature Modal */}
      {selectedSpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 motion-safe:animate-fade-in" onClick={closeSignature} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 motion-safe:animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Tanda Tangan Data Lama
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {new Date(selectedSpl.date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })} - {selectedSpl.startTime} - {selectedSpl.endTime}
            </p>

            <SignaturePad value={signature} onChange={setSignature} />

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                onClick={handleSign}
                disabled={submitting}
                className={`flex-1 ${submitting ? "btn-loading" : ""}`}
              >
                {submitting ? (
                  <>
                    <div className="spinner h-5 w-5 mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Tanda Tangan"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeSignature}
                disabled={submitting}
                className="flex-1"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
