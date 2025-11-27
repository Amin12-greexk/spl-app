"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js", {
          scope: "/",
        })
        .then((registration) => {
          console.log("✅ Service Worker registered successfully:", registration.scope)

          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60000) // Check every minute
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed:", error)
        })

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("🔄 Service Worker updated")
        window.location.reload()
      })
    }
  }, [])

  return null
}
