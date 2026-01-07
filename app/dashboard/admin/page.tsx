"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [session, status, router])

  if (status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
      </div>
    )
  }

  const adminMenus = [
    {
      title: "Kelola User",
      description: "CRUD user, assign supervisor, ubah role",
      href: "/dashboard/admin/users",
      icon: "👥",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Kelola Departemen",
      description: "Tambah, edit, dan atur status supervised",
      href: "/dashboard/admin/departments",
      icon: "DEP",
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Jam Reguler",
      description: "Atur jam kerja reguler per user",
      href: "/dashboard/admin/regular-hours",
      icon: "JR",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Input SPL Manual",
      description: "Buat SPL untuk user yang lupa/terlewat",
      href: "/dashboard/admin/spl-manual",
      icon: "📝",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Riwayat SPL",
      description: "View dan delete semua riwayat SPL",
      href: "/dashboard/admin/spl-history",
      icon: "📋",
      color: "from-purple-500 to-purple-600",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl backdrop-blur-sm">
            🔐
          </div>
          <div>
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <p className="text-red-100 mt-1">Kelola sistem, user, dan data SPL</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-4">
          <p className="text-sm">
            ⚠️ <strong>Akses Penuh:</strong> Anda memiliki kontrol penuh terhadap sistem. Gunakan dengan bijak.
          </p>
        </div>
      </div>

      {/* Admin Menus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminMenus.map((menu, index) => (
          <Link
            key={index}
            href={menu.href}
            className="group bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${menu.color} rounded-xl flex items-center justify-center text-2xl text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {menu.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                  {menu.title}
                </h3>
                <p className="text-gray-600 text-sm mt-1">{menu.description}</p>
                <div className="flex items-center text-red-600 text-sm font-medium mt-3 group-hover:translate-x-2 transition-transform">
                  Kelola
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Info */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">ℹ️ Informasi</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span><strong>Kelola User:</strong> Tambah, edit, hapus user dan assign supervisor/kepala departemen</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span><strong>Input SPL Manual:</strong> Buat SPL untuk user yang lupa, user akan diminta TTD</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span><strong>Riwayat SPL:</strong> View dan delete semua riwayat SPL (manual & non-manual)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
