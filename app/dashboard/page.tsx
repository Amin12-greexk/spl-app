"use client"

import { useSession } from "next-auth/react"
import { ChangeEvent, useCallback, useEffect, useState } from "react"
import NotificationToggle from "@/components/notifications/NotificationToggle"
import { getRoleLabel } from "@/lib/utils"
import { Spl, Role } from "@/types"
import Swal from "sweetalert2"
import Link from "next/link" // <-- TAMBAHAN: Import Link
import TimePicker from "@/components/ui/TimePicker"
import Modal from "@/components/ui/Modal"
import Image from "next/image"

const DIRECT_TO_MANAGER_ROLES: Role[] = [
  "GA",
  "DEPARTMENT_HEAD",
  "PRODUCTION_SUPERVISOR",
  "HR",
]
const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])
const REJECTED_STATUSES = ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"]
const EARLY_FINISH_GRACE_MINUTES = 30

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [userSpls, setUserSpls] = useState<Spl[]>([])
  const [minOvertime, setMinOvertime] = useState("16:30")
  const [isSavingMin, setIsSavingMin] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [managerName, setManagerName] = useState<string | null>(null)
  const [supervisorName, setSupervisorName] = useState<string | null>(null)
  const [supervisorLabel, setSupervisorLabel] = useState<string | null>(null)
  const [hasSupervisor, setHasSupervisor] = useState<boolean | null>(null)
  const [isStartingId, setIsStartingId] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [selectedSpl, setSelectedSpl] = useState<Spl | null>(null)
  const [realizationNote, setRealizationNote] = useState("")
  const [realizationProofImage, setRealizationProofImage] = useState("")
  const [realizationProofPreview, setRealizationProofPreview] = useState<string | null>(null)
  const [overrunReason, setOverrunReason] = useState("")

  const userRole = session?.user?.role as Role
  const normalizedDepartment = (
    session?.user?.department ||
    (session?.user as { departmentName?: string })?.departmentName ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase()
  const isProductionHead =
    userRole === "DEPARTMENT_HEAD" &&
    (normalizedDepartment === "produksi" || normalizedDepartment === "production")

  const refreshSpls = useCallback(
    async (showLoading = false) => {
      if (!session) {
        return
      }

      if (showLoading) {
        setIsLoading(true)
      }

      try {
        const response = await fetch("/api/spl")
        if (!response.ok) {
          throw new Error("Gagal mengambil data")
        }

        const data: Spl[] = await response.json()
        const requesterId = session.user.id
        const ownSpls = data.filter(
          (spl) => (spl.requesterId || spl.requester?.id) === requesterId
        )

        const pendingStatuses = [
          "PENDING",
          "PENDING_SUPERVISOR",
          "PENDING_MANAGER",
          "IN_PROGRESS",
          "DONE",
        ]
        const rejectedStatuses = ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"]

        setStats({
          total: data.length,
          pending: data.filter((spl) => pendingStatuses.includes(spl.status)).length,
          approved: data.filter((spl) => spl.status === "APPROVED").length,
          rejected: data.filter((spl) => rejectedStatuses.includes(spl.status)).length,
        })
        setUserSpls(ownSpls)

      } catch (error: any) {
        await Swal.fire({
          icon: "error",
          title: "Gagal memuat data",
          text: error.message || "Terjadi kesalahan",
        })
      } finally {
        if (showLoading) {
          setIsLoading(false)
        }
      }
    },
    [session]
  )

  useEffect(() => {
    if (!session) {
      return
    }

    refreshSpls(true)
    if (session.user.role !== "MANAGER") {
      const visibleManagerName = (value: unknown) =>
        typeof value === "string" && value.trim().length > 0

      const fetchManager = async () => {
        try {
          const response = await fetch("/api/manager")
          if (!response.ok) {
            return
          }
          const data = await response.json()
          if (visibleManagerName(data?.name)) {
            setManagerName(data.name)
          }
        } catch (error) {
          // ignore manager name failure
        }
      }

      fetchManager()
    }
  }, [session, refreshSpls])

  useEffect(() => {
    if (!session || session.user.role === "MANAGER") {
      setHasSupervisor(null)
      setSupervisorName(null)
      setSupervisorLabel(null)
      return
    }

    if (DIRECT_TO_MANAGER_ROLES.includes(session.user.role as Role)) {
      setHasSupervisor(false)
      setSupervisorName(null)
      setSupervisorLabel(null)
      return
    }

    const departmentId = session.user.departmentId
    const departmentName = session.user.department

    if (!departmentId && (!departmentName || departmentName.trim().length === 0)) {
      setHasSupervisor(null)
      setSupervisorName(null)
      setSupervisorLabel(null)
      return
    }

    const fetchSupervisorInfo = async () => {
      try {
        const query = departmentId
          ? `departmentId=${encodeURIComponent(departmentId)}`
          : `department=${encodeURIComponent(departmentName || "")}`
        const response = await fetch(`/api/auth/supervisor-info?${query}`)
        if (!response.ok) {
          setHasSupervisor(null)
          setSupervisorName(null)
          setSupervisorLabel(null)
          return
        }
        const data = await response.json()
        const hasSupervisorValue =
          typeof data?.hasSupervisor === "boolean" ? data.hasSupervisor : null
        setHasSupervisor(hasSupervisorValue)
        setSupervisorName(
          typeof data?.supervisor?.name === "string" && data.supervisor.name.trim().length > 0
            ? data.supervisor.name
            : null
        )
        setSupervisorLabel(
          typeof data?.supervisor?.position === "string" && data.supervisor.position.trim().length > 0
            ? data.supervisor.position
            : null
        )
      } catch (error) {
        setHasSupervisor(null)
        setSupervisorName(null)
        setSupervisorLabel(null)
      }
    }

    fetchSupervisorInfo()
  }, [session?.user?.departmentId, session?.user?.department, session?.user?.role])

  useEffect(() => {
    setHistoryPage(1)
  }, [userSpls.length])

  // Load minimal lembur for manager view
  useEffect(() => {
    const loadMin = async () => {
      try {
        const res = await fetch("/api/settings/min-overtime")
        const data = await res.json()
        if (res.ok && data?.value) {
          setMinOvertime(data.value)
        }
      } catch (err) {
        // Failed to load minimal overtime setting
      }
    }
    loadMin()
  }, [])

  const historyItemsPerPage = 10
  const sortedHistory = [...userSpls].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(sortedHistory.length / historyItemsPerPage)
  )
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages)
  const historyStartIndex = (currentHistoryPage - 1) * historyItemsPerPage
  const historyItems = sortedHistory.slice(
    historyStartIndex,
    historyStartIndex + historyItemsPerPage
  )
  const showHistoryTable = userRole !== "SUPER_ADMIN" && !isProductionHead
  const showManagerWidgets = userRole === "MANAGER"

  const getLeaderName = (spl: Spl) => {
    if (hasSupervisor === true) {
      if (supervisorName) return supervisorName
      if (spl.supervisor?.name) return spl.supervisor.name
      return supervisorLabel || "Atasan"
    }

    if (hasSupervisor === false) {
      if (managerName) return managerName
      if (spl.approver?.name) return spl.approver.name
      return "Manager"
    }

    if (spl.supervisor?.name) return spl.supervisor.name
    if (managerName) return managerName
    if (spl.approver?.name) return spl.approver.name
    return "Manager"
  }

  const getRegularHoursLabel = (spl: Spl) => {
    const snapshotStart = spl.regularStartAt ? formatTimeValue(spl.regularStartAt) : ""
    const snapshotEnd = spl.regularEndAt ? formatTimeValue(spl.regularEndAt) : ""
    if (snapshotStart && snapshotEnd) {
      return `${snapshotStart} - ${snapshotEnd}`
    }
    const start =
      spl.requester?.regularStartTime || session?.user?.regularStartTime || ""
    const end =
      spl.requester?.regularEndTime || session?.user?.regularEndTime || ""
    if (start && end) {
      return `${start} - ${end}`
    }
    return "-"
  }

  const getDepartmentKey = (spl: Spl) => {
    const departmentName =
      spl.requester?.department?.name ||
      spl.requester?.departmentName ||
      session?.user?.department ||
      ""
    return departmentName.toLowerCase()
  }

  const isGaSupervisedDepartment = (spl: Spl) =>
    GA_SUPERVISED_DEPARTMENTS.has(getDepartmentKey(spl))

  function formatTimeValue(value?: Date | string | null) {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getActualRangeLabel = (spl: Spl) => {
    if (spl.actualStartAt && spl.actualEndAt) {
      return `${formatTimeValue(spl.actualStartAt)} - ${formatTimeValue(spl.actualEndAt)}`
    }
    if (spl.actualStartAt) {
      return `${formatTimeValue(spl.actualStartAt)} - Berjalan`
    }
    if (isOvertimeExpired(spl)) {
      return "Surat kadaluarsa"
    }
    return "Belum mulai"
  }

  const parseTimeToMinutes = (value: string) => {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    if (!/^\d{2}:\d{2}$/.test(trimmed)) return null
    const [hour, minute] = trimmed.split(":").map(Number)
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null
    }
    return hour * 60 + minute
  }

  const getPlannedWindow = (spl: Spl) => {
    if (spl.plannedStartAt && spl.plannedEndAt) {
      const plannedStart = new Date(spl.plannedStartAt)
      const plannedEnd = new Date(spl.plannedEndAt)
      if (!Number.isNaN(plannedStart.getTime()) && !Number.isNaN(plannedEnd.getTime())) {
        return { plannedStart, plannedEnd }
      }
    }

    const startMinutes = parseTimeToMinutes(spl.startTime)
    const endMinutes = parseTimeToMinutes(spl.endTime)
    if (startMinutes === null || endMinutes === null) return null
    if (startMinutes === endMinutes) return null

    const baseDaySource = spl.regularEndAt ? new Date(spl.regularEndAt) : new Date(spl.date)
    const baseDay = new Date(baseDaySource)
    baseDay.setHours(0, 0, 0, 0)
    if (Number.isNaN(baseDay.getTime())) {
      return null
    }

    const plannedStart = new Date(baseDay)
    const plannedEnd = new Date(baseDay)
    plannedStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
    plannedEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
    if (plannedEnd <= plannedStart) {
      plannedEnd.setDate(plannedEnd.getDate() + 1)
    }
    return { plannedStart, plannedEnd }
  }

  const getActualMinutes = (spl: Spl, endAt = new Date()) => {
    if (!spl.actualStartAt) return null
    const startAt = new Date(spl.actualStartAt)
    if (Number.isNaN(startAt.getTime())) return null
    const diffMs = endAt.getTime() - startAt.getTime()
    if (diffMs <= 0) return 0
    return Math.floor(diffMs / 60000)
  }

  const isEarlyFinish = (spl: Spl) => {
    if (!spl.actualStartAt || spl.actualEndAt) return false
    const elapsed = getActualMinutes(spl, new Date())
    if (elapsed === null) return false
    return elapsed <= EARLY_FINISH_GRACE_MINUTES
  }

  const isOutsidePlannedWindow = (spl: Spl) => {
    const window = getPlannedWindow(spl)
    if (!window) return false
    const now = new Date()
    return now < window.plannedStart || now >= window.plannedEnd
  }

  const isOvertimeExpired = (spl: Spl) => {
    if (spl.actualStartAt) return false
    const window = getPlannedWindow(spl)
    if (!window) return false
    return new Date() >= window.plannedEnd
  }

  const getOverrunMinutes = (spl: Spl, endAt = new Date()) => {
    const window = getPlannedWindow(spl)
    if (!window) return null
    const plannedEnd = window.plannedEnd
    if (Number.isNaN(plannedEnd.getTime())) return null
    if (endAt <= plannedEnd) return 0
    const diffMs = endAt.getTime() - plannedEnd.getTime()
    return diffMs > 0 ? Math.floor(diffMs / 60000) : 0
  }

  const canStartSpl = (spl: Spl) => {
    const requesterId = spl.requesterId || spl.requester?.id
    if (requesterId !== session?.user?.id) return false
    if (spl.actualStartAt || spl.actualEndAt) return false
    if (REJECTED_STATUSES.includes(spl.status)) return false
    if (isOutsidePlannedWindow(spl)) return false
    if (
      isGaSupervisedDepartment(spl) &&
      ["PENDING_SUPERVISOR", "PENDING"].includes(spl.status)
    ) {
      return false
    }
    return true
  }

  const canFinishSpl = (spl: Spl) => {
    const requesterId = spl.requesterId || spl.requester?.id
    if (requesterId !== session?.user?.id) return false
    if (!spl.actualStartAt || spl.actualEndAt) return false
    return true
  }

  const isGaStartBlocked = (spl: Spl) => {
    if (!isGaSupervisedDepartment(spl)) return false
    if (spl.actualStartAt || spl.actualEndAt) return false
    if (REJECTED_STATUSES.includes(spl.status)) return false
    return ["PENDING_SUPERVISOR", "PENDING"].includes(spl.status)
  }

  const handleStartRealization = async (spl: Spl) => {
    if (!canStartSpl(spl)) return
    setIsStartingId(spl.id)
    try {
      const response = await fetch(`/api/spl/${spl.id}/realization/start`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal memulai realisasi")
      }
      await Swal.fire({
        icon: "success",
        title: "Realisasi dimulai",
        text: `Jam mulai tercatat ${formatTimeValue(new Date())}.`,
      })
      await refreshSpls()
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal memulai",
        text: error.message || "Terjadi kesalahan",
      })
    } finally {
      setIsStartingId(null)
    }
  }

  const openFinishModal = (spl: Spl) => {
    setSelectedSpl(spl)
    setRealizationNote("")
    setRealizationProofImage("")
    setRealizationProofPreview(null)
    setOverrunReason("")
    setShowFinishModal(true)
  }

  const handleFinishProofUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      await Swal.fire({
        icon: "error",
        title: "File Tidak Valid",
        text: "Harap upload file gambar (JPG, PNG, atau JPEG)",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      await Swal.fire({
        icon: "error",
        title: "Ukuran File Terlalu Besar",
        text: "Ukuran file maksimal 5MB",
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setRealizationProofImage(base64String)
      setRealizationProofPreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFinishProof = () => {
    setRealizationProofImage("")
    setRealizationProofPreview(null)
  }

  const handleFinishRealization = async () => {
    if (!selectedSpl) return

    if (!realizationNote.trim()) {
      await Swal.fire({
        icon: "error",
        title: "Catatan wajib diisi",
        text: "Silakan isi catatan hasil lembur.",
      })
      return
    }

    if (isGaSupervisedDepartment(selectedSpl) && realizationProofImage.length < 30) {
      await Swal.fire({
        icon: "error",
        title: "Foto bukti wajib",
        text: "Departemen ini mewajibkan foto bukti realisasi.",
      })
      return
    }

    const overrunMinutes = getOverrunMinutes(selectedSpl, new Date())
    if (overrunMinutes && overrunMinutes > 0 && !overrunReason.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Alasan melebihi rencana",
        text: "Isi alasan karena realisasi melebihi jam rencana.",
      })
      return
    }

    setIsFinishing(true)
    try {
      const basePayload = {
        note: realizationNote.trim(),
        proofImage: realizationProofImage || null,
        overrunReason: overrunReason.trim() || null,
      }

      const submitFinish = async (confirmEarlyFinish = false) => {
        const response = await fetch(`/api/spl/${selectedSpl.id}/realization/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...basePayload,
            confirmEarlyFinish,
          }),
        })
        const data = await response.json()
        return { response, data }
      }

      const { response, data } = await submitFinish(false)
      if (!response.ok) {
        if (data?.code === "CONFIRM_EARLY_FINISH_REQUIRED") {
          const confirmResult = await Swal.fire({
            icon: "warning",
            title: "Durasi lembur masih singkat",
            text: "Jika diselesaikan sekarang, lembur tidak akan dihitung. Lanjutkan?",
            showCancelButton: true,
            confirmButtonText: "Ya, akhiri",
            cancelButtonText: "Batal",
          })

          if (!confirmResult.isConfirmed) {
            return
          }

          const confirmResponse = await submitFinish(true)
          if (!confirmResponse.response.ok) {
            throw new Error(confirmResponse.data?.error || "Gagal menyimpan realisasi")
          }
        } else {
          throw new Error(data.error || "Gagal menyimpan realisasi")
        }
      }
      await Swal.fire({
        icon: "success",
        title: "Realisasi tersimpan",
        text: "Catatan realisasi lembur berhasil disimpan.",
      })
      setShowFinishModal(false)
      setSelectedSpl(null)
      await refreshSpls()
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menyimpan",
        text: error.message || "Terjadi kesalahan",
      })
    } finally {
      setIsFinishing(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Selamat pagi"
    if (hour < 17) return "Selamat siang"
    return "Selamat sore"
  }

  function getStatusBadge(status: string) {
    const config = {
      PENDING: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
      },
      PENDING_SUPERVISOR: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
      },
      PENDING_MANAGER: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
      },
      APPROVED: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Disetujui",
      },
      IN_PROGRESS: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Berjalan",
      },
      DONE: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Selesai",
      },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", label: "Ditolak" },
      REJECTED_BY_SUPERVISOR: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak",
      },
      REJECTED_BY_MANAGER: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak",
      },
    }
    const c = config[status as keyof typeof config] || config.PENDING
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}
      >
        {c.label}
      </span>
    )
  }

  const getHeaderGradient = () => {
    switch (userRole) {
      case "HR":
        return "from-green-600 via-green-700 to-green-800"
      case "MANAGER":
        return "from-purple-600 via-purple-700 to-purple-800"
      default:
        return "from-blue-600 via-blue-700 to-blue-800"
    }
  }

  const getHeaderIcon = () => {
    switch (userRole) {
      case "HR":
        return "📊"
      case "MANAGER":
        return "👔"
      default:
        return "👋"
    }
  }

  const getHeaderDescription = () => {
    switch (userRole) {
      case "HR":
        return "Kelola data dan laporan SPL seluruh karyawan"
      case "MANAGER":
        return "Review dan setujui pengajuan lembur karyawan"
      default:
        return "Selamat datang di Sistem Pengajuan Surat Perintah Lembur"
    }
  }

  const saveMinOvertime = async () => {
    if (!/^\d{2}:\d{2}$/.test(minOvertime)) {
      await Swal.fire({
        icon: "warning",
        title: "Format salah",
        text: "Format waktu harus HH:MM (contoh 13:30).",
      })
      return
    }
    try {
      setIsSavingMin(true)
      const res = await fetch("/api/settings/min-overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: minOvertime }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan waktu minimal")
      }
      setMinOvertime(data.value)
      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Waktu minimal lembur diset ke ${data.value}`,
      })
    } catch (err: any) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menyimpan",
        text: err.message || "Gagal menyimpan setting",
      })
    } finally {
      setIsSavingMin(false)
    }
  }

  const selectedActualMinutes = selectedSpl ? getActualMinutes(selectedSpl, new Date()) : null
  const selectedOverrunMinutes = selectedSpl ? getOverrunMinutes(selectedSpl, new Date()) : null
  const selectedEarlyFinish = selectedSpl ? isEarlyFinish(selectedSpl) : false

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
          <div className="text-center">
            <p className="text-gray-700 font-medium">Memuat dashboard...</p>
            <p className="text-gray-500 text-sm mt-1">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Enhanced Header Section */}
      <div
        className={`relative bg-gradient-to-br ${getHeaderGradient()} rounded-2xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">{getHeaderIcon()}</span>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                    {getGreeting()}!
                  </h1>
                  <p className="text-xl sm:text-2xl font-medium text-white/90 mt-1">
                    {session?.user?.name}
                  </p>
                </div>
              </div>

              <p className="text-white/80 text-sm sm:text-base mb-4 max-w-2xl">
                {getHeaderDescription()}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {userRole
                    ? getRoleLabel(userRole, session?.user?.department)
                    : ""}
                </span>
                {session?.user?.department && (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {session.user.department}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex w-20 h-20 bg-white/20 rounded-2xl items-center justify-center backdrop-blur-sm">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-green-600 font-bold text-2xl">TEI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Two Column Layout */}
      <div
        className={
          showManagerWidgets
            ? "grid grid-cols-1 xl:grid-cols-3 gap-6"
            : "grid grid-cols-1 gap-6"
        }
      >
        {/* Left Column - Actions & Profile */}
        <div className={showManagerWidgets ? "xl:col-span-2 space-y-6" : "space-y-6"}>
          {showHistoryTable && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Riwayat Lembur Saya
                  </h2>
                </div>
                <div className="text-sm text-gray-500">
                  Total: {sortedHistory.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Tgl Lembur
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Pimpinan
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Jam Reguler
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Jam Lembur (Rencana)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Jam Realisasi
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Alasan Lembur
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyItems.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-gray-500"
                          colSpan={8}
                        >
                          Belum ada riwayat lembur
                        </td>
                      </tr>
                    ) : (
                      historyItems.map((spl) => (
                        <tr key={spl.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">
                            {new Date(spl.date).toLocaleDateString("id-ID")}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {getLeaderName(spl)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {getRegularHoursLabel(spl)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {spl.startTime} - {spl.endTime}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {getActualRangeLabel(spl)}
                          </td>
                          <td
                            className="px-4 py-3 text-gray-700 max-w-xs truncate"
                            title={spl.reason}
                          >
                            {spl.reason}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(spl.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {canStartSpl(spl) && (
                                <button
                                  type="button"
                                  onClick={() => handleStartRealization(spl)}
                                  disabled={isStartingId === spl.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                                >
                                  {isStartingId === spl.id ? "Memulai..." : "Mulai"}
                                </button>
                              )}
                              {!canStartSpl(spl) && isGaStartBlocked(spl) && (
                                <button
                                  type="button"
                                  disabled
                                  className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg cursor-not-allowed"
                                >
                                  Menunggu GA
                                </button>
                              )}
                              {!canStartSpl(spl) &&
                                isOutsidePlannedWindow(spl) &&
                                !isGaStartBlocked(spl) &&
                                !canFinishSpl(spl) && (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg cursor-not-allowed"
                                  >
                                    {isOvertimeExpired(spl) ? "Kadaluarsa" : "Di luar jadwal"}
                                  </button>
                                )}
                              {canFinishSpl(spl) && (
                                <button
                                  type="button"
                                  onClick={() => openFinishModal(spl)}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                >
                                  {isEarlyFinish(spl) ? "Selesai (Konfirmasi)" : "Selesai"}
                                </button>
                              )}
                              {!canStartSpl(spl) &&
                                !canFinishSpl(spl) &&
                                !isGaStartBlocked(spl) && (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {sortedHistory.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
                  <span>
                    Menampilkan {historyStartIndex + 1}-
                    {Math.min(
                      historyStartIndex + historyItemsPerPage,
                      sortedHistory.length
                    )}{" "}
                    dari {sortedHistory.length}
                  </span>
                  {totalHistoryPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryPage(Math.max(1, currentHistoryPage - 1))
                        }
                        disabled={currentHistoryPage === 1}
                        className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <span>
                        Hal {currentHistoryPage} dari {totalHistoryPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryPage(
                            Math.min(totalHistoryPages, currentHistoryPage + 1)
                          )
                        }
                        disabled={currentHistoryPage === totalHistoryPages}
                        className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Berikutnya
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {showManagerWidgets && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                Aksi Cepat
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Batas Waktu Pengajuan
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Pengajuan setelah jam ini akan ditolak
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <TimePicker
                      value={minOvertime}
                      onChange={(value) => setMinOvertime(value)}
                      showWib
                      selectClassName="focus:ring-purple-200 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={saveMinOvertime}
                      disabled={isSavingMin}
                      className="w-full px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
                    >
                      {isSavingMin ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </div>

                <Link
                  href="/dashboard/hr/persetujuan"
                  className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Persetujuan SPL
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Review pengajuan lembur
                        </p>
                      </div>
                    </div>
                    {stats.pending > 0 && (
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {stats.pending}
                      </span>
                    )}
                  </div>
                </Link>

                <Link
                  href="/dashboard/hr"
                  className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Data & Laporan
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Lihat data SPL tim
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <NotificationToggle />
        </div>

        {/* Right Column - Profile */}
        {showManagerWidgets && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 bg-purple-100">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Informasi Akun
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-600 to-purple-700">
                    {session?.user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      {session?.user?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Role:</span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      Manager
                    </span>
                  </div>

                  {session?.user?.department && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">
                        Departemen:
                      </span>
                      <span className="text-gray-900 font-medium">
                        {session.user.department}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showFinishModal && selectedSpl && (
        <Modal
          isOpen={showFinishModal}
          onClose={() => {
            if (isFinishing) return
            setShowFinishModal(false)
            setSelectedSpl(null)
          }}
          title="Selesai Lembur"
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowFinishModal(false)
                  setSelectedSpl(null)
                }}
                disabled={isFinishing}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFinishRealization}
                disabled={isFinishing}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isFinishing ? "Menyimpan..." : "Simpan Realisasi"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-gray-600">Rencana:</span>
                <span className="font-medium text-gray-900">
                  {selectedSpl.startTime} - {selectedSpl.endTime}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-gray-600">Mulai:</span>
                <span className="font-medium text-gray-900">
                  {formatTimeValue(selectedSpl.actualStartAt)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-gray-600">Durasi sementara:</span>
                <span className="font-medium text-gray-900">
                  {selectedActualMinutes !== null
                    ? `${Math.floor(selectedActualMinutes / 60)} jam ${selectedActualMinutes % 60} menit`
                    : "-"}
                </span>
              </div>
              {selectedEarlyFinish && (
                <div className="mt-2 text-xs text-amber-600">
                  Durasi masih {'<='} 30 menit. Jika diselesaikan sekarang, lembur tidak dihitung.
                </div>
              )}
              {selectedOverrunMinutes && selectedOverrunMinutes > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  Melebihi rencana {selectedOverrunMinutes} menit.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Realisasi <span className="text-red-500">*</span>
              </label>
              <textarea
                value={realizationNote}
                onChange={(e) => setRealizationNote(e.target.value)}
                className="w-full min-h-[100px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Isi hasil pekerjaan lembur..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto Bukti Realisasi{" "}
                {isGaSupervisedDepartment(selectedSpl) ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-gray-400">(Opsional)</span>
                )}
              </label>
              {!realizationProofPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-micro">
                  <div className="flex flex-col items-center justify-center py-4 px-4">
                    <svg
                      className="w-8 h-8 mb-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-xs text-gray-600 text-center">
                      <span className="font-semibold text-blue-600">Klik untuk upload</span>
                      <br />
                      PNG, JPG (Max 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFinishProofUpload}
                  />
                </label>
              ) : (
                <div className="relative">
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={realizationProofPreview}
                      alt="Preview bukti realisasi"
                      width={1200}
                      height={800}
                      className="w-full h-auto max-h-64 object-contain"
                      sizes="100vw"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFinishProof}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-micro"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {selectedOverrunMinutes && selectedOverrunMinutes > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan Melebihi Rencana <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrunReason}
                  onChange={(e) => setOverrunReason(e.target.value)}
                  className="w-full min-h-[80px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jelaskan alasan realisasi melebihi rencana..."
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
