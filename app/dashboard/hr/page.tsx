"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Spl } from "@/types"
import SplCard from "@/components/spl/SplCard"
import SplDetailModal from "@/components/spl/SplDetailModal"
import Input from "@/components/ui/Input"
import toast from "react-hot-toast"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isWithinInterval } from "date-fns"
import { id } from "date-fns/locale"
import { getEffectiveHours, getEffectiveMinutes } from "@/lib/spl-hours"
import { isMorningOvertime } from "@/lib/spl-labels"

interface AttendanceRecord {
  pin?: string | null
  scan_date: string
}

type ExportRow = Record<string, string | number>
type ExportContext = {
  resolvePin: (spl: Spl) => string
  attendanceByPin: Map<string, AttendanceRecord[]>
}

function StatPill({
  value,
  label,
  tone,
}: {
  value: string | number
  label: string
  tone: "blue" | "amber" | "emerald" | "rose" | "violet" | "orange"
}) {
  const toneMap = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
    orange: "border-orange-200 bg-orange-50 text-orange-900",
  }
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] opacity-60">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export default function HRViewPage() {
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [dateFilter, setDateFilter] = useState<string>("ALL")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [selectedSpl, setSelectedSpl] = useState<Spl | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchSpls = useCallback(async () => {
    setIsLoading(true)
    setIsFetchingMore(false)
    try {
      const limit = 50

      const firstResponse = await fetch(`/api/spl?lite=1&skipStats=1&page=1&limit=${limit}`)
      if (!firstResponse.ok) throw new Error("Gagal mengambil data SPL")

      const firstPayload = await firstResponse.json()
      const firstItems: Spl[] = Array.isArray(firstPayload) ? firstPayload : firstPayload?.data || []
      setSpls(firstItems)
      setIsLoading(false)

      if (firstItems.length < limit) return

      setIsFetchingMore(true)

      let currentPage = 2
      while (true) {
        const batchSize = 5
        const pages = Array.from({ length: batchSize }, (_, i) => currentPage + i)
        const responses = await Promise.all(
          pages.map((p) => fetch(`/api/spl?lite=1&skipStats=1&page=${p}&limit=${limit}`))
        )

        const batchItems = await Promise.all(
          responses.map(async (res) => {
            if (!res.ok) return []
            const payload = await res.json()
            return (Array.isArray(payload) ? payload : payload?.data || []) as Spl[]
          })
        )

        const allBatchItems = batchItems.flat()
        if (allBatchItems.length > 0) {
          setSpls((prev) => [...prev, ...allBatchItems])
        }

        const lastNonEmptyBatch = batchItems.findLastIndex((b) => b.length > 0)
        const anyShortPage = batchItems.some((b) => b.length < limit)
        if (anyShortPage || lastNonEmptyBatch < 0) break

        currentPage += batchSize
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
      setIsLoading(false)
    } finally {
      setIsFetchingMore(false)
    }
  }, [])

  const handleOpenDetail = (spl: Spl) => {
    setSelectedSpl(spl)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSpl(null)
  }

  useEffect(() => { fetchSpls() }, [fetchSpls])

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const filteredSpls = useMemo(() => {
    let filtered = spls

    if (filterStatus !== "ALL") {
      if (filterStatus === "PENDING") {
        filtered = filtered.filter((spl) =>
          ["PENDING", "PENDING_SUPERADMIN", "PENDING_SUPERVISOR", "PENDING_MANAGER", "IN_PROGRESS", "DONE"].includes(spl.status)
        )
      } else if (filterStatus === "REJECTED") {
        filtered = filtered.filter((spl) =>
          ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"].includes(spl.status)
        )
      } else {
        filtered = filtered.filter((spl) => spl.status === filterStatus)
      }
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (spl) =>
          spl.requester.name.toLowerCase().includes(query) ||
          (spl.requester.pin && spl.requester.pin.toLowerCase().includes(query))
      )
    }

    const now = new Date()
    switch (dateFilter) {
      case "THIS_WEEK": {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        filtered = filtered.filter((spl) => isWithinInterval(new Date(spl.date), { start: weekStart, end: weekEnd }))
        break
      }
      case "THIS_MONTH": {
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        filtered = filtered.filter((spl) => isWithinInterval(new Date(spl.date), { start: monthStart, end: monthEnd }))
        break
      }
      case "LAST_MONTH": {
        const lastMonth = subMonths(now, 1)
        filtered = filtered.filter((spl) =>
          isWithinInterval(new Date(spl.date), { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) })
        )
        break
      }
      case "LAST_3_MONTHS": {
        filtered = filtered.filter((spl) => new Date(spl.date) >= subMonths(now, 3))
        break
      }
      case "CUSTOM": {
        if (customStartDate && customEndDate) {
          filtered = filtered.filter((spl) =>
            isWithinInterval(new Date(spl.date), { start: new Date(customStartDate), end: new Date(customEndDate) })
          )
        }
        break
      }
    }

    return filtered
  }, [spls, filterStatus, dateFilter, customStartDate, customEndDate, searchQuery])

  useEffect(() => { setCurrentPage(1) }, [filterStatus, dateFilter, customStartDate, customEndDate, searchQuery])

  const totalPages = Math.ceil(filteredSpls.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSpls.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "Menunggu", PENDING_SUPERADMIN: "Review Super Admin",
      PENDING_SUPERVISOR: "Menunggu Supervisor", PENDING_MANAGER: "Menunggu Manager",
      APPROVED: "Disetujui", IN_PROGRESS: "Berjalan", DONE: "Selesai",
      REJECTED: "Ditolak", REJECTED_BY_SUPERVISOR: "Ditolak Supervisor",
      REJECTED_BY_MANAGER: "Ditolak Manager",
    }
    return statusMap[status] || status
  }

  const getStats = () => {
    const pendingStatuses = new Set(["PENDING", "PENDING_SUPERADMIN", "PENDING_SUPERVISOR", "PENDING_MANAGER", "IN_PROGRESS", "DONE"])
    const rejectedStatuses = new Set(["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"])
    const sumHours = (items: Spl[]) =>
      items.reduce((sum, spl) => {
        const effectiveHours = getEffectiveHours(spl)
        if (effectiveHours !== null) return sum + effectiveHours
        const fallback = Number(spl.totalHours)
        return sum + (Number.isFinite(fallback) ? fallback : 0)
      }, 0)

    const pendingItems = filteredSpls.filter((spl) => pendingStatuses.has(spl.status))
    const approvedItems = filteredSpls.filter((spl) => spl.status === "APPROVED")
    const rejectedItems = filteredSpls.filter((spl) => rejectedStatuses.has(spl.status))
    return {
      total: filteredSpls.length,
      pending: pendingItems.length,
      approved: approvedItems.length,
      rejected: rejectedItems.length,
      approvedHours: sumHours(approvedItems).toFixed(1),
      pendingHours: sumHours(pendingItems).toFixed(1),
    }
  }

  const getSupervisorApprovalLabels = (spl: Spl) => {
    if (spl.supervisor?.role === "GA") return { ga: spl.supervisor.name, deptHead: "-" }
    if (spl.supervisor?.role === "DEPARTMENT_HEAD") return { ga: "-", deptHead: spl.supervisor.name }
    return { ga: "Langsung Manager", deptHead: "Langsung Manager" }
  }

  const isExportEligible = (spl: Spl) => spl.status === "APPROVED"

  const exportHeaders = [
    "No", "Nama Karyawan", "PIN", "Departemen", "Tanggal Lembur",
    "Waktu Mulai", "Waktu Selesai", "Absensi Masuk", "Absensi Pulang",
    "Total Jam", "Alasan Lembur", "Status", "Disetujui Oleh GA",
    "Disetujui Oleh", "Tanggal Persetujuan", "Alasan Penolakan",
    "Tanggal Pengajuan", "Tanda Tangan",
  ]

  const exportColWidths = [
    { wch: 5 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 40 }, { wch: 12 }, { wch: 20 },
    { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 12 },
  ]

  const roundHoursFromMinutes = (minutes: number | null): number | string | null => {
    if (minutes === null || !Number.isFinite(minutes)) return null
    if (minutes < 30) return 0
    if (minutes === 30) return "30 menit"
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return remainder > 30 ? hours + 1 : hours
  }

  const formatTotalHours = (spl: Spl): number | string => {
    const effectiveMinutes = getEffectiveMinutes(spl)
    const roundedFromEffective = roundHoursFromMinutes(effectiveMinutes)
    if (roundedFromEffective !== null) return roundedFromEffective
    const fallback = Number(spl.totalHours)
    if (!Number.isFinite(fallback)) return "-"
    const roundedFromStored = roundHoursFromMinutes(Math.round(fallback * 60))
    return roundedFromStored ?? "-"
  }

  const formatScanTime = (value: string) => {
    const trimmed = (value || "").trim()
    if (!trimmed) return "-"
    const parts = trimmed.split(" ")
    if (parts[1] && /^\d{2}:\d{2}/.test(parts[1])) return parts[1].slice(0, 5)
    const parsed = new Date(trimmed.replace(" ", "T"))
    if (Number.isNaN(parsed.getTime())) return trimmed
    return format(parsed, "HH:mm")
  }

  const getAttendanceTimes = (records: AttendanceRecord[], dateKey: string) => {
    if (!dateKey || records.length === 0) return { checkIn: "-", checkOut: "-" }
    const dayRecords = records.filter((r) => r.scan_date.split(" ")[0] === dateKey)
    if (dayRecords.length === 0) return { checkIn: "-", checkOut: "-" }
    dayRecords.sort((a, b) => a.scan_date.localeCompare(b.scan_date))
    return {
      checkIn: formatScanTime(dayRecords[0].scan_date),
      checkOut: formatScanTime(dayRecords[dayRecords.length - 1].scan_date),
    }
  }

  const sortSplsForExport = (items: Spl[]) =>
    [...items].sort((a, b) => {
      const nameCompare = a.requester.name.localeCompare(b.requester.name, "id-ID", { sensitivity: "base" })
      if (nameCompare !== 0) return nameCompare
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return (a.requester.pin || "").localeCompare(b.requester.pin || "")
    })

  const buildExportContext = async (exportableSpls: Spl[]): Promise<ExportContext> => {
    const needsPinLookup = exportableSpls.some((spl) => !(spl.requester.pin || "").toString().trim())
    const nameToPin = new Map<string, string>()

    if (needsPinLookup) {
      try {
        const response = await fetch("/api/hr/users")
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            data.forEach((user) => {
              const name = (user?.name || "").toString().toLowerCase().trim()
              const pin = (user?.pin || "").toString().trim()
              if (name && pin && !nameToPin.has(name)) nameToPin.set(name, pin)
            })
          }
        }
      } catch (error) {
        console.error("Error fetching user pins for attendance:", error)
      }
    }

    const resolvePin = (spl: Spl) => {
      const directPin = (spl.requester.pin || "").toString().trim()
      if (directPin) return directPin
      return nameToPin.get(spl.requester.name.toLowerCase().trim()) || ""
    }

    const uniquePins = Array.from(new Set(exportableSpls.map(resolvePin).filter(Boolean)))
    const attendanceByPin = new Map<string, AttendanceRecord[]>()

    if (uniquePins.length > 0) {
      await Promise.all(
        uniquePins.map(async (pin) => {
          try {
            const response = await fetch(`/api/hr/attendance?pin=${encodeURIComponent(pin)}`)
            if (!response.ok) { attendanceByPin.set(pin, []); return }
            const data = await response.json()
            attendanceByPin.set(pin, Array.isArray(data?.data) ? data.data : [])
          } catch (error) {
            console.error("Error fetching attendance for pin:", pin, error)
            attendanceByPin.set(pin, [])
          }
        })
      )
    }

    return { resolvePin, attendanceByPin }
  }

  const buildRowsFromSpls = (items: Spl[], context: ExportContext): ExportRow[] =>
    items.map((spl, index) => {
      const { resolvePin, attendanceByPin } = context
      const supervisorLabels = getSupervisorApprovalLabels(spl)
      const resolvedPin = resolvePin(spl)
      const dateValue = new Date(spl.date)
      const dateKey = Number.isNaN(dateValue.getTime()) ? "" : format(dateValue, "yyyy-MM-dd")
      const attendanceRecords = resolvedPin ? attendanceByPin.get(resolvedPin) || [] : []
      const attendanceTimes = getAttendanceTimes(attendanceRecords, dateKey)

      return {
        No: index + 1,
        "Nama Karyawan": spl.requester.name,
        PIN: resolvedPin || "-",
        Departemen: spl.requester.department?.name || spl.requester.departmentName || "-",
        "Tanggal Lembur": Number.isNaN(dateValue.getTime()) ? "-" : format(dateValue, "dd/MM/yyyy"),
        "Waktu Mulai": spl.actualStartAt ? format(new Date(spl.actualStartAt), "HH:mm") : spl.startTime,
        "Waktu Selesai": spl.actualEndAt ? format(new Date(spl.actualEndAt), "HH:mm") : spl.endTime,
        "Absensi Masuk": attendanceTimes.checkIn,
        "Absensi Pulang": attendanceTimes.checkOut,
        "Total Jam": formatTotalHours(spl),
        "Alasan Lembur": spl.reason,
        Status: getStatusText(spl.status),
        "Disetujui Oleh GA": supervisorLabels.ga,
        "Disetujui Oleh": spl.approver?.name || "-",
        "Tanggal Persetujuan": spl.approvalDate ? format(new Date(spl.approvalDate), "dd/MM/yyyy HH:mm") : "-",
        "Alasan Penolakan": spl.rejectionReason || "-",
        "Tanggal Pengajuan": format(new Date(spl.createdAt), "dd/MM/yyyy HH:mm"),
        "Tanda Tangan": spl.signature ? "Ada" : "Tidak",
      }
    })

  const buildExportRows = async (sourceSpls: Spl[] = filteredSpls): Promise<ExportRow[]> => {
    const exportableSpls = sortSplsForExport(sourceSpls).filter(isExportEligible)
    if (exportableSpls.length === 0) return []
    return buildRowsFromSpls(exportableSpls, await buildExportContext(exportableSpls))
  }

  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx")
      const exportableSpls = sortSplsForExport(filteredSpls).filter(isExportEligible)
      if (exportableSpls.length === 0) { toast.error("Tidak ada data untuk diexport"); return }

      const exportData = buildRowsFromSpls(exportableSpls, await buildExportContext(exportableSpls))
      const ws = XLSX.utils.json_to_sheet(exportData, { header: exportHeaders })
      ws["!cols"] = exportColWidths
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Data SPL")

      const periodText = dateFilter === "ALL" ? "Semua_Periode"
        : dateFilter === "THIS_WEEK" ? "Minggu_Ini"
          : dateFilter === "THIS_MONTH" ? "Bulan_Ini"
            : dateFilter === "LAST_MONTH" ? "Bulan_Lalu"
              : dateFilter === "LAST_3_MONTHS" ? "3_Bulan_Terakhir"
                : `${customStartDate}_sampai_${customEndDate}`

      XLSX.writeFile(wb, `Data_SPL_${filterStatus}_${periodText}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`)
      toast.success("Data berhasil diexport ke Excel!")
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.error("Gagal export data")
    }
  }

  const copyTableData = async () => {
    try {
      const exportData = await buildExportRows()
      if (exportData.length === 0) { toast.error("Tidak ada data untuk disalin"); return }
      const csvContent = [exportHeaders, ...exportData.map((row) => exportHeaders.map((h) => String(row[h] ?? "")))]
        .map((row) => row.map((cell) => `"${cell}"`).join("\t"))
        .join("\n")
      await navigator.clipboard.writeText(csvContent)
      toast.success("Data berhasil disalin ke clipboard!")
    } catch (error) {
      console.error("Error copying data:", error)
      toast.error("Gagal menyalin data")
    }
  }

  const dataUrlToBytes = (dataUrl: string) => {
    const base64 = dataUrl.split(",")[1]
    if (!base64) return null
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  const wrapText = (text: string, maxChars: number) => {
    const words = text.split(" ")
    const lines: string[] = []
    let current = ""
    words.forEach((w) => {
      if ((current + " " + w).trim().length > maxChars) {
        if (current) lines.push(current.trim())
        current = w
      } else {
        current += " " + w
      }
    })
    if (current.trim()) lines.push(current.trim())
    return lines
  }

  const fitTextToWidth = (text: string, maxWidth: number, font: any, size: number) => {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (!normalized) return "-"
    if (font.widthOfTextAtSize(normalized, size) <= maxWidth) return normalized
    const ellipsis = "..."
    const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size)
    let trimmed = normalized
    while (trimmed.length > 0 && font.widthOfTextAtSize(trimmed, size) + ellipsisWidth > maxWidth) {
      trimmed = trimmed.slice(0, -1)
    }
    return trimmed.length > 0 ? `${trimmed}${ellipsis}` : ellipsis
  }

  const wrapTextByWidth = (text: string, maxWidth: number, font: any, size: number, maxLines = 2) => {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (!normalized) return ["-"]
    const words = normalized.split(" ")
    const lines: string[] = []
    let current = ""
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        current = word
      }
      if (lines.length === maxLines) break
    }
    if (lines.length < maxLines && current) lines.push(current)
    if (lines.length > maxLines) lines.length = maxLines
    if (lines.length === maxLines) {
      lines[maxLines - 1] = fitTextToWidth(lines[maxLines - 1], maxWidth, font, size)
    }
    return lines
  }

  const generateRekapPdf = async () => {
    if (filteredSpls.length === 0) { toast.error("Tidak ada data untuk direkap"); return }

    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      const pageWidth = 595.28
      const pageHeight = 841.89
      const margin = 30
      const colWidths = [25, 90, 40, 60, 45, 45, 100, 65, 65]
      const headers = ["No", "Nama", "PIN", "Tanggal", "Mulai", "Selesai", "Keterangan", "TTD Pemohon", "TTD Atasan"]
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0)
      const rowsPerPage = 8
      const rowHeight = 60

      const splsPerPage: Spl[][] = []
      for (let i = 0; i < filteredSpls.length; i += rowsPerPage) {
        splsPerPage.push(filteredSpls.slice(i, i + rowsPerPage))
      }

      let logoImage: any = null
      try {
        const logoResponse = await fetch("/logo.png")
        if (logoResponse.ok) {
          logoImage = await pdfDoc.embedPng(await logoResponse.arrayBuffer())
        }
      } catch { logoImage = null }

      for (let pageIndex = 0; pageIndex < splsPerPage.length; pageIndex++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        const pageSPLs = splsPerPage[pageIndex]
        let y = pageHeight - margin

        const logoSize = 40
        if (logoImage) {
          const scale = Math.min(logoSize / logoImage.width, logoSize / logoImage.height)
          const dims = logoImage.scale(scale)
          page.drawImage(logoImage, {
            x: margin + (logoSize - dims.width) / 2,
            y: y - logoSize + (logoSize - dims.height) / 2,
            width: dims.width, height: dims.height,
          })
        } else {
          page.drawRectangle({ x: margin, y: y - logoSize, width: logoSize, height: logoSize, color: rgb(0.1, 0.6, 0.3), opacity: 0.2 })
          page.drawCircle({ x: margin + 15, y: y - 20, size: 10, color: rgb(0.1, 0.6, 0.3) })
          page.drawCircle({ x: margin + 25, y: y - 20, size: 10, color: rgb(0.1, 0.6, 0.3) })
        }

        page.drawText("REKAP ABSEN MANUAL STAFF PT TUNAS ESTA INDONESIA", {
          x: margin + logoSize + 15, y: y - 25, size: 14, font: bold,
        })
        y -= 60

        const tableX = margin
        let currentX = tableX
        page.drawRectangle({ x: tableX, y: y - 25, width: tableWidth, height: 25, color: rgb(0.9, 0.9, 0.9) })

        for (let i = 0; i < headers.length; i++) {
          const textWidth = bold.widthOfTextAtSize(headers[i], 9)
          page.drawText(headers[i], { x: currentX + (colWidths[i] - textWidth) / 2, y: y - 17, size: 9, font: bold })
          page.drawLine({ start: { x: currentX, y }, end: { x: currentX, y: y - 25 }, thickness: 0.5, color: rgb(0, 0, 0) })
          currentX += colWidths[i]
        }
        page.drawLine({ start: { x: currentX, y }, end: { x: currentX, y: y - 25 }, thickness: 0.5, color: rgb(0, 0, 0) })
        page.drawLine({ start: { x: tableX, y }, end: { x: currentX, y }, thickness: 0.5 })
        page.drawLine({ start: { x: tableX, y: y - 25 }, end: { x: currentX, y: y - 25 }, thickness: 0.5 })
        y -= 25

        for (let index = 0; index < rowsPerPage; index++) {
          const spl = pageSPLs[index]
          const rowY = y - (index + 1) * rowHeight
          currentX = tableX

          page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })

          if (spl) {
            const rowData = [
              `${pageIndex * rowsPerPage + index + 1}`,
              spl.requester.name,
              spl.requester.pin || "-",
              format(new Date(spl.date), "dd/MM/yyyy"),
              spl.startTime,
              spl.endTime,
            ]

            for (let i = 0; i < 6; i++) {
              const isCenter = i !== 1
              const displayText = fitTextToWidth(rowData[i], colWidths[i] - 10, font, 9)
              const textWidth = font.widthOfTextAtSize(displayText, 9)
              const textX = isCenter ? currentX + (colWidths[i] - textWidth) / 2 : currentX + 5
              page.drawText(displayText, { x: textX, y: rowY + rowHeight / 2 - 4, size: 9, font })
              currentX += colWidths[i]
              page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
            }

            const ketLines = wrapText(spl.reason || "-", 25)
            let ketY = rowY + rowHeight - 15
            ketLines.slice(0, 4).forEach((line) => {
              page.drawText(line, { x: currentX + 5, y: ketY, size: 8, font })
              ketY -= 10
            })
            currentX += colWidths[6]
            page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })

            const signatureCells = [
              { name: spl.requester.name, signature: spl.signature || null },
              {
                name: spl.supervisor?.role === "GA" || spl.supervisor?.role === "DEPARTMENT_HEAD"
                  ? spl.supervisor?.name || "-" : "-",
                signature: spl.supervisor?.role === "GA" || spl.supervisor?.role === "DEPARTMENT_HEAD"
                  ? spl.supervisorSignature || null : null,
              },
            ]

            const drawSignatureImage = async (dataUrl: string, boxX: number, boxY: number, boxWidth: number, boxHeight: number) => {
              try {
                const signatureBytes = dataUrlToBytes(dataUrl)
                if (!signatureBytes) return false
                const signatureImage = dataUrl.includes("image/png")
                  ? await pdfDoc.embedPng(signatureBytes)
                  : await pdfDoc.embedJpg(signatureBytes)
                const scale = Math.min(boxWidth / signatureImage.width, boxHeight / signatureImage.height)
                const dims = signatureImage.scale(scale)
                page.drawImage(signatureImage, {
                  x: boxX + (boxWidth - dims.width) / 2,
                  y: boxY + (boxHeight - dims.height) / 2,
                  width: dims.width, height: dims.height,
                })
                return true
              } catch { return false }
            }

            for (let sigIndex = 0; sigIndex < signatureCells.length; sigIndex++) {
              const cellWidth = colWidths[7 + sigIndex]
              const cell = signatureCells[sigIndex]
              const nameSize = 7
              const namePadding = 4
              const nameLines = wrapTextByWidth(cell.name || "-", cellWidth - namePadding * 2, bold, nameSize, 2)
              const nameLineHeight = 8
              const nameBlockHeight = nameLines.length * nameLineHeight

              nameLines.forEach((line, lineIndex) => {
                const lineWidth = bold.widthOfTextAtSize(line, nameSize)
                page.drawText(line, {
                  x: currentX + Math.max(2, (cellWidth - lineWidth) / 2),
                  y: rowY + namePadding + (nameLines.length - 1 - lineIndex) * nameLineHeight,
                  size: nameSize, font: bold,
                })
              })

              const gap = 2
              const signatureBoxX = currentX + namePadding
              const signatureBoxY = rowY + nameBlockHeight + namePadding + gap
              const signatureBoxWidth = cellWidth - namePadding * 2
              const signatureBoxHeight = rowHeight - nameBlockHeight - namePadding * 2 - gap

              if (cell.signature) {
                await drawSignatureImage(cell.signature, signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
              } else {
                page.drawText("-", {
                  x: signatureBoxX + signatureBoxWidth / 2 - 2,
                  y: signatureBoxY + signatureBoxHeight / 2 - 4,
                  size: 8, font,
                })
              }

              currentX += cellWidth
              page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
            }
          } else {
            for (let i = 0; i < colWidths.length; i++) {
              currentX += colWidths[i]
              page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
            }
          }
          page.drawLine({ start: { x: tableX, y: rowY }, end: { x: tableX + tableWidth, y: rowY }, thickness: 0.5 })
        }

        const footerY = 80
        const boxWidth = 140
        const totalFooterWidth = pageWidth - margin * 2
        const gap = (totalFooterWidth - boxWidth * 3) / 2

        const signatures = [
          { role: "Diajukan Oleh", name: "..........................", title: "Pemohon / Leader" },
          { role: "Disetujui Oleh", name: "Zhalilla Viola R.S.", title: "HR & GA Supervisor" },
          { role: "Mengetahui", name: "Tiyas Indah S.", title: "Plant Manager" },
        ]

        const dateText = `Demak, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`
        const dateXPos = margin + 2 * (boxWidth + gap)
        page.drawText(dateText, {
          x: dateXPos + (boxWidth - font.widthOfTextAtSize(dateText, 10)) / 2,
          y: footerY + 85, size: 10, font,
        })

        signatures.forEach((sig, idx) => {
          const xPos = margin + idx * (boxWidth + gap)
          const drawCentered = (text: string, y: number, f: any, s: number) => {
            page.drawText(text, { x: xPos + (boxWidth - f.widthOfTextAtSize(text, s)) / 2, y, size: s, font: f })
          }
          drawCentered(sig.role + " :", footerY + 60, bold, 9)
          page.drawLine({ start: { x: xPos, y: footerY + 25 }, end: { x: xPos + boxWidth, y: footerY + 25 }, thickness: 0.5 })
          drawCentered(sig.name, footerY + 12, bold, 9)
          drawCentered(sig.title, footerY, font, 9)
        })
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Rekap_Lembur_Manual_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Rekap PDF berhasil dibuat")
    } catch (error) {
      console.error("Gagal membuat rekap PDF:", error)
      toast.error("Gagal membuat rekap PDF")
    }
  }

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "THIS_WEEK": return "Minggu Ini"
      case "THIS_MONTH": return "Bulan Ini"
      case "LAST_MONTH": return "Bulan Lalu"
      case "LAST_3_MONTHS": return "3 Bulan Terakhir"
      case "CUSTOM": return `${customStartDate} – ${customEndDate}`
      default: return "Semua Periode"
    }
  }

  const stats = useMemo(getStats, [filteredSpls])

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
        <p className="text-sm text-gray-500">Memuat data SPL...</p>
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Fetching more: thin progress bar */}
      {isFetchingMore && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-green-100">
          <div className="h-full w-3/5 animate-pulse rounded-full bg-green-500" />
        </div>
      )}

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-green-600 via-green-700 to-green-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-green-200">
              Human Resources
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Data & Laporan SPL</h1>
            <p className="mt-1.5 text-sm text-green-100">
              {getDateFilterLabel()}
              {" · "}
              {filterStatus === "ALL" ? "Semua Status" : filterStatus}
              {isFetchingMore && " · Memuat data tambahan…"}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
            <p className="font-semibold tabular-nums">{stats.total} SPL</p>
            <p className="mt-0.5 text-xs text-green-100">{stats.approvedHours} jam ACC Manager</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatPill value={stats.total} label="Total SPL" tone="blue" />
        <StatPill value={stats.pending} label="Menunggu" tone="amber" />
        <StatPill value={stats.approved} label="Disetujui" tone="emerald" />
        <StatPill value={stats.rejected} label="Ditolak" tone="rose" />
        <StatPill value={stats.approvedHours} label="Jam ACC Manager" tone="violet" />
        <StatPill value={stats.pendingHours} label="Jam Pending" tone="orange" />
      </div>

      {/* Filter + Export Panel */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="space-y-4">

          {/* Search */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama karyawan atau PIN…"
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearchQuery("") }}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status + Period filters side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "ALL", label: "Semua" },
                  { value: "PENDING", label: "Menunggu" },
                  { value: "APPROVED", label: "Disetujui" },
                  { value: "REJECTED", label: "Ditolak" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFilterStatus(s.value)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors
                      ${filterStatus === s.value
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Periode</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "ALL", label: "Semua" },
                  { value: "THIS_WEEK", label: "Minggu" },
                  { value: "THIS_MONTH", label: "Bulan Ini" },
                  { value: "LAST_MONTH", label: "Bulan Lalu" },
                  { value: "LAST_3_MONTHS", label: "3 Bulan" },
                  { value: "CUSTOM", label: "Custom" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDateFilter(p.value)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors
                      ${dateFilter === p.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom date range */}
          {dateFilter === "CUSTOM" && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <Input
                label="Tanggal Mulai"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <Input
                label="Tanggal Selesai"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}

          {/* Summary + Export */}
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{filteredSpls.length}</span>
              {" dari "}
              {spls.length} SPL
              {Number(stats.approvedHours) > 0 && (
                <> · <span className="font-semibold text-green-600">{stats.approvedHours} jam</span> ACC</>
              )}
              {Number(stats.pendingHours) > 0 && (
                <> · <span className="font-semibold text-amber-600">{stats.pendingHours} jam</span> pending</>
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyTableData}
                disabled={filteredSpls.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                disabled={filteredSpls.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                type="button"
                onClick={generateRekapPdf}
                disabled={filteredSpls.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Rekap PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {filteredSpls.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-3.5 shadow-sm sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="tabular-nums">
              {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredSpls.length)} dari {filteredSpls.length}
            </span>
            <span className="text-gray-200">|</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {[10, 15, 20, 30, 50].map((n) => (
                <option key={n} value={n}>{n} / hal</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ←
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNumber: number
              if (totalPages <= 5) pageNumber = i + 1
              else if (currentPage <= 3) pageNumber = i + 1
              else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i
              else pageNumber = currentPage - 2 + i
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => handlePageChange(pageNumber)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors
                    ${currentPage === pageNumber
                      ? "bg-green-600 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {pageNumber}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* SPL Cards / Empty State */}
      {filteredSpls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">Tidak Ada Data</h3>
          <p className="mt-1 text-sm text-gray-500">Tidak ada SPL dengan filter yang dipilih</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {currentItems.map((spl) => (
            <SplCard
              key={spl.id}
              spl={spl}
              userRole="HR"
              showActions={false}
              mini={true}
              showExpiredBadge
              onClick={() => handleOpenDetail(spl)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <SplDetailModal spl={selectedSpl} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  )
}