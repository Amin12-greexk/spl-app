"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import Swal from "sweetalert2"
import toast from "react-hot-toast"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isWithinInterval } from "date-fns"
import { id } from "date-fns/locale" // Import locale Indonesia
import { getEffectiveHours, getEffectiveMinutes } from "@/lib/spl-hours"
import { isMorningOvertime } from "@/lib/spl-labels"

interface AttendanceRecord {
  pin?: string | null
  scan_date: string
}

type ExportRow = Record<string, string | number>
type ExportContext = {
  resolvePin: (spl: Spl) => string
  attendanceByPin: Map<string, AttendanceRecord[]>
}

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
  supervisorApprovalDate?: Date | null
  approvalDate?: Date | null
  signature?: string | null
  supervisorSignature?: string | null
  rejectionReason?: string | null
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
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [dateFilter, setDateFilter] = useState("ALL")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
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
    endDayOffset: 0,
    actualStartTime: "",
    actualEndTime: "",
    actualEndDayOffset: 0,
    reason: "",
    projectName: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const fetchSpls = useCallback(async () => {
    setIsFetching(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(PAGE_SIZE))
      params.set("skipStats", "1")
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim())
      }
      if (filterStatus !== "ALL") {
        params.set("status", filterStatus)
      }
      
      // Khusus Super Admin Export: Ambil SEMUA data jika skipStats = 1 dan fetch lite agar bisa diexport semua
      // karena page ini punya pagination server side. Untuk export kita butuh fetch all
      params.set("lite", "1")

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
          if (data.stats) {
            setStats({
              total: data.stats.total || 0,
              approved: data.stats.approved || 0,
              pending: data.stats.pending || 0,
              rejected: data.stats.rejected || 0,
            })
          }
        }
      }
    } catch (error) {
      console.error("Error fetching SPLs:", error)
    } finally {
      setIsFetching(false)
      setIsInitialLoading(false)
    }
  }, [PAGE_SIZE, page, searchQuery, filterStatus])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/spl/stats")
      if (!response.ok) return
      const data = await response.json()
      setStats({
        total: data.total || 0,
        approved: data.approved || 0,
        pending: data.pending || 0,
        rejected: data.rejected || 0,
      })
    } catch (error) {
      console.error("Error fetching SPL stats:", error)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    } else {
      fetchSpls()
    }
  }, [session, status, router, fetchSpls])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchStats()
    }
  }, [session, status, fetchStats])

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

  const getDayOffsetFromWindow = (
    start?: Date | string | null,
    end?: Date | string | null
  ) => {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0
    }
    const diffMinutes = Math.round(
      (endDate.getTime() - startDate.getTime()) / 60000
    )
    return diffMinutes >= 24 * 60 ? 1 : 0
  }

  const openEdit = (spl: Spl) => {
    setEditingSpl(spl)
    const plannedDayOffset = getDayOffsetFromWindow(
      spl.plannedStartAt,
      spl.plannedEndAt
    )
    const actualDayOffset =
      spl.actualStartAt && spl.actualEndAt
        ? getDayOffsetFromWindow(spl.actualStartAt, spl.actualEndAt)
        : plannedDayOffset
    const actualStartTime = formatTimeInJakarta(spl.actualStartAt) || spl.startTime
    const actualEndTime = formatTimeInJakarta(spl.actualEndAt) || spl.endTime
    setEditForm({
      date: formatDateInput(spl.date),
      startTime: spl.startTime,
      endTime: spl.endTime,
      endDayOffset: plannedDayOffset,
      actualStartTime,
      actualEndTime,
      actualEndDayOffset: actualDayOffset,
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
          endDayOffset: editForm.endDayOffset,
          actualStartTime: editForm.actualStartTime || null,
          actualEndTime: editForm.actualEndTime || null,
          actualEndDayOffset: editForm.actualEndDayOffset,
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
      await Promise.all([fetchSpls(), fetchStats()])
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
          await Promise.all([fetchSpls(), fetchStats()])
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
      PENDING_SUPERADMIN: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending Super Admin" },
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
    if (totalMinutes < 30) return "0 menit"
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
          disabled={page <= 1 || isFetching}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <span className="text-sm text-gray-600">
          Hal {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages || isFetching}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  )

  // =============================== EXPORT EXCEL & PDF UTILS ===============================
  
  // Karena export HR Butuh semua data bukan hanya per page, kita fetch all untuk print
  const fetchAllForExport = async () => {
    try {
      const limit = 5000 // Tentukan limit yang wajar atau endpoint all
      const params = new URLSearchParams()
      params.set("page", "1")
      params.set("limit", String(limit))
      params.set("skipStats", "1")
      params.set("lite", "1")
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim())
      }
      if (filterStatus !== "ALL") {
        params.set("status", filterStatus)
      }
      
      const response = await fetch(`/api/spl?${params.toString()}`)
      if (!response.ok) throw new Error("Gagal mengambil semua data untuk export")
      const data = await response.json()
      
      let allSpls: Spl[] = []
      if (Array.isArray(data)) {
        allSpls = data
      } else {
        allSpls = data.data || []
      }
      
      // Filter by Date for Export
      const now = new Date()
      let filtered = allSpls
      
      switch (dateFilter) {
        case "THIS_WEEK": {
          const weekStart = startOfWeek(now, { weekStartsOn: 1 })
          const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
          filtered = filtered.filter((spl) =>
            isWithinInterval(new Date(spl.date), { start: weekStart, end: weekEnd })
          )
          break
        }
        case "THIS_MONTH": {
          const monthStart = startOfMonth(now)
          const monthEnd = endOfMonth(now)
          filtered = filtered.filter((spl) =>
            isWithinInterval(new Date(spl.date), { start: monthStart, end: monthEnd })
          )
          break
        }
        case "LAST_MONTH": {
          const lastMonth = subMonths(now, 1)
          const lastMonthStart = startOfMonth(lastMonth)
          const lastMonthEnd = endOfMonth(lastMonth)
          filtered = filtered.filter((spl) =>
            isWithinInterval(new Date(spl.date), { start: lastMonthStart, end: lastMonthEnd })
          )
          break
        }
        case "LAST_3_MONTHS": {
          const threeMonthsAgo = subMonths(now, 3)
          filtered = filtered.filter(
            (spl) => new Date(spl.date) >= threeMonthsAgo
          )
          break
        }
        case "CUSTOM": {
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate)
            const end = new Date(customEndDate)
            filtered = filtered.filter((spl) =>
              isWithinInterval(new Date(spl.date), { start, end })
            )
          }
          break
        }
        default:
          break
      }
      return filtered
    } catch (e) {
      console.error(e)
      return []
    }
  }

  const getSupervisorApprovalLabels = (spl: Spl) => {
    if (spl.supervisor?.role === "GA") {
      return { ga: spl.supervisor.name, deptHead: "-" }
    }
    if (spl.supervisor?.role === "DEPARTMENT_HEAD") {
      return { ga: "-", deptHead: spl.supervisor.name }
    }
    return { ga: "Langsung Manager", deptHead: "Langsung Manager" }
  }

  const isExportEligible = (spl: Spl) => {
    return spl.status === "APPROVED"
  }

  const exportHeaders = [
    "No",
    "Nama Karyawan",
    "PIN",
    "Departemen",
    "Tanggal Lembur",
    "Waktu Mulai",
    "Waktu Selesai",
    "Absensi Masuk",
    "Absensi Pulang",
    "Total Jam",
    "Alasan Lembur",
    "Status",
    "Disetujui Oleh GA",
    "Disetujui Oleh",
    "Tanggal Persetujuan",
    "Alasan Penolakan",
    "Tanggal Pengajuan",
    "Tanda Tangan",
  ]

  const exportColWidths = [
    { wch: 5 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 40 }, { wch: 12 }, { wch: 20 },
    { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 18 },
    { wch: 12 },
  ]

  const roundHoursFromMinutes = (minutes: number | null): number | string | null => {
    if (minutes === null || !Number.isFinite(minutes)) return null
    if (minutes < 30) return 0
    if (minutes === 30) return "30 menit"
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return remainder > 30 ? hours + 1 : hours
  }

  const formatTotalHoursExport = (spl: Spl): number | string => {
    const effectiveMinutes = getEffectiveMinutes(spl as any)
    const roundedFromEffective = roundHoursFromMinutes(effectiveMinutes)
    if (roundedFromEffective !== null) return roundedFromEffective

    const fallback = Number(spl.totalHours)
    if (!Number.isFinite(fallback)) return "-"
    const fallbackMinutes = Math.round(fallback * 60)
    const roundedFromStored = roundHoursFromMinutes(fallbackMinutes)
    return roundedFromStored ?? "-"
  }

  const formatScanTime = (value: string) => {
    const trimmed = (value || "").trim()
    if (!trimmed) return "-"
    const parts = trimmed.split(" ")
    if (parts[1] && /^\d{2}:\d{2}/.test(parts[1])) {
      return parts[1].slice(0, 5)
    }
    const normalized = trimmed.replace(" ", "T")
    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) return trimmed
    return format(parsed, "HH:mm")
  }

  const getAttendanceTimes = (
    records: AttendanceRecord[],
    dateKey: string
  ) => {
    if (!dateKey || records.length === 0) {
      return { checkIn: "-", checkOut: "-" }
    }
    const dayRecords = records.filter((record) => {
      const recordDateKey = record.scan_date.split(" ")[0]
      return recordDateKey === dateKey
    })
    if (dayRecords.length === 0) {
      return { checkIn: "-", checkOut: "-" }
    }
    dayRecords.sort((a, b) => a.scan_date.localeCompare(b.scan_date))
    return {
      checkIn: formatScanTime(dayRecords[0].scan_date),
      checkOut: formatScanTime(dayRecords[dayRecords.length - 1].scan_date),
    }
  }

  const sortSplsForExport = (items: Spl[]) => {
    return [...items].sort((a, b) => {
      // Urutkan berdasarkan tanggal paling baru (descending)
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateCompare !== 0) return dateCompare

      const nameCompare = a.requester.name.localeCompare(
        b.requester.name,
        "id-ID",
        { sensitivity: "base" }
      )
      if (nameCompare !== 0) return nameCompare
      
      const aPin = (a.requester as any).pin || ""
      const bPin = (b.requester as any).pin || ""
      return aPin.localeCompare(bPin)
    })
  }

  const buildExportContext = async (exportableSpls: Spl[]): Promise<ExportContext> => {
    const needsPinLookup = exportableSpls.some(
      (spl) => !((spl.requester as any).pin || "").toString().trim()
    )
    const nameToPin = new Map<string, string>()

    if (needsPinLookup) {
      try {
        const response = await fetch("/api/hr/users")
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            data.forEach((user) => {
              const name = (user?.name || "").toString().toLowerCase().trim()
              const pin = (user?.pin || "").toString().trim()
              if (name && pin && !nameToPin.has(name)) {
                nameToPin.set(name, pin)
              }
            })
          }
        }
      } catch (error) {
        console.error("Error fetching user pins for attendance:", error)
      }
    }

    const resolvePin = (spl: Spl) => {
      const directPin = ((spl.requester as any).pin || "").toString().trim()
      if (directPin) return directPin
      const nameKey = spl.requester.name.toLowerCase().trim()
      return nameToPin.get(nameKey) || ""
    }

    const uniquePins = Array.from(
      new Set(exportableSpls.map(resolvePin).filter(Boolean))
    )
    const attendanceByPin = new Map<string, AttendanceRecord[]>()

    if (uniquePins.length > 0) {
      await Promise.all(
        uniquePins.map(async (pin) => {
          try {
            const response = await fetch(
              `/api/hr/attendance?pin=${encodeURIComponent(pin)}`
            )
            if (!response.ok) {
              attendanceByPin.set(pin, [])
              return
            }
            const data = await response.json()
            const records = Array.isArray(data?.data) ? data.data : []
            attendanceByPin.set(pin, records)
          } catch (error) {
            console.error("Error fetching attendance for pin:", pin, error)
            attendanceByPin.set(pin, [])
          }
        })
      )
    }

    return { resolvePin, attendanceByPin }
  }

  const buildRowsFromSpls = (items: Spl[], context: ExportContext): ExportRow[] => {
    return items.map((spl, index) => {
      const { resolvePin, attendanceByPin } = context
      const supervisorLabels = getSupervisorApprovalLabels(spl)
      const resolvedPin = resolvePin(spl)
      const dateValue = new Date(spl.date)
      const dateKey = Number.isNaN(dateValue.getTime())
        ? ""
        : format(dateValue, "yyyy-MM-dd")
      const attendanceRecords = resolvedPin
        ? attendanceByPin.get(resolvedPin) || []
        : []
      const attendanceTimes = getAttendanceTimes(attendanceRecords, dateKey)

      const getStatusTextLabel = (status: string) => {
        const statusMap: Record<string, string> = {
          'PENDING': 'Menunggu',
          'PENDING_SUPERADMIN': 'Review Super Admin',
          'PENDING_SUPERVISOR': 'Menunggu Supervisor',
          'PENDING_MANAGER': 'Menunggu Manager',
          'APPROVED': 'Disetujui',
          'IN_PROGRESS': 'Berjalan',
          'DONE': 'Selesai',
          'REJECTED': 'Ditolak',
          'REJECTED_BY_SUPERVISOR': 'Ditolak Supervisor',
          'REJECTED_BY_MANAGER': 'Ditolak Manager',
        }
        return statusMap[status] || status
      }

      return {
        No: index + 1,
        "Nama Karyawan": spl.requester.name,
        PIN: resolvedPin || "-",
        Departemen:
          spl.requester.department?.name ||
          spl.requester.departmentName ||
          "-",
        "Tanggal Lembur": Number.isNaN(dateValue.getTime())
          ? "-"
          : format(dateValue, "dd/MM/yyyy"),
        "Waktu Mulai": spl.actualStartAt ? format(new Date(spl.actualStartAt), "HH:mm") : spl.startTime,
        "Waktu Selesai": spl.actualEndAt ? format(new Date(spl.actualEndAt), "HH:mm") : spl.endTime,
        "Absensi Masuk": attendanceTimes.checkIn,
        "Absensi Pulang": attendanceTimes.checkOut,
        "Total Jam": formatTotalHoursExport(spl),
        "Alasan Lembur": spl.reason,
        Status: getStatusTextLabel(spl.status),
        "Disetujui Oleh GA": supervisorLabels.ga,
        "Disetujui Oleh": spl.approver?.name || "-",
        "Tanggal Persetujuan": spl.approvalDate
          ? format(new Date(spl.approvalDate), "dd/MM/yyyy HH:mm")
          : "-",
        "Alasan Penolakan": spl.rejectionReason || "-",
        "Tanggal Pengajuan": format(new Date(spl.createdAt), "dd/MM/yyyy HH:mm"),
        "Tanda Tangan": spl.signature ? "Ada" : "Tidak",
      }
    })
  }

  const buildExportRows = async (): Promise<ExportRow[]> => {
    const allSplsForExport = await fetchAllForExport()
    const sortedSpls = sortSplsForExport(allSplsForExport)
    const exportableSpls = sortedSpls.filter(isExportEligible)
    if (exportableSpls.length === 0) return []

    const exportContext = await buildExportContext(exportableSpls)
    return buildRowsFromSpls(exportableSpls, exportContext)
  }

  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx")
      const allSplsForExport = await fetchAllForExport()
      const sortedSpls = sortSplsForExport(allSplsForExport)
      const exportableSpls = sortedSpls.filter(isExportEligible)

      if (exportableSpls.length === 0) {
        toast.error("Tidak ada data untuk diexport")
        return
      }

      toast.loading("Mempersiapkan data dan membuat file Excel...", { id: "export-excel"})
      const exportContext = await buildExportContext(exportableSpls)
      const exportData = buildRowsFromSpls(exportableSpls, exportContext)

      const ws = XLSX.utils.json_to_sheet(exportData, { header: exportHeaders })
      const wb = XLSX.utils.book_new()

      ws["!cols"] = exportColWidths

      XLSX.utils.book_append_sheet(wb, ws, "Data SPL")

      const periodText = dateFilter === "ALL" ? "Semua_Periode" :
        dateFilter === "THIS_WEEK" ? "Minggu_Ini" :
          dateFilter === "THIS_MONTH" ? "Bulan_Ini" :
            dateFilter === "LAST_MONTH" ? "Bulan_Lalu" :
              dateFilter === "LAST_3_MONTHS" ? "3_Bulan_Terakhir" :
                `${customStartDate}_sampai_${customEndDate}`

      const fileName = `Data_SPL_Admin_${filterStatus}_${periodText}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast.success("Data berhasil diexport ke Excel!", { id: "export-excel"})
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.error("Gagal export data", { id: "export-excel"})
    }
  }

  const copyTableData = async () => {
    try {
      toast.loading("Mempersiapkan penyalinan data...", { id: "copy-table"})
      const exportData = await buildExportRows()
      if (exportData.length === 0) {
        toast.error("Tidak ada data untuk disalin", { id: "copy-table"})
        return
      }

      const tableData = exportData.map((row) =>
        exportHeaders.map((header) => String(row[header] ?? ""))
      )

      const csvContent = [exportHeaders, ...tableData]
        .map(row => row.map(cell => `"${cell}"`).join("\t"))
        .join("\n")

      await navigator.clipboard.writeText(csvContent)
      toast.success("Data berhasil disalin ke clipboard!", { id: "copy-table"})
    } catch (error) {
      console.error("Error copying data:", error)
      toast.error("Gagal menyalin data", { id: "copy-table"})
    }
  }

  const wrapText = (text: string, maxChars: number) => {
    const words = text.split(" ")
    const lines: string[] = []
    let current = ""
    words.forEach((w) => {
      if ((current + " " + w).trim().length > maxChars) {
        if (current) lines.push(current.trim())
        current = w
      } else {
        current += " " + w
      }
    })
    if (current.trim()) lines.push(current.trim())
    return lines
  }

  const fitTextToWidth = (text: string, maxWidth: number, font: any, size: number) => {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (!normalized) return "-"
    if (font.widthOfTextAtSize(normalized, size) <= maxWidth) return normalized
    const ellipsis = "..."
    const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size)
    let trimmed = normalized
    while (trimmed.length > 0 && font.widthOfTextAtSize(trimmed, size) + ellipsisWidth > maxWidth) {
      trimmed = trimmed.slice(0, -1)
    }
    return trimmed.length > 0 ? `${trimmed}${ellipsis}` : ellipsis
  }

  const wrapTextByWidth = (
    text: string,
    maxWidth: number,
    font: any,
    size: number,
    maxLines = 2
  ) => {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (!normalized) return ["-"]
    const words = normalized.split(" ")
    const lines: string[] = []
    let current = ""

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        current = word
      }
      if (lines.length === maxLines) break
    }

    if (lines.length < maxLines && current) {
      lines.push(current)
    }

    if (lines.length > maxLines) {
      lines.length = maxLines
    }

    if (lines.length === maxLines) {
      const lastIndex = maxLines - 1
      lines[lastIndex] = fitTextToWidth(lines[lastIndex], maxWidth, font, size)
    }

    return lines
  }

  const generateRekapPdf = async () => {
    const allSplsForExport = await fetchAllForExport()
    if (allSplsForExport.length === 0) {
      toast.error("Tidak ada data untuk direkap")
      return
    }

    toast.loading("Membuat rekap dokumen PDF...", { id: "generate-pdf" })
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      const pageWidth = 595.28 // A4 width
      const pageHeight = 841.89 // A4 height
      const margin = 30

      const colWidths = [25, 90, 40, 60, 45, 45, 100, 65, 65]
      const headers = [
        "No",
        "Nama",
        "PIN",
        "Tanggal",
        "Mulai",
        "Selesai",
        "Keterangan",
        "TTD Pemohon",
        "TTD Atasan",
      ]
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0)

      const rowsPerPage = 8
      const rowHeight = 60

      const splsPerPage: Spl[][] = []
      // We sort the results identical to hr page here too although order shouldn't matter too much
      const sortedAllSpls = sortSplsForExport(allSplsForExport)
      for (let i = 0; i < sortedAllSpls.length; i += rowsPerPage) {
        splsPerPage.push(sortedAllSpls.slice(i, i + rowsPerPage))
      }

      let logoImage: any = null
      try {
        const logoResponse = await fetch("/logo.png")
        if (logoResponse.ok) {
          const logoBytes = await logoResponse.arrayBuffer()
          logoImage = await pdfDoc.embedPng(logoBytes)
        }
      } catch (error) {
        logoImage = null
      }

      const dataUrlToBytes = (dataUrl: string) => {
        const base64 = dataUrl.split(",")[1]
        if (!base64) return null
        const binary = atob(base64)
        const len = binary.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return bytes
      }

      for (let pageIndex = 0; pageIndex < splsPerPage.length; pageIndex++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        const pageSPLs = splsPerPage[pageIndex]
        let y = pageHeight - margin

        // --- HEADER ---
        const logoSize = 40
        if (logoImage) {
          const scale = Math.min(
            logoSize / logoImage.width,
            logoSize / logoImage.height
          )
          const dims = logoImage.scale(scale)
          const logoX = margin + (logoSize - dims.width) / 2
          const logoY = y - logoSize + (logoSize - dims.height) / 2
          page.drawImage(logoImage, { x: logoX, y: logoY, width: dims.width, height: dims.height })
        } else {
          page.drawRectangle({
            x: margin, y: y - logoSize, width: logoSize, height: logoSize,
            color: rgb(0.1, 0.6, 0.3), opacity: 0.2
          })
          page.drawCircle({ x: margin + 15, y: y - 20, size: 10, color: rgb(0.1, 0.6, 0.3) })
          page.drawCircle({ x: margin + 25, y: y - 20, size: 10, color: rgb(0.1, 0.6, 0.3) })
        }

        page.drawText("REKAP ABSEN MANUAL STAFF PT TUNAS ESTA INDONESIA", {
          x: margin + logoSize + 15,
          y: y - 25,
          size: 14,
          font: bold
        })
        y -= 60

        // --- TABEL HEADER ---
        const tableX = margin
        let currentX = tableX

        page.drawRectangle({
          x: tableX, y: y - 25,
          width: tableWidth, height: 25,
          color: rgb(0.9, 0.9, 0.9)
        })

        for (let i = 0; i < headers.length; i++) {
          const textWidth = bold.widthOfTextAtSize(headers[i], 9)
          const centerX = currentX + (colWidths[i] - textWidth) / 2

          page.drawText(headers[i], {
            x: centerX, y: y - 17,
            size: 9, font: bold
          })

          page.drawLine({
            start: { x: currentX, y: y }, end: { x: currentX, y: y - 25 },
            thickness: 0.5, color: rgb(0, 0, 0)
          })
          currentX += colWidths[i]
        }

        page.drawLine({ start: { x: currentX, y: y }, end: { x: currentX, y: y - 25 }, thickness: 0.5, color: rgb(0, 0, 0) })
        page.drawLine({ start: { x: tableX, y: y }, end: { x: currentX, y: y }, thickness: 0.5 })
        page.drawLine({ start: { x: tableX, y: y - 25 }, end: { x: currentX, y: y - 25 }, thickness: 0.5 })
        y -= 25

        // --- TABEL ROWS ---
        for (let index = 0; index < rowsPerPage; index++) {
          const spl = pageSPLs[index]
          const rowY = y - (index + 1) * rowHeight
          currentX = tableX

          page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })

          if (spl) {
            const rowData = [
              `${pageIndex * rowsPerPage + index + 1}`,
              spl.requester.name,
              (spl.requester as any).pin || "-",
              format(new Date(spl.date), "dd/MM/yyyy"),
              spl.startTime,
              spl.endTime,
            ]

            for (let i = 0; i < 6; i++) {
              const isCenter = i !== 1
              const rawText = rowData[i]
              const textSize = 9
              const displayText = fitTextToWidth(rawText, colWidths[i] - 10, font, textSize)
              const textWidth = font.widthOfTextAtSize(displayText, textSize)
              let textX = currentX + 5
              if (isCenter) textX = currentX + (colWidths[i] - textWidth) / 2

              page.drawText(displayText, {
                x: textX, y: rowY + (rowHeight / 2) - 4,
                size: textSize, font: font
              })
              currentX += colWidths[i]
              page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
            }

            // Keterangan
            const ketIndex = 6
            const ketText = spl.reason || "-"
            const ketLines = wrapText(ketText, 25)
            let ketY = rowY + rowHeight - 15
            ketLines.slice(0, 4).forEach((line) => {
              page.drawText(line, { x: currentX + 5, y: ketY, size: 8, font })
              ketY -= 10
            })
            currentX += colWidths[ketIndex]
            page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })

            const signatureCells = [
              {
                name: spl.requester.name,
                signature: spl.signature || null,
              },
              {
                name:
                  spl.supervisor?.role === "GA" || spl.supervisor?.role === "DEPARTMENT_HEAD"
                    ? spl.supervisor?.name || "-"
                    : "-",
                signature:
                  spl.supervisor?.role === "GA" || spl.supervisor?.role === "DEPARTMENT_HEAD"
                    ? spl.supervisorSignature || null
                    : null,
              },
            ]

            const drawSignatureImage = async (
              dataUrl: string,
              boxX: number,
              boxY: number,
              boxWidth: number,
              boxHeight: number
            ) => {
              try {
                const bytes = dataUrlToBytes(dataUrl)
                if (!bytes) return
                
                let image
                if (dataUrl.startsWith("data:image/png")) {
                  image = await pdfDoc.embedPng(bytes)
                } else if (dataUrl.startsWith("data:image/jpeg")) {
                  image = await pdfDoc.embedJpg(bytes)
                } else {
                  return
                }

                const imgDims = image.scale(1)
                const scale = Math.min(
                  (boxWidth - 4) / imgDims.width,
                  (boxHeight - 10) / imgDims.height
                )
                const finalDims = image.scale(scale)
                
                const imgX = boxX + (boxWidth - finalDims.width) / 2
                const imgY = boxY + 5 + (boxHeight - 10 - finalDims.height) / 2
                
                page.drawImage(image, {
                  x: imgX,
                  y: imgY,
                  width: finalDims.width,
                  height: finalDims.height,
                  opacity: 0.8
                })
              } catch (e) {
                console.error("Error drawing signature image:", e)
              }
            }

            for (let i = 0; i < 2; i++) {
              const cellWidth = colWidths[7 + i]
              const sigData = signatureCells[i]
              
              const lines = wrapTextByWidth(sigData.name, cellWidth - 4, font, 7, 2)
              lines.forEach((line, lineIdx) => {
                const lineWidth = font.widthOfTextAtSize(line, 7)
                page.drawText(line, {
                  x: currentX + (cellWidth - lineWidth) / 2,
                  y: rowY + 5 + (lines.length - 1 - lineIdx) * 8,
                  size: 7,
                  font,
                })
              })

              const signatureBoxY = rowY + 15
              const signatureBoxHeight = rowHeight - 20
              const signatureBoxWidth = cellWidth
              const signatureBoxX = currentX

              if (sigData.signature && sigData.signature.startsWith("data:image")) {
                await drawSignatureImage(
                  sigData.signature,
                  signatureBoxX,
                  signatureBoxY,
                  signatureBoxWidth,
                  signatureBoxHeight
                )
              } else {
                page.drawText("-", {
                  x: signatureBoxX + signatureBoxWidth / 2 - 2,
                  y: signatureBoxY + signatureBoxHeight / 2 - 4,
                  size: 8,
                  font,
                })
              }

              currentX += cellWidth
              page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
            }
          } else {
            for (let i = 0; i < colWidths.length; i++) {
              currentX += colWidths[i]
              page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
            }
          }
          page.drawLine({ start: { x: tableX, y: rowY }, end: { x: tableX + tableWidth, y: rowY }, thickness: 0.5 })
        }

        const footerY = 80
        const boxWidth = 140
        const totalFooterWidth = pageWidth - (margin * 2)
        const gap = (totalFooterWidth - (boxWidth * 3)) / 2

        const signatures = [
          { role: "Diajukan Oleh", name: "..........................", title: "Pemohon / Leader" },
          { role: "Disetujui Oleh", name: "Zhalilla Viola R.S.", title: "HR & GA Supervisor" },
          { role: "Mengetahui", name: "Tiyas Indah S.", title: "Plant Manager" },
        ]

        const dateText = `Demak, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`
        const dateXPos = margin + (2 * (boxWidth + gap))
        const dateWidth = font.widthOfTextAtSize(dateText, 10)
        const centeredDateX = dateXPos + (boxWidth - dateWidth) / 2

        page.drawText(dateText, {
          x: centeredDateX,
          y: footerY + 85,
          size: 10, font
        })

        signatures.forEach((sig, idx) => {
          const xPos = margin + (idx * (boxWidth + gap))

          const drawCentered = (text: string, y: number, f: any, s: number) => {
            const w = f.widthOfTextAtSize(text, s)
            page.drawText(text, { x: xPos + (boxWidth - w) / 2, y, size: s, font: f })
          }

          drawCentered(sig.role + " :", footerY + 60, bold, 9)

          page.drawLine({
            start: { x: xPos, y: footerY + 25 },
            end: { x: xPos + boxWidth, y: footerY + 25 },
            thickness: 0.5
          })

          drawCentered(sig.name, footerY + 12, bold, 9)
          drawCentered(sig.title, footerY, font, 9)
        })

      } // End Page Loop

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Rekap_Lembur_Manual_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Rekap PDF berhasil dibuat", { id: "generate-pdf" })
    } catch (error) {
      console.error("Gagal membuat rekap PDF:", error)
      toast.error("Gagal membuat rekap PDF", { id: "generate-pdf" })
    }
  }

  if (isInitialLoading) {
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
            <option value="PENDING_SUPERADMIN">Pending Super Admin</option>
            <option value="PENDING_SUPERVISOR">Pending Supervisor</option>
            <option value="PENDING_MANAGER">Pending Manager</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
            <option value="REJECTED_BY_SUPERVISOR">Rejected (Supervisor)</option>
            <option value="REJECTED_BY_MANAGER">Rejected (Manager)</option>
          </select>
        </div>
        {/* Date Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Filter Periode:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { value: "ALL", label: "Semua Periode" },
              { value: "THIS_WEEK", label: "Minggu Ini" },
              { value: "THIS_MONTH", label: "Bulan Ini" },
              { value: "LAST_MONTH", label: "Bulan Lalu" },
              { value: "LAST_3_MONTHS", label: "3 Bulan Terakhir" },
              { value: "CUSTOM", label: "Custom" }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setDateFilter(period.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dateFilter === period.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {dateFilter === "CUSTOM" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tanggal Mulai</label>
                <input
                className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tanggal Selesai</label>
                <input
                className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Export Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-end gap-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Button
              onClick={copyTableData}
              variant="outline"
              className="flex items-center justify-center gap-2 flex-1 lg:flex-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Table
            </Button>
            <Button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 flex-1 lg:flex-none text-white hover:from-green-700 hover:to-green-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </Button>
            <Button
              onClick={generateRekapPdf}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 flex-1 lg:flex-none text-white hover:from-purple-700 hover:to-purple-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF
            </Button>
          </div>
        </div>

        {isFetching && (
          <p className="text-xs text-gray-500">Memuat data terbaru...</p>
        )}
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
                  {(spl.requester.department?.name || spl.requester.departmentName || "-")} • {spl.requester.position || "-"}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durasi Lembur
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="edit-duration-days"
                  checked={editForm.endDayOffset === 0}
                  onChange={() =>
                    setEditForm((prev) => ({ ...prev, endDayOffset: 0 }))
                  }
                  className="h-4 w-4 text-red-600 border-gray-300"
                />
                1 Hari
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="edit-duration-days"
                  checked={editForm.endDayOffset === 1}
                  onChange={() =>
                    setEditForm((prev) => ({ ...prev, endDayOffset: 1 }))
                  }
                  className="h-4 w-4 text-red-600 border-gray-300"
                />
                2 Hari (Selesai Besok)
              </label>
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
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durasi Realisasi
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="edit-actual-duration-days"
                    checked={editForm.actualEndDayOffset === 0}
                    onChange={() =>
                      setEditForm((prev) => ({ ...prev, actualEndDayOffset: 0 }))
                    }
                    className="h-4 w-4 text-emerald-600 border-emerald-200"
                  />
                  1 Hari
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="edit-actual-duration-days"
                    checked={editForm.actualEndDayOffset === 1}
                    onChange={() =>
                      setEditForm((prev) => ({ ...prev, actualEndDayOffset: 1 }))
                    }
                    className="h-4 w-4 text-emerald-600 border-emerald-200"
                  />
                  2 Hari (Selesai Besok)
                </label>
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


