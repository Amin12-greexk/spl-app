// components/notifications/NotificationTester.tsx
"use client"

import { useState } from "react"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import toast from "react-hot-toast"

/**
 * Komponen untuk testing notifikasi
 * HANYA MUNCUL DI DEVELOPMENT MODE
 */
export default function NotificationTester() {
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState("Test Notification")
  const [message, setMessage] = useState("Ini adalah notifikasi test dari aplikasi SPL")

  // Hanya tampilkan di development
  if (process.env.NODE_ENV === "production") {
    return null
  }

  const handleSendTest = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Judul dan pesan harus diisi")
      return
    }

    setIsLoading(true)
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
      } else {
        toast.error(data.message || "Gagal mengirim notifikasi")
      }
    } catch (error: any) {
      console.error("Error sending test notification:", error)
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 text-2xl">🧪</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-purple-900 mb-1">
            Test Notifikasi (Development Only)
          </h3>
          <p className="text-sm text-purple-700 mb-4">
            Kirim notifikasi test ke diri Anda sendiri untuk memastikan sistem berfungsi
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          label="Judul Notifikasi"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul notifikasi"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Isi Pesan
          </label>
          <textarea
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
            placeholder="Masukkan isi pesan notifikasi"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button
          onClick={handleSendTest}
          disabled={isLoading || !title.trim() || !message.trim()}
          size="sm"
          className="w-full"
        >
          {isLoading ? "Mengirim..." : "🚀 Kirim Test Notifikasi"}
        </Button>
      </div>
    </div>
  )
}