"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Role } from "@/types"

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  const handleLogout = async () => {
    setShowUserMenu(false)
    await signOut({ redirect: false })
    router.push("/login")
  }

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        if (session?.user?.role === "STAFF") {
          // Check for SPL status updates
          const response = await fetch("/api/spl")
          if (response.ok) {
            const data = await response.json()
            const recentUpdates = data.filter((spl: any) => 
              spl.status !== "PENDING" && 
              new Date(spl.approvalDate || spl.updatedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            )
            setNotificationCount(recentUpdates.length)
          }
        } else if (session?.user?.role === "HR" || session?.user?.role === "MANAGER") {
          // Check for pending SPLs
          const response = await fetch("/api/spl?status=PENDING")
          if (response.ok) {
            const data = await response.json()
            setNotificationCount(data.length)
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
      }
    }

    if (session) {
      fetchNotificationCount()
      // Refresh every 5 minutes
      const interval = setInterval(fetchNotificationCount, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [session])

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      STAFF: "bg-blue-100 text-blue-800 border-blue-200",
      HR: "bg-green-100 text-green-800 border-green-200",
      MANAGER: "bg-purple-100 text-purple-800 border-purple-200",
    }

    const labels: Record<string, string> = {
      STAFF: "Staff",
      HR: "HR",
      MANAGER: "Manager",
    }

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full border ${
          colors[role] || "bg-gray-100 text-gray-800 border-gray-200"
        }`}
      >
        {labels[role] || role}
      </span>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getNotificationText = () => {
    if (session?.user?.role === "STAFF") {
      return notificationCount > 0 ? `${notificationCount} update SPL` : "Tidak ada update"
    } else {
      return notificationCount > 0 ? `${notificationCount} SPL menunggu` : "Tidak ada SPL pending"
    }
  }

  return (
    <header className="bg-white shadow-lg border-b border-green-100 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Logo & Menu */}
          <div className="flex items-center">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors mr-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo & Company Name */}
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg mr-4">
                <span className="text-white font-bold text-lg">TE</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">
                  PT Tunas Esta Indonesia
                </h1>
                <p className="text-sm text-green-600 font-medium">
                  Sistem Pengajuan SPL
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Actions & User Menu */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                className="p-2 text-gray-600 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors relative"
                title={getNotificationText()}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 11.7l-7.5-7.5m15 0l-7.5 7.5" />
                </svg>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-green-50 transition-colors"
              >
                {/* User Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                  {session?.user?.name ? getInitials(session.user.name) : "U"}
                </div>
                
                {/* User Info - Hidden on small screens */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {session?.user?.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {session?.user?.role && getRoleBadge(session.user.role)}
                  </div>
                </div>

                {/* Dropdown Arrow */}
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  {/* User Info Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {session?.user?.name ? getInitials(session.user.name) : "U"}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-base">{session?.user?.name}</p>
                        <p className="text-sm text-gray-600 break-all">{session?.user?.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          {session?.user?.role && getRoleBadge(session.user.role)}
                          {session?.user?.department && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {session.user.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                      </svg>
                      <span className="text-gray-600">{getNotificationText()}</span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center">
                      <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profil Saya
                    </button>
                    <button className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center">
                      <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Pengaturan Notifikasi
                    </button>
                    <a
                      href="/dashboard"
                      className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      </svg>
                      Dashboard
                    </a>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-6 py-3 text-sm text-red-700 hover:bg-red-50 transition-colors flex items-center"
                    >
                      <svg className="w-5 h-5 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Keluar dari Sistem
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  )
}