// app/dashboard/layout.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Header from "@/components/dashboard/Header"
import Sidebar from "@/components/dashboard/Sidebar"
import NotificationProvider from "@/components/notifications/Notificationprovider"
import Image from "next/image"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 relative">
            <Image
              src="/logo.png"
              alt="Logo PT Tunas Esta Indonesia"
              fill
              sizes="64px"
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-gray-600 text-sm font-medium">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main Layout */}
        <div className="flex">
          {/* Sidebar */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          {/* Main Content */}
          <main className="flex-1 lg:ml-64 transition-all duration-200">
            <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
              <div className="w-full max-w-[1600px] mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation (Optional for future enhancement) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-30">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 relative">
                <Image
                  src="/logo.png"
                  alt="Logo PT Tunas Esta Indonesia"
                  fill
                  sizes="24px"
                  className="object-contain"
                />
              </div>
              <span className="text-xs text-gray-600">PT Tunas Esta Indonesia</span>
            </div>
          </div>
        </div>
      </div>
    </NotificationProvider>
  )
}
