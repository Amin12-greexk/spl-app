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
  position: string | null
  supervisor: {
    id: string
    name: string
    role: string
    position: string | null
  } | null
  subordinates: {
    id: string
    name: string
    email: string
    role: string
  }[]
  _count: {
    splRequests: number
  }
}

const ROLES = [
  { value: "STAFF", label: "Staff" },
  { value: "TEKNISI", label: "Teknisi" },
  { value: "DRIVER", label: "Driver" },
  { value: "GA", label: "GA" },
  { value: "HR", label: "HR" },
  { value: "PRODUCTION_SUPERVISOR", label: "Production Supervisor" },
  { value: "DEPARTMENT_HEAD", label: "Kepala Departemen" },
  { value: "MANAGER", label: "Manager" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
]

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
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
      fetchUser()
      fetchSupervisors()
    }
  }, [session, status, router, params.id])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        setFormData({
          name: data.name,
          email: data.email,
          password: "",
          pin: data.pin || "",
          role: data.role,
          department: data.department || "",
          position: data.position || "",
          supervisorId: data.supervisor?.id || "",
        })
      } else {
        await Swal.fire({
          icon: "error",
          title: "Error!",
          text: "User tidak ditemukan",
        })
        router.push("/dashboard/admin/users")
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSupervisors = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        // Filter users who can be supervisors, excluding current user
        const potentialSupervisors = data.filter(
          (u: User) =>
            u.id !== params.id &&
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
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "User berhasil diupdate",
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
      setSaving(false)
    }
  }

  if (loading || status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        <p className="text-gray-600 text-sm mt-1">Update informasi user</p>
      </div>

      {/* User Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {user.role}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                {user._count.splRequests} SPL
              </span>
              {user.subordinates && user.subordinates.length > 0 && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                  {user.subordinates.length} Subordinate
                </span>
              )}
            </div>
          </div>
        </div>
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
              Password Baru (kosongkan jika tidak ingin mengubah)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Kosongkan jika tidak ingin mengubah"
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

        {/* Subordinates Info */}
        {user.subordinates && user.subordinates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">
              User ini menjadi supervisor untuk:
            </h4>
            <ul className="space-y-1">
              {user.subordinates.map((sub) => (
                <li key={sub.id} className="text-sm text-yellow-800">
                  • {sub.name} ({sub.email}) - {sub.role}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
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
