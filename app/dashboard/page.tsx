"use client"

import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import NotificationToggle from "@/components/notifications/NotificationToggle"
import { getRoleLabel } from "@/lib/utils"
import { Spl, Role } from "@/types"
import Swal from "sweetalert2"
import Link from "next/link"
import TimePicker from "@/components/ui/TimePicker"
import Modal from "@/components/ui/Modal"
import Image from "next/image"
import { isMorningOvertime } from "@/lib/spl-labels"
import ManagerAnalytics from "@/components/dashboard/ManagerAnalytics"

const DIRECT_TO_MANAGER_ROLES: Role[] = [
  "GA",
  "DEPARTMENT_HEAD",
  "PRODUCTION_SUPERVISOR",
  "HR",
]
const LEGACY_PROMPT_ROLES: Role[] = [
  "STAFF",
  "TEKNISI",
  "DRIVER",
  "GA",
  "DEPARTMENT_HEAD",
  "PRODUCTION_SUPERVISOR",
  "HR",
]
const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])
const REJECTED_STATUSES = ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"]

const formatTimeValue = (value?: Date | string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
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

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
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
  const [historyMonthFilter, setHistoryMonthFilter] = useState("ALL")
  const [managerName, setManagerName] = useState<string | null>(null)
  const [supervisorName, setSupervisorName] = useState<string | null>(null)
  const [supervisorLabel, setSupervisorLabel] = useState<string | null>(null)
  const [hasSupervisor, setHasSupervisor] = useState<boolean | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [selectedSpl, setSelectedSpl] = useState<Spl | null>(null)
  const [realizationStartTime, setRealizationStartTime] = useState("")
  const [realizationEndTime, setRealizationEndTime] = useState("")
  const [realizationEndDayOffset, setRealizationEndDayOffset] = useState(0)
  const [realizationNote, setRealizationNote] = useState("")
  const [overrunReason, setOverrunReason] = useState("")
  const [hasPromptedLegacy, setHasPromptedLegacy] = useState(false)

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

  const fetchUserSpls = useCallback(
    async (showLoading = false) => {
      if (!session?.user?.id) {
        if (showLoading) {
          setIsLoading(false)
        }
        return
      }

      if (showLoading) {
        setIsLoading(true)
      }

      try {
        const limit = 50
        let page = 1
        const all: Spl[] = []
        const params = new URLSearchParams({
          lite: "1",
          skipStats: "1",
          userId: session.user.id,
        })

        while (true) {
          params.set("page", String(page))
          params.set("limit", String(limit))
          const response = await fetch(`/api/spl?${params.toString()}`)
          if (!response.ok) {
            throw new Error("Gagal mengambil data")
          }
          const payload = await response.json()
          const items = Array.isArray(payload) ? payload : payload?.data || []
          all.push(...items)
          if (items.length < limit) break
          page += 1
        }

        setUserSpls(all)
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
    [session?.user?.id]
  )

  const fetchStats = useCallback(async () => {
    if (!session) return
    try {
      const response = await fetch("/api/spl/stats")
      if (!response.ok) return
      const data = await response.json()
      setStats({
        total: Number(data?.total || 0),
        pending: Number(data?.pending || 0),
        approved: Number(data?.approved || 0),
        rejected: Number(data?.rejected || 0),
      })
    } catch (error) {
      // ignore stats failure
    }
  }, [session])

  const fetchManagerName = useCallback(async () => {
    if (!session || session.user.role === "MANAGER") return
    const visibleManagerName = (value: unknown) =>
      typeof value === "string" && value.trim().length > 0
    try {
      const response = await fetch("/api/manager")
      if (!response.ok) return
      const data = await response.json()
      if (visibleManagerName(data?.name)) {
        setManagerName(data.name)
      }
    } catch (error) {
      // ignore manager name failure
    }
  }, [session])

  const fetchSupervisorInfo = useCallback(async () => {
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
  }, [session])

  const fetchMinOvertime = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/min-overtime")
      const data = await res.json()
      if (res.ok && data?.value) {
        setMinOvertime(data.value)
      }
    } catch (err) {
      // ignore min overtime failure
    }
  }, [])

  const checkLegacy = useCallback(async () => {
    if (!session || hasPromptedLegacy) return
    const role = session.user.role as Role
    if (!LEGACY_PROMPT_ROLES.includes(role)) return

    try {
      const response = await fetch("/api/spl/legacy")
      if (!response.ok) return
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        const result = await Swal.fire({
          icon: "info",
          title: "Data Lama Menunggu TTD",
          text: "Ada data lembur lama sebelum sistem dibuat. Mohon tanda tangan dulu agar bisa diproses.",
          showCancelButton: true,
          confirmButtonText: "Buka Data Lama",
          cancelButtonText: "Nanti",
        })
        if (result.isConfirmed) {
          router.push("/dashboard/data-lama")
        }
      }
    } catch (error) {
      // ignore legacy prompt errors
    } finally {
      setHasPromptedLegacy(true)
    }
  }, [session, hasPromptedLegacy, router])

  useEffect(() => {
    if (!session) return

    fetchUserSpls(true)
    Promise.allSettled([
      fetchStats(),
      fetchManagerName(),
      fetchSupervisorInfo(),
      fetchMinOvertime(),
      checkLegacy(),
    ])
  }, [
    session,
    fetchUserSpls,
    fetchStats,
    fetchManagerName,
    fetchSupervisorInfo,
    fetchMinOvertime,
    checkLegacy,
  ])

  useEffect(() => {
    setHistoryPage(1)
  }, [userSpls.length, historyMonthFilter])

  const historyItemsPerPage = 10
  const sortedHistory = useMemo(
    () =>
      [...userSpls].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [userSpls]
  )
  const historyMonthOptions = useMemo(() => {
    const monthMap = new Map<string, string>()
    sortedHistory.forEach((spl) => {
      const date = new Date(spl.date)
      if (Number.isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!monthMap.has(key)) {
        monthMap.set(
          key,
          date.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })
        )
      }
    })
    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }))
  }, [sortedHistory])
  const filteredHistory = useMemo(() => {
    if (historyMonthFilter === "ALL") return sortedHistory
    return sortedHistory.filter((spl) => {
      const date = new Date(spl.date)
      if (Number.isNaN(date.getTime())) return false
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      return key === historyMonthFilter
    })
  }, [sortedHistory, historyMonthFilter])
  useEffect(() => {
    if (historyMonthFilter === "ALL") return
    const exists = historyMonthOptions.some((option) => option.value === historyMonthFilter)
    if (!exists) {
      setHistoryMonthFilter("ALL")
    }
  }, [historyMonthFilter, historyMonthOptions])
  const totalHistoryPages = useMemo(
    () => Math.max(1, Math.ceil(filteredHistory.length / historyItemsPerPage)),
    [filteredHistory.length, historyItemsPerPage]
  )
  const currentHistoryPage = useMemo(
    () => Math.min(historyPage, totalHistoryPages),
    [historyPage, totalHistoryPages]
  )
  const historyStartIndex = useMemo(
    () => (currentHistoryPage - 1) * historyItemsPerPage,
    [currentHistoryPage, historyItemsPerPage]
  )
  const historyItems = useMemo(
    () => filteredHistory.slice(historyStartIndex, historyStartIndex + historyItemsPerPage),
    [filteredHistory, historyStartIndex, historyItemsPerPage]
  )
  const showHistoryTable = useMemo(
    () => userRole !== "SUPER_ADMIN" && !isProductionHead,
    [userRole, isProductionHead]
  )
  const showManagerWidgets = useMemo(() => userRole === "MANAGER", [userRole])

  const getLeaderName = useCallback((spl: Spl) => {
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
  }, [hasSupervisor, supervisorName, supervisorLabel, managerName])

  const getRegularHoursLabel = useCallback((spl: Spl) => {
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
  }, [session?.user?.regularStartTime, session?.user?.regularEndTime])

  const getDepartmentKey = useCallback((spl: Spl) => {
    const departmentName =
      spl.requester?.department?.name ||
      spl.requester?.departmentName ||
      session?.user?.department ||
      ""
    return departmentName.toLowerCase()
  }, [session?.user?.department])

  const isGaSupervisedDepartment = useCallback(
    (spl: Spl) => GA_SUPERVISED_DEPARTMENTS.has(getDepartmentKey(spl)),
    [getDepartmentKey]
  )

  const getManualWindow = useCallback((
    spl: Spl,
    startTime: string,
    endTime: string,
    endDayOffset = 0
  ) => {
    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)
    if (startMinutes === null || endMinutes === null) return null
    if (startMinutes === endMinutes) return null

    const baseDaySource = spl.plannedStartAt ? new Date(spl.plannedStartAt) : new Date(spl.date)
    const baseDay = new Date(baseDaySource)
    baseDay.setHours(0, 0, 0, 0)
    if (Number.isNaN(baseDay.getTime())) return null

    const start = new Date(baseDay)
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)

    const end = new Date(baseDay)
    end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
    if (endDayOffset > 0) {
      end.setDate(end.getDate() + endDayOffset)
    } else if (end <= start) {
      end.setDate(end.getDate() + 1)
    }

    return { start, end }
  }, [])

  const getPlannedWindow = useCallback((spl: Spl) => {
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
  }, [])

  const isOvertimeExpired = useCallback((spl: Spl) => {
    if (spl.actualStartAt) return false
    const window = getPlannedWindow(spl)
    if (!window) return false
    return new Date() >= window.plannedEnd
  }, [getPlannedWindow])

  const getActualRangeLabel = useCallback((spl: Spl) => {
    if (spl.actualStartAt && spl.actualEndAt) {
      return `${formatTimeValue(spl.actualStartAt)} - ${formatTimeValue(spl.actualEndAt)}`
    }
    if (spl.actualStartAt) {
      return `${formatTimeValue(spl.actualStartAt)} - Berjalan`
    }
    if (isOvertimeExpired(spl)) {
      return "Surat kadaluarsa"
    }
    return "Belum diinput"
  }, [isOvertimeExpired])

  const canInputRealization = useCallback((spl: Spl) => {
    const requesterId = spl.requesterId || spl.requester?.id
    if (requesterId !== session?.user?.id) return false
    if (spl.source === "LEGACY") return false
    if (spl.isManualEntry && !spl.requesterSignedAt) return false
    if (REJECTED_STATUSES.includes(spl.status)) return false
    if (spl.status !== "PENDING_MANAGER") return false
    if (spl.actualEndAt) return false
    return true
  }, [session?.user?.id])

  const isGaApprovalBlocked = useCallback(
    (spl: Spl) => isGaSupervisedDepartment(spl) && spl.status === "PENDING_SUPERVISOR",
    [isGaSupervisedDepartment]
  )

  const openFinishModal = (spl: Spl) => {
    setSelectedSpl(spl)
    setRealizationStartTime(spl.startTime)
    setRealizationEndTime(spl.endTime)
    const plannedWindow = getPlannedWindow(spl)
    const plannedDayOffset =
      plannedWindow &&
        plannedWindow.plannedEnd.getTime() - plannedWindow.plannedStart.getTime() >=
        24 * 60 * 60 * 1000
        ? 1
        : 0
    setRealizationEndDayOffset(plannedDayOffset)
    setRealizationNote("")
    setOverrunReason("")
    setShowFinishModal(true)
  }

  const handleFinishRealization = async () => {
    if (!selectedSpl) return

    if (!realizationStartTime || !realizationEndTime) {
      await Swal.fire({
        icon: "error",
        title: "Jam realisasi wajib diisi",
        text: "Isi jam mulai dan jam selesai realisasi.",
      })
      return
    }

    const manualWindow = getManualWindow(
      selectedSpl,
      realizationStartTime,
      realizationEndTime,
      realizationEndDayOffset
    )
    if (!manualWindow) {
      await Swal.fire({
        icon: "error",
        title: "Jam realisasi tidak valid",
        text: "Periksa kembali format jam realisasi.",
      })
      return
    }

    const plannedWindow = getPlannedWindow(selectedSpl)
    const overrunMinutes =
      plannedWindow && manualWindow.end > plannedWindow.plannedEnd
        ? Math.floor(
          (manualWindow.end.getTime() - plannedWindow.plannedEnd.getTime()) /
          60000
        )
        : 0
    if (!overrunReason.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Alasan realisasi wajib diisi",
        text: "Silakan isi alasan realisasi lembur.",
      })
      return
    }

    setIsFinishing(true)
    try {
      const response = await fetch(
        `/api/spl/${selectedSpl.id}/realization/manual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: realizationStartTime,
            endTime: realizationEndTime,
            endDayOffset: realizationEndDayOffset,
            note: realizationNote.trim(),
            overrunReason: overrunReason.trim() || null,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan realisasi")
      }
      await Swal.fire({
        icon: "success",
        title: "Realisasi tersimpan",
        text: "Realisasi lembur berhasil disimpan dan dikirim ke Manager.",
      })
      setShowFinishModal(false)
      setSelectedSpl(null)
      setRealizationStartTime("")
      setRealizationEndTime("")
      setRealizationEndDayOffset(0)
      await Promise.allSettled([fetchUserSpls(), fetchStats()])
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

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Selamat pagi"
    if (hour < 17) return "Selamat siang"
    return "Selamat sore"
  }, [])

  const getStatusBadge = useCallback((status: string) => {
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
  }, [])

  const getHeaderGradient = useCallback(() => {
    switch (userRole) {
      case "HR":
        return "from-green-600 via-green-700 to-green-800"
      case "MANAGER":
        return "from-purple-600 via-purple-700 to-purple-800"
      default:
        return "from-blue-600 via-blue-700 to-blue-800"
    }
  }, [userRole])

  const getHeaderIcon = useCallback(() => {
    switch (userRole) {
      case "HR":
        return "📊"
      case "MANAGER":
        return "👔"
      default:
        return "👋"
    }
  }, [userRole])

  const getHeaderDescription = useCallback(() => {
    switch (userRole) {
      case "HR":
        return "Kelola data dan laporan SPL seluruh karyawan"
      case "MANAGER":
        return "Review dan setujui pengajuan lembur karyawan"
      default:
        return "Selamat datang di Sistem Pengajuan Surat Perintah Lembur"
    }
  }, [userRole])

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

  const selectedManualWindow =
    selectedSpl && realizationStartTime && realizationEndTime
      ? getManualWindow(
        selectedSpl,
        realizationStartTime,
        realizationEndTime,
        realizationEndDayOffset
      )
      : null
  const selectedActualMinutes = selectedManualWindow
    ? Math.floor(
      (selectedManualWindow.end.getTime() - selectedManualWindow.start.getTime()) /
      60000
    )
    : null
  const selectedOverrunMinutes = (() => {
    if (!selectedSpl || !selectedManualWindow) return null
    const plannedWindow = getPlannedWindow(selectedSpl)
    if (!plannedWindow) return null
    if (selectedManualWindow.end <= plannedWindow.plannedEnd) return 0
    return Math.floor(
      (selectedManualWindow.end.getTime() - plannedWindow.plannedEnd.getTime()) /
      60000
    )
  })()

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
        id="dash-header"
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

      {/* Content Layout */}
      {showManagerWidgets ? (
        /* Manager: Full-width Analytics */
        <div className="space-y-6">
          <ManagerAnalytics />
          <NotificationToggle />
        </div>
      ) : (
        /* Non-Manager: History Table */
        <div className="space-y-6">
          {showHistoryTable && (
            <div id="dash-history" className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
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
                <div className="flex items-center gap-2">
                  <select
                    value={historyMonthFilter}
                    onChange={(e) => setHistoryMonthFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  >
                    <option value="ALL">Semua Bulan</option>
                    {historyMonthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-gray-500">
                    Total: {filteredHistory.length}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-[900px] w-full text-sm">
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
                          Belum ada riwayat lembur pada periode ini
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
                            <div className="flex items-center gap-2">
                              <span>
                                {spl.startTime} - {spl.endTime}
                              </span>
                              {isMorningOvertime(spl) && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md border bg-orange-50 text-orange-700 border-orange-200">
                                  Lembur Pagi
                                </span>
                              )}
                            </div>
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
                              {canInputRealization(spl) && (
                                <button
                                  type="button"
                                  onClick={() => openFinishModal(spl)}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                >
                                  Input Realisasi
                                </button>
                              )}
                              {!canInputRealization(spl) && isGaApprovalBlocked(spl) && (
                                <button
                                  type="button"
                                  disabled
                                  className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg cursor-not-allowed"
                                >
                                  Menunggu GA
                                </button>
                              )}
                              {!canInputRealization(spl) &&
                                !isGaApprovalBlocked(spl) && (
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

              {filteredHistory.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
                  <span>
                    Menampilkan {historyStartIndex + 1}-
                    {Math.min(
                      historyStartIndex + historyItemsPerPage,
                      filteredHistory.length
                    )}{" "}
                    dari {filteredHistory.length}
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
          <NotificationToggle />
        </div>
      )}
      {showFinishModal && selectedSpl && (
        <Modal
          isOpen={showFinishModal}
          onClose={() => {
            if (isFinishing) return
            setShowFinishModal(false)
            setSelectedSpl(null)
            setRealizationStartTime("")
            setRealizationEndTime("")
            setRealizationEndDayOffset(0)
          }}
          title="Input Realisasi"
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowFinishModal(false)
                  setSelectedSpl(null)
                  setRealizationStartTime("")
                  setRealizationEndTime("")
                  setRealizationEndDayOffset(0)
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
                <span className="text-gray-600">Durasi:</span>
                <span className="font-medium text-gray-900">
                  {selectedActualMinutes !== null
                    ? `${Math.floor(selectedActualMinutes / 60)} jam ${selectedActualMinutes % 60} menit`
                    : "-"}
                </span>
              </div>
              {selectedOverrunMinutes && selectedOverrunMinutes > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  Melebihi rencana {selectedOverrunMinutes} menit.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TimePicker
                label="Jam Mulai Realisasi"
                value={realizationStartTime}
                onChange={(value) => setRealizationStartTime(value)}
                required
                showWib
              />
              <TimePicker
                label="Jam Selesai Realisasi"
                value={realizationEndTime}
                onChange={(value) => setRealizationEndTime(value)}
                required
                showWib
              />
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durasi Realisasi
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="realization-duration-days"
                    checked={realizationEndDayOffset === 0}
                    onChange={() => setRealizationEndDayOffset(0)}
                    className="h-4 w-4 text-blue-600 border-blue-200"
                  />
                  1 Hari
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="realization-duration-days"
                    checked={realizationEndDayOffset === 1}
                    onChange={() => setRealizationEndDayOffset(1)}
                    className="h-4 w-4 text-blue-600 border-blue-200"
                  />
                  2 Hari (Selesai Besok)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Realisasi <span className="text-gray-400">(Opsional)</span>
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
                Alasan Realisasi <span className="text-red-500">*</span>
              </label>
              <textarea
                value={overrunReason}
                onChange={(e) => setOverrunReason(e.target.value)}
                className="w-full min-h-[80px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jelaskan alasan realisasi lembur..."
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
