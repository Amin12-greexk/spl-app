"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Swal from "sweetalert2"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string | null
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
    setLoading(true)

    try {
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
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <strong>Catatan:</strong> SPL yang dibuat manual akan membutuhkan tanda tangan dari user terlebih dahulu
            sebelum diteruskan ke supervisor/manager untuk persetujuan.
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                <strong>Department:</strong> {selectedUser.department || "-"}
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Waktu Mulai <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Waktu Selesai <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
        </div>

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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
