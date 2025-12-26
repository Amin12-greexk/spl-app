"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"

export default function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    pin: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Password tidak cocok!")
      return
    }

    if (!formData.pin || formData.pin.trim().length !== 3) {
      toast.error("PIN harus 3 digit!")
      return
    }

    if (!/^\d{3}$/.test(formData.pin.trim())) {
      toast.error("PIN harus berupa 3 digit angka!")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password minimal 6 karakter!")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          department: formData.department,
          pin: formData.pin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal mendaftar")
      }

      toast.success("Pendaftaran berhasil! Silakan login.")
      router.push("/login")
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat mendaftar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo dan Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-lg mb-4">
            <div className="text-white text-2xl font-bold">TE</div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            PT Tunas Esta Indonesia
          </h1>
          <p className="text-gray-600 text-sm">Bergabung dengan Sistem SPL</p>
        </div>

        {/* Register Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-green-100">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Buat Akun Baru
            </h2>
            <p className="text-gray-500 text-sm">
              Isi formulir di bawah untuk mendaftar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* PIN */}
            <Input
              label="PIN (3 Digit)"
              type="text"
              placeholder="Masukkan 3 digit PIN (contoh: 123)"
              value={formData.pin}
              onChange={(e) => {
                // Hanya izinkan angka dan maksimal 3 digit
                const value = e.target.value.replace(/\D/g, '').slice(0, 3)
                setFormData({ ...formData, pin: value })
              }}
              maxLength={3}
              className="border-gray-200 focus:border-green-500 focus:ring-green-500"
              required
            />

            {/* Nama Lengkap */}
            <Input
              label="Nama Lengkap"
              type="text"
              placeholder="Masukkan nama lengkap"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border-gray-200 focus:border-green-500 focus:ring-green-500"
              required
            />

            {/* Email */}
            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@tunasesta.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-gray-200 focus:border-green-500 focus:ring-green-500"
              required
            />

            {/* Departemen (free text) */}
            <Input
              label="Departemen"
              type="text"
              placeholder="Masukkan nama departemen"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="border-gray-200 focus:border-green-500 focus:ring-green-500"
              required
            />

            {/* Password */}
            <Input
              label="Kata Sandi"
              type="password"
              placeholder=".........."
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="border-gray-200 focus:border-green-500 focus:ring-green-500"
              required
            />

            {/* Konfirmasi Password */}
            <Input
              label="Konfirmasi Kata Sandi"
              type="password"
              placeholder="Ulangi kata sandi"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="border-gray-200 focus:border-green-500 focus:ring-green-500"
              required
            />

            {/* Password Requirements */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Syarat Kata Sandi:
              </h4>
              <ul className="text-xs text-green-700 space-y-1">
                <li className="flex items-center">
                  <svg
                    className="w-3 h-3 mr-2 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Minimal 6 karakter
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-3 h-3 mr-2 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Kombinasi huruf dan angka direkomendasikan
                </li>
              </ul>
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Sedang Mendaftar...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Daftar Akun Baru
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

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-3">Sudah memiliki akun?</p>
            <a
              href="/login"
              className="inline-flex items-center justify-center w-full px-4 py-3 border-2 border-green-600 text-green-600 font-medium rounded-xl hover:bg-green-50 transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              Masuk ke Akun
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
