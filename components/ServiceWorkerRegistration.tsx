"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    let updateIntervalId: ReturnType<typeof setInterval> | null = null

    const handleControllerChange = () => {
      console.log("Service Worker updated")
      window.location.reload()
    }

    const clearDevCaches = async () => {
      if (!("caches" in window)) return
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
    }

    const cleanupLegacyServiceWorkers = async (mode: "all" | "legacy-only") => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        registrations.map(async (registration) => {
          const worker =
            registration.active || registration.waiting || registration.installing
          const scriptUrl = worker?.scriptURL || ""
          const isFirebaseWorker = scriptUrl.includes("/firebase-messaging-sw.js")
          const isLegacyPwaWorker = scriptUrl.includes("/sw.js")
          const shouldUnregister =
            mode === "all" ? true : isLegacyPwaWorker && !isFirebaseWorker

          if (shouldUnregister) {
            await registration.unregister()
          }
        })
      )
    }

    ;(async () => {
      try {
        if (process.env.NODE_ENV !== "production") {
          // Avoid stale SW cache in local dev causing CSS/JS to return HTML responses.
          await cleanupLegacyServiceWorkers("all")
          await clearDevCaches()
          return
        }

        await cleanupLegacyServiceWorkers("legacy-only")

        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        )
        console.log("Service Worker registered:", registration.scope)

        updateIntervalId = setInterval(() => {
          registration.update()
        }, 60000)

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          handleControllerChange
        )
      } catch (error) {
        console.error("Service Worker registration failed:", error)
      }
    })()

    return () => {
      if (updateIntervalId) {
        clearInterval(updateIntervalId)
      }
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      )
    }
  }, [])

  return null
}
