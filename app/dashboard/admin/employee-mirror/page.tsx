"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

interface MirrorEmployee {
  id: string
  name: string
  email: string
  pin: string
  role: string
  departmentId: string | null
  departmentName: string | null
  department: {
    id: string
    name: string
  } | null
  position: string | null
  supervisorId: string | null
  supervisor: {
    id: string
    name: string
    role: string
  } | null
  regularStartTime: string | null
  regularEndTime: string | null
  createdAt: string
  updatedAt: string
}

const formatDateTime = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Inisial nama untuk avatar
const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

// Warna avatar berdasarkan karakter pertama nama
const avatarColors: Record<string, string> = {
  A: "bg-purple-100 text-purple-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-teal-100 text-teal-700",
  D: "bg-green-100 text-green-700",
  E: "bg-amber-100 text-amber-700",
  F: "bg-rose-100 text-rose-700",
  G: "bg-indigo-100 text-indigo-700",
  H: "bg-cyan-100 text-cyan-700",
}
const getAvatarColor = (name: string) =>
  avatarColors[name[0]?.toUpperCase()] || "bg-slate-100 text-slate-700"

export default function EmployeeMirrorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<MirrorEmployee[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    setMounted(true)
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [router, session, status])

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchEmployees()
    }
  }, [session?.user?.role])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employee-mirror")
      if (!response.ok) {
        throw new Error("Gagal mengambil data mirror karyawan")
      }
      const data = await response.json()
      setEmployees(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching employee mirror data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return employees

    return employees.filter((employee) => {
      const departmentLabel =
        employee.department?.name || employee.departmentName || ""
      const supervisorLabel = employee.supervisor?.name || ""

      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.pin.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query) ||
        departmentLabel.toLowerCase().includes(query) ||
        supervisorLabel.toLowerCase().includes(query)
      )
    })
  }, [employees, search])

  const summary = useMemo(() => {
    const roleCount = new Map<string, number>()
    employees.forEach((employee) => {
      roleCount.set(employee.role, (roleCount.get(employee.role) || 0) + 1)
    })

    return {
      total: employees.length,
      departments: new Set(
        employees.map((employee) =>
          employee.department?.name || employee.departmentName || "-"
        )
      ).size,
      withoutSupervisor: employees.filter((employee) => !employee.supervisorId)
        .length,
      staffLike:
        (roleCount.get("STAFF") || 0) +
        (roleCount.get("TEKNISI") || 0) +
        (roleCount.get("DRIVER") || 0),
    }
  }, [employees])

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5 px-1">

      {/* ── Hero header ── */}
      <div className="rounded-xl bg-slate-900 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Mirror Data
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight">Tabel Karyawan</h1>
            <p className="mt-1.5 max-w-lg text-sm text-slate-400 leading-relaxed">
              Data karyawan langsung dari tabel <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded text-xs">users</code> untuk pengecekan keaslian data.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs text-slate-400 border border-slate-700 rounded-lg px-3 py-2 bg-slate-800 whitespace-nowrap">
            Sumber: <span className="font-semibold text-white">tabel users</span>
          </span>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total karyawan", value: summary.total },
          { label: "Dept unik", value: summary.departments },
          { label: "Tanpa supervisor", value: summary.withoutSupervisor },
          { label: "Staff / Teknisi / Driver", value: summary.staffLike },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-gray-100 bg-white p-4"
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, PIN, role, departemen, supervisor…"
          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* ── Empty state ── */}
      {filteredEmployees.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400">
          Tidak ada karyawan yang cocok dengan pencarian.
        </div>
      )}

      {/* ── MOBILE: card list (hidden on md+) ── */}
      {filteredEmployees.length > 0 && (
        <div className="flex flex-col gap-3 md:hidden">
          {filteredEmployees.map((employee) => {
            const departmentLabel =
              employee.department?.name || employee.departmentName || "-"
            const regularHours =
              employee.regularStartTime && employee.regularEndTime
                ? `${employee.regularStartTime} – ${employee.regularEndTime}`
                : "-"

            return (
              <div
                key={employee.id}
                className="rounded-xl border border-gray-100 bg-white p-4 space-y-3"
              >
                {/* Card header */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${getAvatarColor(employee.name)}`}
                  >
                    {getInitials(employee.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                    {employee.role}
                  </span>
                </div>

                {/* Card detail grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">PIN</p>
                    <p className="font-mono font-medium text-gray-800">{employee.pin}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Departemen</p>
                    <p className="font-medium text-gray-800">{departmentLabel}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Supervisor</p>
                    <p className="font-medium text-gray-800">{employee.supervisor?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Jabatan</p>
                    <p className="font-medium text-gray-800">{employee.position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Jam reguler</p>
                    <p className="font-medium text-gray-800">{regularHours}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Diupdate</p>
                    <p className="font-medium text-gray-800">{formatDateTime(employee.updatedAt)}</p>
                  </div>
                </div>

                {/* ID row */}
                <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] text-gray-400 truncate">{employee.id}</p>
                  <Link
                    href={`/dashboard/admin/employee-mirror/${employee.id}`}
                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Mirror SPL →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── DESKTOP: table (hidden below md) ── */}
      {filteredEmployees.length > 0 && (
        <div className="hidden md:block rounded-xl border border-gray-100 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[
                    "Nama",
                    "Email",
                    "PIN",
                    "Role",
                    "Departemen",
                    "Jabatan",
                    "Supervisor",
                    "Jam reguler",
                    "Dibuat",
                    "Diupdate",
                    "Aksi",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.map((employee) => {
                  const departmentLabel =
                    employee.department?.name || employee.departmentName || "-"
                  const regularHours =
                    employee.regularStartTime && employee.regularEndTime
                      ? `${employee.regularStartTime} – ${employee.regularEndTime}`
                      : "-"

                  return (
                    <tr key={employee.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nama + avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${getAvatarColor(employee.name)}`}
                          >
                            {getInitials(employee.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[160px]">
                              {employee.name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono truncate max-w-[160px]">
                              {employee.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                        {employee.email}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">{employee.pin}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{departmentLabel}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.position || "-"}</td>
                      <td className="px-4 py-3">
                        {employee.supervisor ? (
                          <div>
                            <p className="text-gray-800 font-medium">{employee.supervisor.name}</p>
                            <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]">
                              {employee.supervisorId}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {regularHours}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDateTime(employee.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDateTime(employee.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/admin/employee-mirror/${employee.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                        >
                          Mirror SPL →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}