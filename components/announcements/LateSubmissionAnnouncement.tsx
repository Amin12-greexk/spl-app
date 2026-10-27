"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const DISMISS_KEY_PREFIX = "announcement:late-submission:"

/**
 * Pengumuman: karyawan kini bisa mengajukan SPL telat sendiri.
 * Angka batas hari diambil dari Setting (default 7), dan pengumuman muncul
 * kembali bila batasnya diubah. Penutupan disimpan per-browser.
 */
export default function LateSubmissionAnnouncement() {
  const [maxDays, setMaxDays] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/settings/late-submission")
        if (!res.ok) return
        const data = await res.json()
        const days = Number(data?.maxDays)
        if (cancelled || !Number.isFinite(days) || days <= 0) return
        setMaxDays(days)
        try {
          setDismissed(localStorage.getItem(DISMISS_KEY_PREFIX + days) === "1")
        } catch {
          setDismissed(false)
        }
      } catch {
        // pengumuman bersifat opsional; abaikan bila gagal dimuat
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (maxDays === null || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + maxDays, "1")
    } catch {
      // abaikan bila storage tidak tersedia
    }
  }

  return (
    <div
      role="status"
      className="relative rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50/60 p-5 pr-12 shadow-sm"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup pengumuman"
        className="absolute top-3 right-3 rounded-lg p-1.5 text-gray-400 hover:bg-orange-100 hover:text-gray-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">
          📢
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Pengumuman: SPL Telat Kini Bisa Diajukan Sendiri
          </h2>
          <p>
            Lupa mengajukan SPL? Sekarang Anda bisa mengajukan SPL untuk tanggal lembur yang
            sudah lewat, <strong>paling lambat {maxDays} hari</strong> setelah tanggal lembur.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>
              Buka <strong>Buat SPL Baru</strong>, lalu pilih tanggal lembur yang sudah lewat
              (maksimal {maxDays} hari ke belakang).
            </li>
            <li>Isi jam mulai &amp; selesai secara manual, alasan lembur, dan alasan keterlambatan (masing-masing minimal 20 karakter).</li>
            <li>Sistem akan mencocokkan jam pulang dengan data fingerprint. Jam pulang yang tidak sesuai akan ditolak.</li>
            <li>SPL telat diberi label <strong>⏰ Telat</strong> dan tetap melalui persetujuan Supervisor, lalu Manager.</li>
            <li>Lewat dari {maxDays} hari, SPL tidak dapat diajukan sendiri. Hubungi Super Admin.</li>
          </ul>
          <div className="pt-1">
            <Link
              href="/dashboard/staff/pengajuan"
              className="inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Buat SPL Baru
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
