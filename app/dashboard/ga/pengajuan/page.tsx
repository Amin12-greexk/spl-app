"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import SplForm from "@/components/spl/SplForm"
import toast from "react-hot-toast"

export default function GAPengajuanPage() {
  const { data: session } = useSession()
  const router = useRouter()

  // Authorization check
  useEffect(() => {
    if (session && !["GA", "DEPARTMENT_HEAD", "HR", "PRODUCTION_SUPERVISOR"].includes(session.user.role)) {
      toast.error("Akses ditolak! Hanya GA/Kepala Dept/HR/Pengawas Produksi yang dapat mengakses halaman ini.")
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Pengajuan Lembur Saya
        </h1>
        <p className="text-gray-600 mt-1">
          Isi formulir di bawah untuk mengajukan lembur Anda sendiri
        </p>
        <div className="mt-3 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-sm">
          <div className="font-semibold mb-1 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Informasi:
          </div>
          <p>
            {session?.user.role === "HR"
              ? "Sebagai HR, pengajuan Anda akan langsung diteruskan ke Manager untuk persetujuan (melewati approval supervisor)."
              : "Pengajuan Anda akan langsung diteruskan ke Manager untuk persetujuan (melewati approval supervisor)."}
          </p>
        </div>
      </div>

      <SplForm />
    </div>
  )
}
