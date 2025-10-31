"use client"

import SplForm from "@/components/spl/SplForm"

export default function PengajuanPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Buat Pengajuan SPL Baru
        </h1>
        <p className="text-gray-600 mt-1">
          Isi formulir di bawah ini untuk mengajukan Surat Perintah Lembur
        </p>
      </div>

      <SplForm />
    </div>
  )
}