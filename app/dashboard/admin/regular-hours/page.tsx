"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import TimePicker from "@/components/ui/TimePicker"

interface RegularHoursUser {
  id: string
  name: string
  email: string
  role: string
  departmentName: string | null
  department: { name: string } | null
  regularStartTime?: string | null
  regularEndTime?: string | null
  saturdayStartTime?: string | null
  saturdayEndTime?: string | null
}

const SECURITY_SHIFT_PRESETS = [
  { id: "P1", label: "P1 (07:00-15:00)", start: "07:00", end: "15:00" },
  { id: "P2", label: "P2 (11:00-19:00)", start: "11:00", end: "19:00" },
  { id: "M1", label: "M1 (16:00-04:00)", start: "16:00", end: "04:00" },
  { id: "M2", label: "M2 (23:00-07:00)", start: "23:00", end: "07:00" },
]

const getSecurityShiftPresetId = (
  startValue?: string | null,
  endValue?: string | null
) => {
  const start = (startValue || "").trim()
  const end = (endValue || "").trim()
  if (!start || !end) return "CUSTOM"
  const matched = SECURITY_SHIFT_PRESETS.find(
    (shift) => shift.start === start && shift.end === end
  )
  return matched ? matched.id : "CUSTOM"
}

export default function RegularHoursPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<RegularHoursUser[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    userId: "",
    regularStartTime: "",
    regularEndTime: "",
    saturdayStartTime: "",
    saturdayEndTime: "",
  })

  useEffect(() => {
    setMounted(true)
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (session?.user?.role && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
      return
    }
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchUsers()
    }
  }, [session, status, router])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/regular-hours")
      if (!response.ok) {
        throw new Error("Gagal mengambil data user")
      }
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserChange = (userId: string) => {
    const selected = users.find((user) => user.id === userId)
    setFormData({
      userId,
      regularStartTime: selected?.regularStartTime || "",
      regularEndTime: selected?.regularEndTime || "",
      saturdayStartTime: selected?.saturdayStartTime || "",
      saturdayEndTime: selected?.saturdayEndTime || "",
    })
  }

  const parseTimeToMinutes = (value: string) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return null
    const [hour, minute] = value.split(":").map(Number)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.userId) {
      await Swal.fire({
        icon: "error",
        title: "User belum dipilih",
        text: "Silakan pilih user terlebih dahulu.",
      })
      return
    }

    const startValue = formData.regularStartTime.trim()
    const endValue = formData.regularEndTime.trim()
    const saturdayStartValue = formData.saturdayStartTime.trim()
    const saturdayEndValue = formData.saturdayEndTime.trim()

    if ((startValue && !endValue) || (!startValue && endValue)) {
      await Swal.fire({
        icon: "error",
        title: "Jam tidak lengkap",
        text: "Jam mulai dan jam selesai harus diisi bersamaan.",
      })
      return
    }

    if (
      (saturdayStartValue && !saturdayEndValue) ||
      (!saturdayStartValue && saturdayEndValue)
    ) {
      await Swal.fire({
        icon: "error",
        title: "Jam Sabtu tidak lengkap",
        text: "Jam mulai dan jam selesai Sabtu harus diisi bersamaan.",
      })
      return
    }

    if (startValue && endValue) {
      const startMinutes = parseTimeToMinutes(startValue)
      const endMinutes = parseTimeToMinutes(endValue)
      if (startMinutes === null || endMinutes === null) {
        await Swal.fire({
          icon: "error",
          title: "Format jam salah",
          text: "Gunakan format HH:MM (24 jam).",
        })
        return
      }
      // Allow overnight shifts (e.g., 22:00-06:00 for night security)
      // Only reject if start and end are exactly the same
      if (startMinutes === endMinutes) {
        await Swal.fire({
          icon: "error",
          title: "Jam tidak valid",
          text: "Jam selesai tidak boleh sama dengan jam mulai.",
        })
        return
      }
    }

    if (saturdayStartValue && saturdayEndValue) {
      const startMinutes = parseTimeToMinutes(saturdayStartValue)
      const endMinutes = parseTimeToMinutes(saturdayEndValue)
      if (startMinutes === null || endMinutes === null) {
        await Swal.fire({
          icon: "error",
          title: "Format jam Sabtu salah",
          text: "Gunakan format HH:MM (24 jam).",
        })
        return
      }
      if (startMinutes === endMinutes) {
        await Swal.fire({
          icon: "error",
          title: "Jam Sabtu tidak valid",
          text: "Jam selesai Sabtu tidak boleh sama dengan jam mulai.",
        })
        return
      }
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/regular-hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formData.userId,
          regularStartTime: startValue || null,
          regularEndTime: endValue || null,
          saturdayStartTime: saturdayStartValue || null,
          saturdayEndTime: saturdayEndValue || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan jam reguler")
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === data.user.id
            ? {
              ...user,
              regularStartTime: data.user.regularStartTime,
              regularEndTime: data.user.regularEndTime,
              saturdayStartTime: data.user.saturdayStartTime,
              saturdayEndTime: data.user.saturdayEndTime,
            }
            : user
        )
      )

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Jam reguler berhasil diperbarui.",
      })
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedUser = users.find((user) => user.id === formData.userId)
  const selectedDepartmentName = (
    selectedUser?.department?.name ||
    selectedUser?.departmentName ||
    ""
  ).toLowerCase()
  const isSelectedSecurity = selectedDepartmentName === "security"

  if (!mounted || status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Jam Kerja Reguler</h1>
        <p className="text-green-100 text-sm mt-1">
          Atur jam kerja reguler per user untuk validasi pengajuan lembur
        </p>
        <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
          <p className="text-xs text-white/90">
            <strong>Catatan Shift Malam:</strong> Untuk shift yang melewati tengah malam (contoh: Security 22:00-06:00),
            masukkan waktu selesai yang lebih kecil dari waktu mulai. Sistem akan otomatis mendeteksi sebagai shift lintas hari.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih User <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.userId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="">-- Pilih User --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.email} ({user.role})
              </option>
            ))}
          </select>
          {selectedUser && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-700">
                <strong>Departemen:</strong>{" "}
                {selectedUser.department?.name || selectedUser.departmentName || "-"}
              </p>
              <p className="text-gray-700">
                <strong>Role:</strong> {selectedUser.role}
              </p>
              <p className="text-gray-700 flex items-center gap-2">
                <strong>Jam Reguler Saat Ini:</strong>{" "}
                {selectedUser.regularStartTime && selectedUser.regularEndTime ? (
                  <>
                    {selectedUser.regularStartTime} - {selectedUser.regularEndTime}
                    {(() => {
                      const start = parseTimeToMinutes(selectedUser.regularStartTime)
                      const end = parseTimeToMinutes(selectedUser.regularEndTime)
                      if (start !== null && end !== null && end < start) {
                        return (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            Shift Malam
                          </span>
                        )
                      }
                      return null
                    })()}
                  </>
                ) : (
                  "Belum diatur"
                )}
              </p>
              <p className="text-gray-700 flex items-center gap-2 mt-1">
                <strong>Override Sabtu:</strong>{" "}
                {selectedUser.saturdayStartTime && selectedUser.saturdayEndTime
                  ? `${selectedUser.saturdayStartTime} - ${selectedUser.saturdayEndTime}`
                  : "Mengikuti jam reguler"}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isSelectedSecurity && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Security
                </label>
                <select
                  value={getSecurityShiftPresetId(
                    formData.regularStartTime,
                    formData.regularEndTime
                  )}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "CUSTOM") return
                    const matched = SECURITY_SHIFT_PRESETS.find(
                      (shift) => shift.id === value
                    )
                    if (!matched) return
                    setFormData((prev) => ({
                      ...prev,
                      regularStartTime: matched.start,
                      regularEndTime: matched.end,
                    }))
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="CUSTOM">Manual / Custom</option>
                  {SECURITY_SHIFT_PRESETS.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Pilih shift untuk mengisi jam reguler otomatis.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jam Mulai
              </label>
              <TimePicker
                value={formData.regularStartTime}
                onChange={(value) =>
                  setFormData({ ...formData, regularStartTime: value })
                }
                showWib
                selectClassName="focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jam Selesai
              </label>
              <TimePicker
                value={formData.regularEndTime}
                onChange={(value) =>
                  setFormData({ ...formData, regularEndTime: value })
                }
                showWib
                selectClassName="focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-3">
              Jam Kerja Sabtu (opsional override)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jam Mulai Sabtu
                </label>
                <TimePicker
                  value={formData.saturdayStartTime}
                  onChange={(value) =>
                    setFormData({ ...formData, saturdayStartTime: value })
                  }
                  showWib
                  selectClassName="focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jam Selesai Sabtu
                </label>
                <TimePicker
                  value={formData.saturdayEndTime}
                  onChange={(value) =>
                    setFormData({ ...formData, saturdayEndTime: value })
                  }
                  showWib
                  selectClassName="focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-amber-700">
              Jika diisi, jam Sabtu akan dipakai otomatis saat pengajuan di hari
              Sabtu.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Jam Reguler"}
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  userId: "",
                  regularStartTime: "",
                  regularEndTime: "",
                  saturdayStartTime: "",
                  saturdayEndTime: "",
                })
              }
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Daftar Jam Reguler</h2>
          {loading && (
            <span className="text-sm text-gray-500">Memuat data...</span>
          )}
        </div>

        {/* Mobile View */}
        <div className="block md:hidden mt-4 space-y-3">
          {users.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500 text-sm border border-slate-100 rounded-lg">
              Tidak ada data user.
            </div>
          )}
          {users.map((user) => (
            <div key={user.id} className="p-4 border border-gray-100 rounded-lg space-y-3">
              <div>
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-500 mt-1">{user.role} • {user.department?.name || user.departmentName || "-"}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Jam Reguler</div>
                  {user.regularStartTime && user.regularEndTime ? (
                    <div className="flex flex-col gap-1 text-gray-900">
                      <span>{user.regularStartTime} - {user.regularEndTime}</span>
                      {(() => {
                        const start = parseTimeToMinutes(user.regularStartTime)
                        const end = parseTimeToMinutes(user.regularEndTime)
                        if (start !== null && end !== null && end < start) {
                          return (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded w-fit">
                              Shift Malam
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                  ) : (
                    <span className="text-gray-400">Belum diatur</span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Jam Sabtu</div>
                  <div className="text-gray-900">
                    {user.saturdayStartTime && user.saturdayEndTime
                      ? `${user.saturdayStartTime} - ${user.saturdayEndTime}`
                      : <span className="text-gray-400">-</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Departemen</th>
                <th className="px-4 py-3 text-left font-semibold">Jam Reguler</th>
                <th className="px-4 py-3 text-left font-semibold">Jam Sabtu</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={6}>
                    Tidak ada data user.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.role}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.department?.name || user.departmentName || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.regularStartTime && user.regularEndTime ? (
                      <div className="flex items-center gap-2">
                        <span>{user.regularStartTime} - {user.regularEndTime}</span>
                        {(() => {
                          const start = parseTimeToMinutes(user.regularStartTime)
                          const end = parseTimeToMinutes(user.regularEndTime)
                          if (start !== null && end !== null && end < start) {
                            return (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                                Shift Malam
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                    ) : (
                      "Belum diatur"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.saturdayStartTime && user.saturdayEndTime
                      ? `${user.saturdayStartTime} - ${user.saturdayEndTime}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
