"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"

interface SupervisorInfo {
  hasSupervisor: boolean
  supervisor?: {
    id: string
    name: string
    position: string
    department: string
  }
  message: string
  warning?: string
  approvalFlow: string[]
}

export default function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [supervisorInfo, setSupervisorInfo] = useState<SupervisorInfo | null>(null)
  const [isLoadingSupervisor, setIsLoadingSupervisor] = useState(false)
  const [formData, setFormData] = useState({
    pin: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
  })

  // Fetch supervisor info when department changes
  useEffect(() => {
    const fetchSupervisorInfo = async () => {
      if (!formData.department || formData.department.trim().length < 2) {
        setSupervisorInfo(null)
        return
      }

      setIsLoadingSupervisor(true)
      try {
        const response = await fetch(
          `/api/auth/supervisor-info?department=${encodeURIComponent(formData.department)}`
        )
        if (response.ok) {
          const data = await response.json()
          setSupervisorInfo(data)
        }
      } catch (error) {
        console.error("Error fetching supervisor info:", error)
      } finally {
        setIsLoadingSupervisor(false)
      }
    }

    // Debounce: Wait 500ms after user stops typing
    const timeoutId = setTimeout(fetchSupervisorInfo, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.department])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Password tidak cocok!")
      return
    }

    if (!formData.pin || formData.pin.trim().length < 4) {
      toast.error("PIN minimal 4 karakter!")
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

      // Show success message with supervisor info
      toast.success(data.message || "Pendaftaran berhasil! Silakan login.", {
        duration: 5000,
      })
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
            <div>
              <Input
                label="PIN Karyawan"
                type="text"
                placeholder="Masukkan PIN (minimal 4 karakter)"
                value={formData.pin}
                onChange={(e) => {
                  setFormData({ ...formData, pin: e.target.value })
                }}
                className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                PIN karyawan Anda sesuai data HRD (minimal 4 karakter)
              </p>
            </div>

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

            {/* Departemen (dropdown) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departemen <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                required
              >
                <option value="">Pilih Departemen</option>
                <option value="Security">Security (Supervised by GA)</option>
                <option value="IT">IT</option>
                <option value="Production">Production</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Logistics">Logistics</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Purchasing">Purchasing</option>
              </select>

              {/* Supervisor Info */}
              {isLoadingSupervisor && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent mr-2"></div>
                  Memeriksa atasan untuk department ini...
                </div>
              )}

              {supervisorInfo && !isLoadingSupervisor && (
                <div className={`mt-3 p-3 rounded-lg border ${
                  supervisorInfo.hasSupervisor
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start">
                    <svg
                      className={`w-5 h-5 mt-0.5 mr-2 flex-shrink-0 ${
                        supervisorInfo.hasSupervisor ? 'text-blue-600' : 'text-gray-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        supervisorInfo.hasSupervisor ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {supervisorInfo.message}
                      </p>

                      {supervisorInfo.warning && (
                        <p className="text-xs text-orange-700 mt-1">
                          ⚠️ {supervisorInfo.warning}
                        </p>
                      )}

                      {/* Approval Flow */}
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          Alur Persetujuan SPL:
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {supervisorInfo.approvalFlow.map((step, index) => (
                            <div key={index} className="flex items-center">
                              <span className={`text-xs px-2 py-1 rounded ${
                                index === 0
                                  ? 'bg-green-100 text-green-800 font-medium'
                                  : index === supervisorInfo.approvalFlow.length - 1
                                  ? 'bg-purple-100 text-purple-800 font-medium'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {step}
                              </span>
                              {index < supervisorInfo.approvalFlow.length - 1 && (
                                <svg
                                  className="w-4 h-4 mx-1 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

            {/* Requirements Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Persyaratan Pendaftaran:
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
                  PIN minimal 4 karakter (sesuai data HRD)
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
                  Password minimal 6 karakter
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
                  Email harus valid dan belum terdaftar
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
