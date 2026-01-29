"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import SignaturePad from "@/components/spl/SignaturePad"
import TimePicker from "@/components/ui/TimePicker"
import Swal from "sweetalert2"

const SECURITY_SHIFT_PRESETS = [
  { id: "P1", label: "P1 (07:00-15:00)", start: "07:00", end: "15:00" },
  { id: "P2", label: "P2 (11:00-19:00)", start: "11:00", end: "19:00" },
  { id: "M1", label: "M1 (16:00-04:00)", start: "16:00", end: "04:00" },
  { id: "M2", label: "M2 (23:00-07:00)", start: "23:00", end: "07:00" },
]
const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])

export default function SplForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [minStart, setMinStart] = useState("16:30")
  const [regularHours, setRegularHours] = useState<{
    start: string | null
    end: string | null
  } | null>(null)
  const [regularHoursOriginal, setRegularHoursOriginal] = useState<{
    start: string | null
    end: string | null
  } | null>(null)
  const [regularHoursLoading, setRegularHoursLoading] = useState(false)
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
  const [showPhotoSection, setShowPhotoSection] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [showRegularHours, setShowRegularHours] = useState(false)
  const departmentKey = (session?.user?.department || "").toLowerCase()
  const isSecurityDepartment = departmentKey === "security"
  const isGaSupervisedDepartment = GA_SUPERVISED_DEPARTMENTS.has(departmentKey)
  const todayInputValue = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })()

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

  useEffect(() => {
    const loadRegularHours = async () => {
      if (!session?.user?.id || session.user.role === "MANAGER") return
      setRegularHoursLoading(true)
      try {
        const targetDate = formData.date || todayInputValue
        const res = await fetch(
          `/api/user/profile?date=${encodeURIComponent(targetDate)}`
        )
        if (!res.ok) {
          throw new Error("Gagal mengambil jam reguler")
        }
        const data = await res.json()
        const loadedHours = {
          start: data?.regularStartTime || null,
          end: data?.regularEndTime || null,
        }
        setRegularHours(loadedHours)
        setRegularHoursOriginal(loadedHours)
      } catch (err) {
        console.error("Gagal mengambil jam reguler:", err)
        setRegularHours(null)
        setRegularHoursOriginal(null)
      } finally {
        setRegularHoursLoading(false)
      }
    }
    loadRegularHours()
  }, [session?.user?.id, session?.user?.role, formData.date, todayInputValue])

  const parseTimeToMinutes = (value: string) => {
    if (!value || typeof value !== "string") return null
    const trimmed = value.trim()
    if (!/^\d{2}:\d{2}$/.test(trimmed)) return null
    const [hour, minute] = trimmed.split(":").map(Number)
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null
    }
    return hour * 60 + minute
  }

  const normalizeTimeValue = (value?: string | null) => {
    if (!value || typeof value !== "string") return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  type TimeRange = { start: number; end: number }
  const DAY_MINUTES = 24 * 60

  const toRanges = (start: number, end: number): TimeRange[] => {
    if (start < end) return [{ start, end }]
    return [
      { start, end: DAY_MINUTES },
      { start: 0, end },
    ]
  }

  const rangesOverlap = (a: TimeRange, b: TimeRange) =>
    a.start < b.end && b.start < a.end

  const hasOverlap = (aRanges: TimeRange[], bRanges: TimeRange[]) =>
    aRanges.some((a) => bRanges.some((b) => rangesOverlap(a, b)))

  const handleRegularStartChange = (value: string) => {
    setRegularHours((prev) => ({
      start: value || null,
      end: prev?.end || null,
    }))
  }

  const handleRegularEndChange = (value: string) => {
    setRegularHours((prev) => ({
      start: prev?.start || null,
      end: value || null,
    }))
  }

  const canEditRegularHours = isSecurityDepartment && !regularHoursLoading

  const securityShiftPreset = (() => {
    if (!isSecurityDepartment) return "CUSTOM"
    const normalizedStart = normalizeTimeValue(regularHours?.start)
    const normalizedEnd = normalizeTimeValue(regularHours?.end)
    if (!normalizedStart || !normalizedEnd) return "CUSTOM"
    const matched = SECURITY_SHIFT_PRESETS.find(
      (shift) => shift.start === normalizedStart && shift.end === normalizedEnd
    )
    return matched ? matched.id : "CUSTOM"
  })()

  const handleSecurityShiftChange = (value: string) => {
    if (value === "CUSTOM") return
    const matched = SECURITY_SHIFT_PRESETS.find((shift) => shift.id === value)
    if (!matched) return
    setRegularHours({ start: matched.start, end: matched.end })
  }

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

    const selectedDate = new Date(`${formData.date}T00:00:00`)
    if (Number.isNaN(selectedDate.getTime())) {
      await Swal.fire({
        icon: "error",
        title: "Tanggal tidak valid",
        text: "Silakan pilih tanggal lembur yang valid.",
      })
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      await Swal.fire({
        icon: "warning",
        title: "Tanggal tidak diperbolehkan",
        text: "Tanggal lembur tidak boleh sebelum hari ini.",
      })
      return
    }

    const normalizedRegularStart = normalizeTimeValue(regularHours?.start)
    const normalizedRegularEnd = normalizeTimeValue(regularHours?.end)

    const proofImageValue = (formData.proofImage || "").trim()
    if (isGaSupervisedDepartment && proofImageValue.length < 30) {
      await Swal.fire({
        icon: "error",
        title: "Foto bukti wajib diunggah",
        text: "Untuk departemen yang disupervisi GA, unggah foto bukti lembur terlebih dahulu.",
      })
      return
    }

    if (isSecurityDepartment) {
      if (
        (normalizedRegularStart && !normalizedRegularEnd) ||
        (!normalizedRegularStart && normalizedRegularEnd)
      ) {
        await Swal.fire({
          icon: "error",
          title: "Jam reguler belum lengkap",
          text: "Jam mulai dan selesai harus diisi bersamaan.",
        })
        return
      }

      if (normalizedRegularStart && normalizedRegularEnd) {
        const regularStartMinutes = parseTimeToMinutes(normalizedRegularStart)
        const regularEndMinutes = parseTimeToMinutes(normalizedRegularEnd)

        if (regularStartMinutes === null || regularEndMinutes === null) {
          await Swal.fire({
            icon: "error",
            title: "Format jam reguler tidak valid",
            text: "Gunakan format HH:MM untuk jam kerja reguler.",
          })
          return
        }

        // Allow overnight shifts for Security (end time < start time means next day)
        if (regularStartMinutes === regularEndMinutes) {
          await Swal.fire({
            icon: "error",
            title: "Jam reguler tidak valid",
            text: "Jam selesai tidak boleh sama dengan jam mulai.",
          })
          return
        }
      }
    }

    if (normalizedRegularStart && normalizedRegularEnd) {
      const startMinutes = parseTimeToMinutes(formData.startTime)
      const endMinutes = parseTimeToMinutes(formData.endTime)
      const regularStartMinutes = parseTimeToMinutes(normalizedRegularStart)
      const regularEndMinutes = parseTimeToMinutes(normalizedRegularEnd)

      if (
        startMinutes === null ||
        endMinutes === null ||
        regularStartMinutes === null ||
        regularEndMinutes === null
      ) {
        await Swal.fire({
          icon: "error",
          title: "Format jam tidak valid",
          text: "Periksa format jam lembur atau jam reguler.",
        })
        return
      }

      const overtimeRanges = toRanges(startMinutes, endMinutes)
      const regularRanges = toRanges(regularStartMinutes, regularEndMinutes)
      if (hasOverlap(overtimeRanges, regularRanges)) {
        await Swal.fire({
          icon: "warning",
          title: "Waktu lembur bentrok",
          text: `Waktu lembur tidak boleh bentrok dengan jam kerja reguler (${normalizedRegularStart} - ${normalizedRegularEnd}).`,
        })
        return
      }
    }

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
      const originalRegularStart = normalizeTimeValue(regularHoursOriginal?.start)
      const originalRegularEnd = normalizeTimeValue(regularHoursOriginal?.end)
      const regularHoursChanged =
        isSecurityDepartment &&
        (normalizedRegularStart !== originalRegularStart ||
          normalizedRegularEnd !== originalRegularEnd)

      if (regularHoursChanged) {
        const updateResponse = await fetch("/api/user/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            regularStartTime: normalizedRegularStart,
            regularEndTime: normalizedRegularEnd,
          }),
        })

        const updateData = await updateResponse.json()
        if (!updateResponse.ok) {
          throw new Error(updateData.error || "Gagal menyimpan jam reguler")
        }

        setRegularHoursOriginal({
          start: normalizedRegularStart,
          end: normalizedRegularEnd,
        })
      }

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
      router.push("/dashboard")
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
      let totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin)

      // Handle overnight shift (crossing midnight)
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60 // Add 24 hours
      }

      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      if (totalMinutes > 0) {
        return `${hours} jam ${minutes > 0 ? `${minutes} menit` : ''}`
      }
    }
    return null
  }

  const isOvernightShift = () => {
    if (formData.startTime && formData.endTime) {
      const startMinutes = parseTimeToMinutes(formData.startTime)
      const endMinutes = parseTimeToMinutes(formData.endTime)
      if (startMinutes !== null && endMinutes !== null) {
        return endMinutes < startMinutes
      }
    }
    return false
  }

  const isOvernightRegularShift = () => {
    const normalizedStart = normalizeTimeValue(regularHours?.start)
    const normalizedEnd = normalizeTimeValue(regularHours?.end)
    if (normalizedStart && normalizedEnd) {
      const startMinutes = parseTimeToMinutes(normalizedStart)
      const endMinutes = parseTimeToMinutes(normalizedEnd)
      if (startMinutes !== null && endMinutes !== null) {
        return endMinutes < startMinutes
      }
    }
    return false
  }

  const duration = calculateDuration()
  const overnight = isOvernightShift()
  const overnightRegular = isOvernightRegularShift()

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 sm:p-6 text-white shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Pengajuan SPL</h1>
              <p className="text-green-100 text-xs sm:text-sm">{session?.user?.name} • {session?.user?.department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Basic Info - Compact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal */}
              <Input
                label="Tanggal Lembur"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                min={todayInputValue}
                required
              />

              {/* Nama Proyek */}
              <Input
                label="Nama Proyek (Opsional)"
                type="text"
                placeholder="e.g., Project Alpha"
                value={formData.projectName}
                onChange={(e) =>
                  setFormData({ ...formData, projectName: e.target.value })
                }
                className="border-gray-200 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            {/* Jam Reguler - Collapsible */}
            {session?.user?.id && session?.user?.role !== "MANAGER" && (
              <div className="border border-gray-200 rounded-lg overflow-visible">
                <button
                  type="button"
                  onClick={() => setShowRegularHours(!showRegularHours)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-micro flex items-center justify-between text-left rounded-t-lg"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">Jam Kerja Reguler</span>
                    {regularHours?.start && regularHours?.end && (
                      <span className="text-xs text-gray-500 ml-2 flex items-center gap-1">
                        ({regularHours.start} - {regularHours.end})
                        {overnightRegular && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                            Keesokan Hari
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showRegularHours ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showRegularHours && (
                  <div className="p-4 bg-white border-t border-gray-200 motion-safe:animate-slide-down relative z-10">
                    {isSecurityDepartment && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Shift Security
                        </label>
                        <select
                          value={securityShiftPreset}
                          onChange={(e) => handleSecurityShiftChange(e.target.value)}
                          disabled={!canEditRegularHours}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-60"
                        >
                          <option value="CUSTOM">Manual / Custom</option>
                          {SECURITY_SHIFT_PRESETS.map((shift) => (
                            <option key={shift.id} value={shift.id}>
                              {shift.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Pilih shift untuk mengisi jam reguler otomatis.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                      <div className="relative z-20">
                        <TimePicker
                          label="Mulai"
                          value={regularHours?.start || ""}
                          onChange={canEditRegularHours ? handleRegularStartChange : () => {}}
                          disabled={!canEditRegularHours}
                          showWib
                          hourPlaceholder={canEditRegularHours ? "HH" : "--"}
                          minutePlaceholder={canEditRegularHours ? "MM" : "--"}
                          selectClassName="border-gray-200 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div className="relative z-20">
                        <TimePicker
                          label="Selesai"
                          value={regularHours?.end || ""}
                          onChange={canEditRegularHours ? handleRegularEndChange : () => {}}
                          disabled={!canEditRegularHours}
                          showWib
                          hourPlaceholder={canEditRegularHours ? "HH" : "--"}
                          minutePlaceholder={canEditRegularHours ? "MM" : "--"}
                          selectClassName="border-gray-200 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                    {isSecurityDepartment && (
                      <p className="mt-2 text-xs text-blue-600">
                        <strong>Khusus Security:</strong> Pilih shift P1/P2/M1/M2 atau isi manual. Untuk shift malam yang melewati tengah malam, masukkan waktu selesai yang lebih kecil dari waktu mulai (contoh: 16:00 - 04:00).
                      </p>
                    )}
                    {!regularHoursLoading && !isSecurityDepartment && (!regularHours?.start || !regularHours?.end) && (
                      <p className="mt-2 text-xs text-gray-600">
                        Jam reguler belum diatur. Hubungi Super Admin.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Waktu Lembur - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TimePicker
                label="Waktu Mulai Lembur"
                value={formData.startTime}
                onChange={(value) => setFormData({ ...formData, startTime: value })}
                showWib
                required
                hint={isSecurityDepartment ? "Security: sesuaikan dengan waktu pulang" : `Batas pengajuan: ${minStart}`}
                selectClassName="border-gray-200 focus:ring-green-500 focus:border-green-500"
              />

              <div className="relative">
                <TimePicker
                  label="Waktu Selesai Lembur"
                  value={formData.endTime}
                  onChange={(value) => setFormData({ ...formData, endTime: value })}
                  showWib
                  required
                  hint={overnight ? "Lembur lintas hari terdeteksi" : "Harus lebih besar dari waktu mulai"}
                  selectClassName="border-gray-200 focus:ring-green-500 focus:border-green-500"
                />
                {overnight && (
                  <div className="absolute top-8 right-0">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Keesokan Hari
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Duration Display - Inline */}
            {duration && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-green-800 font-medium">
                  Durasi: {duration}
                </span>
                {overnight && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    Lintas Hari
                  </span>
                )}
              </div>
            )}

            {/* Alasan Lembur - Compact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Lembur <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Jelaskan alasan dan kebutuhan lembur secara detail..."
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[100px] motion-safe:transition-all motion-safe:duration-200"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </div>

            {/* Foto Bukti - Collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-visible">
              <button
                type="button"
                onClick={() => setShowPhotoSection(!showPhotoSection)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-micro flex items-center justify-between text-left rounded-t-lg"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">Foto Bukti Lembur</span>
                  {isGaSupervisedDepartment ? (
                    <span className="text-xs text-red-500">(Wajib)</span>
                  ) : (
                    <span className="text-xs text-gray-500">(Opsional)</span>
                  )}
                  {imagePreview && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">✓ Uploaded</span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showPhotoSection ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPhotoSection && (
                <div className="p-4 bg-white border-t border-gray-200 motion-safe:animate-slide-down">
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-micro">
                      <div className="flex flex-col items-center justify-center py-4 px-4">
                        <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-xs text-gray-600 text-center">
                          <span className="font-semibold text-green-600">Klik untuk upload</span>
                          <br />
                          PNG, JPG (Max 5MB)
                        </p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  ) : (
                    <div className="relative">
                      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          width={1200}
                          height={800}
                          className="w-full h-auto max-h-64 object-contain"
                          style={{ width: "100%", height: "auto" }}
                          sizes="100vw"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-micro"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tanda Tangan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Tanda Tangan <span className="text-red-500">*</span>
              </label>
              <SignaturePad
                value={formData.signature}
                onChange={(signature) => setFormData({ ...formData, signature })}
              />
            </div>

            {/* Guidelines - Collapsible */}
            <div className="border border-blue-200 rounded-lg overflow-visible bg-blue-50">
              <button
                type="button"
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="w-full px-4 py-3 hover:bg-blue-100 transition-micro flex items-center justify-between text-left rounded-t-lg"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-900">Panduan Pengajuan SPL</span>
                </div>
                <svg
                  className={`w-5 h-5 text-blue-600 transition-transform ${showGuidelines ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showGuidelines && (
                <div className="px-4 pb-3 border-t border-blue-200 bg-blue-50 motion-safe:animate-slide-down">
                  <ul className="text-xs text-blue-800 space-y-1.5 mt-3">
                    <li className="flex items-start">
                      <svg className="w-3 h-3 mr-2 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Jelaskan alasan lembur dengan detail dan jelas
                    </li>
                    <li className="flex items-start">
                      <svg className="w-3 h-3 mr-2 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Notifikasi status persetujuan akan dikirim via sistem
                    </li>
                  </ul>
                </div>
              )}
            </div>

          </div>
        </form>
      </div>

      {/* Sticky Action Buttons - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-40 motion-safe:animate-slide-up">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="px-6 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Batal</span>
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <div className="spinner h-5 w-5 mr-2"></div>
                  <span className="hidden sm:inline">Sedang Mengajukan...</span>
                  <span className="sm:hidden">Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden sm:inline">Ajukan SPL</span>
                  <span className="sm:hidden">Ajukan</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
