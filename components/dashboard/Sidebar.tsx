"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Role } from "@/types"
import { useNotificationContext } from "@/components/notifications/Notificationprovider"
import { useStaggerAnimation } from "@/hooks/useGSAP"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

interface NavItemConfig {
  name: string
  href: string
  icon: React.ReactNode
  roles: Role[]
  badge: number | null
  badgeKey?: "manual" | "team" | "manager"
  customCondition?: (role: string, position: string) => boolean
}

interface NavGroupConfig {
  id: string
  label: string
}

const NAV_GROUPS: NavGroupConfig[] = [
  { id: "overview", label: "Utama" },
  { id: "personal", label: "Aktivitas Saya" },
  { id: "approval", label: "Tim & Persetujuan" },
  { id: "monitoring", label: "Monitoring & Laporan" },
  { id: "admin", label: "Admin Tools" },
]

const PRODUCTION_HEAD_HIDDEN_ROUTES = new Set([
  "/dashboard/data-lama",
  "/dashboard/telat-input",
  "/dashboard/ga/pengajuan",
  "/dashboard/ga/riwayat",
])

const EXACT_ONLY_HREFS = new Set([
  "/dashboard",
  "/dashboard/staff",
  "/dashboard/ga",
  "/dashboard/hr",
  "/dashboard/admin",
])

const resolveNavGroupId = (href: string) => {
  if (href.startsWith("/dashboard/admin")) return "admin"

  if (href === "/dashboard" || href === "/dashboard/profile") {
    return "overview"
  }

  if (
    [
      "/dashboard/staff/pengajuan",
      "/dashboard/staff",
      "/dashboard/telat-input",
      "/dashboard/data-lama",
      "/dashboard/ga/pengajuan",
      "/dashboard/ga/riwayat",
    ].includes(href)
  ) {
    return "personal"
  }

  if (
    [
      "/dashboard/ga/persetujuan",
      "/dashboard/ga",
      "/dashboard/hr/persetujuan",
    ].includes(href)
  ) {
    return "approval"
  }

  return "monitoring"
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = session?.user?.role as Role
  const userPosition = session?.user?.position || ""
  const isHeadHR = userRole === "HR" && userPosition.toLowerCase().includes("head")
  const normalizedDepartment = (
    session?.user?.department ||
    (session?.user as { departmentName?: string })?.departmentName ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase()
  const isProductionHead =
    userRole === "DEPARTMENT_HEAD" &&
    (normalizedDepartment === "produksi" || normalizedDepartment === "production")
  const [manualPendingCount, setManualPendingCount] = useState(0)
  const [teamPendingCount, setTeamPendingCount] = useState(0)
  const [managerPendingCount, setManagerPendingCount] = useState(0)
  const { clearNotificationCount } = useNotificationContext()

  // Stagger animation for menu items
  const navRef = useStaggerAnimation<HTMLElement>({
    stagger: 0.05,
    duration: 0.4,
    delay: 0.1,
    direction: "left",
    distance: 20,
  })

  const mobileNavRef = useStaggerAnimation<HTMLElement>({
    stagger: 0.05,
    duration: 0.4,
    delay: 0.1,
    direction: "left",
    distance: 20,
    trigger: isOpen,
  })

  const refreshSidebarBadges = useCallback(async () => {
    if (!session?.user?.id || !userRole) return

    const lastViewedKey = `notif_last_viewed_${session.user.id}`
    let lastViewedStr: string | null = null
    if (typeof window !== "undefined") {
      try {
        lastViewedStr = localStorage.getItem(lastViewedKey)
      } catch (e) {
        // Safe fallback in Safari Private mode
      }
    }
    const lastViewedTime = lastViewedStr ? new Date(lastViewedStr) : new Date(0)
    const normalizeSpls = (payload: any) => {
      if (!payload) return []
      return Array.isArray(payload) ? payload : payload?.data || []
    }

    const countManual = async () => {
      const response = await fetch("/api/spl/telat-input")
      if (!response.ok) return 0
      const data = await response.json()
      const list = normalizeSpls(data)
      return list.filter((spl: any) => {
        const createdAt = new Date(spl.createdAt || spl.date)
        return createdAt > lastViewedTime
      }).length
    }

    const countTeamPending = async () => {
      const teamPendingStatus =
        userRole === "SUPER_ADMIN"
          ? "PENDING_SUPERADMIN,PENDING_SUPERVISOR"
          : "PENDING_SUPERVISOR"
      const response = await fetch(
        `/api/spl/my-team?status=${teamPendingStatus}&lite=1&skipCount=1&page=1&limit=100`
      )
      if (!response.ok) return 0
      const data = await response.json()
      const list = normalizeSpls(data)
      return list.filter((spl: any) => {
        const createdAt = new Date(spl.createdAt)
        return createdAt > lastViewedTime
      }).length
    }

    const countManagerPending = async () => {
      const response = await fetch(
        "/api/spl?status=PENDING_MANAGER,IN_PROGRESS,DONE&page=1&limit=100"
      )
      if (!response.ok) return 0
      const data = await response.json()
      const list = normalizeSpls(data)
      return list.filter((spl: any) => {
        const createdAt = new Date(spl.createdAt)
        return createdAt > lastViewedTime
      }).length
    }

    try {
      if (["STAFF", "TEKNISI", "DRIVER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "HR", "SUPER_ADMIN"].includes(userRole)) {
        setManualPendingCount(await countManual())
      } else {
        setManualPendingCount(0)
      }

      if (userRole === "GA" || userRole === "DEPARTMENT_HEAD" || userRole === "SUPER_ADMIN") {
        setTeamPendingCount(await countTeamPending())
      } else {
        setTeamPendingCount(0)
      }

      if (userRole === "MANAGER" || userRole === "SUPER_ADMIN") {
        setManagerPendingCount(await countManagerPending())
      } else {
        setManagerPendingCount(0)
      }
    } catch (error) {
      console.error("Error fetching sidebar notification counts:", error)
    }
  }, [session?.user?.id, userRole])

  useEffect(() => {
    if (session?.user?.id) {
      refreshSidebarBadges()
    }
  }, [session?.user?.id, userRole, pathname, refreshSidebarBadges])

  const handleBadgeClick = (badgeKey?: "manual" | "team" | "manager") => {
    if (!badgeKey) return
    clearNotificationCount()

    if (badgeKey === "manual") {
      setManualPendingCount(0)
    } else if (badgeKey === "team") {
      setTeamPendingCount(0)
    } else if (badgeKey === "manager") {
      setManagerPendingCount(0)
    }
  }

  const navItems = useMemo<NavItemConfig[]>(() => [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z" />
          </svg>
        ),
        roles: ["STAFF", "HR", "MANAGER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "TEKNISI", "DRIVER"],
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
        roles: ["STAFF", "TEKNISI", "DRIVER"],
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
        roles: ["STAFF", "TEKNISI", "DRIVER"],
        badge: null,
      },
      {
        name: "Telat Input",
        href: "/dashboard/telat-input",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        roles: ["STAFF", "TEKNISI", "DRIVER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "HR"],
        badge: manualPendingCount > 0 ? manualPendingCount : null,
        badgeKey: "manual",
      },
      {
        name: "Data Lama",
        href: "/dashboard/data-lama",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        roles: ["STAFF", "TEKNISI", "DRIVER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "HR"],
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
        roles: ["HR", "MANAGER"],
        badge: null,
      },
      {
        name: "Cek Absensi",
        href: "/dashboard/hr/absensi",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        roles: ["HR", "MANAGER"],
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
        roles: ["GA", "DEPARTMENT_HEAD", "SUPER_ADMIN"],
        badge: teamPendingCount > 0 ? teamPendingCount : null,
        badgeKey: "team",
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
        name: "Generate Jadwal Security",
        href: "/dashboard/ga/security-schedule",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2zm4-6l2 2 4-4" />
          </svg>
        ),
        roles: ["GA", "SUPER_ADMIN"],
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
        roles: ["MANAGER", "SUPER_ADMIN"],
        badge: managerPendingCount > 0 ? managerPendingCount : null,
        badgeKey: "manager",
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
        roles: ["STAFF", "HR", "MANAGER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "TEKNISI", "DRIVER", "SUPER_ADMIN"],
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
        name: "Mirror Karyawan",
        href: "/dashboard/admin/employee-mirror",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        roles: ["SUPER_ADMIN"],
        badge: null,
      },
      {
        name: "Kelola Departemen",
        href: "/dashboard/admin/departments",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
          </svg>
        ),
        roles: ["SUPER_ADMIN"],
        badge: null,
      },
      {
        name: "Cek Absensi",
        href: "/dashboard/admin/absensi",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-7 9h4" />
          </svg>
        ),
        roles: ["SUPER_ADMIN"],
        badge: null,
      },
      {
        name: "Jam Reguler",
        href: "/dashboard/admin/regular-hours",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        roles: ["SUPER_ADMIN"],
        badge: null,
      },
      {
        name: "Shift Security",
        href: "/dashboard/admin/security-shifts",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    ], [managerPendingCount, manualPendingCount, teamPendingCount])

  const isItemActive = useCallback(
    (href: string) => {
      if (EXACT_ONLY_HREFS.has(href)) {
        return pathname === href
      }
      return pathname === href || pathname.startsWith(`${href}/`)
    },
    [pathname]
  )

  const filteredNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (!item.roles.includes(userRole)) return false

        if (isProductionHead && PRODUCTION_HEAD_HIDDEN_ROUTES.has(item.href)) {
          return false
        }

        if (item.customCondition) {
          return item.customCondition(userRole, userPosition)
        }

        return true
      }),
    [isProductionHead, navItems, userPosition, userRole]
  )

  const groupedNavItems = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: filteredNavItems.filter(
          (item) => resolveNavGroupId(item.href) === group.id
        ),
      })).filter((group) => group.items.length > 0),
    [filteredNavItems]
  )

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = {}

      groupedNavItems.forEach((group, index) => {
        const hasActiveItem = group.items.some((item) => isItemActive(item.href))
        next[group.id] = prev[group.id] ?? (hasActiveItem || index === 0)

        if (hasActiveItem) {
          next[group.id] = true
        }
      })

      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      const isSameState =
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])

      return isSameState ? prev : next
    })
  }, [groupedNavItems, isItemActive])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const renderNavLink = (item: NavItemConfig, isMobile = false) => {
    const isActive = isItemActive(item.href)

    return (
      <Link
        key={item.href}
        href={item.href}
        data-animate
        onClick={() => {
          handleBadgeClick(item.badgeKey)
          if (isMobile) {
            onClose?.()
          }
        }}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 group relative transform motion-safe:hover:scale-[1.02] tour-${item.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")} ${
          isActive
            ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-green-200 shadow-lg"
            : "text-gray-600 hover:bg-green-50 hover:text-green-700 hover:shadow-sm"
        }`}
      >
        <div
          className={`transition-transform duration-300 group-hover:scale-110 ${
            isActive
              ? "text-white"
              : "text-gray-400 group-hover:text-green-600"
          }`}
        >
          {item.icon}
        </div>
        <span className="font-medium text-sm transition-transform duration-300 group-hover:translate-x-1">
          {item.name}
        </span>
        {item.badge && (
          <span className="ml-auto min-w-[20px] rounded-full bg-red-500 px-2 py-1 text-center text-xs text-white motion-safe:animate-pulse-subtle shadow-md">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  const renderNavGroup = (
    group: NavGroupConfig & { items: NavItemConfig[] },
    isMobile = false
  ) => {
    const isExpanded = expandedGroups[group.id] ?? false
    const hasActiveItem = group.items.some((item) => isItemActive(item.href))

    return (
      <div
        key={group.id}
        data-animate
        className="rounded-2xl border border-gray-100 bg-gray-50/70 p-2"
      >
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
            hasActiveItem
              ? "bg-green-50 text-green-800"
              : "text-gray-700 hover:bg-white"
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              {group.label}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {group.items.length} menu
            </p>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1">
            {group.items.map((item) => renderNavLink(item, isMobile))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-[76px] h-[calc(100vh-76px)] w-64 bg-white border-r border-gray-200 shadow-lg z-40">
        <div className="flex flex-col h-full">
          <nav ref={navRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
            {groupedNavItems.map((group) => renderNavGroup(group))}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-[76px] h-[calc(100vh-76px)] w-72 bg-white border-r border-gray-200 shadow-2xl z-50 transform motion-safe:transition-transform motion-safe:duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
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
          <nav ref={mobileNavRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
            {groupedNavItems.map((group) => renderNavGroup(group, true))}
          </nav>
        </div>
      </aside>
    </>
  )
}
