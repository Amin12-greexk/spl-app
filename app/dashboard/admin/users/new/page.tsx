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
  position: string | null
}

const ROLES = [
  { value: "STAFF", label: "Staff" },
  { value: "TEKNISI", label: "Teknisi" },
  { value: "GA", label: "GA" },
  { value: "HR", label: "HR" },
  { value: "PRODUCTION_SUPERVISOR", label: "Production Supervisor" },
  { value: "DEPARTMENT_HEAD", label: "Kepala Departemen" },
  { value: "MANAGER", label: "Manager" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
]

export default function NewUserPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [supervisors, setSupervisors] = useState<User[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    pin: "",
    role: "STAFF",
    department: "",
    position: "",
    supervisorId: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    } else {
      fetchSupervisors()
    }
  }, [session, status, router])

  const fetchSupervisors = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        // Filter users who can be supervisors
        const potentialSupervisors = data.filter((u: User) =>
          ["GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "MANAGER"].includes(u.role)
        )
        setSupervisors(potentialSupervisors)
      }
    } catch (error) {
      console.error("Error fetching supervisors:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "User berhasil dibuat",
        })
        router.push("/dashboard/admin/users")
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
        text: "Terjadi kesalahan",
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tambah User Baru</h1>
        <p className="text-gray-600 text-sm mt-1">Buat akun user baru untuk sistem SPL</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        {/* Password & PIN */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN (6 digit) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              maxLength={6}
              pattern="\d{6}"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Department & Position */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departemen
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="IT, HR, Production, etc"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posisi
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="Security, IT Staff, Admin, etc"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Supervisor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supervisor (Opsional)
          </label>
          <select
            value={formData.supervisorId}
            onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">-- Tidak Ada Supervisor --</option>
            {supervisors.map((supervisor) => (
              <option key={supervisor.id} value={supervisor.id}>
                {supervisor.name} - {supervisor.role} ({supervisor.position || "-"})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Jika tidak ada supervisor, SPL akan langsung ke Manager
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? "Membuat User..." : "Buat User"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/users")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
