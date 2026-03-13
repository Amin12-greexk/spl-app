"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import Swal from "sweetalert2"

interface SecurityShiftUser {
  id: string
  name: string
  email: string
  role: string
  departmentName: string | null
  department: { name: string } | null
  shiftCode?: string | null
}

const SHIFT_OPTIONS = [
  { value: "", label: "Tanpa Shift" },
  { value: "P1", label: "P1 (07:00-15:00)" },
  { value: "P2", label: "P2 (11:00-19:00)" },
  { value: "M1", label: "M1 (16:00-04:00)" },
  { value: "M2", label: "M2 (23:00-07:00)" },
]

const getTodayDateValue = () => new Date().toLocaleDateString("en-CA")

export default function SecurityShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(getTodayDateValue)
  const [users, setUsers] = useState<SecurityShiftUser[]>([])
  const [loading, setLoading] = useState(false)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (session?.user?.role && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
      return
    }
  }, [session, status, router])

  const fetchAssignments = useCallback(async (dateValue: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/security-shifts?date=${encodeURIComponent(dateValue)}`
      )
      if (!response.ok) {
        throw new Error("Gagal mengambil data shift security")
      }
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching security shifts:", error)
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Tidak bisa memuat data shift security.",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchAssignments(selectedDate)
    }
  }, [session?.user?.role, selectedDate, fetchAssignments])

  const showToast = async (icon: "success" | "error", title: string) => {
    await Swal.fire({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1200,
      timerProgressBar: true,
      icon,
      title,
    })
  }

  const handleShiftChange = async (userId: string, shiftCode: string) => {
    setSavingUserId(userId)
    try {
      const response = await fetch("/api/admin/security-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          workDate: selectedDate,
          shiftCode: shiftCode || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan shift")
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, shiftCode: shiftCode || null } : user
        )
      )
      await showToast("success", "Shift tersimpan")
    } catch (error: any) {
      await showToast("error", error.message || "Gagal menyimpan shift")
    } finally {
      setSavingUserId(null)
    }
  }

  if (status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Shift Security Harian</h1>
        <p className="text-blue-100 text-sm mt-1">
          Atur shift security per tanggal untuk validasi jam reguler
        </p>
        <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
          <p className="text-xs text-white/90">
            <strong>Catatan:</strong> Shift security disimpan per tanggal dan akan
            dipakai sebagai jam reguler ketika pengajuan lembur dibuat.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Shift <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {users.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500 text-sm border border-gray-100 rounded-lg">
              Tidak ada user security.
            </div>
          )}
          {users.map((user) => (
            <div key={user.id} className="p-4 border border-gray-100 rounded-lg space-y-3">
              <div>
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email} • {user.role}</div>
              </div>
              <div className="pt-2 border-t border-gray-50">
                <label className="block text-xs text-gray-500 mb-1">Pilih Shift</label>
                <div className="flex items-center gap-2">
                  <select
                    value={user.shiftCode || ""}
                    onChange={(e) => handleShiftChange(user.id, e.target.value)}
                    disabled={savingUserId === user.id}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    {SHIFT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {savingUserId === user.id && (
                    <span className="text-xs text-blue-600">Menyimpan...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-center py-4 text-sm text-gray-500">Memuat data...</div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Shift</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={4}>
                    Tidak ada user security.
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={user.shiftCode || ""}
                        onChange={(e) =>
                          handleShiftChange(user.id, e.target.value)
                        }
                        disabled={savingUserId === user.id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      >
                        {SHIFT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {savingUserId === user.id && (
                        <span className="text-xs text-gray-400">Menyimpan...</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="mt-4 text-sm text-gray-500">Memuat data...</div>
          )}
        </div>
      </div>
    </div>
  )
}
