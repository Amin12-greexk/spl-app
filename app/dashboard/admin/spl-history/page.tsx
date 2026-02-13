"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import Swal from "sweetalert2"
import { getEffectiveHours } from "@/lib/spl-hours"
import { isMorningOvertime } from "@/lib/spl-labels"

interface Spl {
  id: string
  date: Date
  startTime: string
  endTime: string
  totalHours: number
  actualStartAt?: Date | string | null
  actualEndAt?: Date | string | null
  actualTotalHours?: number | null
  realizedMinutes?: number | null
  regularStartAt?: Date | string | null
  plannedStartAt?: Date | string | null
  plannedEndAt?: Date | string | null
  reason: string
  status: string
  projectName: string | null
  isManualEntry: boolean
  requester: {
    id: string
    name: string
    email: string
    departmentId: string | null
    departmentName: string | null
    department: {
      id: string
      name: string
    } | null
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
  const PAGE_SIZE = 10
  const [spls, setSpls] = useState<Spl[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  })
  const [editingSpl, setEditingSpl] = useState<Spl | null>(null)
  const [editForm, setEditForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    actualStartTime: "",
    actualEndTime: "",
    reason: "",
    projectName: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const fetchSpls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(PAGE_SIZE))
      if (search.trim()) {
        params.set("search", search.trim())
      }
      if (filterStatus !== "ALL") {
        params.set("status", filterStatus)
      }

      const response = await fetch(`/api/spl?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setSpls(data)
          setTotal(data.length)
          setStats({
            total: data.length,
            approved: data.filter((s: Spl) => s.status === "APPROVED").length,
            pending: data.filter((s: Spl) => s.status.includes("PENDING")).length,
            rejected: data.filter((s: Spl) => s.status.includes("REJECTED")).length,
          })
        } else {
          setSpls(data.data || [])
          setTotal(data.pagination?.total || 0)
          setStats({
            total: data.stats?.total || 0,
            approved: data.stats?.approved || 0,
            pending: data.stats?.pending || 0,
            rejected: data.stats?.rejected || 0,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching SPLs:", error)
    } finally {
      setLoading(false)
    }
  }, [PAGE_SIZE, page, search, filterStatus])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    } else {
      fetchSpls()
    }
  }, [session, status, router, fetchSpls])

  const formatDateInput = (value: Date) =>
    new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })

  const formatTimeInJakarta = (value?: Date | string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
  }

  const openEdit = (spl: Spl) => {
    setEditingSpl(spl)
    const actualStartTime = formatTimeInJakarta(spl.actualStartAt) || spl.startTime
    const actualEndTime = formatTimeInJakarta(spl.actualEndAt) || spl.endTime
    setEditForm({
      date: formatDateInput(spl.date),
      startTime: spl.startTime,
      endTime: spl.endTime,
      actualStartTime,
      actualEndTime,
      reason: spl.reason,
      projectName: spl.projectName || "",
    })
  }

  const closeEdit = () => {
    if (isSaving) return
    setEditingSpl(null)
  }

  const handleEditSave = async () => {
    if (!editingSpl) return
    if (!editForm.date || !editForm.startTime || !editForm.endTime || !editForm.reason.trim()) {
      await Swal.fire("Gagal", "Tanggal, jam, dan alasan wajib diisi.", "error")
      return
    }
    if ((editForm.actualStartTime && !editForm.actualEndTime) || (!editForm.actualStartTime && editForm.actualEndTime)) {
      await Swal.fire("Gagal", "Jam realisasi mulai dan selesai harus diisi berpasangan.", "error")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/spl/${editingSpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.date,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          actualStartTime: editForm.actualStartTime || null,
          actualEndTime: editForm.actualEndTime || null,
          reason: editForm.reason,
          projectName: editForm.projectName || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal memperbarui SPL")
      }
      await Swal.fire("Berhasil!", "SPL berhasil diperbarui", "success")
      setEditingSpl(null)
      await fetchSpls()
    } catch (error: any) {
      await Swal.fire("Gagal!", error.message || "Terjadi kesalahan", "error")
    } finally {
      setIsSaving(false)
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      PENDING_SUPERVISOR: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Supervisor" },
      PENDING_MANAGER: { bg: "bg-blue-100", text: "text-blue-800", label: "Pending Manager" },
      APPROVED: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
      IN_PROGRESS: { bg: "bg-yellow-100", text: "text-yellow-800", label: "In Progress" },
      DONE: { bg: "bg-green-100", text: "text-green-800", label: "Done" },
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

  const formatHoursDisplay = (value?: number | null) => {
    if (value === null || value === undefined) return "-"
    if (!Number.isFinite(value)) return "-"
    const totalMinutes = Math.round(value * 60)
    if (totalMinutes <= 30) return "0 menit"
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} menit`
    if (minutes === 0) return `${hours} jam`
    return `${hours} jam ${minutes} menit`
  }

  const paginationControls = (
    <div className="flex flex-col gap-3 px-4 py-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-600">
        Menampilkan {spls.length} dari {total} data
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1 || loading}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <span className="text-sm text-gray-600">
          Hal {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages || loading}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  )

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
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.approved}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pending}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">
            {stats.rejected}
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
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING_SUPERVISOR">Pending Supervisor</option>
            <option value="PENDING_MANAGER">Pending Manager</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
            <option value="REJECTED_BY_SUPERVISOR">Rejected (Supervisor)</option>
            <option value="REJECTED_BY_MANAGER">Rejected (Manager)</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      {spls.length > 0 && (
        <div className="space-y-4 md:hidden">
          {spls.map((spl) => (
            <div
              key={spl.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {new Date(spl.date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                {getStatusBadge(spl.status)}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{spl.requester.name}</div>
                <div className="text-xs text-gray-500">
                  {(spl.requester.department?.name || spl.requester.departmentName || "-")} â€¢ {spl.requester.position || "-"}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {spl.startTime} - {spl.endTime}
              </div>
              <div className="text-sm font-medium text-gray-900">
                {formatHoursDisplay(getEffectiveHours(spl) ?? spl.totalHours)}
              </div>
              <div className="text-sm text-gray-600 line-clamp-2">
                {spl.reason}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {spl.isManualEntry && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                    Manual
                  </span>
                )}
                {isMorningOvertime(spl) && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                    Lembur Pagi
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => openEdit(spl)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Data"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(spl.id, spl.requester.name, spl.date)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus Permanen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {paginationControls}
          </div>
        </div>
      )}

      {/* SPL Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full whitespace-nowrap">
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
              {spls.map((spl) => (
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
                        {(spl.requester.department?.name || spl.requester.departmentName || "-")} • {spl.requester.position || "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {spl.startTime} - {spl.endTime}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatHoursDisplay(getEffectiveHours(spl) ?? spl.totalHours)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {spl.reason}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(spl.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {spl.isManualEntry && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          Manual
                        </span>
                      )}
                      {isMorningOvertime(spl) && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                          Lembur Pagi
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(spl)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Data"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(spl.id, spl.requester.name, spl.date)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus Permanen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {paginationControls}
      </div>

      {spls.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada SPL ditemukan
        </div>
      )}

      <Modal
        isOpen={Boolean(editingSpl)}
        onClose={closeEdit}
        title="Edit Data SPL"
        size="large"
        footer={
          <>
            <Button
              variant="outline"
              onClick={closeEdit}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Lembur
            </label>
            <input
              type="date"
              value={editForm.date}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jam Mulai (Format 24 jam)
              </label>
              <input
                type="time"
                step="60"
                value={editForm.startTime}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, startTime: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                placeholder="HH:mm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jam Selesai (Format 24 jam)
              </label>
              <input
                type="time"
                step="60"
                value={editForm.endTime}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, endTime: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                placeholder="HH:mm"
              />
            </div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="text-xs font-semibold text-emerald-800 mb-2">
              Realisasi (prefill dari jam pengajuan)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jam Realisasi Mulai
                </label>
                <input
                  type="time"
                  step="60"
                  value={editForm.actualStartTime}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, actualStartTime: e.target.value }))
                  }
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  placeholder="HH:mm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jam Realisasi Selesai
                </label>
                <input
                  type="time"
                  step="60"
                  value={editForm.actualEndTime}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, actualEndTime: e.target.value }))
                  }
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  placeholder="HH:mm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alasan Lembur
            </label>
            <textarea
              value={editForm.reason}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              className="w-full min-h-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Isi alasan lembur..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Proyek (Opsional)
            </label>
            <input
              type="text"
              value={editForm.projectName}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, projectName: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Nama proyek..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

