"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import TimePicker from "@/components/ui/TimePicker"

interface User {
  id: string
  name: string
  email: string
  role: string
  departmentId: string | null
  departmentName: string | null
  department: {
    id: string
    name: string
  } | null
  supervisor: {
    name: string
    role: string
  } | null
}

export default function ManualSPLPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    userId: "",
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
    projectName: "",
  })
  const todayInputValue = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    } else {
      fetchUsers()
    }
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        // Filter only staff, teknisi, and users who can have SPL
        const filteredUsers = data.filter((u: User) =>
          ["STAFF", "TEKNISI", "GA", "DEPARTMENT_HEAD", "HR", "PRODUCTION_SUPERVISOR"].includes(u.role)
        )
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
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
      if (selectedDate > today) {
        await Swal.fire({
          icon: "warning",
          title: "Tanggal tidak diperbolehkan",
          text: "Tanggal lembur manual tidak boleh melebihi hari ini.",
        })
        return
      }

      setLoading(true)

      const response = await fetch("/api/admin/spl/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        await Swal.fire({
          icon: "success",
          title: "SPL Manual Berhasil Dibuat!",
          html: `
            <p>SPL untuk <strong>${users.find(u => u.id === formData.userId)?.name}</strong> berhasil dibuat.</p>
            <p class="text-sm text-gray-600 mt-2">User perlu menandatangani SPL ini sebelum diproses ke supervisor/manager.</p>
          `,
        })
        // Reset form
        setFormData({
          userId: "",
          date: "",
          startTime: "",
          endTime: "",
          reason: "",
          projectName: "",
        })
      } else {
        await Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: data.error,
        })
      }
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Terjadi kesalahan saat membuat SPL",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(u => u.id === formData.userId)

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

  const duration = calculateDuration()
  const overnight = isOvernightShift()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Input SPL Manual</h1>
        <p className="text-red-100 text-sm mt-1">
          Buat SPL untuk karyawan yang lupa atau terlewat tanggal
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Catatan:</strong> SPL yang dibuat manual akan membutuhkan tanda tangan dari user terlebih dahulu
            sebelum diteruskan ke supervisor/manager untuk persetujuan.</p>
            <p className="text-xs"><strong>Shift Malam:</strong> Untuk shift yang melewati tengah malam (contoh: 22:00-06:00), masukkan waktu selesai yang lebih kecil dari waktu mulai. Sistem akan otomatis menghitung durasi lintas hari.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
        {/* Select User */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Karyawan <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          >
            <option value="">-- Pilih Karyawan --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.email} ({user.role})
              </option>
            ))}
          </select>
          {selectedUser && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-700">
                <strong>Department:</strong>{" "}
                {selectedUser.department?.name || selectedUser.departmentName || "-"}
              </p>
              <p className="text-gray-700">
                <strong>Supervisor:</strong> {selectedUser.supervisor?.name || "Langsung ke Manager"}
              </p>
              {selectedUser.supervisor && (
                <p className="text-xs text-gray-500 mt-1">
                  Alur: User TTD → {selectedUser.supervisor.name} → Manager → Approved
                </p>
              )}
              {!selectedUser.supervisor && (
                <p className="text-xs text-gray-500 mt-1">
                  Alur: User TTD → Manager → Approved
                </p>
              )}
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Lembur <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            max={todayInputValue}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Waktu Mulai <span className="text-red-500">*</span>
            </label>
            <TimePicker
              value={formData.startTime}
              onChange={(value) => setFormData({ ...formData, startTime: value })}
              showWib
              required
              selectClassName="focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Waktu Selesai <span className="text-red-500">*</span>
            </label>
            <TimePicker
              value={formData.endTime}
              onChange={(value) => setFormData({ ...formData, endTime: value })}
              showWib
              required
              hint={overnight ? "Shift lintas hari terdeteksi" : undefined}
              selectClassName="focus:ring-red-500 focus:border-red-500"
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

        {/* Duration Display */}
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

        {/* Project Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Project (Opsional)
          </label>
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            placeholder="Nama project yang dikerjakan"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alasan Lembur <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Jelaskan alasan lembur..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? "Membuat SPL..." : "Buat SPL Manual"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
