"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"

interface NotificationContextType {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  requestPermission: () => Promise<boolean>
  testNotification: (title: string, message: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotificationContext must be used within a NotificationProvider")
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session } = useSession()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true)
      
      // Check current permission status
      if (Notification.permission === "granted") {
        setIsSubscribed(true)
      }
    }
  }, [])

  // Setup foreground message listener
  useEffect(() => {
    if (!session || !isSupported) return

    const setupListener = async () => {
      try {
        // Try to setup Firebase listener if available
        const { onMessageListener } = await import("@/lib/firebase")
        
        const messageListener = onMessageListener() // <--- 'await' DIHAPUS

messageListener.then((payload: any) => {
// ...
          console.log("📬 Received foreground message:", payload)
          
          const title = payload.notification?.title || "Notifikasi Baru"
          const body = payload.notification?.body || ""
          
          // Show custom toast notification
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-enter" : "animate-leave"
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600">
                        🔔
                      </span>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{title}</p>
                      <p className="mt-1 text-sm text-gray-500">{body}</p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id)
                      // Redirect to appropriate page
                      if (payload.data?.click_action) {
                        window.location.href = payload.data.click_action
                      }
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                  >
                    Lihat
                  </button>
                </div>
              </div>
            ),
            {
              duration: 5000,
              position: 'top-right',
            }
          )
        }).catch((err: any) => {
          console.log("❌ Failed to receive foreground message:", err)
        })

      } catch (err) {
        console.log("Firebase not available, using fallback notification system")
      }
    }

    setupListener()
  }, [session, isSupported])

  // Request permission for notifications
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Browser Anda tidak mendukung notifikasi")
      return false
    }

    if (!session) {
      toast.error("Silakan login terlebih dahulu")
      return false
    }

    setIsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      
      if (permission === "granted") {
        // Try to get real FCM token
        try {
          const { requestNotificationPermission } = await import("@/lib/firebase")
          const fcmToken = await requestNotificationPermission()
          
          if (fcmToken) {
            // Save real FCM token
            const response = await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                endpoint: fcmToken,
                keys: {
                  p256dh: fcmToken,
                  auth: fcmToken,
                },
              }),
            })

            if (response.ok) {
              setIsSubscribed(true)
              toast.success("Notifikasi berhasil diaktifkan!")
              return true
            } else {
              throw new Error("Gagal menyimpan token notifikasi")
            }
          } else {
            throw new Error("Gagal mendapatkan FCM token")
          }
        } catch (firebaseError) {
          console.log("Firebase unavailable, using fallback subscription")
          
          // Fallback: create mock subscription for testing
          const mockToken = `fallback-${session.user.id}-${Date.now()}`
          
          const response = await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              endpoint: mockToken,
              keys: {
                p256dh: mockToken,
                auth: mockToken,
              },
            }),
          })

          if (response.ok) {
            setIsSubscribed(true)
            toast.success("Notifikasi diaktifkan (mode fallback)")
            return true
          } else {
            throw new Error("Gagal menyimpan token notifikasi")
          }
        }
      } else if (permission === "denied") {
        toast.error("Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.")
        return false
      } else {
        toast("Izin notifikasi diabaikan")
        return false
      }
    } catch (error: any) {
      console.error("Error requesting notification permission:", error)
      toast.error(error.message || "Gagal mengaktifkan notifikasi")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Test notification
  const testNotification = async (title: string, message: string) => {
    if (!isSubscribed) {
      toast.error("Silakan aktifkan notifikasi terlebih dahulu")
      return
    }

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengirim notifikasi test")
      }

      if (data.success) {
        toast.success(data.message || "Notifikasi test berhasil dikirim!")
        
        // Also show browser notification for immediate feedback
        if (Notification.permission === "granted") {
          new Notification(title, {
            body: message,
            icon: "/icons/icon-192x192.png",
            tag: "test-notification"
          })
        }
      } else {
        toast.error(data.message || "Gagal mengirim notifikasi")
      }
    } catch (error: any) {
      console.error("Error sending test notification:", error)
      toast.error(error.message || "Terjadi kesalahan")
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        isSupported,
        isSubscribed,
        isLoading,
        requestPermission,
        testNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}