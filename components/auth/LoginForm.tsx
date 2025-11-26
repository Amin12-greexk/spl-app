"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"
import Image from "next/image"

export default function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Login berhasil!")
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo dan Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 mb-4 relative">
            <Image
              src="/logo.png"
              alt="Logo PT Tunas Esta Indonesia"
              fill
              sizes="80px"
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          
          {/* Company Branding */}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            PT Tunas Esta Indonesia
          </h1>
          <p className="text-gray-600 text-sm">
            Sistem Pengajuan Surat Perintah Lembur
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-green-100">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Masuk ke Akun Anda
            </h2>
            <p className="text-gray-500 text-sm">
              Silakan masukkan kredensial Anda untuk melanjutkan
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                label="Alamat Email"
                type="email"
                placeholder="contoh@tunasesta.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <Input
                label="Kata Sandi"
                type="password"
                placeholder="*****************"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Sedang Masuk...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Masuk ke Dashboard
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="px-4 text-gray-500 text-sm">atau</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-3">
              Belum memiliki akun?
            </p>
            <a 
              href="/register" 
              className="inline-flex items-center justify-center w-full px-4 py-3 border-2 border-green-600 text-green-600 font-medium rounded-xl hover:bg-green-50 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Daftar Akun Baru
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="relative w-6 h-6">
              <Image
                src="/logo.png"
                alt="Logo PT Tunas Esta Indonesia"
                fill
                sizes="24px"
                className="object-contain"
              />
            </div>
            <p className="text-gray-500 text-xs">
              (c) 2024 PT Tunas Esta Indonesia. All rights reserved.
            </p>
          </div>
          <p className="text-gray-400 text-xs">
            Sistem SPL v1.0
          </p>
        </div>
      </div>
    </div>
  )
}


