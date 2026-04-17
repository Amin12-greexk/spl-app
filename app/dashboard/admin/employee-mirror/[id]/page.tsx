"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

interface MirrorUser {
  id: string
  name: string
  email: string
  role: string
  departmentName: string | null
  department: {
    id: string
    name: string
  } | null
}

interface MirrorSpl {
  id: string
  date: string
  startTime: string
  endTime: string
  totalHours: number
  reason: string
  status: string
  source?: string
  isManualEntry?: boolean
  requesterSignedAt?: string | null
  actualStartAt?: string | null
  actualEndAt?: string | null
  regularStartAt?: string | null
  regularEndAt?: string | null
  approvalDate?: string | null
  rejectionReason?: string | null
  supervisorRejectionReason?: string | null
  createdAt: string
  requester: {
    regularStartTime?: string | null
    regularEndTime?: string | null
  }
  supervisor?: {
    name: string
  } | null
  approver?: {
    name: string
  } | null
}

const formatTimeValue = (value?: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PENDING_SUPERADMIN: "bg-amber-100 text-amber-800",
    PENDING_SUPERVISOR: "bg-orange-100 text-orange-800",
    PENDING_MANAGER: "bg-blue-100 text-blue-800",
    APPROVED: "bg-green-100 text-green-800",
    IN_PROGRESS: "bg-cyan-100 text-cyan-800",
    DONE: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-800",
    REJECTED_BY_SUPERVISOR: "bg-red-100 text-red-800",
    REJECTED_BY_MANAGER: "bg-rose-100 text-rose-800",
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusConfig[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  )
}

export default function EmployeeMirrorSplPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const employeeId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : ""

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MirrorUser | null>(null)
  const [spls, setSpls] = useState<MirrorSpl[]>([])
  const [monthFilter, setMonthFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [mirrorMode, setMirrorMode] = useState("employee-self")
  const [hideUnsignedManual, setHideUnsignedManual] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (session?.user?.role && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [router, session?.user?.role, status])

  useEffect(() => {
    if (session?.user?.role !== "SUPER_ADMIN" || !employeeId) return

    const fetchMirrorSpls = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/admin/employee-mirror/${employeeId}/spl`
        )
        if (!response.ok) {
          throw new Error("Gagal mengambil mirror data SPL")
        }

        const data = await response.json()
        setUser(data.user || null)
        setSpls(Array.isArray(data.spls) ? data.spls : [])
        setMirrorMode(data.mirrorMode || "employee-self")
        setHideUnsignedManual(Boolean(data.hideUnsignedManual))
      } catch (error) {
        console.error("Error fetching mirrored SPL data:", error)
        setUser(null)
        setSpls([])
      } finally {
        setLoading(false)
      }
    }

    fetchMirrorSpls()
  }, [employeeId, session?.user?.role])

  const monthOptions = useMemo(() => {
    const monthMap = new Map<string, string>()
    spls.forEach((spl) => {
      const date = new Date(spl.date)
      if (Number.isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!monthMap.has(key)) {
        monthMap.set(
          key,
          date.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })
        )
      }
    })

    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }))
  }, [spls])

  const filteredSpls = useMemo(() => {
    return spls.filter((spl) => {
      const date = new Date(spl.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const query = search.trim().toLowerCase()

      if (monthFilter !== "ALL" && monthKey !== monthFilter) {
        return false
      }

      if (!query) return true

      return (
        spl.reason.toLowerCase().includes(query) ||
        spl.status.toLowerCase().includes(query) ||
        spl.startTime.toLowerCase().includes(query) ||
        spl.endTime.toLowerCase().includes(query) ||
        (spl.supervisor?.name || "").toLowerCase().includes(query) ||
        (spl.approver?.name || "").toLowerCase().includes(query)
      )
    })
  }, [monthFilter, search, spls])

  const getLeaderName = (spl: MirrorSpl) => {
    if (spl.supervisor?.name) return spl.supervisor.name
    if (spl.approver?.name) return spl.approver.name
    return "Manager"
  }

  const getRegularHoursLabel = (spl: MirrorSpl) => {
    const snapshotStart = formatTimeValue(spl.regularStartAt)
    const snapshotEnd = formatTimeValue(spl.regularEndAt)
    if (snapshotStart !== "-" && snapshotEnd !== "-") {
      return `${snapshotStart} - ${snapshotEnd}`
    }

    if (spl.requester.regularStartTime && spl.requester.regularEndTime) {
      return `${spl.requester.regularStartTime} - ${spl.requester.regularEndTime}`
    }

    return "-"
  }

  const getActualRangeLabel = (spl: MirrorSpl) => {
    if (spl.actualStartAt && spl.actualEndAt) {
      return `${formatTimeValue(spl.actualStartAt)} - ${formatTimeValue(
        spl.actualEndAt
      )}`
    }
    if (spl.actualStartAt) {
      return `${formatTimeValue(spl.actualStartAt)} - Berjalan`
    }
    return "Belum diinput"
  }

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-700"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Mirror SPL
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            {user?.name || "Karyawan"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Menampilkan riwayat SPL sesuai perspektif akun target.
            {hideUnsignedManual
              ? " SPL manual yang belum ditandatangani disembunyikan."
              : " SPL manual unsigned tetap terlihat untuk role ini."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mode mirror: {mirrorMode}
          </p>
        </div>
        <Link
          href="/dashboard/admin/employee-mirror"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Kembali ke Mirror Karyawan
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Email</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {user?.email || "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Role</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {user?.role || "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Departemen</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {user?.department?.name || user?.departmentName || "-"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 lg:w-64"
          >
            <option value="ALL">Semua Bulan</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari alasan, status, jam, pimpinan..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Tgl Lembur</th>
                <th className="px-4 py-3 text-left font-semibold">Pimpinan</th>
                <th className="px-4 py-3 text-left font-semibold">Jam Reguler</th>
                <th className="px-4 py-3 text-left font-semibold">Jam Lembur</th>
                <th className="px-4 py-3 text-left font-semibold">Jam Realisasi</th>
                <th className="px-4 py-3 text-left font-semibold">Alasan</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSpls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Tidak ada data SPL yang terlihat pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredSpls.map((spl) => (
                  <tr key={spl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(spl.date).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getLeaderName(spl)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {getRegularHoursLabel(spl)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {spl.startTime} - {spl.endTime}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getActualRangeLabel(spl)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-sm truncate" title={spl.reason}>
                      {spl.reason}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(spl.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
