"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Swal from "sweetalert2"

interface Spl {
  id: string
  date: Date
  startTime: string
  endTime: string
  totalHours: number
  reason: string
  status: string
  projectName: string | null
  isManualEntry: boolean
  requester: {
    id: string
    name: string
    email: string
    department: string | null
    position: string | null
  }
  supervisor: {
    name: string
    role: string
  } | null
  approver: {
    name: string
    role: string
  } | null
  createdAt: Date
}

export default function SplHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [spls, setSpls] = useState<Spl[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    } else {
      fetchSpls()
    }
  }, [session, status, router])

  const fetchSpls = async () => {
    try {
      const response = await fetch("/api/spl")
      if (response.ok) {
        const data = await response.json()
        setSpls(data)
      }
    } catch (error) {
      console.error("Error fetching SPLs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (splId: string, requesterName: string, date: Date) => {
    const result = await Swal.fire({
      title: "Hapus Riwayat SPL?",
      html: `
        <p>Yakin ingin menghapus SPL ini?</p>
        <p class="text-sm text-gray-600 mt-2">
          <strong>User:</strong> ${requesterName}<br/>
          <strong>Tanggal:</strong> ${new Date(date).toLocaleDateString("id-ID")}
        </p>
        <p class="text-red-600 text-sm mt-3">⚠️ Tindakan ini tidak dapat dibatalkan!</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/spl/${splId}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (response.ok) {
          await Swal.fire("Berhasil!", "Riwayat SPL berhasil dihapus", "success")
          fetchSpls()
        } else {
          await Swal.fire("Gagal!", data.error, "error")
        }
      } catch (error) {
        await Swal.fire("Error!", "Terjadi kesalahan", "error")
      }
    }
  }

  const filteredSpls = spls.filter((spl) => {
    const matchSearch =
      spl.requester.name.toLowerCase().includes(search.toLowerCase()) ||
      spl.requester.email.toLowerCase().includes(search.toLowerCase()) ||
      spl.reason.toLowerCase().includes(search.toLowerCase())

    const matchStatus = filterStatus === "ALL" || spl.status === filterStatus

    return matchSearch && matchStatus
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      PENDING_SUPERVISOR: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Supervisor" },
      PENDING_MANAGER: { bg: "bg-blue-100", text: "text-blue-800", label: "Pending Manager" },
      APPROVED: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
      REJECTED_BY_SUPERVISOR: { bg: "bg-red-100", text: "text-red-800", label: "Rejected (Supervisor)" },
      REJECTED_BY_MANAGER: { bg: "bg-red-100", text: "text-red-800", label: "Rejected (Manager)" },
    }
    const c = config[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
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
        <h1 className="text-2xl font-bold text-gray-900">Riwayat SPL</h1>
        <p className="text-gray-600 text-sm mt-1">View dan delete riwayat semua SPL</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600">Total SPL</div>
          <div className="text-2xl font-bold text-gray-900">{spls.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {spls.filter((s) => s.status === "APPROVED").length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {spls.filter((s) => s.status.includes("PENDING")).length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">
            {spls.filter((s) => s.status.includes("REJECTED")).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Cari user, email, atau alasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING_SUPERVISOR">Pending Supervisor</option>
            <option value="PENDING_MANAGER">Pending Manager</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED_BY_SUPERVISOR">Rejected (Supervisor)</option>
            <option value="REJECTED_BY_MANAGER">Rejected (Manager)</option>
          </select>
        </div>
      </div>

      {/* SPL Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSpls.map((spl) => (
                <tr key={spl.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(spl.date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{spl.requester.name}</div>
                      <div className="text-xs text-gray-500">
                        {spl.requester.department || "-"} • {spl.requester.position || "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {spl.startTime} - {spl.endTime}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {spl.totalHours}h
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {spl.reason}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(spl.status)}</td>
                  <td className="px-6 py-4">
                    {spl.isManualEntry && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(spl.id, spl.requester.name, spl.date)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSpls.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada SPL ditemukan
        </div>
      )}
    </div>
  )
}
