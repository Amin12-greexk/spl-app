"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

interface AttendanceRecord {
  scan_date: string
}

interface AttendanceUser {
  id: string
  name: string
  pin?: string | null
  role: string
  departmentName?: string | null
  department?: { name: string } | null
  regularStartTime?: string | null
}

interface AttendanceItem {
  id: string
  name: string
  pin: string
  department: string
  checkIn: string
  checkInMinutes: number
}

type AttendanceTab = "onTime" | "late" | "absent"

const START_WORK_MINUTES = 8 * 60
const MAX_USERS_TO_PROCESS = 80
const FETCH_CONCURRENCY = 8
const USER_LIST_TIMEOUT_MS = 12000
const ATTENDANCE_REQUEST_TIMEOUT_MS = 12000

const formatDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseTimeToMinutes = (value: string) => {
  const match = /^(\d{2}):(\d{2})/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }
  return hour * 60 + minute
}

const formatMinutesToTime = (minutes: number) => {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0")
  const minute = String(minutes % 60).padStart(2, "0")
  return `${hour}:${minute}`
}

const getScanDateKey = (scanDate: string) => {
  const trimmed = (scanDate || "").trim()
  if (!trimmed) return ""
  if (trimmed.includes(" ")) return trimmed.split(" ")[0]
  if (trimmed.includes("T")) return trimmed.split("T")[0]
  return trimmed
}

const getScanMinutes = (scanDate: string) => {
  const trimmed = (scanDate || "").trim()
  if (!trimmed) return null
  if (trimmed.includes(" ")) {
    const timePart = trimmed.split(" ")[1] || ""
    return parseTimeToMinutes(timePart)
  }
  if (trimmed.includes("T")) {
    const timePart = trimmed.split("T")[1] || ""
    return parseTimeToMinutes(timePart)
  }
  return null
}

const getDepartmentName = (user: AttendanceUser) =>
  (user.department?.name || user.departmentName || "-").trim()

const isSecurityDepartment = (user: AttendanceUser) =>
  getDepartmentName(user).toLowerCase() === "security"

const shouldUseEightOClockRule = (user: AttendanceUser) => {
  const regularStart = (user.regularStartTime || "08:00").trim()
  return regularStart === "08:00"
}

interface ProcessedAttendanceItem extends AttendanceItem {
  state: AttendanceTab
}

const buildAbsentItem = (user: AttendanceUser): ProcessedAttendanceItem => ({
  id: user.id,
  name: user.name,
  pin: (user.pin || "").trim(),
  department: getDepartmentName(user),
  checkIn: "-",
  checkInMinutes: Number.MAX_SAFE_INTEGER,
  state: "absent",
})

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export default function ManagerAttendancePanel() {
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()))
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<AttendanceTab>("onTime")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)

  const [onTimeUsers, setOnTimeUsers] = useState<AttendanceItem[]>([])
  const [lateUsers, setLateUsers] = useState<AttendanceItem[]>([])
  const [absentUsers, setAbsentUsers] = useState<AttendanceItem[]>([])
  const [averageCheckIn, setAverageCheckIn] = useState<string>("-")

  const fetchAttendanceOverview = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }

      try {
        const usersResponse = await fetchWithTimeout(
          "/api/hr/users",
          { cache: "no-store" },
          USER_LIST_TIMEOUT_MS
        )
        if (!usersResponse.ok) {
          throw new Error("Gagal mengambil daftar user")
        }

        const usersData = (await usersResponse.json()) as AttendanceUser[]
        const eligibleUsers = usersData
          .filter((user) => Boolean((user.pin || "").trim()))
          .filter((user) => !["MANAGER", "SUPER_ADMIN"].includes(user.role))
          .filter((user) => !isSecurityDepartment(user))
          .filter((user) => shouldUseEightOClockRule(user))
          .slice(0, MAX_USERS_TO_PROCESS)
        setProcessedCount(eligibleUsers.length)

        const presentOnTime: AttendanceItem[] = []
        const presentLate: AttendanceItem[] = []
        const absent: AttendanceItem[] = []
        const presentMinutes: number[] = []

        const processUser = async (
          user: AttendanceUser
        ): Promise<ProcessedAttendanceItem> => {
          try {
            const pin = (user.pin || "").trim()
            const response = await fetchWithTimeout(
              `/api/hr/attendance?pin=${encodeURIComponent(pin)}`,
              { cache: "no-store" },
              ATTENDANCE_REQUEST_TIMEOUT_MS
            )
            if (!response.ok) {
              return buildAbsentItem(user)
            }

            const payload = await response.json()
            const rows = Array.isArray(payload?.data)
              ? (payload.data as AttendanceRecord[])
              : []
            const firstScanMinutes = rows
              .filter((record) => getScanDateKey(record.scan_date) === selectedDate)
              .map((record) => getScanMinutes(record.scan_date))
              .filter((value): value is number => value !== null)
              .sort((a, b) => a - b)[0]

            if (firstScanMinutes === undefined) {
              return buildAbsentItem(user)
            }

            return {
              id: user.id,
              name: user.name,
              pin,
              department: getDepartmentName(user),
              checkIn: formatMinutesToTime(firstScanMinutes),
              checkInMinutes: firstScanMinutes,
              state: firstScanMinutes <= START_WORK_MINUTES ? "onTime" : "late",
            }
          } catch {
            return buildAbsentItem(user)
          }
        }

        for (let i = 0; i < eligibleUsers.length; i += FETCH_CONCURRENCY) {
          const chunk = eligibleUsers.slice(i, i + FETCH_CONCURRENCY)
          const chunkResults = await Promise.allSettled(
            chunk.map((user) => processUser(user))
          )

          chunkResults.forEach((result, index) => {
            const item =
              result.status === "fulfilled"
                ? result.value
                : buildAbsentItem(chunk[index])
            if (item.state === "onTime") {
              presentOnTime.push(item)
              presentMinutes.push(item.checkInMinutes)
              return
            }
            if (item.state === "late") {
              presentLate.push(item)
              presentMinutes.push(item.checkInMinutes)
              return
            }
            absent.push(item)
          })
        }

        presentOnTime.sort((a, b) => a.checkInMinutes - b.checkInMinutes)
        presentLate.sort((a, b) => b.checkInMinutes - a.checkInMinutes)
        absent.sort((a, b) => a.name.localeCompare(b.name, "id-ID"))

        const avgMinutes =
          presentMinutes.length > 0
            ? Math.round(
                presentMinutes.reduce((sum, minutes) => sum + minutes, 0) /
                  presentMinutes.length
              )
            : null

        setOnTimeUsers(presentOnTime)
        setLateUsers(presentLate)
        setAbsentUsers(absent)
        setAverageCheckIn(avgMinutes !== null ? formatMinutesToTime(avgMinutes) : "-")
      } catch (error: any) {
        const isTimeoutError =
          error instanceof Error && error.name === "AbortError"
        toast.error(
          isTimeoutError
            ? "Request absensi timeout. Silakan refresh."
            : error.message || "Gagal memuat ringkasan absensi"
        )
      } finally {
        if (showLoader) {
          setIsLoading(false)
        } else {
          setIsRefreshing(false)
        }
      }
    },
    [selectedDate]
  )

  useEffect(() => {
    fetchAttendanceOverview(true)
  }, [fetchAttendanceOverview])

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filterBySearch = useCallback(
    (items: AttendanceItem[]) => {
      if (!normalizedSearch) return items
      return items.filter((item) => {
        return (
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.pin.toLowerCase().includes(normalizedSearch) ||
          item.department.toLowerCase().includes(normalizedSearch)
        )
      })
    },
    [normalizedSearch]
  )

  const filteredOnTime = useMemo(() => filterBySearch(onTimeUsers), [onTimeUsers, filterBySearch])
  const filteredLate = useMemo(() => filterBySearch(lateUsers), [lateUsers, filterBySearch])
  const filteredAbsent = useMemo(() => filterBySearch(absentUsers), [absentUsers, filterBySearch])

  const activeList = useMemo(() => {
    if (activeTab === "onTime") return filteredOnTime
    if (activeTab === "late") return filteredLate
    return filteredAbsent
  }, [activeTab, filteredOnTime, filteredLate, filteredAbsent])

  const presentCount = onTimeUsers.length + lateUsers.length

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Cek Absensi Staff (Jam 08:00)
          </h3>
          <p className="text-xs text-gray-500">
            Security dikecualikan. Data berbasis scan masuk pertama.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/hr/absensi"
            className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Buka Absensi Lengkap
          </Link>
          <button
            type="button"
            onClick={() => fetchAttendanceOverview(false)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {isRefreshing ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <p className="text-[11px] text-blue-700">Tanggal</p>
          <p className="text-sm font-semibold text-blue-900">{selectedDate}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[11px] text-slate-600">Staff Diproses</p>
          <p className="text-sm font-semibold text-slate-900">{processedCount}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <p className="text-[11px] text-emerald-700">Datang Pagi/Tepat</p>
          <p className="text-sm font-semibold text-emerald-900">{onTimeUsers.length}</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
          <p className="text-[11px] text-amber-700">Terlambat</p>
          <p className="text-sm font-semibold text-amber-900">{lateUsers.length}</p>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
          <p className="text-[11px] text-rose-700">Belum Scan</p>
          <p className="text-sm font-semibold text-rose-900">{absentUsers.length}</p>
        </div>
        <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
          <p className="text-[11px] text-purple-700">Rata-rata Masuk</p>
          <p className="text-sm font-semibold text-purple-900">
            {presentCount > 0 ? averageCheckIn : "-"}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full lg:w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama / PIN / departemen"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("onTime")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
            activeTab === "onTime"
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Pagi/Tepat ({filteredOnTime.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("late")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
            activeTab === "late"
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Telat ({filteredLate.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("absent")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
            activeTab === "absent"
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Belum Scan ({filteredAbsent.length})
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-600">Memuat ringkasan absensi...</div>
        ) : activeList.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Tidak ada data pada filter ini.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeList.slice(0, 12).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    PIN {item.pin} • {item.department}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      activeTab === "onTime"
                        ? "bg-emerald-100 text-emerald-700"
                        : activeTab === "late"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {activeTab === "absent" ? "Belum scan" : item.checkIn}
                  </span>
                  <Link
                    href={`/dashboard/hr/absensi/${item.pin}`}
                    className="text-xs font-medium text-green-700 hover:text-green-800"
                  >
                    Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
