"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

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

const ITEMS_PER_PAGE = 12

const getDepartmentLabel = (user: AttendanceUser) =>
  user.department?.name || user.departmentName || "-"

const getRegularHoursLabel = (user: AttendanceUser) =>
  user.regularStartTime && user.regularEndTime
    ? `${user.regularStartTime} - ${user.regularEndTime}`
    : "Belum diatur"

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

export default function AdminAttendancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pageLoading, setPageLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [users, setUsers] = useState<AttendanceUser[]>([])
  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user?.role && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
      return
    }

    if (status === "authenticated") {
      setPageLoading(false)
    }
  }, [router, session?.user?.role, status])

  const fetchAttendanceUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const response = await fetch("/api/hr/users", {
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data user absensi")
      }
      setUsers(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat user absensi")
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchAttendanceUsers()
    }
  }, [fetchAttendanceUsers, session?.user?.role])

  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(users.map((user) => getDepartmentLabel(user)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b))
  }, [users])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return users.filter((user) => {
      if (
        departmentFilter !== "ALL" &&
        getDepartmentLabel(user) !== departmentFilter
      ) {
        return false
      }

      if (!query) return true

      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.pin || "").toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query) ||
        getDepartmentLabel(user).toLowerCase().includes(query)
      )
    })
  }, [departmentFilter, search, users])

  useEffect(() => {
    setCurrentPage(1)
  }, [departmentFilter, search])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const safePage = totalPages === 0 ? 1 : Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const currentItems = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const summary = useMemo(() => {
    const withPin = users.filter((user) => (user.pin || "").trim()).length
    const withoutRegularHours = users.filter(
      (user) => !user.regularStartTime || !user.regularEndTime
    ).length

    return {
      totalUsers: users.length,
      withPin,
      departments: departmentOptions.length,
      withoutRegularHours,
    }
  }, [departmentOptions.length, users])

  const paginationNumbers = useMemo(() => {
    if (totalPages <= 1) return []
    const maxButtons = 5
    let start = Math.max(1, safePage - 2)
    let end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [safePage, totalPages])

  if (status === "loading" || pageLoading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-red-600"></div>
          <p className="text-sm font-medium text-slate-600">
            Memuat menu absensi super admin...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_34%),linear-gradient(135deg,_#1f2937,_#111827_55%,_#991b1b)] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
              Super Admin Attendance
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Cek Absensi Karyawan
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-200 sm:text-base">
              Tampilan ini memakai API absensi yang sama seperti modul HR, tetapi
              disusun ulang agar pencarian user dan pembacaan status harian lebih
              cepat.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm">
            Fokus utama: cari user lebih cepat, buka detail, lalu baca scan harian
            tanpa tabel yang terlalu lebar.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Total User
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.totalUsers}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Punya PIN
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {summary.withPin}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Departemen
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {summary.departments}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            Jam Reguler Kosong
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {summary.withoutRegularHours}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px_auto]">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, email, PIN, role, atau departemen..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="ALL">Semua Departemen</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fetchAttendanceUsers()}
            disabled={usersLoading}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {usersLoading ? "Memuat..." : "Refresh User"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Menampilkan{" "}
          <span className="font-semibold text-slate-900">
            {filteredUsers.length}
          </span>{" "}
          user yang cocok.
        </p>
        <p className="text-xs text-slate-500">
          Halaman {safePage} dari {Math.max(totalPages, 1)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {usersLoading && users.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-red-600"></div>
            <p className="mt-4 text-sm font-medium text-slate-600">
              Memuat daftar karyawan...
            </p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">
              Tidak ada user yang cocok
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ubah kata kunci atau filter departemen.
            </p>
          </div>
        ) : (
          currentItems.map((user) => {
            const hasPin = Boolean((user.pin || "").trim())

            return (
              <div
                key={user.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-red-700 text-sm font-bold text-white shadow-sm">
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900">
                        {user.name}
                      </h3>
                      <p className="truncate text-sm text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {user.role}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      PIN
                    </p>
                    <p className="mt-1 font-mono text-slate-900">
                      {user.pin || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Jam Reguler
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {getRegularHoursLabel(user)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Departemen
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {getDepartmentLabel(user)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Posisi
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {user.position || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {hasPin
                      ? "PIN tersedia, detail absensi bisa dibuka."
                      : "PIN belum ada, absensi tidak bisa dicek."}
                  </div>
                  {hasPin ? (
                    <Link
                      href={`/dashboard/admin/absensi/${encodeURIComponent(
                        user.pin || ""
                      )}`}
                      className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Buka Detail
                    </Link>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500">
                      PIN Kosong
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage === 1}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>
          {paginationNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setCurrentPage(pageNumber)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                pageNumber === safePage
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={safePage === totalPages}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  )
}
