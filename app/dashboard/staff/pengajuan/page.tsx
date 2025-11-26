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
        <div className="mt-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
          <div className="font-semibold mb-1">Perhatian:</div>
          <p>
            Pengajuan setelah melewati batas jam minimal akan ditolak. Jika sudah lewat jam batas, temui Manager secara langsung untuk persetujuan.
          </p>
        </div>
      </div>

      <SplForm />
    </div>
  )
}
