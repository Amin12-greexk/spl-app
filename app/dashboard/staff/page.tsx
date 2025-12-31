"use client"

import SplList from "@/components/spl/SplList"
import Button from "@/components/ui/Button"
import Link from "next/link"

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Riwayat SPL Saya</h1>
          <p className="text-gray-600 mt-1">
            Lihat semua pengajuan SPL yang telah Anda buat
          </p>
        </div>
        <Link href="/dashboard/staff/pengajuan" className="shrink-0">
          <Button className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Buat SPL Baru</span>
            <span className="sm:hidden">Buat Baru</span>
          </Button>
        </Link>
      </div>

      <SplList userRole="STAFF" showFilters={true} />
    </div>
  )
}
