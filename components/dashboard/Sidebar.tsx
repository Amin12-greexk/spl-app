"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Role } from "@/types"

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = session?.user?.role as Role

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "📊",
      roles: ["STAFF", "HR", "MANAGER"],
    },
    {
      name: "Pengajuan SPL",
      href: "/dashboard/staff/pengajuan",
      icon: "📝",
      roles: ["STAFF"],
    },
    {
      name: "Riwayat SPL",
      href: "/dashboard/staff",
      icon: "📋",
      roles: ["STAFF"],
    },
    {
      name: "Persetujuan SPL",
      href: "/dashboard/hr/persetujuan",
      icon: "✅",
      roles: ["HR", "MANAGER"],
    },
    {
      name: "Semua SPL",
      href: "/dashboard/hr",
      icon: "📑",
      roles: ["HR", "MANAGER"],
    },
  ]

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}