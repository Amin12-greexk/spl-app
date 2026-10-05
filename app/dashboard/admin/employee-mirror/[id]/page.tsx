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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Audit View • Mirroring Employee
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 flex items-center gap-2">
            <span className="h-8 w-1 bg-red-600 rounded-full"></span>
            {user?.name || "Karyawan"}
          </h1>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-md">
            Anda sedang melihat riwayat SPL dari sudut pandang target.
            {hideUnsignedManual
              ? " Sistem menyembunyikan SPL manual tanpa tanda tangan."
              : " Semua data SPL terlihat dalam mode audit ini."}
          </p>
        </div>
        <Link
          href="/dashboard/admin/employee-mirror"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all hover:shadow-md"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Daftar
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm lg:p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
          <p className="mt-0.5 text-xs lg:text-sm font-semibold text-slate-900 truncate">
            {user?.email || "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm lg:p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Departemen</p>
          <p className="mt-0.5 text-xs lg:text-sm font-semibold text-slate-900 truncate">
            {user?.department?.name || user?.departmentName || "-"}
          </p>
        </div>
        <div className="col-span-2 lg:col-span-1 rounded-xl border border-slate-100 bg-white p-3 shadow-sm lg:p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Mode Akses</p>
          <p className="mt-0.5 text-xs lg:text-sm font-semibold text-red-600 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
            Audit: {mirrorMode}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative w-full md:w-64">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-slate-50 py-2.5 pl-4 pr-10 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="ALL">Semua Periode</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari alasan, status, pimpinan..."
              className="w-full rounded-xl border border-gray-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Cards */}
      <div className="space-y-4 md:hidden">
        {filteredSpls.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">Tidak ada data ditemukan</p>
          </div>
        ) : (
          filteredSpls.map((spl) => (
            <div key={spl.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  {new Date(spl.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {getStatusBadge(spl.status)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Lembur</p>
                  <p className="text-xs font-bold text-slate-800">{spl.startTime} - {spl.endTime}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Realisasi</p>
                  <p className="text-xs font-bold text-emerald-600">{getActualRangeLabel(spl)}</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Alasan</p>
                <p className="text-xs text-slate-600 italic">&quot;{spl.reason}&quot;</p>
              </div>
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Pimpinan: <span className="font-bold">{getLeaderName(spl)}</span></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table - Optimized for Laptop screens */}
      <div className="hidden md:block rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider hidden lg:table-cell">Pimpinan</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider hidden xl:table-cell">Reguler</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider">Jam Lembur</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider">Realisasi</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider hidden md:table-cell">Alasan</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSpls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400 italic">
                    Belum ada data SPL untuk ditampilkan
                  </td>
                </tr>
              ) : (
                filteredSpls.map((spl) => (
                  <tr key={spl.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-700">
                      {new Date(spl.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                      <span className="hidden lg:inline text-slate-400 font-normal ml-1">{new Date(spl.date).getFullYear()}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-600 hidden lg:table-cell">
                      {getLeaderName(spl)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-500 hidden xl:table-cell">
                      {getRegularHoursLabel(spl)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{spl.startTime} - {spl.endTime}</span>
                        <span className="text-[10px] text-slate-400 xl:hidden">Reg: {getRegularHoursLabel(spl)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`font-bold ${spl.actualStartAt ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {getActualRangeLabel(spl)}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="max-w-[200px] lg:max-w-xs truncate italic text-slate-500" title={spl.reason}>
                        &quot;{spl.reason}&quot;
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(spl.status)}
                    </td>
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
