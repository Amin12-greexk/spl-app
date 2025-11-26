"use client"

import { useEffect, useState } from "react"
import { Spl } from "@/types"
import SplCard from "@/components/spl/SplCard"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import toast from "react-hot-toast"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isWithinInterval } from "date-fns"
import { id } from "date-fns/locale"
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

  // Filter data berdasarkan status dan tanggal
  useEffect(() => {
    let filtered = spls

    // Filter by status
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(spl => spl.status === filterStatus)
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
  }, [filterStatus, dateFilter, customStartDate, customEndDate, spls])

  const getStats = () => {
    return {
      total: filteredSpls.length,
      pending: filteredSpls.filter(spl => spl.status === "PENDING").length,
      approved: filteredSpls.filter(spl => spl.status === "APPROVED").length,
      rejected: filteredSpls.filter(spl => spl.status === "REJECTED").length,
      totalHours: filteredSpls.reduce((sum, spl) => sum + Number(spl.totalHours), 0).toFixed(1)
    }
  }

  const exportToExcel = () => {
    try {
      const exportData = filteredSpls.map((spl, index) => ({
        No: index + 1,
        'Nama Karyawan': spl.requester.name,
        'Email': spl.requester.email,
        'Departemen': spl.requester.department || '-',
        'Tanggal Lembur': format(new Date(spl.date), "dd/MM/yyyy"),
        'Waktu Mulai': spl.startTime,
        'Waktu Selesai': spl.endTime,
        'Total Jam': spl.totalHours,
        'Nama Proyek': spl.projectName || '-',
        'Alasan Lembur': spl.reason,
        'Status': spl.status === 'PENDING' ? 'Menunggu' : 
               spl.status === 'APPROVED' ? 'Disetujui' : 'Ditolak',
        'Disetujui Oleh': spl.approver?.name || '-',
        'Tanggal Persetujuan': spl.approvalDate ? format(new Date(spl.approvalDate), "dd/MM/yyyy HH:mm") : '-',
        'Alasan Penolakan': spl.rejectionReason || '-',
        'Tanggal Pengajuan': format(new Date(spl.createdAt), "dd/MM/yyyy HH:mm"),
        'Tanda Tangan': spl.signature ? 'Ada' : 'Tidak'
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   { wch: 20 },  { wch: 25 },  { wch: 15 },  { wch: 12 },
        { wch: 10 },  { wch: 10 },  { wch: 8 },   { wch: 20 },  { wch: 40 },
        { wch: 12 },  { wch: 20 },  { wch: 18 },  { wch: 30 },  { wch: 18 },
        { wch: 12 }
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
        spl.requester.email,
        spl.requester.department || '-',
        format(new Date(spl.date), "dd/MM/yyyy"),
        spl.startTime,
        spl.endTime,
        spl.totalHours,
        spl.projectName || '-',
        spl.reason,
        spl.status === 'PENDING' ? 'Menunggu' : 
        spl.status === 'APPROVED' ? 'Disetujui' : 'Ditolak',
        spl.approver?.name || '-',
        spl.approvalDate ? format(new Date(spl.approvalDate), "dd/MM/yyyy HH:mm") : '-',
        spl.rejectionReason || '-',
        format(new Date(spl.createdAt), "dd/MM/yyyy HH:mm"),
        spl.signature ? 'Ada' : 'Tidak'
      ])

      const headers = [
        'No', 'Nama Karyawan', 'Email', 'Departemen', 'Tanggal Lembur',
        'Waktu Mulai', 'Waktu Selesai', 'Total Jam', 'Nama Proyek', 'Alasan Lembur',
        'Status', 'Disetujui Oleh', 'Tanggal Persetujuan', 'Alasan Penolakan', 'Tanggal Pengajuan', 'Tanda Tangan'
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
      const rowsPerPage = 15 // Adjust based on actual space

      // Group SPLs by page
      const splsPerPage: Spl[][] = []
      for (let i = 0; i < filteredSpls.length; i += rowsPerPage) {
        splsPerPage.push(filteredSpls.slice(i, i + rowsPerPage))
      }

      // Create pages
      for (let pageIndex = 0; pageIndex < splsPerPage.length; pageIndex++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        const pageSPLs = splsPerPage[pageIndex]
        let y = pageHeight - margin

        // Draw logo placeholder (green leaf icon)
        const logoSize = 40
        page.drawRectangle({
          x: margin,
          y: y - logoSize,
          width: logoSize,
          height: logoSize,
          color: rgb(0.1, 0.6, 0.3),
          opacity: 0.2
        })
        // Simple leaf shape
        page.drawCircle({
          x: margin + 15,
          y: y - 20,
          size: 10,
          color: rgb(0.1, 0.6, 0.3)
        })
        page.drawCircle({
          x: margin + 25,
          y: y - 20,
          size: 10,
          color: rgb(0.1, 0.6, 0.3)
        })

        // Title
        const titleX = margin + logoSize + 20
        page.drawText("REKAP ABSEN MANUAL STAFF PT TUNAS ESTA INDONESIA", {
          x: titleX,
          y: y - 25,
          size: 14,
          font: bold
        })
        y -= 60

        // Table header
        const colWidths = [30, 120, 60, 80, 80, 80, 150, 100] // Adjusted column widths
        const tableX = margin
        let currentX = tableX

        // Draw table header background
        page.drawRectangle({
          x: tableX,
          y: y - 25,
          width: pageWidth - (margin * 2),
          height: 25,
          color: rgb(0.95, 0.95, 0.95)
        })

        // Draw header text
        const headers = ["No", "Nama", "PIN", "Tanggal", "Jam Masuk\nLembur", "Jam Keluar\nLembur", "Keterangan", "Tanda Tangan"]
        headers.forEach((header, i) => {
          const lines = header.split('\n')
          lines.forEach((line, lineIndex) => {
            page.drawText(line, {
              x: currentX + 5,
              y: y - 10 - (lineIndex * 10),
              size: 9,
              font: bold
            })
          })
          currentX += colWidths[i]
        })

        // Draw header borders
        currentX = tableX
        for (let i = 0; i <= headers.length; i++) {
          page.drawLine({
            start: { x: currentX, y: y },
            end: { x: currentX, y: y - 25 },
            thickness: 0.5,
            color: rgb(0, 0, 0)
          })
          if (i < colWidths.length) currentX += colWidths[i]
        }
        page.drawLine({
          start: { x: tableX, y: y },
          end: { x: pageWidth - margin, y: y },
          thickness: 0.5,
          color: rgb(0, 0, 0)
        })
        page.drawLine({
          start: { x: tableX, y: y - 25 },
          end: { x: pageWidth - margin, y: y - 25 },
          thickness: 0.5,
          color: rgb(0, 0, 0)
        })

        y -= 25

        // Draw table rows
        const rowHeight = 30
        for (let index = 0; index < pageSPLs.length; index++) {
          const spl = pageSPLs[index]
          const rowY = y - (index + 1) * rowHeight
          currentX = tableX

          // Draw row data
          const rowData = [
            `${pageIndex * rowsPerPage + index + 1}`,
            spl.requester.name,
            spl.requester.pin || "-",
            format(new Date(spl.date), "dd/MM/yyyy"),
            spl.startTime,
            spl.endTime,
            spl.reason.length > 40 ? spl.reason.substring(0, 37) + "..." : spl.reason
          ]

          // Calculate signature column position
          let signatureColX = tableX
          for (let i = 0; i < colWidths.length - 1; i++) {
            signatureColX += colWidths[i]
          }

          rowData.forEach((data, i) => {
            page.drawText(data, {
              x: currentX + 5,
              y: rowY + rowHeight - 20,
              size: 8,
              font: font,
              maxWidth: colWidths[i] - 10
            })
            currentX += colWidths[i]
          })

          // Draw signature if exists
          if (spl.signature) {
            try {
              const signatureBytes = dataUrlToBytes(spl.signature)
              if (signatureBytes) {
                let signatureImage
                if (spl.signature.includes('image/png')) {
                  signatureImage = await pdfDoc.embedPng(signatureBytes)
                } else {
                  signatureImage = await pdfDoc.embedJpg(signatureBytes)
                }

                const signatureWidth = 80
                const signatureHeight = 20
                const signatureX = signatureColX + 10
                const signatureY = rowY + 5

                page.drawImage(signatureImage, {
                  x: signatureX,
                  y: signatureY,
                  width: signatureWidth,
                  height: signatureHeight
                })
              }
            } catch (error) {
              console.error("Error embedding signature:", error)
            }
          }

          // Draw row borders
          currentX = tableX
          for (let i = 0; i <= headers.length; i++) {
            page.drawLine({
              start: { x: currentX, y: rowY },
              end: { x: currentX, y: rowY + rowHeight },
              thickness: 0.5,
              color: rgb(0, 0, 0)
            })
            if (i < colWidths.length) currentX += colWidths[i]
          }
          page.drawLine({
            start: { x: tableX, y: rowY },
            end: { x: pageWidth - margin, y: rowY },
            thickness: 0.5,
            color: rgb(0, 0, 0)
          })
        }

        // Draw empty rows to fill the table
        const totalRows = rowsPerPage
        const emptyRows = totalRows - pageSPLs.length
        for (let i = 0; i < emptyRows; i++) {
          const rowY = y - (pageSPLs.length + i + 1) * rowHeight
          currentX = tableX

          // Draw empty row borders
          for (let j = 0; j <= headers.length; j++) {
            page.drawLine({
              start: { x: currentX, y: rowY },
              end: { x: currentX, y: rowY + rowHeight },
              thickness: 0.5,
              color: rgb(0, 0, 0)
            })
            if (j < colWidths.length) currentX += colWidths[j]
          }
          page.drawLine({
            start: { x: tableX, y: rowY },
            end: { x: pageWidth - margin, y: rowY },
            thickness: 0.5,
            color: rgb(0, 0, 0)
          })
        }

        // Footer section
        const footerY = 120
        const signatureWidth = 150
        const signatureGap = (pageWidth - margin * 2 - signatureWidth * 3) / 2

        // Date location
        page.drawText("Demak,.................................", {
          x: pageWidth - margin - 200,
          y: footerY + 100,
          size: 10,
          font: font
        })
        page.drawText("Mengetahui :", {
          x: pageWidth - margin - 120,
          y: footerY + 85,
          size: 10,
          font: font
        })

        // Signature boxes
        const signatures = [
          { label: "Diajukan Oleh :", name: ".....................................", title: "Karyawan / Leader" },
          { label: "Disetujui Oleh :", name: "Zhalilla Viola Risqa Setiani", title: "HR & GA Supervisor" },
          { label: "", name: "Tiyas Indah Setyowuri", title: "Plant Manager" }
        ]

        signatures.forEach((sig, index) => {
          const sigX = margin + (index * (signatureWidth + signatureGap))
          
          if (sig.label) {
            page.drawText(sig.label, {
              x: sigX,
              y: footerY + 70,
              size: 10,
              font: font
            })
          }

          // Signature line
          page.drawLine({
            start: { x: sigX, y: footerY + 20 },
            end: { x: sigX + signatureWidth - 20, y: footerY + 20 },
            thickness: 0.5,
            color: rgb(0, 0, 0)
          })

          // Name
          page.drawText(sig.name, {
            x: sigX,
            y: footerY + 5,
            size: 9,
            font: font
          })

          // Title
          page.drawText(sig.title, {
            x: sigX,
            y: footerY - 10,
            size: 9,
            font: font
          })
        })
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Rekap_Lembur_Manual_${format(new Date(), "yyyyMMdd")}.pdf`
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

      {/* Enhanced Stats Cards */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSpls.map((spl) => (
            <SplCard
              key={spl.id}
              spl={spl}
              userRole="HR"
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}