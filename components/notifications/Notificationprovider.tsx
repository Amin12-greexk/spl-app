"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"

interface NotificationContextType {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  notificationCount: number
  requestPermission: () => Promise<boolean>
  testNotification: (title: string, message: string) => Promise<void>
  refreshNotificationCount: () => Promise<void>
  incrementNotificationCount: () => void
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
  const [firebaseAvailable, setFirebaseAvailable] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

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

  // Check Firebase availability dengan cara yang lebih robust
  useEffect(() => {
    const checkFirebase = () => {
      try {
        // Check environment variables langsung dari window object (client-side)
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        }

        // Log untuk debugging
        console.log('🔍 Firebase Config Check:', {
          apiKey: firebaseConfig.apiKey ? '✅' : '❌',
          authDomain: firebaseConfig.authDomain ? '✅' : '❌',
          projectId: firebaseConfig.projectId ? '✅' : '❌',
          messagingSenderId: firebaseConfig.messagingSenderId ? '✅' : '❌',
          appId: firebaseConfig.appId ? '✅' : '❌'
        })

        const requiredVars = [
          firebaseConfig.apiKey,
          firebaseConfig.authDomain,
          firebaseConfig.projectId,
          firebaseConfig.messagingSenderId,
          firebaseConfig.appId
        ]

        const hasAllVars = requiredVars.every(Boolean)
        
        if (hasAllVars) {
          console.log('✅ Firebase configuration complete')
          setFirebaseAvailable(true)
        } else {
          console.warn('⚠️ Firebase configuration incomplete, using fallback mode')
          setFirebaseAvailable(false)
        }
      } catch (error) {
        console.warn('⚠️ Firebase check error:', error)
        setFirebaseAvailable(false)
      }
    }

    // Check immediately and after a delay to handle Next.js env loading
    checkFirebase()
    
    // Fallback check after component mount
    const timeoutId = setTimeout(checkFirebase, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [])

  // Setup foreground message listener hanya jika Firebase tersedia
  useEffect(() => {
    if (!session || !isSupported) return

    const setupListener = async () => {
      if (firebaseAvailable) {
        try {
          const { onMessageListener } = await import("@/lib/firebase")

          const messagePromise = onMessageListener()

          messagePromise.then((payload: any) => {
            console.log("📬 Received foreground message:", payload)

            const title = payload.notification?.title || "Notifikasi Baru"
            const body = payload.notification?.body || ""

            // Increment notification count when new message arrives
            incrementNotificationCount()

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
                        <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-green-100 text-green-600">
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
                        if (payload.data?.click_action) {
                          window.location.href = payload.data.click_action
                        }
                      }}
                      className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-600 hover:text-green-500 focus:outline-none"
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
          console.log("Firebase message listener setup failed:", err)
        }
      }
    }

    setupListener()
  }, [session, isSupported, firebaseAvailable])

  // Fetch initial notification count
  useEffect(() => {
    if (session) {
      refreshNotificationCount()
    }
  }, [session])

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
        if (firebaseAvailable) {
          try {
            const { requestNotificationPermission } = await import("@/lib/firebase")
            const fcmToken = await requestNotificationPermission()
            
            if (fcmToken) {
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
                toast.success("Notifikasi berhasil diaktifkan dengan Firebase!")
                return true
              } else {
                throw new Error("Gagal menyimpan FCM token")
              }
            } else {
              throw new Error("Gagal mendapatkan FCM token")
            }
          } catch (firebaseError) {
            console.log("Firebase error, falling back to mock mode:", firebaseError)
            // Fallback ke mock mode
          }
        }
        
        // Fallback mode (baik karena Firebase tidak tersedia atau error)
        console.log("Using fallback notification mode")
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
          toast.success(`Notifikasi diaktifkan ${firebaseAvailable ? '(Firebase mode)' : '(Fallback mode)'}`)
          return true
        } else {
          throw new Error("Gagal menyimpan token notifikasi")
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

        // Show browser notification for immediate feedback
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

  // Fetch notification count
  const refreshNotificationCount = async () => {
    if (!session) return

    try {
      if (session.user.role === "STAFF") {
        const response = await fetch("/api/spl")
        if (response.ok) {
          const data = await response.json()
          const recentUpdates = data.filter((spl: any) =>
            spl.status !== "PENDING" &&
            new Date(spl.approvalDate || spl.updatedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          )
          setNotificationCount(recentUpdates.length)
        }
      } else if (session.user.role === "HR" || session.user.role === "MANAGER") {
        const response = await fetch("/api/spl?status=PENDING")
        if (response.ok) {
          const data = await response.json()
          setNotificationCount(data.length)
        }
      }
    } catch (error) {
      console.error("Error fetching notification count:", error)
    }
  }

  // Increment notification count (called when new notification arrives)
  const incrementNotificationCount = () => {
    setNotificationCount(prev => prev + 1)
  }

  return (
    <NotificationContext.Provider
      value={{
        isSupported,
        isSubscribed,
        isLoading,
        notificationCount,
        requestPermission,
        testNotification,
        refreshNotificationCount,
        incrementNotificationCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}