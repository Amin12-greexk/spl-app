"use client"

import SplForm from "@/components/spl/SplForm"
import { useSession } from "next-auth/react"

export default function PengajuanPage() {
  const { data: session } = useSession()
  const isSecurityDepartment = session?.user?.department === "Security"

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Buat Pengajuan SPL Baru
        </h1>
        <p className="text-gray-600 mt-1">
          Isi formulir di bawah ini untuk mengajukan Surat Perintah Lembur
        </p>
        {isSecurityDepartment ? (
          <div className="mt-3 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-sm">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informasi Security:
            </div>
            <p>
              Departemen Security tidak memiliki batasan waktu pengajuan karena berbeda-beda shift. Anda dapat mengajukan SPL kapan saja.
            </p>
          </div>
        ) : (
          <div className="mt-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            <div className="font-semibold mb-1">Perhatian:</div>
            <p>
              Pengajuan setelah melewati batas jam minimal akan ditolak. Jika sudah lewat jam batas, temui Manager secara langsung untuk persetujuan.
            </p>
          </div>
        )}
      </div>

      <SplForm />
    </div>
  )
}
