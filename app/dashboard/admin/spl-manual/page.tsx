"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import Swal from "sweetalert2"
import TimePicker from "@/components/ui/TimePicker"

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
  supervisor: {
    name: string
    role: string
  } | null
}

interface ManualSplEntry {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  endDayOffset: 0 | 1
  reason: string
  projectName: string
}

interface BulkError {
  row: number
  error: string
}

interface BulkCreateResponse {
  message?: string
  error?: string
  created?: unknown[]
  errors?: BulkError[]
}

const createEmptyEntry = (id: string): ManualSplEntry => ({
  id,
  userId: "",
  date: "",
  startTime: "",
  endTime: "",
  endDayOffset: 0,
  reason: "",
  projectName: "",
})

const getTodayInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return replacements[char]
  })

const buildBulkErrorHtml = (errors: BulkError[]) => {
  const visibleErrors = errors.slice(0, 10)
  const items = visibleErrors
    .map(
      (item) =>
        `<li><strong>Baris ${item.row}:</strong> ${escapeHtml(item.error)}</li>`
    )
    .join("")
  const more =
    errors.length > visibleErrors.length
      ? `<p class="mt-2 text-sm text-gray-600">+${errors.length - visibleErrors.length} error lainnya.</p>`
      : ""

  return `<ul class="text-left text-sm space-y-1">${items}</ul>${more}`
}

export default function ManualSPLPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [bypassWorkSchedule, setBypassWorkSchedule] = useState(false)
  const [entries, setEntries] = useState<ManualSplEntry[]>([
    createEmptyEntry("entry-1"),
  ])
  const nextEntryNumber = useRef(2)
  const todayInputValue = useMemo(() => getTodayInputValue(), [])

  const userById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]))
  }, [users])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    } else {
      fetchUsers()
    }
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        const filteredUsers = data.filter((user: User) =>
          [
            "STAFF",
            "TEKNISI",
            "DRIVER",
            "GA",
            "DEPARTMENT_HEAD",
            "HR",
            "PRODUCTION_SUPERVISOR",
          ].includes(user.role)
        )
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const parseTimeToMinutes = (value: string) => {
    if (!value || typeof value !== "string") return null
    const trimmed = value.trim()
    if (!/^\d{2}:\d{2}$/.test(trimmed)) return null
    const [hour, minute] = trimmed.split(":").map(Number)
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

  const calculateDuration = (entry: ManualSplEntry) => {
    const startMinutes = parseTimeToMinutes(entry.startTime)
    const endMinutes = parseTimeToMinutes(entry.endTime)

    if (startMinutes === null || endMinutes === null) return null

    let totalMinutes = endMinutes - startMinutes

    if (entry.endDayOffset === 1) {
      totalMinutes += 24 * 60
    } else if (totalMinutes < 0) {
      totalMinutes += 24 * 60
    }

    if (totalMinutes <= 0) return null

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `${hours} jam ${minutes > 0 ? `${minutes} menit` : ""}`.trim()
  }

  const isOvernightShift = (entry: ManualSplEntry) => {
    const startMinutes = parseTimeToMinutes(entry.startTime)
    const endMinutes = parseTimeToMinutes(entry.endTime)

    if (startMinutes === null || endMinutes === null) return false
    return entry.endDayOffset === 1 || endMinutes < startMinutes
  }

  const formatEndDateLabel = (entry: ManualSplEntry) => {
    if (!entry.date) return ""
    const base = new Date(`${entry.date}T00:00:00`)
    if (Number.isNaN(base.getTime())) return ""
    base.setDate(base.getDate() + entry.endDayOffset)
    return base.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const updateEntry = (id: string, patch: Partial<ManualSplEntry>) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      )
    )
  }

  const addEntry = () => {
    const nextId = `entry-${nextEntryNumber.current}`
    nextEntryNumber.current += 1
    setEntries((currentEntries) => [
      ...currentEntries,
      createEmptyEntry(nextId),
    ])
  }

  const duplicateEntry = (entry: ManualSplEntry) => {
    const nextId = `entry-${nextEntryNumber.current}`
    nextEntryNumber.current += 1
    const duplicatedEntry = { ...entry, id: nextId }

    setEntries((currentEntries) => {
      const entryIndex = currentEntries.findIndex((item) => item.id === entry.id)
      if (entryIndex === -1) return [...currentEntries, duplicatedEntry]
      return [
        ...currentEntries.slice(0, entryIndex + 1),
        duplicatedEntry,
        ...currentEntries.slice(entryIndex + 1),
      ]
    })
  }

  const removeEntry = (id: string) => {
    setEntries((currentEntries) => {
      if (currentEntries.length === 1) return currentEntries
      return currentEntries.filter((entry) => entry.id !== id)
    })
  }

  const resetForm = () => {
    nextEntryNumber.current = 2
    setBypassWorkSchedule(false)
    setEntries([createEmptyEntry("entry-1")])
  }

  const validateEntries = async () => {
    if (entries.length === 0) {
      await Swal.fire({
        icon: "error",
        title: "Data kosong",
        text: "Minimal satu baris SPL wajib diisi.",
      })
      return false
    }

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      const rowLabel = `Baris ${index + 1}`

      if (
        !entry.userId ||
        !entry.date ||
        !entry.startTime ||
        !entry.endTime ||
        !entry.reason.trim()
      ) {
        await Swal.fire({
          icon: "error",
          title: `${rowLabel} belum lengkap`,
          text: "Karyawan, tanggal, waktu mulai, waktu selesai, dan alasan wajib diisi.",
        })
        return false
      }

      if (entry.date > todayInputValue) {
        await Swal.fire({
          icon: "warning",
          title: `${rowLabel}: tanggal tidak diperbolehkan`,
          text: "Tanggal lembur manual tidak boleh melebihi hari ini.",
        })
        return false
      }

      const startMinutes = parseTimeToMinutes(entry.startTime)
      const endMinutes = parseTimeToMinutes(entry.endTime)
      if (startMinutes === null || endMinutes === null) {
        await Swal.fire({
          icon: "error",
          title: `${rowLabel}: jam tidak valid`,
          text: "Format jam lembur harus HH:MM.",
        })
        return false
      }

      if (startMinutes === endMinutes) {
        await Swal.fire({
          icon: "error",
          title: `${rowLabel}: jam tidak valid`,
          text: "Jam lembur akhir harus berbeda dari jam lembur mulai.",
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isValid = await validateEntries()
    if (!isValid) return

    try {
      setLoading(true)

      const response = await fetch("/api/admin/spl/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bypassWorkSchedule,
          entries: entries.map(({ id, ...entry }) => ({
            ...entry,
            bypassWorkSchedule,
          })),
        }),
      })

      const data: BulkCreateResponse = await response.json()

      if (response.ok) {
        const createdCount = Array.isArray(data.created)
          ? data.created.length
          : entries.length
        const failedErrors = data.errors || []

        if (failedErrors.length > 0) {
          const failedRows = new Set(failedErrors.map((error) => error.row))

          await Swal.fire({
            icon: "warning",
            title: "Sebagian SPL berhasil dibuat",
            html: `
              <p>${createdCount} SPL manual berhasil dibuat.</p>
              <p class="mt-2">${failedErrors.length} baris gagal dan tetap ditampilkan di form.</p>
              <div class="mt-3">${buildBulkErrorHtml(failedErrors)}</div>
            `,
          })

          setEntries((currentEntries) =>
            currentEntries.filter((_, index) => failedRows.has(index + 1))
          )
        } else {
          await Swal.fire({
            icon: "success",
            title: "SPL Manual Berhasil Dibuat!",
            html: `
              <p><strong>${createdCount}</strong> SPL manual berhasil dibuat.</p>
              <p class="text-sm text-gray-600 mt-2">User perlu menandatangani SPL ini sebelum diproses ke supervisor/manager.</p>
            `,
          })
          resetForm()
        }
      } else {
        await Swal.fire({
          icon: "error",
          title: "Gagal membuat SPL",
          html:
            data.errors && data.errors.length > 0
              ? buildBulkErrorHtml(data.errors)
              : escapeHtml(data.error || "Terjadi kesalahan saat membuat SPL."),
        })
      }
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Terjadi kesalahan saat membuat SPL",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="sticky top-0 z-10 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Daftar SPL Manual
              </h1>
              <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                {entries.length} baris
              </span>
              <label className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900">
                <input
                  type="checkbox"
                  checked={bypassWorkSchedule}
                  onChange={(e) => setBypassWorkSchedule(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                Bypass jadwal
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {loading
                  ? `Membuat ${entries.length} SPL...`
                  : `Buat ${entries.length} SPL`}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin")}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={addEntry}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tambah Baris
          </button>
        </div>

        <div className="space-y-4">
          {entries.map((entry, index) => {
            const selectedUser = userById.get(entry.userId)
            const duration = calculateDuration(entry)
            const overnight = isOvernightShift(entry)

            return (
              <article
                key={entry.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4"
              >
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Baris {index + 1}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedUser
                        ? `${selectedUser.name} (${selectedUser.role})`
                        : "Pilih karyawan untuk baris ini"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => duplicateEntry(entry)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Duplikat
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={loading || entries.length === 1}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-8 0h10"
                        />
                      </svg>
                      Hapus
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Karyawan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={entry.userId}
                    onChange={(e) =>
                      updateEntry(entry.id, { userId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">-- Pilih Karyawan --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email} ({user.role})
                      </option>
                    ))}
                  </select>
                  {selectedUser && (
                    <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
                      <p className="text-gray-700">
                        <strong>Department:</strong>{" "}
                        {selectedUser.department?.name ||
                          selectedUser.departmentName ||
                          "-"}
                      </p>
                      <p className="text-gray-700">
                        <strong>Supervisor:</strong>{" "}
                        {selectedUser.supervisor?.name || "Langsung ke Manager"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Alur: User TTD -&gt;{" "}
                        {selectedUser.supervisor
                          ? `${selectedUser.supervisor.name} -> Manager -> Approved`
                          : "Manager -> Approved"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Mulai Lembur{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) =>
                        updateEntry(entry.id, { date: e.target.value })
                      }
                      max={todayInputValue}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durasi Lembur <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 px-4 py-2.5">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name={`manual-duration-days-${entry.id}`}
                          checked={entry.endDayOffset === 0}
                          onChange={() =>
                            updateEntry(entry.id, { endDayOffset: 0 })
                          }
                          className="h-4 w-4 text-red-600 border-gray-300"
                        />
                        1 Hari
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name={`manual-duration-days-${entry.id}`}
                          checked={entry.endDayOffset === 1}
                          onChange={() =>
                            updateEntry(entry.id, { endDayOffset: 1 })
                          }
                          className="h-4 w-4 text-red-600 border-gray-300"
                        />
                        2 Hari (Selesai Besok)
                      </label>
                    </div>
                    {entry.endDayOffset === 1 && entry.date && (
                      <p className="mt-2 text-xs text-gray-500">
                        Tanggal selesai: {formatEndDateLabel(entry)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waktu Mulai <span className="text-red-500">*</span>
                    </label>
                    <TimePicker
                      value={entry.startTime}
                      onChange={(value) =>
                        updateEntry(entry.id, { startTime: value })
                      }
                      showWib
                      required
                      selectClassName="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waktu Selesai <span className="text-red-500">*</span>
                    </label>
                    <TimePicker
                      value={entry.endTime}
                      onChange={(value) =>
                        updateEntry(entry.id, { endTime: value })
                      }
                      showWib
                      required
                      hint={
                        overnight
                          ? entry.endDayOffset === 1
                            ? "Lembur 2 hari terdeteksi"
                            : "Shift lintas hari terdeteksi"
                          : undefined
                      }
                      selectClassName="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {duration && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm text-green-800 font-medium">
                      Durasi: {duration}
                    </span>
                    {overnight && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        {entry.endDayOffset === 1 ? "2 Hari" : "Lintas Hari"}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Project (Opsional)
                    </label>
                    <input
                      type="text"
                      value={entry.projectName}
                      onChange={(e) =>
                        updateEntry(entry.id, { projectName: e.target.value })
                      }
                      placeholder="Nama project yang dikerjakan"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alasan Lembur <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={entry.reason}
                      onChange={(e) =>
                        updateEntry(entry.id, { reason: e.target.value })
                      }
                      placeholder="Jelaskan alasan lembur..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={addEntry}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tambah Baris
          </button>
        </div>
      </form>
    </div>
  )
}
