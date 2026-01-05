"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import SignaturePad from "@/components/spl/SignaturePad"
import Swal from "sweetalert2"

export default function SplForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [minStart, setMinStart] = useState("16:30")
  const [formData, setFormData] = useState({
    signature: "",
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
    projectName: "",
    proofImage: "",
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    const loadMin = async () => {
      try {
        const res = await fetch("/api/settings/min-overtime")
        const data = await res.json()
        if (res.ok && data?.value) {
          setMinStart(data.value)
        }
      } catch (err) {
        console.error("Gagal mengambil setting jam minimal lembur", err)
      }
    }
    loadMin()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      await Swal.fire({
        icon: "error",
        title: "File Tidak Valid",
        text: "Harap upload file gambar (JPG, PNG, atau JPEG)",
      })
      return
    }

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      await Swal.fire({
        icon: "error",
        title: "Ukuran File Terlalu Besar",
        text: "Ukuran file maksimal 5MB",
      })
      return
    }

    // Convert ke base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setFormData({ ...formData, proofImage: base64String })
      setImagePreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, proofImage: "" })
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.signature || formData.signature.length < 30) {
      await Swal.fire({
        icon: "error",
        title: "Tanda tangan belum diisi",
        text: "Silakan isi tanda tangan sebelum mengajukan.",
      })
      return
    }

    // Security tidak memiliki batasan waktu karena berbeda-beda shift
    const userDepartment = session?.user?.department
    const isSecurityDepartment = userDepartment === "Security"

    if (!isSecurityDepartment) {
      const [minH, minM] = minStart.split(":").map(Number)
      const [startH, startM] = formData.startTime.split(":").map(Number)
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      if (!Number.isNaN(minH) && !Number.isNaN(startH)) {
        const minMinutes = minH * 60 + minM
        if (nowMinutes > minMinutes) {
          await Swal.fire({
            icon: "error",
            title: "Lewat Batas Waktu",
            text: `Pengajuan hanya bisa sebelum pukul ${minStart} (atur oleh Manager).`,
          })
          return
        }
      }
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/spl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengajukan SPL")
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "SPL berhasil diajukan!",
      })
      // Dynamic redirect based on role
      if (session?.user.role === "GA" || session?.user.role === "DEPARTMENT_HEAD") {
        router.push("/dashboard/ga/riwayat")
      } else {
        router.push("/dashboard/staff")
      }
      router.refresh()
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const [startHour, startMin] = formData.startTime.split(":").map(Number)
      const [endHour, endMin] = formData.endTime.split(":").map(Number)
      const totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      
      if (totalMinutes > 0) {
        return `${hours} jam ${minutes > 0 ? `${minutes} menit` : ''}`
      }
    }
    return null
  }

  const duration = calculateDuration()

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Pengajuan SPL Baru
            </h1>
            <p className="text-green-100">
              Isi formulir di bawah untuk mengajukan Surat Perintah Lembur
            </p>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-6 p-4 bg-white/10 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {session?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold">{session?.user?.name}</p>
              <p className="text-green-100 text-sm">{session?.user?.department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                  </svg>
                </div>
                Informasi Dasar
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tanggal */}
                <div>
                  <Input
                    label="Tanggal Lembur"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Nama Proyek */}
                <div>
                  <Input
                    label="Nama Proyek (Opsional)"
                    type="text"
                    placeholder="e.g., Project Alpha, Website Revamp"
                    value={formData.projectName}
                    onChange={(e) =>
                      setFormData({ ...formData, projectName: e.target.value })
                    }
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Time Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Waktu Lembur
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Waktu Mulai"
                  type="time"
                  placeholder="13:30"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                  required
                />
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>Format 24 jam (contoh: 13:30).</p>
                {session?.user?.department === "Security" ? (
                  <p className="text-blue-600 font-medium">
                    ℹ️ Security
                  </p>
                ) : (
                  <p>Batas maksimal pengajuan: {minStart} (atur oleh Manager). Jika sudah melewati batas tersebut, pengajuan ditolak; hubungi Manager langsung.</p>
                )}
              </div>
            </div>

              <div>
                <Input
                  label="Waktu Selesai"
                  type="time"
                  placeholder="17:00"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Pastikan lebih besar dari waktu mulai. Gunakan format HH:MM.
                </p>
              </div>
            </div>

              {/* Duration Display */}
              {duration && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-800 font-medium">
                      Durasi Lembur: {duration}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Reason Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Alasan Lembur
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Jelaskan alasan dan kebutuhan lembur <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] transition-all duration-200"
                  placeholder="Contoh: Menyelesaikan laporan bulanan yang harus diserahkan besok pagi, mengatasi masalah urgent di server production, dsb..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Berikan penjelasan yang detail dan jelas untuk memudahkan proses persetujuan
                </p>
              </div>
            </div>

            {/* Proof Image Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Foto Bukti Pengerjaan Lembur <span className="text-sm font-normal text-gray-500">(Opsional)</span>
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload foto bukti pengerjaan lembur <span className="text-gray-500 font-normal">(Opsional)</span>
                </label>
                <p className="text-xs text-gray-600 mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="font-semibold text-blue-800">ℹ️ Informasi:</span>
                  <span className="text-blue-900 ml-1">
                    Foto bukti opsional.
                  </span>
                </p>

                {!imagePreview ? (
                  <div className="mt-2">
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
                        <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-600 font-semibold text-center">
                          <span className="text-indigo-600">Klik untuk upload</span> atau drag & drop
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          PNG, JPG, atau JPEG (Max. 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="mt-2 relative">
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                      <img
                        src={imagePreview}
                        alt="Preview foto bukti"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all duration-200 transform hover:scale-110"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Foto berhasil diupload</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Ganti Foto
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  Upload foto sebagai bukti bahwa pekerjaan lembur telah selesai dikerjakan. Foto ini akan dilihat oleh atasan Anda.
                </p>
              </div>
            </div>

            {/* Signature Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12c2.28-2.04 4.68-3.06 7.2-3.06.86 0 1.58.7 1.58 1.56 0 6.6-4.98 9.5-8.78 9.5-2.5 0-4.06-1.24-4.06-3.02 0-1.58 1.04-2.78 2.88-2.78 1.02 0 1.96.34 3.08 1.06l.8-.66C11.1 13.22 8.8 12.5 6.6 12.5c-1.76 0-3.12 1.08-3.12 2.6 0 1.78 1.86 3.16 4.52 3.16 2.56 0 5.74-1.44 7.64-3.74-.44 2.72-2.72 4.6-5.96 4.6-3.7 0-6.68-2.42-6.68-6.06C2 9.16 5.26 6 9.98 6c2.3 0 4.28.9 5.66 2.34l.98-.92C14.84 5.62 12.7 4.8 10.1 4.8 4.96 4.8 1 8.64 1 13.06 1 17.02 3.86 20 8.1 20c4.92 0 8.9-3.52 8.9-8.94 0-1.88-1.3-3.12-3.8-3.12-2.1 0-3.96 1.02-5.2 2.06z" />
                  </svg>
                </div>
                Tanda Tangan Pengajuan
              </h2>

              <SignaturePad
                value={formData.signature}
                onChange={(signature) => setFormData({ ...formData, signature })}
              />
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Panduan Pengajuan SPL
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Jelaskan alasan lembur dengan detail dan jelas
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Anda akan mendapat notifikasi status persetujuan via sistem
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Sedang Mengajukan...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Ajukan SPL
                  </div>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="sm:w-auto px-6 py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Batal
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
