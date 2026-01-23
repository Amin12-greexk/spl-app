"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"
import Image from "next/image"

import { useRef } from "react"
import { usePageLoadAnimation, useStaggerAnimation, useFocusScale } from "@/hooks/useGSAP"

export default function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  // Animations
  const logoRef = usePageLoadAnimation<HTMLDivElement>({
    direction: "down",
    distance: 30,
    duration: 0.8
  })

  const cardContainerRef = usePageLoadAnimation<HTMLDivElement>({
    direction: "up",
    distance: 30,
    duration: 0.8,
    delay: 0.2
  })

  const formRef = useStaggerAnimation<HTMLFormElement>({
    stagger: 0.1,
    delay: 0.4
  })

  // Interactive Animations
  const emailInputRef = useFocusScale<HTMLInputElement>(1.02)
  const passwordInputRef = useFocusScale<HTMLInputElement>(1.02)

  // New ref for Footer
  const footerRef = usePageLoadAnimation<HTMLDivElement>({
    direction: "up",
    distance: 20,
    duration: 0.8,
    delay: 0.6
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setHasError(false)

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setHasError(true)
        toast.error(result.error)
        setTimeout(() => setHasError(false), 400)
      } else {
        toast.success("Login berhasil!")
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      setHasError(true)
      toast.error("Terjadi kesalahan saat login")
      setTimeout(() => setHasError(false), 400)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md lg:max-w-lg">
        {/* Logo dan Branding */}
        <div ref={logoRef} className="text-center mb-8">
          <div className="mx-auto w-20 h-20 mb-4 relative hover:scale-110 transition-transform duration-300">
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
        <div ref={cardContainerRef} className={`bg-white shadow-xl rounded-2xl p-8 border border-green-100 ${hasError ? 'motion-safe:animate-shake' : ''}`}>
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
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div data-animate>
              <Input
                ref={emailInputRef}
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

            <div data-animate>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="*****************"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    setHasError(false)
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-10 motion-safe:transition-all motion-safe:duration-200 focus:shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-micro"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <div data-animate>
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
            </div>
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
              className="inline-flex items-center justify-center w-full px-4 py-3 border-2 border-green-600 text-green-600 font-medium rounded-xl hover:bg-green-50 transition-micro motion-safe:hover:scale-[1.01]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Daftar Akun Baru
            </a>
          </div>
        </div>

        {/* Footer */}
        <div ref={footerRef} className="text-center mt-8">
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
              (c) 2026 PT Tunas Esta Indonesia. All rights reserved.
            </p>
          </div>
          <p className="text-gray-400 text-xs">
            Sistem SPL
          </p>
        </div>
      </div>
    </div>
  )
}


