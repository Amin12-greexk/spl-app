"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import toast from "react-hot-toast"
import Image from "next/image"

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

interface DepartmentOption {
  id?: string
  name: string
  supervised: boolean
  approvalMode?: string | null
}

const DEFAULT_DEPARTMENTS: DepartmentOption[] = [
  { name: "HR", supervised: true, approvalMode: "DEPARTMENT_HEAD" },
  { name: "IT", supervised: true, approvalMode: "DEPARTMENT_HEAD" },
  { name: "Security", supervised: true, approvalMode: "GA" },
  { name: "Teknik", supervised: true, approvalMode: "GA" },
  { name: "Driver", supervised: true, approvalMode: "GA" },
  { name: "Admin", supervised: false, approvalMode: "DIRECT" },
  { name: "Lab", supervised: true, approvalMode: "DEPARTMENT_HEAD" },
  { name: "Produksi", supervised: false, approvalMode: "DIRECT" },
]

const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])

export default function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [supervisorInfo, setSupervisorInfo] = useState<SupervisorInfo | null>(null)
  const [isLoadingSupervisor, setIsLoadingSupervisor] = useState(false)
  const [departments, setDepartments] = useState<DepartmentOption[]>(DEFAULT_DEPARTMENTS)
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [formData, setFormData] = useState({
    pin: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    departmentId: "",
    departmentName: "",
  })

  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoadingDepartments(true)
      try {
        const response = await fetch("/api/departments")
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            setDepartments(data)
          }
        }
      } catch (error) {
        console.error("Error fetching departments:", error)
      } finally {
        setIsLoadingDepartments(false)
      }
    }

    fetchDepartments()
  }, [])

  // Fetch supervisor info when department changes
  useEffect(() => {
    const fetchSupervisorInfo = async () => {
      if (!formData.departmentId && (!formData.departmentName || formData.departmentName.trim().length < 2)) {
        setSupervisorInfo(null)
        return
      }

      setIsLoadingSupervisor(true)
      try {
        const query = formData.departmentId
          ? `departmentId=${encodeURIComponent(formData.departmentId)}`
          : `department=${encodeURIComponent(formData.departmentName)}`
        const response = await fetch(`/api/auth/supervisor-info?${query}`)
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
  }, [formData.departmentId, formData.departmentName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setHasError(true)
      toast.error("Password tidak cocok!")
      setTimeout(() => setHasError(false), 400)
      return
    }

    if (!formData.pin || formData.pin.trim().length < 4) {
      setHasError(true)
      toast.error("PIN minimal 4 karakter!")
      setTimeout(() => setHasError(false), 400)
      return
    }

    if (formData.password.length < 6) {
      setHasError(true)
      toast.error("Password minimal 6 karakter!")
      setTimeout(() => setHasError(false), 400)
      return
    }

    setIsLoading(true)
    setHasError(false)

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
          departmentId: formData.departmentId || null,
          department: formData.departmentName,
          pin: formData.pin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setHasError(true)
        setTimeout(() => setHasError(false), 400)
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

  const getDepartmentLabel = (department: DepartmentOption) => {
    const name = department.name
    if (!department.supervised || department.approvalMode === "DIRECT") {
      return `${name} (Direct to Manager)`
    }
    if (department.approvalMode === "GA" || GA_SUPERVISED_DEPARTMENTS.has(name.toLowerCase())) {
      return `${name} (Supervised by GA)`
    }
    return `${name} (Supervised)`
  }

  return (
    <div
      className={`w-full max-w-6xl overflow-hidden rounded-[22px] border border-green-100 bg-white shadow-[0_16px_46px_rgba(21,128,61,0.16)] ${hasError ? "motion-safe:animate-shake" : ""}`}
    >
      <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-2">
        <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-green-600 via-green-600 to-emerald-500 px-6 py-10 text-white sm:px-10 lg:px-12">
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -left-24 -top-16 h-56 w-56 rounded-full bg-white/25 blur-2xl" />
            <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-emerald-200/20 blur-2xl" />
          </div>

          <div className="relative z-10 w-full max-w-sm text-center lg:text-left">
            <p className="mb-3 inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.06em] text-white/95">
              SPL TUNAS ESTA INDONESIA
            </p>

            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 p-2.5 backdrop-blur-sm lg:mx-0">
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

            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Daftar Akun
            </h1>

            <p className="mb-6 text-sm leading-7 text-white/95 sm:text-base">
              Bergabung dengan sistem pengajuan lembur PT Tunas Esta Indonesia untuk proses SPL yang lebih cepat dan rapi.
            </p>

            <div className="space-y-2.5 text-left text-sm text-white/90">
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" />
                Pendaftaran terhubung ke PIN karyawan
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" />
                Alur persetujuan mengikuti struktur departemen
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" />
                Riwayat SPL tersimpan otomatis di dashboard
              </div>
            </div>

            <a
              href="/login"
              className="mt-7 inline-flex h-11 min-w-[190px] items-center justify-center rounded-full border border-white/90 px-6 text-xs font-bold tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-green-700"
            >
              MASUK AKUN
            </a>
          </div>
        </section>

        <section className="bg-[#f8faf8] px-6 py-8 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-xl lg:max-h-[82vh] lg:overflow-y-auto lg:pr-2">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Form Registrasi
            </h2>
            <p className="mb-6 mt-1 text-sm text-gray-600">
              Isi data berikut untuk membuat akun baru.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Input
                  label="PIN Karyawan"
                  type="text"
                  placeholder="Masukkan PIN"
                  value={formData.pin}
                  onChange={(e) => {
                    setFormData({ ...formData, pin: e.target.value })
                  }}
                  className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  PIN karyawan Anda sesuai data HRD
                </p>
              </div>

              <Input
                label="Nama Lengkap"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                required
              />

              <Input
                label="Alamat Email"
                type="email"
                placeholder="nama@tunasestaindonesia.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                required
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Departemen <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.departmentId || formData.departmentName}
                  onChange={(e) => {
                    const value = e.target.value
                    const selected = departments.find(
                      (dept) => dept.id === value || dept.name === value
                    )
                    setFormData({
                      ...formData,
                      departmentId: selected?.id || "",
                      departmentName: selected?.name || "",
                    })
                  }}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-900 transition-all duration-200 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={isLoadingDepartments}
                >
                  <option value="">Pilih Departemen</option>
                  {departments.map((department) => (
                    <option key={department.id || department.name} value={department.id || department.name}>
                      {getDepartmentLabel(department)}
                    </option>
                  ))}
                </select>

                {isLoadingDepartments && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
                    Memuat daftar departemen...
                  </div>
                )}

                {isLoadingSupervisor && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
                    Memeriksa atasan untuk department ini...
                  </div>
                )}

                {supervisorInfo && !isLoadingSupervisor && (
                  <div
                    className={`mt-3 rounded-lg border p-3 ${
                      supervisorInfo.hasSupervisor
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start">
                      <svg
                        className={`mr-2 mt-0.5 h-5 w-5 flex-shrink-0 ${
                          supervisorInfo.hasSupervisor ? "text-blue-600" : "text-gray-600"
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
                        <p
                          className={`text-sm font-medium ${
                            supervisorInfo.hasSupervisor ? "text-blue-900" : "text-gray-900"
                          }`}
                        >
                          {supervisorInfo.message}
                        </p>

                        {supervisorInfo.warning && (
                          <p className="mt-1 text-xs text-orange-700">
                            Perhatian: {supervisorInfo.warning}
                          </p>
                        )}

                        <div className="mt-2">
                          <p className="mb-1 text-xs font-medium text-gray-700">
                            Alur Persetujuan SPL:
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {supervisorInfo.approvalFlow.map((step, index) => (
                              <div key={index} className="flex items-center">
                                <span
                                  className={`rounded px-2 py-1 text-xs ${
                                    index === 0
                                      ? "bg-green-100 font-medium text-green-800"
                                      : index === supervisorInfo.approvalFlow.length - 1
                                      ? "bg-purple-100 font-medium text-purple-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {step}
                                </span>
                                {index < supervisorInfo.approvalFlow.length - 1 && (
                                  <svg
                                    className="mx-1 h-4 w-4 text-gray-400"
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 pr-10 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi kata sandi"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 pr-10 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
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

              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-800">
                  Persyaratan Pendaftaran:
                </h4>
                <ul className="space-y-1 text-xs text-green-700">
                  <li className="flex items-center">
                    <svg className="mr-2 h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    PIN harus sesuai data HRD
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-2 h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Password minimal 6 karakter
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-2 h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Pastikan email aktif untuk login
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-green-700 hover:to-green-800 hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Sedang Mendaftar...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg
                      className="mr-2 h-5 w-5"
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

            <div className="mt-6 text-center lg:hidden">
              <p className="mb-3 text-sm text-gray-600">Sudah memiliki akun?</p>
              <a
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-green-600 px-4 text-sm font-medium text-green-600 transition-micro hover:bg-green-50 motion-safe:hover:scale-[1.01]"
              >
                Masuk ke Akun
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
