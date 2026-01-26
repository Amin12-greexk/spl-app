"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import Swal from "sweetalert2"

interface Department {
  id: string
  name: string
  supervised: boolean
  approvalMode: string
  createdAt: string
  updatedAt: string
}

export default function AdminDepartmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    supervised: false,
    approvalMode: "DIRECT",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchDepartments()
    }
  }, [session])

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments")
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error fetching departments:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({ name: "", supervised: false, approvalMode: "DIRECT" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      await Swal.fire("Gagal!", "Nama departemen wajib diisi", "error")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        editingId ? `/api/admin/departments/${editingId}` : "/api/admin/departments",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            supervised: formData.supervised,
            approvalMode: formData.supervised ? formData.approvalMode : "DIRECT",
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        await Swal.fire("Gagal!", data.error || "Terjadi kesalahan", "error")
        return
      }

      await Swal.fire(
        "Berhasil!",
        editingId ? "Departemen berhasil diperbarui" : "Departemen berhasil ditambahkan",
        "success"
      )
      resetForm()
      fetchDepartments()
    } catch (error) {
      await Swal.fire("Error!", "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (department: Department) => {
    setEditingId(department.id)
    setFormData({
      name: department.name,
      supervised: department.supervised,
      approvalMode: department.approvalMode || (department.supervised ? "DEPARTMENT_HEAD" : "DIRECT"),
    })
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }

  const handleDelete = async (department: Department) => {
    const result = await Swal.fire({
      title: "Hapus Departemen?",
      text: `Yakin ingin menghapus ${department.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/admin/departments/${department.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        await Swal.fire("Berhasil!", "Departemen berhasil dihapus", "success")
        fetchDepartments()
      } else {
        await Swal.fire("Gagal!", data.error || "Terjadi kesalahan", "error")
      }
    } catch (error) {
      await Swal.fire("Error!", "Terjadi kesalahan", "error")
    }
  }

  const getStatusBadge = (supervised: boolean) => {
    return supervised ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
  }

  const getStatusLabel = (department: Department) => {
    if (!department.supervised || department.approvalMode === "DIRECT") {
      return "Direct to Manager"
    }
    if (department.approvalMode === "GA") {
      return "Supervised (GA)"
    }
    return "Supervised (Kepala Dept)"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kelola Departemen</h1>
        <p className="text-gray-600 text-sm mt-1">
          Tambah, ubah, atau nonaktifkan status supervised untuk departemen.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Departemen <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            ref={nameInputRef}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Contoh: Finance, Marketing"
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formData.supervised}
            onChange={(e) => {
              const checked = e.target.checked
              setFormData({
                ...formData,
                supervised: checked,
                approvalMode: checked ? formData.approvalMode : "DIRECT",
              })
            }}
            className="h-4 w-4 text-red-600 border-gray-300 rounded"
          />
          Supervised (butuh approval supervisor)
        </label>
        {formData.supervised && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Tipe Supervisor
            </label>
            <select
              value={formData.approvalMode}
              onChange={(e) => setFormData({ ...formData, approvalMode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="DEPARTMENT_HEAD">Kepala Departemen</option>
              <option value="GA">GA</option>
            </select>
            <p className="text-xs text-gray-500">
              Pilih GA untuk departemen seperti Security, Teknik, atau Driver.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : editingId
                ? "Simpan Perubahan"
                : "Tambah Departemen"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Department List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Departemen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.map((department) => {
                const isEditing = editingId === department.id
                return (
                  <tr key={department.id} className={isEditing ? "bg-green-50" : "hover:bg-gray-50"}>
                    <td className="px-6 py-4 text-sm text-gray-900">{department.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          department.supervised
                        )}`}
                      >
                        {getStatusLabel(department)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(department)}
                          className={isEditing
                            ? "p-2 text-green-700 bg-green-200 rounded-lg transition-colors"
                            : "p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          }
                          title={isEditing ? "Sedang Edit" : "Edit Departemen"}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(department)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Departemen"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {departments.length === 0 && (
          <div className="text-center py-12 text-gray-500">Belum ada departemen</div>
        )}
      </div>
    </div>
  )
}
