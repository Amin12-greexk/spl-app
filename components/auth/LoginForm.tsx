"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import toast from "react-hot-toast"
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

  const emailInputRef = useFocusScale<HTMLInputElement>(1.02)
  const passwordInputRef = useFocusScale<HTMLInputElement>(1.02)

  const rightPanelRef = usePageLoadAnimation<HTMLDivElement>({
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
    <div
      ref={cardContainerRef}
      className={`w-full max-w-5xl overflow-hidden rounded-[22px] border border-green-100 bg-white shadow-[0_16px_46px_rgba(21,128,61,0.16)] ${hasError ? "motion-safe:animate-shake" : ""}`}
    >
      <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-2">
        <section className="flex items-center justify-center bg-[#f8faf8] px-6 py-8 sm:px-10 lg:px-12">
          <div className="w-full max-w-[340px]">
            <p className="mb-3 inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold tracking-[0.06em] text-green-700">
              SPL TUNAS ESTA INDONESIA
            </p>

            <h1
              className="mb-3 text-center text-3xl font-semibold tracking-tight text-gray-900 sm:text-left sm:text-4xl"
              style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
            >
              Masuk
            </h1>

            <p className="mb-5 text-center text-sm text-gray-600 sm:text-left">
              Gunakan akun Anda untuk mengakses sistem pengajuan lembur.
            </p>

            <div className="mb-5 flex items-center justify-center gap-3 sm:justify-start">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-green-200 bg-white text-xs font-semibold text-green-700">
                S
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-green-200 bg-white text-xs font-semibold text-green-700">
                P
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-green-200 bg-white text-xs font-semibold text-green-700">
                L
              </span>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div data-animate>
                <input
                  ref={emailInputRef}
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    setHasError(false)
                  }}
                  className="h-11 w-full rounded-md border border-green-100 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none"
                  required
                />
              </div>

              <div data-animate>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value })
                      setHasError(false)
                    }}
                    className="h-11 w-full rounded-md border border-green-100 bg-white px-4 pr-11 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 transition-colors hover:text-gray-700"
                    aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div data-animate className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-11 min-w-[170px] items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-green-700 px-6 text-xs font-bold tracking-[0.14em] text-white transition-all hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? "MEMPROSES..." : "MASUK"}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section
          ref={rightPanelRef}
          className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-green-600 via-green-600 to-emerald-500 px-6 py-10 text-white sm:px-10"
        >
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -left-24 -top-16 h-56 w-56 rounded-full bg-white/25 blur-2xl" />
            <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-emerald-200/20 blur-2xl" />
          </div>

          <div className="relative z-10 max-w-sm text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 p-2.5 backdrop-blur-sm">
              <div className="relative h-full w-full">
                <Image
                  src="/logo.png"
                  alt="Logo PT Tunas Esta Indonesia"
                  fill
                  sizes="64px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <h2
              className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
            >
              SPL Tunas Esta
            </h2>

            <p className="mx-auto mb-6 max-w-[300px] text-base leading-7 text-white/95">
              Sistem Pengajuan Lembur PT Tunas Esta Indonesia untuk proses pengajuan, persetujuan, dan monitoring SPL.
            </p>

            <a
              href="/register"
              className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-full border border-white/90 px-6 text-xs font-bold tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-green-700"
            >
              DAFTAR AKUN
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
