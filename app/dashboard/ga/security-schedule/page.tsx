"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"
import toast from "react-hot-toast"

type ShiftCode = "P1" | "P2" | "M1" | "M2" | "F1" | "OFF"

interface ScheduleDay {
  date: string
  dateKey: string
  dayOfWeek: number
  dayName: string
  dayNumber: number
  shiftCode: ShiftCode
  isHoliday: boolean
  holidayName: string | null
  isSunday: boolean
  isWeekend: boolean
  existingShiftCode?: string | null
  willOverwrite?: boolean
}

interface ScheduleUser {
  id: string
  name: string
  email: string
  type: "ROTATION" | "FIXED"
  anchorShift: ShiftCode | null
  days: ScheduleDay[]
}

interface HolidayItem {
  date: string
  name: string
}

interface SchedulePayload {
  year: number
  month: number
  users: ScheduleUser[]
  dates: ScheduleDay[]
  unassignedUsers: Array<{ id: string; name: string; email: string }>
  missingRules: string[]
  holidays: HolidayItem[]
  holidayError: string | null
  holidaySource: string
  existingCount: number
  overwriteCount: number
  savedCount?: number
  message?: string
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

const SHIFT_LABELS: Record<ShiftCode, string> = {
  P1: "P1",
  P2: "P2",
  M1: "M1",
  M2: "M2",
  F1: "F1",
  OFF: "OFF",
}

const getShiftCellClass = (shiftCode: ShiftCode) => {
  if (shiftCode === "OFF") return "bg-red-500 text-black font-bold"
  if (shiftCode === "P1") return "bg-white text-gray-900"
  if (shiftCode === "P2") return "bg-gray-50 text-gray-900"
  if (shiftCode === "M1") return "bg-white text-gray-900"
  if (shiftCode === "F1") return "bg-white text-gray-900"
  return "bg-gray-50 text-gray-900"
}

const getHeaderClass = (day: ScheduleDay) => {
  if (day.isHoliday) return "bg-lime-400 text-black"
  if (day.isSunday) return "bg-yellow-300 text-black"
  return "bg-sky-500 text-black"
}

export default function SecurityScheduleGeneratorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [payload, setPayload] = useState<SchedulePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const visibleUsers = useMemo(
    () => payload?.users.filter((user) => user.type === "ROTATION") || [],
    [payload?.users]
  )

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (
      session?.user?.role &&
      session.user.role !== "GA" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      router.push("/dashboard")
    }
  }, [router, session?.user?.role, status])

  const fetchPreview = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/ga/security-schedule?year=${year}&month=${month}`,
        { cache: "no-store" }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat preview jadwal")
      }
      setPayload(data)
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat preview jadwal")
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    if (session?.user?.role === "GA" || session?.user?.role === "SUPER_ADMIN") {
      fetchPreview()
    }
  }, [fetchPreview, session?.user?.role])

  const handleSave = async () => {
    if (!payload) return

    if (payload.missingRules.length > 0) {
      toast.error("User security untuk pola belum lengkap")
      return
    }

    const confirmText =
      payload.existingCount > 0
        ? `Jadwal ${MONTHS[month - 1]} ${year} sudah memiliki ${payload.existingCount} data. ${payload.overwriteCount} data akan berubah.`
        : `Simpan jadwal ${MONTHS[month - 1]} ${year}?`

    const result = await Swal.fire({
      icon: "warning",
      title: "Simpan Jadwal Security",
      text: confirmText,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#16a34a",
    })

    if (!result.isConfirmed) return

    setSaving(true)
    try {
      const response = await fetch("/api/ga/security-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan jadwal")
      }
      setPayload(data)
      toast.success(data.message || "Jadwal security berhasil disimpan")
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan jadwal")
    } finally {
      setSaving(false)
    }
  }

  const handleExportPdf = async () => {
    if (!payload) return

    if (payload.missingRules.length > 0) {
      toast.error("User security untuk pola belum lengkap")
      return
    }

    setExportingPdf(true)
    try {
      const response = await fetch(
        `/api/ga/security-schedule/pdf?year=${year}&month=${month}`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Gagal membuat PDF")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Jadwal_Security_${year}_${String(month).padStart(2, "0")}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success("PDF jadwal security berhasil dibuat")
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat PDF")
    } finally {
      setExportingPdf(false)
    }
  }

  if (
    status === "loading" ||
    (session?.user?.role !== "GA" && session?.user?.role !== "SUPER_ADMIN")
  ) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Generate Jadwal Security
            </h1>
            <p className="mt-1 text-sm text-emerald-100">
              Periode {MONTHS[month - 1]} {year}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="rounded-lg border border-white/30 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              min={2020}
              max={2100}
              onChange={(event) => setYear(Number(event.target.value))}
              className="rounded-lg border border-white/30 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="button"
              onClick={fetchPreview}
              disabled={loading || saving || exportingPdf}
              className="col-span-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1"
            >
              {loading ? "Memuat..." : "Preview"}
            </button>
          </div>
        </div>
      </div>

      {payload && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-gray-500">
                Anggota Rotasi
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {visibleUsers.length}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-gray-500">
                Tanggal
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {payload.dates.length}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-gray-500">
                Libur Nasional
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {payload.holidays.length}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-gray-500">
                Akan Berubah
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {payload.overwriteCount}
              </div>
            </div>
          </div>

          {(payload.missingRules.length > 0 ||
            payload.unassignedUsers.length > 0 ||
            payload.holidayError) && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {payload.missingRules.length > 0 && (
                <p>
                  Pola belum lengkap: {payload.missingRules.join(", ")}
                </p>
              )}
              {payload.unassignedUsers.length > 0 && (
                <p>
                  Tidak masuk pola:{" "}
                  {payload.unassignedUsers.map((user) => user.name).join(", ")}
                </p>
              )}
              {payload.holidayError && <p>{payload.holidayError}</p>}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Preview Jadwal
                </h2>
                <p className="text-sm text-gray-500">
                  FINA tetap dibuat otomatis di database sebagai 08:00-16:30 Senin-Jumat, tetapi tidak ditampilkan di preview.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded border border-red-200 bg-red-500 px-2 py-1 text-black">
                  OFF
                </span>
                <span className="rounded border border-yellow-300 bg-yellow-300 px-2 py-1 text-black">
                  Minggu
                </span>
                <span className="rounded border border-lime-300 bg-lime-400 px-2 py-1 text-black">
                  Libur nasional
                </span>
              </div>
            </div>

            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex flex-wrap gap-2 text-sm">
                {visibleUsers.map((user, index) => (
                  <span
                    key={user.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-800"
                  >
                    {index + 1}. {user.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="min-w-max border-collapse text-center text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-30 min-w-[48px] border border-gray-400 bg-white px-3 py-2 text-gray-900">
                      No
                    </th>
                    <th className="sticky left-[48px] z-20 min-w-[220px] border border-gray-400 bg-white px-3 py-2 text-left text-gray-900">
                      Nama
                    </th>
                    {payload.dates.map((day) => (
                      <th
                        key={`day-${day.dateKey}`}
                        className={`min-w-[54px] border border-gray-400 px-2 py-1 ${getHeaderClass(day)}`}
                        title={day.holidayName || day.dayName}
                      >
                        <div className="font-bold uppercase">{day.dayName.slice(0, 3)}</div>
                        <div className="text-sm">{day.dayNumber}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td className="sticky left-0 z-20 border border-gray-400 bg-white px-3 py-2 font-semibold text-gray-900">
                        {index + 1}
                      </td>
                      <td className="sticky left-[48px] z-10 border border-gray-400 bg-white px-3 py-2 text-left font-semibold text-gray-900">
                        <div className="truncate">{user.name}</div>
                      </td>
                      {user.days.map((day) => (
                        <td
                          key={`${user.id}-${day.dateKey}`}
                          className={`border border-gray-400 px-2 py-2 ${getShiftCellClass(day.shiftCode)} ${
                            day.willOverwrite ? "ring-2 ring-orange-400 ring-inset" : ""
                          }`}
                          title={
                            day.willOverwrite
                              ? `Sebelumnya ${day.existingShiftCode}`
                              : day.holidayName || day.dayName
                          }
                        >
                          {SHIFT_LABELS[day.shiftCode]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900">Keterangan Libur Nasional</h3>
              {payload.holidays.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  Tidak ada libur nasional dari API untuk periode ini.
                </p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {payload.holidays.map((holiday) => (
                    <div
                      key={`${holiday.date}-${holiday.name}`}
                      className="rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-gray-800"
                    >
                      <span className="font-semibold">{holiday.date}</span>
                      <span className="mx-1">:</span>
                      <span>{holiday.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={
                  exportingPdf ||
                  saving ||
                  loading ||
                  payload.missingRules.length > 0
                }
                className="w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
              >
                {exportingPdf ? "Membuat PDF..." : "Generate PDF"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  loading ||
                  exportingPdf ||
                  payload.missingRules.length > 0
                }
                className="w-full rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
              >
                {saving ? "Menyimpan..." : "Simpan Jadwal"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
