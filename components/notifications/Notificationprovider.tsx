"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { requestNotificationPermission, onMessageListener } from "@/lib/firebase"
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
        const messageListener = (await onMessageListener()) as Promise<any>

        messageListener.then((payload: any) => {
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
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                  >
                    Close
                  </button>
                </div>
              </div>
            ),
            { duration: 5000 }
          )
        })
      } catch (err) {
        console.error("Error setting up Firebase message listener:", err)
      }
    }

    setupListener()
  }, [session, isSupported])

  // Request permission for notifications
const requestPermission = async (): Promise<boolean> => {
  if (!isSupported) return false
  setIsLoading(true)
  try {
    const permission = await requestNotificationPermission()

    // ✅ Convert string/null → boolean
    const granted = permission === "granted"
    setIsSubscribed(granted)

    return granted
  } catch (err) {
    console.error("Failed to request notification permission:", err)
    return false
  } finally {
    setIsLoading(false)
  }
}


  // Simple test notification trigger
  const testNotification = async (title: string, message: string) => {
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-green-100 text-green-600">
                ✅
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-600 hover:text-green-500 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    ))
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
