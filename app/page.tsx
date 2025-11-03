"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (session) {
      // Jika sudah login, redirect ke dashboard
      router.push("/dashboard")
    } else {
      // Jika belum login, redirect ke halaman login
      router.push("/login")
    }
  }, [session, status, router])

  // Tampilkan loading spinner sementara
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}