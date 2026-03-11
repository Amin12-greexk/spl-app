"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import Link from "next/link"

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
  departmentName?: string | null
  department?: { name: string } | null
}

type AttendanceStatus = "present" | "partial" | "absent"

const MAX_RANGE_DAYS = 31

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
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

const formatHeaderDate = (value: Date) =>
  value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })

const formatScanTime = (value: string) => {
  const normalized = value.replace(" ", "T")
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const StatusIcon = ({ status }: { status: AttendanceStatus }) => {
  if (status === "present") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M12 3l9 16H3l9-16z" />
        </svg>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  )
}

export default function AbsensiDetailPage() {
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (!["HR", "MANAGER"].includes(session?.user?.role || "")) {
      router.push("/dashboard")
    }
  }, [session, status, router])

  const fetchUserInfo = useCallback(async () => {
    if (!pinValue) return
    try {
      const response = await fetch("/api/hr/users")
      if (!response.ok) {
        throw new Error("Gagal mengambil data user")
      }
      const data: AttendanceUser[] = await response.json()
      const matched = data.find(
        (item) => (item.pin || "").toString() === pinValue
      )
      setUser(matched || null)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat data user")
    }
  }, [pinValue])

  const fetchAttendance = useCallback(async () => {
    if (!pinValue) return
    setRefreshing(true)
    try {
      const response = await fetch(
        `/api/hr/attendance?pin=${encodeURIComponent(pinValue)}`
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil absensi")
      }
      const rows = Array.isArray(data?.data) ? data.data : []
      setRecords(rows)
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil absensi")
    } finally {
      setRefreshing(false)
    }
  }, [pinValue])

  useEffect(() => {
    if (!pinValue || status === "loading") return
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchUserInfo(), fetchAttendance()])
      setLoading(false)
    }
    load()
  }, [pinValue, status, fetchAttendance, fetchUserInfo])

  const dateRangeInfo = useMemo(() => {
    const start = parseDateInput(rangeStart)
    const end = parseDateInput(rangeEnd)
    if (!start || !end) {
      return { dates: [] as Date[], error: "Tanggal tidak valid" }
    }
    if (end < start) {
      return { dates: [] as Date[], error: "Tanggal akhir lebih kecil dari tanggal awal" }
    }
    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
    if (diffDays > MAX_RANGE_DAYS) {
      return {
        dates: [] as Date[],
        error: `Maksimal ${MAX_RANGE_DAYS} hari per range`,
      }
    }
    const dates: Date[] = []
    for (let i = 0; i < diffDays; i += 1) {
      dates.push(addDays(start, i))
    }
    return { dates, error: null }
  }, [rangeStart, rangeEnd])

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>()
    records.forEach((record) => {
      const dateKey = record.scan_date.split(" ")[0]
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)?.push(record)
    })
    map.forEach((items, key) => {
      items.sort((a, b) => a.scan_date.localeCompare(b.scan_date))
      map.set(key, items)
    })
    return map
  }, [records])

  const getStatusForDate = (dateKey: string) => {
    const dayRecords = recordsByDate.get(dateKey) || []
    if (dayRecords.length === 0) return { status: "absent" as AttendanceStatus, count: 0 }
    if (dayRecords.length === 1) return { status: "partial" as AttendanceStatus, count: 1 }
    return { status: "present" as AttendanceStatus, count: dayRecords.length }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-gray-600 text-sm">Memuat detail absensi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Detail Absensi</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.name || `PIN ${pinValue}`}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              PIN: <span className="font-mono text-gray-700">{pinValue}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/hr/absensi"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Kembali
            </Link>
            <button
              type="button"
              onClick={() => fetchAttendance()}
              disabled={refreshing}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              {refreshing ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rentang Tanggal
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <StatusIcon status="present" />
              Hadir
            </span>
            <span className="flex items-center gap-1">
              <StatusIcon status="partial" />
              1 scan
            </span>
            <span className="flex items-center gap-1">
              <StatusIcon status="absent" />
              Tidak ada scan
            </span>
          </div>
        </div>
        {dateRangeInfo.error && (
          <p className="text-sm text-red-600">{dateRangeInfo.error}</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold border-r border-gray-200">
                  ID User
                </th>
                <th className="px-4 py-3 text-left font-semibold border-r border-gray-200">
                  Nama
                </th>
                {dateRangeInfo.dates.map((date) => (
                  <th
                    key={date.toISOString()}
                    className="px-4 py-3 text-center font-semibold border-r border-gray-200"
                  >
                    {formatHeaderDate(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 border-r border-gray-200 font-mono text-gray-700">
                  {pinValue || "-"}
                </td>
                <td className="px-4 py-3 border-r border-gray-200 font-medium text-gray-900">
                  {user?.name || "-"}
                </td>
                {dateRangeInfo.dates.map((date) => {
                  const dateKey = formatDateInput(date)
                  const info = getStatusForDate(dateKey)
                  const dayRecords = recordsByDate.get(dateKey) || []
                  const tooltip =
                    info.count === 0
                      ? "Tidak ada scan"
                      : info.count === 1
                      ? `1 scan (${formatScanTime(dayRecords[0].scan_date)})`
                      : `Masuk ${formatScanTime(dayRecords[0].scan_date)} | Keluar ${formatScanTime(dayRecords[dayRecords.length - 1].scan_date)}`
                  return (
                    <td
                      key={`${pinValue}-${dateKey}`}
                      className="px-4 py-3 text-center border-r border-gray-200"
                      title={tooltip}
                    >
                      <StatusIcon status={info.status} />
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
        {dateRangeInfo.dates.length === 0 && (
          <p className="text-sm text-gray-500 mt-4">
            Pilih rentang tanggal untuk menampilkan data.
          </p>
        )}
      </div>
    </div>
  )
}
