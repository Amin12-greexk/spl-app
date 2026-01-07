"use client"

import { useEffect, useState } from "react"
import { Spl } from "@/types"
import SplCard from "@/components/spl/SplCard"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import toast from "react-hot-toast"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isWithinInterval } from "date-fns"
import { id } from "date-fns/locale" // Import locale Indonesia
import * as XLSX from 'xlsx'
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export default function HRViewPage() {
  const [spls, setSpls] = useState<Spl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [filteredSpls, setFilteredSpls] = useState<Spl[]>([])
  const [dateFilter, setDateFilter] = useState<string>("ALL")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const fetchSpls = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/spl")
      if (!response.ok) {
        throw new Error("Gagal mengambil data SPL")
      }

      const data = await response.json()
      setSpls(data)
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSpls()
  }, [])

  // Filter data berdasarkan status, tanggal, dan search
  useEffect(() => {
    let filtered = spls

    // Filter by status
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(spl => spl.status === filterStatus)
    }

    // Filter by search query (nama atau PIN)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(spl =>
        spl.requester.name.toLowerCase().includes(query) ||
        (spl.requester.pin && spl.requester.pin.toLowerCase().includes(query))
      )
    }

    // Filter by date
    const now = new Date()

    switch (dateFilter) {
      case "THIS_WEEK":
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        filtered = filtered.filter(spl =>
          isWithinInterval(new Date(spl.date), { start: weekStart, end: weekEnd })
        )
        break

      case "THIS_MONTH":
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        filtered = filtered.filter(spl =>
          isWithinInterval(new Date(spl.date), { start: monthStart, end: monthEnd })
        )
        break

      case "LAST_MONTH":
        const lastMonth = subMonths(now, 1)
        const lastMonthStart = startOfMonth(lastMonth)
        const lastMonthEnd = endOfMonth(lastMonth)
        filtered = filtered.filter(spl =>
          isWithinInterval(new Date(spl.date), { start: lastMonthStart, end: lastMonthEnd })
        )
        break

      case "LAST_3_MONTHS":
        const threeMonthsAgo = subMonths(now, 3)
        filtered = filtered.filter(spl =>
          new Date(spl.date) >= threeMonthsAgo
        )
        break

      case "CUSTOM":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate)
          const end = new Date(customEndDate)
          filtered = filtered.filter(spl =>
            isWithinInterval(new Date(spl.date), { start, end })
          )
        }
        break

      default: // "ALL"
        break
    }

    setFilteredSpls(filtered)
    // Reset ke halaman 1 ketika filter berubah
    setCurrentPage(1)
  }, [filterStatus, dateFilter, customStartDate, customEndDate, spls, searchQuery])

  // Pagination logic
  const totalPages = Math.ceil(filteredSpls.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSpls.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': 'Menunggu',
      'PENDING_SUPERVISOR': 'Menunggu Supervisor',
      'PENDING_MANAGER': 'Menunggu Manager',
      'APPROVED': 'Disetujui',
      'REJECTED': 'Ditolak',
      'REJECTED_BY_SUPERVISOR': 'Ditolak Supervisor',
      'REJECTED_BY_MANAGER': 'Ditolak Manager',
    }
    return statusMap[status] || status
  }

  const getStats = () => {
    return {
      total: filteredSpls.length,
      pending: filteredSpls.filter(spl =>
        spl.status === "PENDING" ||
        spl.status === "PENDING_SUPERVISOR" ||
        spl.status === "PENDING_MANAGER"
      ).length,
      approved: filteredSpls.filter(spl => spl.status === "APPROVED").length,
      rejected: filteredSpls.filter(spl =>
        spl.status === "REJECTED" ||
        spl.status === "REJECTED_BY_SUPERVISOR" ||
        spl.status === "REJECTED_BY_MANAGER"
      ).length,
      totalHours: filteredSpls.reduce((sum, spl) => sum + Number(spl.totalHours), 0).toFixed(1)
    }
  }

  const exportToExcel = () => {
    try {
      const exportData = filteredSpls.map((spl, index) => ({
        No: index + 1,
        'Nama Karyawan': spl.requester.name,
        'PIN': spl.requester.pin || '-',
        'Email': spl.requester.email,
        'Departemen': spl.requester.department?.name || spl.requester.departmentName || '-',
        'Tanggal Lembur': format(new Date(spl.date), "dd/MM/yyyy"),
        'Waktu Mulai': spl.startTime,
        'Waktu Selesai': spl.endTime,
        'Total Jam': spl.totalHours,
        'Nama Proyek': spl.projectName || '-',
        'Alasan Lembur': spl.reason,
        'Status': getStatusText(spl.status),
        'Disetujui Oleh GA': spl.supervisor?.role === "GA" ? spl.supervisor.name : '-',
        'Disetujui Oleh Kepala Dept': spl.supervisor?.role === "DEPARTMENT_HEAD" ? spl.supervisor.name : '-',
        'Disetujui Oleh': spl.approver?.name || '-',
        'Tanggal Persetujuan': spl.approvalDate ? format(new Date(spl.approvalDate), "dd/MM/yyyy HH:mm") : '-',
        'Alasan Penolakan': spl.rejectionReason || '-',
        'Tanggal Pengajuan': format(new Date(spl.createdAt), "dd/MM/yyyy HH:mm"),
        'Tanda Tangan': spl.signature ? 'Ada' : 'Tidak'
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()

      const colWidths = [
        { wch: 5 },   { wch: 20 },  { wch: 10 },  { wch: 25 },  { wch: 15 },
        { wch: 12 },  { wch: 10 },  { wch: 10 },  { wch: 8 },   { wch: 20 },
        { wch: 40 },  { wch: 12 },  { wch: 20 },  { wch: 20 },  { wch: 20 },
        { wch: 18 },  { wch: 30 },  { wch: 18 },  { wch: 12 }
      ]
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, "Data SPL")
      
      const periodText = dateFilter === "ALL" ? "Semua_Periode" :
                         dateFilter === "THIS_WEEK" ? "Minggu_Ini" :
                         dateFilter === "THIS_MONTH" ? "Bulan_Ini" :
                         dateFilter === "LAST_MONTH" ? "Bulan_Lalu" :
                         dateFilter === "LAST_3_MONTHS" ? "3_Bulan_Terakhir" :
                         `${customStartDate}_sampai_${customEndDate}`
      
      const fileName = `Data_SPL_${filterStatus}_${periodText}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast.success("Data berhasil diexport ke Excel!")
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.error("Gagal export data")
    }
  }

  const copyTableData = () => {
    try {
      const tableData = filteredSpls.map((spl, index) => [
        index + 1,
        spl.requester.name,
        spl.requester.pin || '-',
        spl.requester.email,
        spl.requester.department?.name || spl.requester.departmentName || '-',
        format(new Date(spl.date), "dd/MM/yyyy"),
        spl.startTime,
        spl.endTime,
        spl.totalHours,
        spl.projectName || '-',
        spl.reason,
        getStatusText(spl.status),
        spl.supervisor?.role === "GA" ? spl.supervisor.name : '-',
        spl.supervisor?.role === "DEPARTMENT_HEAD" ? spl.supervisor.name : '-',
        spl.approver?.name || '-',
        spl.approvalDate ? format(new Date(spl.approvalDate), "dd/MM/yyyy HH:mm") : '-',
        spl.rejectionReason || '-',
        format(new Date(spl.createdAt), "dd/MM/yyyy HH:mm"),
        spl.signature ? 'Ada' : 'Tidak'
      ])

      const headers = [
        'No', 'Nama Karyawan', 'PIN', 'Email', 'Departemen', 'Tanggal Lembur',
        'Waktu Mulai', 'Waktu Selesai', 'Total Jam', 'Nama Proyek', 'Alasan Lembur',
        'Status', 'Disetujui Oleh GA', 'Disetujui Oleh Kepala Dept', 'Disetujui Oleh', 'Tanggal Persetujuan', 'Alasan Penolakan', 'Tanggal Pengajuan', 'Tanda Tangan'
      ]

      const csvContent = [headers, ...tableData]
        .map(row => row.map(cell => `"${cell}"`).join('\t'))
        .join('\n')

      navigator.clipboard.writeText(csvContent)
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
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
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

  // --- REVISED PDF GENERATION (FIXED OVERLAP & ALIGNMENT) ---
  const generateRekapPdf = async () => {
    if (filteredSpls.length === 0) {
      toast.error("Tidak ada data untuk direkap")
      return
    }

    try {
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      const pageWidth = 595.28 // A4 width
      const pageHeight = 841.89 // A4 height
      const margin = 30
      
      const colWidths = [25, 100, 40, 60, 45, 45, 120, 100]
      const headers = ["No", "Nama", "PIN", "Tanggal", "Mulai", "Selesai", "Keterangan", "Tanda Tangan"]
      
      // FIXED: Reduced rowsPerPage from 10 to 8 to prevent overlap with footer
      const rowsPerPage = 8 
      const rowHeight = 60

      const splsPerPage: Spl[][] = []
      for (let i = 0; i < filteredSpls.length; i += rowsPerPage) {
        splsPerPage.push(filteredSpls.slice(i, i + rowsPerPage))
      }

      for (let pageIndex = 0; pageIndex < splsPerPage.length; pageIndex++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        const pageSPLs = splsPerPage[pageIndex]
        let y = pageHeight - margin

        // --- HEADER ---
        const logoSize = 40
        page.drawRectangle({
            x: margin, y: y - logoSize, width: logoSize, height: logoSize,
            color: rgb(0.1, 0.6, 0.3), opacity: 0.2
        })
        page.drawCircle({ x: margin + 15, y: y - 20, size: 10, color: rgb(0.1, 0.6, 0.3) })
        page.drawCircle({ x: margin + 25, y: y - 20, size: 10, color: rgb(0.1, 0.6, 0.3) })

        page.drawText("REKAP ABSEN MANUAL STAFF PT TUNAS ESTA INDONESIA", {
          x: margin + logoSize + 15,
          y: y - 25,
          size: 14,
          font: bold
        })
        y -= 60

        // --- TABEL HEADER ---
        const tableX = margin
        let currentX = tableX

        page.drawRectangle({
          x: tableX, y: y - 25,
          width: pageWidth - (margin * 2), height: 25,
          color: rgb(0.9, 0.9, 0.9)
        })

        for (let i = 0; i < headers.length; i++) {
            const textWidth = bold.widthOfTextAtSize(headers[i], 9)
            const centerX = currentX + (colWidths[i] - textWidth) / 2
            
            page.drawText(headers[i], {
                x: centerX, y: y - 17,
                size: 9, font: bold
            })

            page.drawLine({
                start: { x: currentX, y: y }, end: { x: currentX, y: y - 25 },
                thickness: 0.5, color: rgb(0, 0, 0)
            })
            currentX += colWidths[i]
        }
        
        page.drawLine({ start: { x: currentX, y: y }, end: { x: currentX, y: y - 25 }, thickness: 0.5, color: rgb(0, 0, 0) })
        page.drawLine({ start: { x: tableX, y: y }, end: { x: currentX, y: y }, thickness: 0.5 })
        page.drawLine({ start: { x: tableX, y: y - 25 }, end: { x: currentX, y: y - 25 }, thickness: 0.5 })
        y -= 25

        // --- TABEL ROWS ---
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

                for(let i=0; i<6; i++) {
                    const isCenter = i !== 1
                    const text = rowData[i]
                    const textSize = 9
                    const textWidth = font.widthOfTextAtSize(text, textSize)
                    let textX = currentX + 5
                    if (isCenter) textX = currentX + (colWidths[i] - textWidth) / 2

                    page.drawText(text, {
                        x: textX, y: rowY + (rowHeight / 2) - 4,
                        size: textSize, font: font, maxWidth: colWidths[i] - 10
                    })
                    currentX += colWidths[i]
                    page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
                }

                // Keterangan
                const ketIndex = 6
                const ketText = spl.reason || "-"
                const ketLines = wrapText(ketText, 25)
                let ketY = rowY + rowHeight - 15
                ketLines.slice(0, 4).forEach((line) => {
                    page.drawText(line, { x: currentX + 5, y: ketY, size: 8, font })
                    ketY -= 10
                })
                currentX += colWidths[ketIndex]
                page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })

                // Tanda Tangan Image
                const ttdIndex = 7
                const ttdWidth = colWidths[ttdIndex]
                if (spl.signature) {
                    try {
                        const signatureBytes = dataUrlToBytes(spl.signature)
                        if (signatureBytes) {
                            let signatureImage
                            if (spl.signature.includes('image/png')) signatureImage = await pdfDoc.embedPng(signatureBytes)
                            else signatureImage = await pdfDoc.embedJpg(signatureBytes)

                            const padding = 10
                            const maxWidth = ttdWidth - (padding * 2)
                            const maxHeight = rowHeight - (padding * 2)
                            const scale = Math.min(maxWidth / signatureImage.width, maxHeight / signatureImage.height)
                            const dims = signatureImage.scale(scale)

                            const imgX = currentX + (ttdWidth - dims.width) / 2
                            const imgY = rowY + (rowHeight - dims.height) / 2
                            page.drawImage(signatureImage, { x: imgX, y: imgY, width: dims.width, height: dims.height })
                        }
                    } catch (e) {
                        console.error("Signature error", e)
                    }
                } else {
                    page.drawText("-", { x: currentX + (ttdWidth/2) - 2, y: rowY + (rowHeight/2) - 4, size: 9, font })
                }
                currentX += ttdWidth
                page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
            } else {
                for(let i=0; i < colWidths.length; i++) {
                     currentX += colWidths[i]
                     page.drawLine({ start: { x: currentX, y: rowY }, end: { x: currentX, y: rowY + rowHeight }, thickness: 0.5 })
                }
            }
            page.drawLine({ start: { x: tableX, y: rowY }, end: { x: tableX + 535, y: rowY }, thickness: 0.5 })
        }

        // --- FOOTER TANDA TANGAN (POSISI DIATUR AGAR TIDAK NABRAK) ---
        // Dengan rowsPerPage = 8, tabel berakhir di Y ~246.
        // Kita set footerY di 80, maka Header TTD mulai di Y ~140. Aman (Gap ~100 poin).
        
        const footerY = 80 
        const boxWidth = 140
        const totalFooterWidth = pageWidth - (margin * 2)
        const gap = (totalFooterWidth - (boxWidth * 3)) / 2 

        const signatures = [
             { role: "Diajukan Oleh", name: "..........................", title: "Pemohon / Leader" },
             { role: "Disetujui Oleh", name: "Zhalilla Viola R.S.", title: "HR & GA Supervisor" },
             { role: "Mengetahui", name: "Tiyas Indah S.", title: "Plant Manager" },
        ]

        // 1. Gambar Tanggal & Lokasi
        const dateText = `Demak, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`
        const dateXPos = margin + (2 * (boxWidth + gap))
        const dateWidth = font.widthOfTextAtSize(dateText, 10)
        const centeredDateX = dateXPos + (boxWidth - dateWidth) / 2
        
        page.drawText(dateText, {
            x: centeredDateX,
            y: footerY + 85,
            size: 10, font
        })

        // 2. Loop Gambar Box Tanda Tangan
        signatures.forEach((sig, idx) => {
             const xPos = margin + (idx * (boxWidth + gap))
             
             const drawCentered = (text: string, y: number, f: any, s: number) => {
                const w = f.widthOfTextAtSize(text, s)
                page.drawText(text, { x: xPos + (boxWidth - w) / 2, y, size: s, font: f })
             }

             // Role
             drawCentered(sig.role + " :", footerY + 60, bold, 9)
             
             // Garis
             page.drawLine({
                 start: { x: xPos, y: footerY + 25 },
                 end: { x: xPos + boxWidth, y: footerY + 25 },
                 thickness: 0.5
             })
             
             // Nama
             drawCentered(sig.name, footerY + 12, bold, 9)
             // Title
             drawCentered(sig.title, footerY, font, 9)
        })

      } // End Page Loop

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
      case "CUSTOM": return `${customStartDate} - ${customEndDate}`
      default: return "Semua Periode"
    }
  }

  const stats = getStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-gray-600 text-sm">Memuat data SPL...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              📊 Data & Laporan SPL
            </h1>
            <p className="text-green-100">
              Kelola dan export data Surat Perintah Lembur
            </p>
            <div className="mt-2 text-sm text-green-100">
              Filter: {getDateFilterLabel()} • Status: {filterStatus === "ALL" ? "Semua" : filterStatus}
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <span className="text-sm font-medium">
                {stats.total} SPL • {stats.totalHours} Jam
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total SPL</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Menunggu</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Disetujui</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Ditolak</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalHours}</div>
            <div className="text-sm text-gray-600">Total Jam</div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Data</h3>

        {/* Search Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Cari Nama atau PIN:</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama karyawan atau PIN..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Filter Status:</label>
          <div className="flex flex-wrap gap-2">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status === "ALL" ? "Semua" : 
                 status === "PENDING" ? "Menunggu" :
                 status === "APPROVED" ? "Disetujui" : "Ditolak"}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Filter Periode:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { value: "ALL", label: "Semua Periode" },
              { value: "THIS_WEEK", label: "Minggu Ini" },
              { value: "THIS_MONTH", label: "Bulan Ini" },
              { value: "LAST_MONTH", label: "Bulan Lalu" },
              { value: "LAST_3_MONTHS", label: "3 Bulan Terakhir" },
              { value: "CUSTOM", label: "Custom" }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setDateFilter(period.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === period.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {dateFilter === "CUSTOM" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
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
        </div>

        {/* Export & Summary */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Menampilkan <span className="font-semibold text-gray-900">{filteredSpls.length}</span> dari <span className="font-semibold text-gray-900">{spls.length}</span> data SPL
            {Number(stats.totalHours) > 0 && (
              <span className="ml-2">• Total <span className="font-semibold text-green-600">{stats.totalHours} jam</span> lembur</span>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={copyTableData}
              variant="outline"
              className="flex items-center gap-2"
              disabled={filteredSpls.length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Table
            </Button>
            <Button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700"
              disabled={filteredSpls.length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </Button>
            <Button
              onClick={generateRekapPdf}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700"
              disabled={filteredSpls.length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Generate Rekap PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredSpls.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700">per halaman</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-gray-700">
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredSpls.length)} dari {filteredSpls.length} data
            </div>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNumber
                  if (totalPages <= 5) {
                    pageNumber = i + 1
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i
                  } else {
                    pageNumber = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNumber
                          ? "bg-green-600 text-white"
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPL Cards */}
      {filteredSpls.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tidak Ada Data
              </h3>
              <p className="text-gray-500 text-sm">
                Tidak ada SPL dengan filter yang dipilih
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {currentItems.map((spl) => (
            <SplCard
              key={spl.id}
              spl={spl}
              userRole="HR"
              showActions={false}
              compact={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
