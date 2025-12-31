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
  clearNotificationCount: () => void
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
            const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

            // Increment notification count when new message arrives
            incrementNotificationCount()

            // Show custom toast notification
            toast.custom(
              (t) => (
                <div
                  className={`${
                    t.visible ? "animate-enter" : "animate-leave"
                  } max-w-md w-full bg-white shadow-xl rounded-xl pointer-events-auto ring-1 ring-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-bold text-gray-900">{title}</p>
                          {/* Close button */}
                          <button
                            onClick={() => toast.dismiss(t.id)}
                            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                        <p className="text-xs text-gray-400 mt-2 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {timestamp}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    {payload.data?.click_action && (
                      <button
                        onClick={() => {
                          toast.dismiss(t.id)
                          clearNotificationCount()
                          window.location.href = payload.data.click_action
                        }}
                        className="mt-3 w-full py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Lihat Detail
                      </button>
                    )}
                  </div>
                </div>
              ),
              {
                duration: 6000,
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

  // Clear notification count (called when user views notifications)
  const clearNotificationCount = () => {
    setNotificationCount(0)
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
        clearNotificationCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}