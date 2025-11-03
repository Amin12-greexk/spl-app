// hooks/useNotifications.ts
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { requestNotificationPermission, onMessageListener } from "@/lib/firebase"
import toast from "react-hot-toast"

export function useNotifications() {
  const { data: session } = useSession()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Cek apakah browser mendukung notifikasi
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true)
      
      // Cek status permission saat ini
      if (Notification.permission === "granted") {
        setIsSubscribed(true)
      }
    }
  }, [])

  useEffect(() => {
    if (!session || !isSupported) return

    // Jika sudah granted, subscribe otomatis
    if (Notification.permission === "granted") {
      subscribeToNotifications()
    }

    // Listen untuk pesan saat aplikasi aktif (foreground)
    const unsubscribe = setupForegroundListener()

    return () => {
      // Cleanup jika ada
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [session, isSupported])

  const subscribeToNotifications = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const token = await requestNotificationPermission()
      
      if (token) {
        // Simpan token ke backend
        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: token,
            keys: {
              p256dh: token,
              auth: token,
            },
          }),
        })

        if (response.ok) {
          setIsSubscribed(true)
          console.log("✅ Successfully subscribed to notifications")
          return true
        } else {
          console.error("❌ Failed to save notification token")
          return false
        }
      }
    } catch (error) {
      console.error("❌ Error subscribing to notifications:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const setupForegroundListener = () => {
    onMessageListener()
      .then((payload: any) => {
        console.log("📬 Received foreground message:", payload)
        
        const title = payload.notification?.title || "Notifikasi Baru"
        const body = payload.notification?.body || ""
        
        // Tampilkan toast notification dengan custom UI
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
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xl">🔔</span>
                    </div>
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
                    // Redirect ke halaman yang sesuai
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
      })
      .catch((err) => {
        console.log("❌ Failed to receive foreground message:", err)
      })
  }

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("Browser Anda tidak mendukung notifikasi")
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      
      if (permission === "granted") {
        const success = await subscribeToNotifications()
        if (success) {
          toast.success("Notifikasi berhasil diaktifkan!")
          return true
        }
      } else if (permission === "denied") {
        toast.error("Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.")
      } else {
        toast("Izin notifikasi diabaikan")
      }
      
      return false
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      toast.error("Gagal mengaktifkan notifikasi")
      return false
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    requestPermission,
  }
}