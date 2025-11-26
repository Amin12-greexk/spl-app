"use client"

import SplList from "@/components/spl/SplList"
import Button from "@/components/ui/Button"
import Link from "next/link"

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat SPL Saya</h1>
          <p className="text-gray-600 mt-1">
            Lihat semua pengajuan SPL yang telah Anda buat
          </p>
        </div>
        <Link href="/dashboard/staff/pengajuan">
        </Link>
      </div>

      <SplList userRole="STAFF" showFilters={true} />
    </div>
  )
}
