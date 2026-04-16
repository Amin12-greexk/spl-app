"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

interface AttendanceRecord {
  pin: string
  scan_date: string
}

interface AttendanceUser {
  id: string
  name: string
  email: string
  pin?: string | null
  role: string
  position?: string | null
  regularStartTime?: string | null
  regularEndTime?: string | null
  departmentName?: string | null
  department?: { name: string } | null
}

type DailyStatus = "present" | "partial" | "absent"

const MAX_RANGE_DAYS = 31

const exportHeaders = [
  "No",
  "Tanggal",
  "Hari",
  "Status",
  "Scan Pertama",
  "Scan Terakhir",
  "Total Scan",
  "Detail Scan",
  "PIN",
  "Nama Karyawan",
  "Departemen",
  "Role",
  "Jam Reguler",
]

const exportColWidths = [
  { wch: 5 },
  { wch: 18 },
  { wch: 16 },
  { wch: 18 },
  { wch: 14 },
  { wch: 14 },
  { wch: 12 },
  { wch: 32 },
  { wch: 14 },
  { wch: 24 },
  { wch: 18 },
  { wch: 14 },
  { wch: 18 },
]

const formatDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const addDays = (value: Date, days: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

const formatLongDate = (value: Date) =>
  value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

const formatWeekday = (value: Date) =>
  value.toLocaleDateString("id-ID", { weekday: "long" })

const formatScanTime = (value: string) => {
  const parsed = new Date(value.replace(" ", "T"))
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const buildTimestamp = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hour = String(now.getHours()).padStart(2, "0")
  const minute = String(now.getMinutes()).padStart(2, "0")
  const second = String(now.getSeconds()).padStart(2, "0")
  return `${year}${month}${day}_${hour}${minute}${second}`
}

const sanitizeFileName = (value: string) =>
  value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Absensi"

const getStatusConfig = (status: DailyStatus) => {
  if (status === "present") {
    return {
      label: "Hadir",
      className: "bg-emerald-100 text-emerald-800",
    }
  }

  if (status === "partial") {
    return {
      label: "1 Scan",
      className: "bg-amber-100 text-amber-800",
    }
  }

  return {
    label: "Tidak Ada Scan",
    className: "bg-rose-100 text-rose-800",
  }
}

export default function AdminAttendanceDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const pinParam = Array.isArray(params.pin) ? params.pin[0] : params.pin
  const pinValue = typeof pinParam === "string" ? pinParam : ""

  const today = useMemo(() => new Date(), [])
  const [rangeStart, setRangeStart] = useState(
    formatDateInput(addDays(today, -6))
  )
  const [rangeEnd, setRangeEnd] = useState(formatDateInput(today))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [user, setUser] = useState<AttendanceUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user?.role && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [router, session?.user?.role, status])

  const fetchUserInfo = useCallback(async () => {
    if (!pinValue) return

    try {
      const response = await fetch("/api/hr/users", {
        cache: "no-store",
      })
      const data: AttendanceUser[] = await response.json()
      if (!response.ok) {
        throw new Error("Gagal mengambil data user")
      }

      const matched = data.find((item) => (item.pin || "").toString() === pinValue)
      setUser(matched || null)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat data user")
      setUser(null)
    }
  }, [pinValue])

  const fetchAttendance = useCallback(async () => {
    if (!pinValue) return

    setRefreshing(true)
    try {
      const response = await fetch(
        `/api/hr/attendance?pin=${encodeURIComponent(pinValue)}`,
        {
          cache: "no-store",
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil absensi")
      }

      setRecords(Array.isArray(data?.data) ? data.data : [])
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil absensi")
      setRecords([])
    } finally {
      setRefreshing(false)
    }
  }, [pinValue])

  useEffect(() => {
    if (!pinValue || status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
      return
    }

    const load = async () => {
      setLoading(true)
      await Promise.all([fetchUserInfo(), fetchAttendance()])
      setLoading(false)
    }

    load()
  }, [fetchAttendance, fetchUserInfo, pinValue, session?.user?.role, status])

  const dateRangeInfo = useMemo(() => {
    const start = parseDateInput(rangeStart)
    const end = parseDateInput(rangeEnd)

    if (!start || !end) {
      return { dates: [] as Date[], error: "Tanggal tidak valid" }
    }

    if (end < start) {
      return {
        dates: [] as Date[],
        error: "Tanggal akhir lebih kecil dari tanggal awal",
      }
    }

    const diffDays =
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1

    if (diffDays > MAX_RANGE_DAYS) {
      return {
        dates: [] as Date[],
        error: `Maksimal ${MAX_RANGE_DAYS} hari per range`,
      }
    }

    const dates: Date[] = []
    for (let index = 0; index < diffDays; index += 1) {
      dates.push(addDays(start, index))
    }

    return { dates, error: null }
  }, [rangeEnd, rangeStart])

  const recordsByDate = useMemo(() => {
    const grouped = new Map<string, AttendanceRecord[]>()

    records.forEach((record) => {
      const dateKey = record.scan_date.split(" ")[0]
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)?.push(record)
    })

    grouped.forEach((items, key) => {
      items.sort((a, b) => a.scan_date.localeCompare(b.scan_date))
      grouped.set(key, items)
    })

    return grouped
  }, [records])

  const dailyRows = useMemo(() => {
    return dateRangeInfo.dates.map((date) => {
      const dateKey = formatDateInput(date)
      const dayRecords = recordsByDate.get(dateKey) || []
      const count = dayRecords.length

      const status: DailyStatus =
        count === 0 ? "absent" : count === 1 ? "partial" : "present"

      return {
        dateKey,
        longDate: formatLongDate(date),
        weekday: formatWeekday(date),
        count,
        status,
        firstScan: count > 0 ? formatScanTime(dayRecords[0].scan_date) : "-",
        lastScan:
          count > 1
            ? formatScanTime(dayRecords[dayRecords.length - 1].scan_date)
            : count === 1
            ? formatScanTime(dayRecords[0].scan_date)
            : "-",
        scanTimes: dayRecords.map((record) => formatScanTime(record.scan_date)),
      }
    })
  }, [dateRangeInfo.dates, recordsByDate])

  const summary = useMemo(() => {
    return dailyRows.reduce(
      (accumulator, row) => {
        accumulator.totalScans += row.count

        if (row.status === "present") accumulator.presentDays += 1
        if (row.status === "partial") accumulator.partialDays += 1
        if (row.status === "absent") accumulator.absentDays += 1

        return accumulator
      },
      {
        presentDays: 0,
        partialDays: 0,
        absentDays: 0,
        totalScans: 0,
      }
    )
  }, [dailyRows])

  const departmentLabel = user?.department?.name || user?.departmentName || "-"
  const regularHoursLabel =
    user?.regularStartTime && user?.regularEndTime
      ? `${user.regularStartTime} - ${user.regularEndTime}`
      : "Belum diatur"

  const exportToExcel = async () => {
    if (dateRangeInfo.error || dailyRows.length === 0) {
      toast.error("Tidak ada data absensi untuk diexport")
      return
    }

    setExporting(true)
    try {
      const XLSX = await import("xlsx")
      const exportRows = dailyRows.map((row, index) => ({
        No: index + 1,
        Tanggal: row.longDate,
        Hari: row.weekday,
        Status: getStatusConfig(row.status).label,
        "Scan Pertama": row.firstScan,
        "Scan Terakhir": row.lastScan,
        "Total Scan": row.count,
        "Detail Scan": row.scanTimes.length > 0 ? row.scanTimes.join(", ") : "-",
        PIN: pinValue,
        "Nama Karyawan": user?.name || "-",
        Departemen: departmentLabel,
        Role: user?.role || "-",
        "Jam Reguler": regularHoursLabel,
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportRows, {
        header: exportHeaders,
      })
      worksheet["!cols"] = exportColWidths

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi")

      const fileName = `Absensi_${sanitizeFileName(
        user?.name || pinValue
      )}_${rangeStart}_${rangeEnd}_${buildTimestamp()}.xlsx`

      XLSX.writeFile(workbook, fileName)
      toast.success("Absensi berhasil diexport ke Excel")
    } catch (error) {
      console.error("Error exporting attendance detail:", error)
      toast.error("Gagal export absensi")
    } finally {
      setExporting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-red-600"></div>
          <p className="text-sm font-medium text-slate-600">
            Memuat detail absensi...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_34%),linear-gradient(135deg,_#0f172a,_#1e293b_52%,_#7f1d1d)] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
              Attendance Detail
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              {user?.name || `PIN ${pinValue}`}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-200">
              <span className="rounded-full bg-white/10 px-3 py-1">
                PIN {pinValue}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                {departmentLabel}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                {user?.role || "-"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Jam Reguler {regularHoursLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/absensi"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Kembali
            </Link>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exporting || Boolean(dateRangeInfo.error) || dailyRows.length === 0}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? "Export..." : "Export Excel"}
            </button>
            <button
              type="button"
              onClick={() => fetchAttendance()}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Memuat..." : "Refresh Absensi"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Hari Hadir
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {summary.presentDays}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Hari 1 Scan
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {summary.partialDays}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            Tanpa Scan
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {summary.absentDays}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Total Scan
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.totalScans}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Maksimal range {MAX_RANGE_DAYS} hari.
          </div>
        </div>
        {dateRangeInfo.error && (
          <p className="mt-3 text-sm font-medium text-red-600">
            {dateRangeInfo.error}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Ringkasan Harian</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tabel ini menampilkan status harian, scan pertama, scan terakhir, dan
            seluruh jam scan agar lebih cepat dibaca.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Hari
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Scan Pertama
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Scan Terakhir
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Total Scan
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Detail Scan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Pilih rentang tanggal yang valid untuk melihat data.
                  </td>
                </tr>
              ) : (
                dailyRows.map((row) => {
                  const statusConfig = getStatusConfig(row.status)

                  return (
                    <tr key={row.dateKey} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {row.longDate}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{row.weekday}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">
                        {row.firstScan}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">
                        {row.lastScan}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{row.count}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {row.scanTimes.length === 0 ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            row.scanTimes.map((time) => (
                              <span
                                key={`${row.dateKey}-${time}`}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                {time}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
