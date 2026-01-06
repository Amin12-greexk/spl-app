"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"

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
  pin: string
}

export default function ManageDepartmentHeadPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [action, setAction] = useState<"assign" | "unassign">("assign")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("ALL")

  // Check authorization
  useEffect(() => {
    if (session && !["MANAGER", "HR"].includes(session.user.role)) {
      toast.error("Akses ditolak! Hanya Manager/HR yang dapat mengakses halaman ini.")
      router.push("/dashboard")
    }
  }, [session, router])

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/assign-department-head")
      if (!response.ok) throw new Error("Gagal mengambil data")

      const data = await response.json()
      setUsers(data)
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user.role === "MANAGER" || session?.user.role === "HR") {
      fetchUsers()
    }
  }, [session])

  const handleAssign = (user: User) => {
    setSelectedUser(user)
    setAction("assign")
    setShowConfirmModal(true)
  }

  const handleUnassign = (user: User) => {
    setSelectedUser(user)
    setAction("unassign")
    setShowConfirmModal(true)
  }

  const submitAction = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/assign-department-head", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          action,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Gagal memproses")

      toast.success(data.message)
      setShowConfirmModal(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get unique departments
  const departments = Array.from(
    new Set(
      users
        .map((u) => u.department?.name || u.departmentName)
        .filter(Boolean)
    )
  ) as string[]

  // Filter users
  const filteredUsers = users.filter(user => {
    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      if (
        !user.name.toLowerCase().includes(query) &&
        !user.email.toLowerCase().includes(query) &&
        !(user.pin && user.pin.toLowerCase().includes(query))
      ) {
        return false
      }
    }

    // Filter by department
    const departmentLabel = user.department?.name || user.departmentName || ""
    if (filterDepartment !== "ALL" && departmentLabel !== filterDepartment) {
      return false
    }

    return true
  })

  const staffUsers = filteredUsers.filter(u => u.role === "STAFF")
  const departmentHeads = filteredUsers.filter(u => u.role === "DEPARTMENT_HEAD")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-gray-600 text-sm">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Kelola Kepala Departemen
            </h1>
            <p className="text-blue-100">
              Assign atau unassign staff sebagai Kepala Departemen
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama, email, atau PIN..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Departemen:</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Semua Departemen</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Department Heads List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Kepala Departemen ({departmentHeads.length})
        </h3>

        {departmentHeads.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Belum ada Kepala Departemen</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {departmentHeads.map(user => (
              <div key={user.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                  </div>
                  <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded-full flex-shrink-0">
                    Kepala
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <p>PIN: {user.pin || "-"}</p>
                  <p>Dept: {user.department?.name || user.departmentName || "-"}</p>
                  <p>Posisi: {user.position || "-"}</p>
                </div>
                <Button
                  onClick={() => handleUnassign(user)}
                  variant="outline"
                  className="w-full text-sm border-red-600 text-red-600 hover:bg-red-50"
                >
                  Unassign
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Staff ({staffUsers.length})
        </h3>

        {staffUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Tidak ada staff</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {staffUsers.map(user => (
              <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                  </div>
                  <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full flex-shrink-0">
                    Staff
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <p>PIN: {user.pin || "-"}</p>
                  <p>Dept: {user.department?.name || user.departmentName || "-"}</p>
                  <p>Posisi: {user.position || "-"}</p>
                </div>
                <Button
                  onClick={() => handleAssign(user)}
                  className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Jadikan Kepala Dept
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && selectedUser && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setSelectedUser(null)
          }}
          title={action === "assign" ? "Assign sebagai Kepala Departemen?" : "Unassign dari Kepala Departemen?"}
        >
          <div className="space-y-4">
            <div className={`${action === "assign" ? "bg-blue-50 border-blue-200" : "bg-yellow-50 border-yellow-200"} border rounded-lg p-4`}>
              <p className="text-sm text-gray-900">
                {action === "assign" ? (
                  <>
                    Anda akan menjadikan <strong>{selectedUser.name}</strong> sebagai Kepala Departemen.
                    <br /><br />
                    Kepala Departemen akan dapat:
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Melihat SPL dari tim mereka</li>
                      <li>Approve atau reject SPL sebagai supervisor</li>
                      <li>Akses menu seperti GA</li>
                    </ul>
                  </>
                ) : (
                  <>
                    Anda akan menghapus <strong>{selectedUser.name}</strong> dari posisi Kepala Departemen dan mengembalikan sebagai Staff.
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedUser(null)
                }}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                onClick={submitAction}
                className={`flex-1 ${action === "assign" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"} text-white`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : action === "assign" ? "Ya, Assign" : "Ya, Unassign"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
