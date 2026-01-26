"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import Swal from "sweetalert2"

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
  position: string | null
  supervisor: {
    id: string
    name: string
    role: string
  } | null
  _count: {
    splRequests: number
    subordinates: number
  }
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    const result = await Swal.fire({
      title: "Hapus User?",
      text: `Yakin ingin menghapus ${userName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (response.ok) {
          await Swal.fire("Berhasil!", "User berhasil dihapus", "success")
          fetchUsers()
        } else {
          await Swal.fire("Gagal!", data.error, "error")
        }
      } catch (error) {
        await Swal.fire("Error!", "Terjadi kesalahan", "error")
      }
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.role.toLowerCase().includes(search.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      SUPER_ADMIN: { bg: "bg-red-100", text: "text-red-800" },
      MANAGER: { bg: "bg-purple-100", text: "text-purple-800" },
      HR: { bg: "bg-green-100", text: "text-green-800" },
      GA: { bg: "bg-blue-100", text: "text-blue-800" },
      DEPARTMENT_HEAD: { bg: "bg-indigo-100", text: "text-indigo-800" },
      TEKNISI: { bg: "bg-orange-100", text: "text-orange-800" },
      STAFF: { bg: "bg-gray-100", text: "text-gray-800" },
    }
    const c = config[role] || config.STAFF
    return `px-2 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola User</h1>
          <p className="text-gray-600 text-sm mt-1">Manajemen user sistem SPL</p>
        </div>
        <Link
          href="/dashboard/admin/users/new"
          className="inline-flex justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium w-full sm:w-auto"
        >
          + Tambah User
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <input
          type="text"
          placeholder="Cari user (nama, email, role)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dept</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SPL</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const departmentLabel = user.department?.name || user.departmentName || "-"
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.position || "-"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={getRoleBadge(user.role)}>{user.role}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{departmentLabel}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.supervisor ? user.supervisor.name : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 pl-8">{user._count.splRequests}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/users/${user.id}`}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={user._count.subordinates > 0}
                          title={user._count.subordinates > 0 ? "Tidak bisa hapus user yang memiliki bawahan" : "Hapus User"}
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
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada user ditemukan
        </div>
      )}
    </div>
  )
}
