"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Role } from "@/types"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = session?.user?.role as Role
  const userPosition = session?.user?.position || ""
  const isHeadHR = userRole === "HR" && userPosition.toLowerCase().includes("head")
  const [pendingCount, setPendingCount] = useState(0)

  // Ambil jumlah SPL pending hanya untuk Manager
  useEffect(() => {
    if (userRole === "MANAGER") {
      const fetchPendingCount = async () => {
        try {
          const response = await fetch("/api/spl?status=PENDING")
          if (response.ok) {
            const data = await response.json()
            setPendingCount(data.length)
          }
        } catch (error) {
          console.error("Error fetching pending count:", error)
        }
      }
      fetchPendingCount()
    }
  }, [userRole])

  const navItems: Array<{
    name: string
    href: string
    icon: React.ReactNode
    roles: Role[]
    badge: number | null
    customCondition?: (role: string, position: string) => boolean
  }> = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z" />
        </svg>
      ),
      roles: ["STAFF", "HR", "MANAGER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "TEKNISI"],
      badge: null,
    },
    {
      name: "Pengajuan SPL",
      href: "/dashboard/staff/pengajuan",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      roles: ["STAFF", "TEKNISI"],
      badge: null,
    },
    {
      name: "Riwayat SPL",
      href: "/dashboard/staff",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      roles: ["STAFF", "TEKNISI"],
      badge: null,
    },
    {
      name: "Pengajuan SPL Saya",
      href: "/dashboard/ga/pengajuan",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      roles: ["GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "HR"],
      badge: null,
    },
    {
      name: "Riwayat SPL Saya",
      href: "/dashboard/ga/riwayat",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      roles: ["GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "HR"],
      badge: null,
    },
    {
      name: "Data & Laporan SPL",
      href: "/dashboard/hr",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      roles: ["HR"],
      badge: null,
    },
    {
      name: "Persetujuan SPL Tim",
      href: "/dashboard/ga/persetujuan",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      roles: ["GA", "DEPARTMENT_HEAD"],
      badge: null,
    },
    {
      name: "Data SPL Tim",
      href: "/dashboard/ga",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      roles: ["GA", "DEPARTMENT_HEAD"],
      badge: null,
    },
    {
      name: "Persetujuan SPL",
      href: "/dashboard/hr/persetujuan",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      roles: ["MANAGER"],
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      name: "Kelola Kepala Dept",
      href: "/dashboard/hr/kelola-kepala",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      roles: ["MANAGER"],
      badge: null,
      customCondition: (role: string, position: string) => {
        // Hanya tampil untuk MANAGER atau Head HR
        return role === "MANAGER" || (role === "HR" && position.toLowerCase().includes("head"))
      },
    },
    {
      name: "Profil Saya",
      href: "/dashboard/profile",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      roles: ["STAFF", "HR", "MANAGER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "TEKNISI", "SUPER_ADMIN"],
      badge: null,
    },
    {
      name: "Admin Panel",
      href: "/dashboard/admin",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      roles: ["SUPER_ADMIN"],
      badge: null,
    },
    {
      name: "Kelola User",
      href: "/dashboard/admin/users",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      roles: ["SUPER_ADMIN"],
      badge: null,
    },
    {
      name: "Input SPL Manual",
      href: "/dashboard/admin/spl-manual",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      roles: ["SUPER_ADMIN"],
      badge: null,
    },
    {
      name: "Riwayat SPL",
      href: "/dashboard/admin/spl-history",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      roles: ["SUPER_ADMIN"],
      badge: null,
    },
  ]

  const filteredNavItems = navItems.filter((item) => {
    // Check basic role permission
    if (!item.roles.includes(userRole)) return false

    // Check custom condition if exists
    if (item.customCondition) {
      return item.customCondition(userRole, userPosition)
    }

    return true
  })

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-40 mt-[85px]">
        <div className="flex flex-col h-full">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md"
                      : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
                  <div
                    className={`transition-colors ${
                      isActive ? "text-white" : "text-gray-500 group-hover:text-green-600"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="font-medium text-sm">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-200 shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } mt-[85px]`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-green-100">
            <h2 className="font-semibold text-green-900 text-sm">Menu Navigasi</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md"
                      : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
                  <div
                    className={`transition-colors ${
                      isActive ? "text-white" : "text-gray-500 group-hover:text-green-600"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="font-medium text-sm">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}