"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Swal from "sweetalert2"

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

export default function CekAbsensiPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [attendanceUsers, setAttendanceUsers] = useState<AttendanceUser[]>([])
  const [attendanceUsersLoading, setAttendanceUsersLoading] = useState(false)
  const [attendanceUserQuery, setAttendanceUserQuery] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user?.role !== "HR") {
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Anda tidak memiliki akses ke halaman ini",
      }).then(() => {
        router.push("/dashboard")
      })
      return
    }

    setIsLoading(false)
  }, [session, status, router])

  const fetchAttendanceUsers = useCallback(async () => {
    setAttendanceUsersLoading(true)
    try {
      const response = await fetch("/api/hr/users")
      if (!response.ok) {
        throw new Error("Gagal mengambil data user")
      }
      const data = await response.json()
      setAttendanceUsers(data)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat data user")
    } finally {
      setAttendanceUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.role === "HR") {
      fetchAttendanceUsers()
    }
  }, [session?.user?.role, fetchAttendanceUsers])

  const handleCheckAttendance = (pinValue?: string) => {
    const resolvedPin = (pinValue || "").trim()
    if (!resolvedPin) {
      toast.error("PIN wajib diisi")
      return
    }
    router.push(`/dashboard/hr/absensi/${resolvedPin}`)
  }

  const filteredAttendanceUsers = attendanceUsers.filter((user) => {
    if (!attendanceUserQuery.trim()) return true
    const query = attendanceUserQuery.toLowerCase().trim()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.pin || "").toLowerCase().includes(query)
    )
  })

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-gray-700 font-medium">Memuat data absensi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">Cek Absensi Karyawan</h1>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5 hidden sm:block">Monitor kehadiran karyawan</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-md sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                {filteredAttendanceUsers.length} user
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User PIN Table - Moved to Top */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="truncate">Daftar Karyawan</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                Klik tombol &quot;Cek Absensi&quot; untuk melihat data kehadiran karyawan
              </p>
            </div>
            <span className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium whitespace-nowrap self-start sm:self-auto">
              {filteredAttendanceUsers.length} user
            </span>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={attendanceUserQuery}
              onChange={(e) => setAttendanceUserQuery(e.target.value)}
              placeholder="Cari nama, email, atau PIN..."
              className="block w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            />
            {attendanceUserQuery && (
              <button
                onClick={() => setAttendanceUserQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  PIN
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Departemen
                </th>
                <th className="hidden xl:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {attendanceUsersLoading ? (
                <tr>
                  <td className="px-3 sm:px-6 py-8 sm:py-12 text-center text-gray-500" colSpan={5}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-4 border-gray-200 border-t-green-600"></div>
                      <p className="text-xs sm:text-sm font-medium">Memuat data user...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAttendanceUsers.length === 0 ? (
                <tr>
                  <td className="px-3 sm:px-6 py-8 sm:py-12 text-center text-gray-500" colSpan={5}>
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm sm:text-base font-medium">Tidak ada data user</p>
                      <p className="text-xs sm:text-sm">Coba kata kunci pencarian lain</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAttendanceUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-green-50 transition-colors">
                    <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-mono font-medium w-fit">
                          {user.pin || "-"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCheckAttendance(user.pin || "")}
                          disabled={!user.pin}
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span className="hidden sm:inline">Cek Absensi</span>
                          <span className="sm:hidden">Cek</span>
                        </button>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {user.department?.name || user.departmentName || "-"}
                    </td>
                    <td className="hidden xl:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 max-w-xs truncate">
                      {user.email}
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

