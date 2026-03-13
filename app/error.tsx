"use client"

import { useEffect } from "react"
import Image from "next/image"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  const getErrorDetails = () => {
    if (error.message.includes("fetch")) {
      return {
        title: "Gagal Memuat Data",
        description: "Terjadi kesalahan saat mengambil data dari server. Silakan coba lagi.",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        ),
      }
    }

    if (error.message.includes("unauthorized") || error.message.includes("forbidden")) {
      return {
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin untuk mengakses halaman ini.",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        ),
      }
    }

    return {
      title: "Terjadi Kesalahan",
      description: "Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah diberitahu dan sedang menangani masalah ini.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    }
  }

  const errorDetails = getErrorDetails()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center border border-gray-100">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              <Image
                src="/logo.png"
                alt="Logo PT Tunas Esta Indonesia"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 sm:w-16 sm:h-16 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {errorDetails.icon}
              </svg>
            </div>
          </div>

          {/* Message */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              {errorDetails.title}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto mb-4">
              {errorDetails.description}
            </p>

            {/* Error Details (for development) */}
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 font-medium">
                  Detail Error (Development Mode)
                </summary>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-mono text-red-600 break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-gray-500 mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Coba Lagi
            </button>

            <button
              onClick={() => window.location.href = "/dashboard"}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Ke Dashboard
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Butuh bantuan? Hubungi tim IT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
