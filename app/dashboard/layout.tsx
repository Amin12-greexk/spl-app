// app/dashboard/layout.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Header from "@/components/dashboard/Header"
import Sidebar from "@/components/dashboard/Sidebar"
import NotificationProvider from "@/components/notifications/NotificationProvider"
import NotificationToggle from "@/components/notifications/NotificationToggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    // Register service worker untuk Firebase Messaging
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
          console.log("✅ Service Worker registered successfully:", registration.scope)
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed:", error)
        })
    }
  }, [])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Notification Toggle - Tampil di semua halaman dashboard */}
              <div className="mb-6">
                <NotificationToggle />
              </div>
              
              {children}
            </div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  )
}