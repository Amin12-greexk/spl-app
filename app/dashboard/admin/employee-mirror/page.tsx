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
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Mirror Data
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Tabel Karyawan
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Tampilan ini mengambil data karyawan langsung dari tabel user sistem
              dengan field mentah agar pengecekan keaslian data lebih cepat.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            Sumber data: <span className="font-semibold text-white">tabel users</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Karyawan</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Dept Unik</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.departments}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Tanpa Supervisor</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.withoutSupervisor}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Staff/Teknisi/Driver</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.staffLike}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, PIN, role, departemen, supervisor..."
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1600px] w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nama</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">PIN</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Department ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Position</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Supervisor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Supervisor ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Jam Reguler</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Dibuat</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Diupdate</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-gray-500">
                    Tidak ada data karyawan yang cocok.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const departmentLabel =
                    employee.department?.name || employee.departmentName || "-"
                  const regularHours =
                    employee.regularStartTime && employee.regularEndTime
                      ? `${employee.regularStartTime} - ${employee.regularEndTime}`
                      : "-"

                  return (
                    <tr key={employee.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {employee.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {employee.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{employee.email}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{employee.pin}</td>
                      <td className="px-4 py-3 text-slate-700">{employee.role}</td>
                      <td className="px-4 py-3 text-slate-700">{departmentLabel}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {employee.departmentId || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{employee.position || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {employee.supervisor?.name || "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {employee.supervisorId || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{regularHours}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime(employee.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime(employee.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/admin/employee-mirror/${employee.id}`}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Mirror SPL
                        </Link>
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
