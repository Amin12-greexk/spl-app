"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Button from "@/components/ui/Button"
import { useNotificationContext } from "@/components/notifications/Notificationprovider"
import toast from "react-hot-toast"

/**
 * Komponen untuk mengontrol pengaturan notifikasi
 * Menampilkan status dan tombol untuk mengaktifkan/menonaktifkan notifikasi
 */
export default function NotificationToggle() {
  const { data: session } = useSession()
  const { isSupported, isSubscribed, isLoading, requestPermission } = useNotificationContext()
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)

  useEffect(() => {
    // Check Firebase status - hanya jika ada Firebase
    if (typeof window !== "undefined") {
      setFirebaseStatus({
        isConfigured: true,
        isServiceWorkerSupported: "serviceWorker" in navigator,
        isNotificationSupported: "Notification" in window,
        isInitialized: true,
        isMessagingReady: true,
        permissionStatus: Notification.permission
      })
    }
  }, [])

  const handleUnsubscribe = async () => {
    if (!session) {
      toast.error("Silakan login terlebih dahulu")
      return
    }

    const confirmUnsubscribe = confirm(
      "Apakah Anda yakin ingin menonaktifkan notifikasi? Anda tidak akan menerima pemberitahuan tentang pengajuan SPL."
    )

    if (!confirmUnsubscribe) return

    setIsUnsubscribing(true)
    try {
      // Coba dapatkan token untuk unsubscribe
      const response = await fetch("/api/notifications/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "user-token", // Placeholder
        }),
      })

      if (response.ok) {
        toast.success("Notifikasi berhasil dinonaktifkan")
        window.location.reload()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Gagal menonaktifkan notifikasi")
      }
    } catch (error: any) {
      console.error("Error unsubscribing from notifications:", error)
      toast.error(error.message || "Gagal menonaktifkan notifikasi")
    } finally {
      setIsUnsubscribing(false)
    }
  }

  // Don't render if user is not logged in
  if (!session) {
    return null
  }

  // Show Firebase configuration issues
  if (firebaseStatus && !firebaseStatus.isConfigured) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 mb-2">
              Konfigurasi Firebase Tidak Lengkap
            </h3>
            <p className="text-sm text-red-700 mb-3">
              Notifikasi tidak dapat diaktifkan karena konfigurasi Firebase belum lengkap.
              Silakan hubungi administrator untuk menyelesaikan setup.
            </p>
            <div className="text-xs text-red-600">
              <strong>Status:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Service Worker: {firebaseStatus.isServiceWorkerSupported ? '✅' : '❌'}</li>
                <li>Notification API: {firebaseStatus.isNotificationSupported ? '✅' : '❌'}</li>
                <li>Firebase App: {firebaseStatus.isInitialized ? '✅' : '❌'}</li>
                <li>Firebase Messaging: {firebaseStatus.isMessagingReady ? '✅' : '❌'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show if notifications are not supported
  if (!isSupported) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">📱</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Notifikasi Tidak Didukung
            </h3>
            <p className="text-sm text-gray-700">
              Browser Anda tidak mendukung notifikasi push atau Anda mengakses aplikasi dari HTTP.
              Untuk menggunakan fitur notifikasi, gunakan browser modern dan akses aplikasi melalui HTTPS.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 text-2xl">
          {isSubscribed ? '🔔' : '🔕'}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Notifikasi Push
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            {isSubscribed 
              ? "Anda akan menerima notifikasi tentang pengajuan SPL dan persetujuan."
              : "Aktifkan notifikasi untuk mendapatkan pemberitahuan real-time tentang pengajuan SPL Anda."
            }
          </p>
          
          {/* Status Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isSubscribed 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isSubscribed ? '✅ Aktif' : '⭕ Tidak Aktif'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isSubscribed ? (
          <Button
            onClick={requestPermission}
            disabled={isLoading}
            size="sm"
            className="flex-1"
          >
            {isLoading ? "Mengaktifkan..." : "🔔 Aktifkan Notifikasi"}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleUnsubscribe}
              disabled={isUnsubscribing}
              variant="secondary"
              size="sm"
            >
              {isUnsubscribing ? "Menonaktifkan..." : "🔕 Nonaktifkan"}
            </Button>
            
            {/* Test Notification Button (Development only) */}
            {process.env.NODE_ENV === "development" && (
              <Button
                onClick={() => {
                  // Simple test notification
                  if (typeof window !== 'undefined' && Notification.permission === 'granted') {
                    new Notification("Test Notifikasi", {
                      body: "Notifikasi test dari aplikasi SPL",
                      icon: "/icons/icon-192x192.png"
                    })
                  } else {
                    toast("Aktifkan notifikasi terlebih dahulu")
                  }
                }}
                variant="ghost"
                size="sm"
              >
                🧪 Test
              </Button>
            )}
          </>
        )}
      </div>

      {/* Permission Status for Debugging */}
      {process.env.NODE_ENV === "development" && firebaseStatus && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <pre>{JSON.stringify(firebaseStatus, null, 2)}</pre>
          </div>
        </details>
      )}
    </div>
  )
}