"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import SplList from "@/components/spl/SplList"
import Button from "@/components/ui/Button"
import Link from "next/link"
import toast from "react-hot-toast"

export default function GARiwayatPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session && !["GA", "DEPARTMENT_HEAD", "HR", "PRODUCTION_SUPERVISOR"].includes(session.user.role)) {
      toast.error("Akses ditolak!")
      router.push("/dashboard")
    }
  }, [session, router])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Riwayat SPL Saya</h1>
          <p className="text-gray-600 mt-1">
            Lihat semua pengajuan lembur yang telah Anda buat
          </p>
        </div>
        <Link href="/dashboard/ga/pengajuan" className="shrink-0">
          <Button className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Ajukan SPL Baru</span>
            <span className="sm:hidden">Buat Baru</span>
          </Button>
        </Link>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Alur Persetujuan</p>
            <p>Pengajuan lembur Anda akan langsung diteruskan ke Manager untuk persetujuan final.</p>
          </div>
        </div>
      </div>

      <SplList
        userRole={session.user.role}
        userId={session.user.role === "HR" ? session.user.id : undefined}
      />
    </div>
  )
}
