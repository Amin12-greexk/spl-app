"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef, memo } from "react"
import { useNotificationContext } from "@/components/notifications/Notificationprovider"
import { getRoleLabel } from "@/lib/utils"

interface HeaderProps {
  onMenuClick?: () => void
}

interface Notification {
  id: string
  title: string
  message: string
  status: string
  createdAt: string
  approvalDate?: string
  employeeName?: string
  notificationType?: string
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotificationMenu, setShowNotificationMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const loadingNotificationsRef = useRef(false)
  const sessionUserId = session?.user?.id
  const sessionUserRole = session?.user?.role

  // Get notification count from context (real-time updates via Firebase)
  const { notificationCount, refreshNotificationCount, clearNotificationCount } = useNotificationContext()

  // Efek Glassmorphism saat scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Refresh notification count on mount and when session changes
  useEffect(() => {
    if (session) {
      refreshNotificationCount()
    }
  }, [session])

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      await signOut({ redirect: false })
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
      setShowUserMenu(false)
    }
  }, [router])

  // Fetch notifications when dropdown is opened
  const fetchNotifications = useCallback(async () => {
    if (loadingNotificationsRef.current || !sessionUserId || !sessionUserRole) return

    loadingNotificationsRef.current = true
    setLoadingNotifications(true)
    try {
      const fetchJson = async (url: string) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        try {
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) {
            return null
          }
          return await response.json()
        } catch {
          return null
        } finally {
          clearTimeout(timeoutId)
        }
      }

      const buildManualEntryNotifications = (manualData: any[]) => {
        const formatDate = (dateString: string) => {
          if (!dateString) return 'tanggal tidak tersedia'
          try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return 'tanggal tidak valid'
            return date.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })
          } catch {
            return 'tanggal tidak valid'
          }
        }

        return manualData.map((spl: any) => ({
          id: spl.id,
          title: "SPL Telat Input",
          message: `SPL ${formatDate(spl.date)} (${spl.startTime}-${spl.endTime}) menunggu tanda tangan`,
          status: "PENDING_SIGNATURE",
          createdAt: spl.createdAt || spl.date,
          notificationType: "manual_entry",
        }))
      }

      if (sessionUserRole === "STAFF" || sessionUserRole === "TEKNISI" || sessionUserRole === "DRIVER" || sessionUserRole === "PRODUCTION_SUPERVISOR") {
        const allNotifications: any[] = []
        const data = await fetchJson("/api/spl")
        if (!data) {
          setNotifications([])
          return
        }
        const recentUpdates = data
            .filter((spl: any) => {
              // Filter harus sama dengan logic di NotificationProvider
              const isNotPending = !["PENDING_SUPERVISOR", "PENDING_MANAGER"].includes(spl.status)
              const isRecent = new Date(spl.approvalDate || spl.supervisorApprovalDate || spl.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              return isNotPending && isRecent
            })
            .map((spl: any) => {
              // Format tanggal dengan validasi
              const formatDate = (dateString: string) => {
                if (!dateString) return 'tanggal tidak tersedia'
                try {
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) return 'tanggal tidak valid'
                  return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                } catch {
                  return 'tanggal tidak valid'
                }
              }

              // Format approval date dengan waktu
              const formatApprovalDate = (dateString: string) => {
                if (!dateString) return ''
                try {
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) return ''
                  return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                } catch {
                  return ''
                }
              }

              const statusText = spl.status === "APPROVED" ? "disetujui" : spl.status === "REJECTED" ? "ditolak" : "diupdate"
              const approvalDateText = formatApprovalDate(spl.approvalDate)

              return {
                id: spl.id,
                title: `SPL ${spl.status === "APPROVED" ? "Disetujui" : spl.status === "REJECTED" ? "Ditolak" : "Diupdate"}`,
                message: `SPL untuk tanggal ${formatDate(spl.date)} telah ${statusText}${approvalDateText ? ` pada ${approvalDateText}` : ''}`,
                status: spl.status,
                createdAt: spl.approvalDate || spl.updatedAt,
              }
            })
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        allNotifications.push(...recentUpdates)

        const manualData = await fetchJson("/api/spl/telat-input")
        if (manualData) {
          allNotifications.push(...buildManualEntryNotifications(manualData))
        }

        allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setNotifications(allNotifications.slice(0, 10))
      } else if (sessionUserRole === "GA" || sessionUserRole === "DEPARTMENT_HEAD") {
        // GA/DEPT_HEAD punya 2 jenis notifikasi:
        // 1. Update SPL mereka sendiri
        // 2. Pending approval dari team mereka

        const allNotifications: any[] = []

        // 1. Fetch own SPL updates
        const ownData = await fetchJson("/api/spl")
        if (ownData) {
          const ownUpdates = ownData
            .filter((spl: any) => {
              const isNotPending = !["PENDING_SUPERVISOR", "PENDING_MANAGER"].includes(spl.status)
              const isRecent = new Date(spl.approvalDate || spl.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              return isNotPending && isRecent
            })
            .map((spl: any) => {
              const formatDate = (dateString: string) => {
                if (!dateString) return 'tanggal tidak tersedia'
                try {
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) return 'tanggal tidak valid'
                  return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                } catch {
                  return 'tanggal tidak valid'
                }
              }

              const statusText = spl.status === "APPROVED" ? "disetujui" : "ditolak"
              return {
                id: spl.id,
                title: `SPL Anda ${spl.status === "APPROVED" ? "Disetujui" : "Ditolak"}`,
                message: `SPL ${formatDate(spl.date)} telah ${statusText}`,
                status: spl.status,
                createdAt: spl.approvalDate || spl.updatedAt,
              }
            })
          allNotifications.push(...ownUpdates)
        }

        // 2. Fetch team SPL pending approval
        const teamData = await fetchJson("/api/spl/my-team")
        if (teamData) {
          const pendingApprovals = teamData
            .filter((spl: any) => spl.status === "PENDING_SUPERVISOR")
            .map((spl: any) => {
              const formatDate = (dateString: string) => {
                if (!dateString) return 'tanggal tidak tersedia'
                try {
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) return 'tanggal tidak valid'
                  return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                } catch {
                  return 'tanggal tidak valid'
                }
              }

              return {
                id: spl.id,
                title: "SPL Perlu Persetujuan",
                message: `${spl.requester?.name || "Staff"} mengajukan SPL ${formatDate(spl.date)}`,
                status: spl.status,
                createdAt: spl.createdAt,
                employeeName: spl.requester?.name,
              }
            })
          allNotifications.push(...pendingApprovals)
        }

        const manualData = await fetchJson("/api/spl/telat-input")
        if (manualData) {
          allNotifications.push(...buildManualEntryNotifications(manualData))
        }

        // Sort and limit
        allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setNotifications(allNotifications.slice(0, 10))

      } else if (sessionUserRole === "HR") {
        // HR punya 2 jenis notifikasi:
        // 1. Update SPL mereka sendiri (jika mereka submit)
        // 2. Pending approval MANAGER dari semua staff

        const allNotifications: any[] = []

        // 1. Fetch own SPL updates
        const ownData = await fetchJson(`/api/spl?userId=${sessionUserId}`)
        if (ownData) {
          const ownUpdates = ownData
            .filter((spl: any) => {
              const isNotPending = !["PENDING_SUPERVISOR", "PENDING_MANAGER"].includes(spl.status)
              const isRecent = new Date(spl.approvalDate || spl.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              return isNotPending && isRecent
            })
            .map((spl: any) => {
              const formatDate = (dateString: string) => {
                if (!dateString) return 'tanggal tidak tersedia'
                try {
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) return 'tanggal tidak valid'
                  return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                } catch {
                  return 'tanggal tidak valid'
                }
              }

              const statusText = spl.status === "APPROVED" ? "disetujui" : "ditolak"
              return {
                id: spl.id,
                title: `SPL Anda ${spl.status === "APPROVED" ? "Disetujui" : "Ditolak"}`,
                message: `SPL ${formatDate(spl.date)} telah ${statusText}`,
                status: spl.status,
                createdAt: spl.approvalDate || spl.updatedAt,
              }
            })
          allNotifications.push(...ownUpdates)
        }

        // 2. Fetch pending manager approvals (view only, tidak bisa approve)
        const data = await fetchJson("/api/spl?status=PENDING_MANAGER")
        if (data) {
          const pendingNotifications = data.slice(0, 5).map((spl: any) => {
              // Format tanggal dengan validasi
              const formatDate = (dateString: string) => {
                if (!dateString) return 'tanggal tidak tersedia'
                try {
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) return 'tanggal tidak valid'
                  return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                } catch {
                  return 'tanggal tidak valid'
                }
              }

              return {
                id: spl.id,
                title: "SPL Menunggu Manager",
                message: `${spl.requester?.name || "Karyawan"} - SPL ${formatDate(spl.date)} menunggu Manager`,
                status: spl.status,
                createdAt: spl.createdAt,
                employeeName: spl.requester?.name,
              }
            })
          allNotifications.push(...pendingNotifications)
        }

        const manualData = await fetchJson("/api/spl/telat-input")
        if (manualData) {
          allNotifications.push(...buildManualEntryNotifications(manualData))
        }

        // Sort and limit
        allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setNotifications(allNotifications.slice(0, 10))

      } else if (sessionUserRole === "MANAGER") {
        // MANAGER hanya lihat pending approvals
        const data = await fetchJson("/api/spl?status=PENDING_MANAGER")
        if (!data) {
          setNotifications([])
          return
        }
        const pendingNotifications = data
            .map((spl: any) => {
              const formatDate = (dateString: string) => {
                if (!dateString) return 'tanggal tidak tersedia'
                try {
                  const date = new Date(dateString)
                  if (isNaN(date.getTime())) return 'tanggal tidak valid'
                  return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                } catch {
                  return 'tanggal tidak valid'
                }
              }

              return {
                id: spl.id,
                title: "SPL Perlu Persetujuan",
                message: `${spl.requester?.name || "Karyawan"} mengajukan SPL ${formatDate(spl.date)}`,
                status: spl.status,
                createdAt: spl.createdAt,
                employeeName: spl.requester?.name,
              }
            })
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)

          setNotifications(pendingNotifications)
      }
    } catch (error) {
      setNotifications([])
    } finally {
      loadingNotificationsRef.current = false
      setLoadingNotifications(false)
    }
  }, [sessionUserId, sessionUserRole])

  // Auto-refresh notifications list when dropdown is open and count changes
  useEffect(() => {
    if (showNotificationMenu && sessionUserId && sessionUserRole) {
      fetchNotifications()
    }
  }, [showNotificationMenu, sessionUserId, sessionUserRole, fetchNotifications])

  // Handle notification menu toggle
  const handleNotificationClick = useCallback(() => {
    setShowUserMenu(false)
    const willOpen = !showNotificationMenu
    setShowNotificationMenu(willOpen)

    if (willOpen) {
      clearNotificationCount()
    }
  }, [showNotificationMenu, clearNotificationCount])

  // Handle notification item click
  const handleNotificationItemClick = useCallback((notification: any) => {
    setShowNotificationMenu(false)
    clearNotificationCount()

    if (notification.notificationType === "manual_entry") {
      router.push("/dashboard/telat-input")
      return
    }
    if (session?.user?.role === "STAFF" || session?.user?.role === "TEKNISI" || session?.user?.role === "DRIVER" || session?.user?.role === "PRODUCTION_SUPERVISOR") {
      router.push(`/dashboard/staff/pengajuan/${notification.id}`)
    } else if (session?.user?.role === "GA" || session?.user?.role === "DEPARTMENT_HEAD") {
      if (notification.notificationType === "own_spl") {
        router.push(`/dashboard/ga/riwayat`)
      } else {
        router.push(`/dashboard/ga/persetujuan`)
      }
    } else if (session?.user?.role === "HR") {
      if (notification.notificationType === "own_spl") {
        router.push(`/dashboard/ga/riwayat`)
      } else {
        router.push(`/dashboard/hr`)
      }
    } else if (session?.user?.role === "MANAGER") {
      router.push(`/dashboard/hr/persetujuan`)
    }
  }, [session?.user?.role, router, clearNotificationCount])

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [])

  // Format relative time
  const getRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Baru saja"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`
    return date.toLocaleDateString("id-ID")
  }, [])

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full ${
          isScrolled 
            ? "bg-white/85 backdrop-blur-md shadow-sm border-b border-gray-200/50 py-2" 
            : "bg-white border-b border-gray-100 py-3"
        }`}
      >
        <div className="px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between">
            
            {/* --- LEFT: BRANDING --- */}
            <div className="flex items-center gap-4">
              {/* Mobile Toggle */}
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 transition-transform hover:scale-105">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Vertical Divider */}
                <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
                
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-gray-900 leading-none mb-1">
                    PT Tunas Esta Indonesia
                  </h1>
                  <p className="text-xs text-green-600 font-medium tracking-wide bg-green-50 px-2 py-0.5 rounded-full w-fit">
                    Sistem Pengajuan SPL
                  </p>
                </div>
              </div>
            </div>

            {/* --- RIGHT: ACTIONS --- */}
            <div className="flex items-center gap-3">

              {/* Notification Icon */}
              <div className="relative mr-2">
                <button
                  onClick={handleNotificationClick}
                  className={`p-2.5 rounded-full transition-all duration-200 ${
                    showNotificationMenu
                      ? "bg-green-50 text-green-600 ring-2 ring-green-100"
                      : "text-gray-500 hover:bg-gray-100 hover:text-green-600"
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>

                  {notificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-5 w-5">
                      <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] font-bold text-white items-center justify-center border-2 border-white shadow-sm motion-safe:animate-pulse-subtle">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotificationMenu && (
                  <>
                    <div className="fixed inset-0 z-30 motion-safe:animate-fade-in" onClick={() => {
                      setShowNotificationMenu(false)
                    }} />

                    <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden motion-safe:animate-scale-in max-h-[500px] flex flex-col">
                      {/* Header */}
                      <div className="p-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-900">Notifikasi</h3>
                          {notificationCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              {notificationCount} Baru
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notification List */}
                      <div className="overflow-y-auto flex-1">
                        {loadingNotifications ? (
                          <div className="p-8 text-center">
                            <div className="spinner h-8 w-8 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-3 motion-safe:animate-pulse-subtle">Memuat notifikasi...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-900">Tidak ada notifikasi</p>
                            <p className="text-xs text-gray-500 mt-1">Notifikasi akan muncul di sini</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                              <button
                                key={notification.id}
                                onClick={() => handleNotificationItemClick(notification)}
                                className="w-full p-4 hover:bg-gray-50 transition-micro text-left group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                    notification.status === "APPROVED"
                                      ? "bg-green-100 text-green-600"
                                      : notification.status === "REJECTED"
                                      ? "bg-red-100 text-red-600"
                                      : "bg-blue-100 text-blue-600"
                                  }`}>
                                    {notification.status === "APPROVED" ? (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : notification.status === "REJECTED" ? (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1.5">
                                      {getRelativeTime(notification.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-100 bg-gray-50">
                          <button
                            onClick={() => {
                              setShowNotificationMenu(false)
                              clearNotificationCount() // Clear badge for smooth UX

                              if (session?.user?.role === "STAFF" || session?.user?.role === "TEKNISI") {
                                router.push("/dashboard/staff/pengajuan")
                              } else if (session?.user?.role === "HR") {
                                router.push("/dashboard/hr/persetujuan")
                              } else if (session?.user?.role === "MANAGER") {
                                router.push("/dashboard/manager/persetujuan")
                              }
                            }}
                            className="w-full text-center text-xs font-semibold text-green-600 hover:text-green-700 py-2 rounded-lg hover:bg-white transition-colors"
                          >
                            Lihat Semua Notifikasi
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* User Menu Trigger */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotificationMenu(false) // Close notification menu if open
                    setShowUserMenu(!showUserMenu)
                  }}
                  className={`flex items-center gap-3 pl-1 pr-1 sm:pr-4 py-1 rounded-full border transition-all duration-200 group ${
                    showUserMenu
                      ? "bg-green-50/50 border-green-200 ring-2 ring-green-100"
                      : "bg-white border-gray-200 hover:border-green-200 hover:shadow-sm"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold shadow-md border-2 border-white">
                    {session?.user?.name ? getInitials(session.user.name) : "U"}
                  </div>
                  
                  <div className="hidden sm:flex flex-col items-start mr-1">
                    <span className="text-xs font-bold text-gray-700 group-hover:text-green-700 transition-colors">
                      {session?.user?.name?.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {session?.user?.role ? getRoleLabel(session.user.role) : ''}
                    </span>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 hidden sm:block ${showUserMenu ? 'rotate-180 text-green-600' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-30 motion-safe:animate-fade-in" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden motion-safe:animate-scale-in">
                      {/* User Info Header */}
                      <div className="p-5 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
                             {session?.user?.name ? getInitials(session.user.name) : "U"}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">{session?.user?.name}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{session?.user?.email}</p>
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                            {session?.user?.role ? getRoleLabel(session.user.role) : ''}
                          </span>
                          {session?.user?.pin && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                              PIN: {session.user.pin}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Menu List */}
                      <div className="p-2">
                        <a
                          href="/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all"
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Dashboard
                        </a>
                      </div>
                      {/* Logout */}
                      <div className="p-2 border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className={`flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-micro group ${isLoggingOut ? 'btn-loading' : ''}`}
                        >
                          {isLoggingOut ? (
                            <>
                              <div className="spinner h-5 w-5 mr-3"></div>
                              Sedang Keluar...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-3 motion-safe:group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Keluar Aplikasi
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Spacer agar konten di bawahnya tidak tertutup Header yg Fixed */}
      <div className="h-[76px]" />
    </>
  )
}
