"use client"

import SplList from "@/components/spl/SplList"

export default function HRPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Semua Pengajuan SPL</h1>
        <p className="text-gray-600 mt-1">
          Lihat dan kelola semua pengajuan Surat Perintah Lembur
        </p>
      </div>

      <SplList userRole="HR" showFilters={true} />
    </div>
  )
}