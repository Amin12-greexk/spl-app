import fs from "fs"
import path from "path"
import { PDFDocument, StandardFonts, rgb, RGB } from "pdf-lib"

type Section = {
  title: string
  lines: string[]
}

type RoleManual = {
  key: string
  title: string
  role: string
  color: RGB
  description: string
  extraIntro?: string[]
  section: Section
}

const INPUT_PATH = path.join(process.cwd(), "MANUAL_PER_ROLE.md")
const OUTPUT_DIR = path.join(process.cwd(), "public", "manuals")

const readLines = (value: string) => value.split(/\r?\n/)

const normalizeLine = (line: string) => line.replace(/\s+$/g, "")

const findLineIndex = (lines: string[], startsWith: string) =>
  lines.findIndex((line) => normalizeLine(line).startsWith(startsWith))

const getSectionLines = (lines: string[], start: number, end: number) =>
  lines.slice(start, end).map(normalizeLine)

const parseMeta = (lines: string[]) => {
  const getValue = (prefix: string) => {
    const line = lines.find((item) => item.startsWith(prefix))
    if (!line) return ""
    return line.slice(prefix.length).trim()
  }
  return {
    version: getValue("Versi:"),
    date: getValue("Tanggal:"),
    platform: getValue("Platform:"),
  }
}

const wrapText = (
  text: string,
  maxWidth: number,
  font: any,
  size: number
) => {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [""]
  const lines: string[] = []
  let current = words[0]

  for (let i = 1; i < words.length; i += 1) {
    const word = words[i]
    const candidate = `${current} ${word}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

type RenderContext = {
  pdf: PDFDocument
  font: any
  fontBold: any
  fontItalic: any
  pageWidth: number
  pageHeight: number
  margin: number
  maxWidth: number
  themeColor: RGB
}

type PageContext = {
  page: any
  y: number
  pageNumber: number
}

const createContext = async (
  pdf: PDFDocument,
  themeColor: RGB
): Promise<RenderContext> => {
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 50
  const maxWidth = pageWidth - margin * 2

  return {
    pdf,
    font,
    fontBold,
    fontItalic,
    pageWidth,
    pageHeight,
    margin,
    maxWidth,
    themeColor,
  }
}

const addNewPage = (
  ctx: RenderContext,
  pageCtx: PageContext
): PageContext => {
  const page = ctx.pdf.addPage([ctx.pageWidth, ctx.pageHeight])
  pageCtx.pageNumber += 1

  // Add page number footer
  page.drawText(`Halaman ${pageCtx.pageNumber}`, {
    x: ctx.pageWidth / 2 - 30,
    y: 30,
    size: 9,
    font: ctx.font,
    color: rgb(0.5, 0.5, 0.5),
  })

  return {
    page,
    y: ctx.pageHeight - ctx.margin,
    pageNumber: pageCtx.pageNumber,
  }
}

const checkPageSpace = (
  ctx: RenderContext,
  pageCtx: PageContext,
  requiredSpace: number
): PageContext => {
  if (pageCtx.y - requiredSpace < ctx.margin + 40) {
    return addNewPage(ctx, pageCtx)
  }
  return pageCtx
}

const drawCoverPage = (
  ctx: RenderContext,
  manual: RoleManual,
  meta: any
) => {
  const page = ctx.pdf.addPage([ctx.pageWidth, ctx.pageHeight])
  const centerX = ctx.pageWidth / 2

  // Background accent
  page.drawRectangle({
    x: 0,
    y: ctx.pageHeight - 200,
    width: ctx.pageWidth,
    height: 200,
    color: manual.color,
    opacity: 0.1,
  })

  // Company name
  page.drawText("PT Tunas Esta Indonesia", {
    x: centerX - ctx.fontBold.widthOfTextAtSize("PT Tunas Esta Indonesia", 16) / 2,
    y: ctx.pageHeight - 100,
    size: 16,
    font: ctx.fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })

  // System name
  page.drawText("SISTEM SURAT PERINTAH LEMBUR (SPL)", {
    x: centerX - ctx.fontBold.widthOfTextAtSize("SISTEM SURAT PERINTAH LEMBUR (SPL)", 14) / 2,
    y: ctx.pageHeight - 130,
    size: 14,
    font: ctx.font,
    color: rgb(0.3, 0.3, 0.3),
  })

  // Main title with theme color
  const titleLines = wrapText(manual.title, ctx.maxWidth - 100, ctx.fontBold, 28)
  let titleY = ctx.pageHeight / 2 + 40
  titleLines.forEach((line) => {
    page.drawText(line, {
      x: centerX - ctx.fontBold.widthOfTextAtSize(line, 28) / 2,
      y: titleY,
      size: 28,
      font: ctx.fontBold,
      color: manual.color,
    })
    titleY -= 35
  })

  // Description
  const descLines = wrapText(manual.description, ctx.maxWidth - 100, ctx.fontItalic, 12)
  let descY = titleY - 30
  descLines.forEach((line) => {
    page.drawText(line, {
      x: centerX - ctx.fontItalic.widthOfTextAtSize(line, 12) / 2,
      y: descY,
      size: 12,
      font: ctx.fontItalic,
      color: rgb(0.4, 0.4, 0.4),
    })
    descY -= 18
  })

  // Version info box
  const boxY = 180
  page.drawRectangle({
    x: ctx.margin,
    y: boxY - 60,
    width: ctx.maxWidth,
    height: 80,
    borderColor: manual.color,
    borderWidth: 1,
  })

  page.drawText(`Versi: ${meta.version}`, {
    x: ctx.margin + 20,
    y: boxY - 20,
    size: 11,
    font: ctx.font,
  })
  page.drawText(`Tanggal: ${meta.date}`, {
    x: ctx.margin + 20,
    y: boxY - 38,
    size: 11,
    font: ctx.font,
  })
  page.drawText(`Platform: ${meta.platform}`, {
    x: ctx.margin + 20,
    y: boxY - 56,
    size: 11,
    font: ctx.font,
  })

  // Role badge
  const badgeText = `ROLE: ${manual.role}`
  const badgeWidth = ctx.fontBold.widthOfTextAtSize(badgeText, 11) + 20
  page.drawRectangle({
    x: centerX - badgeWidth / 2,
    y: boxY - 110,
    width: badgeWidth,
    height: 25,
    color: manual.color,
  })
  page.drawText(badgeText, {
    x: centerX - ctx.fontBold.widthOfTextAtSize(badgeText, 11) / 2,
    y: boxY - 102,
    size: 11,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  })

  // Footer
  page.drawText("Manual Pengguna", {
    x: centerX - ctx.font.widthOfTextAtSize("Manual Pengguna", 10) / 2,
    y: 50,
    size: 10,
    font: ctx.font,
    color: rgb(0.5, 0.5, 0.5),
  })
}

const drawTableOfContents = (
  ctx: RenderContext,
  sections: Section[],
  pageCtx: PageContext
): PageContext => {
  let currentCtx = checkPageSpace(ctx, pageCtx, 100)

  // Title
  currentCtx.page.drawText("DAFTAR ISI", {
    x: ctx.margin,
    y: currentCtx.y - 20,
    size: 18,
    font: ctx.fontBold,
    color: ctx.themeColor,
  })
  currentCtx.y -= 40

  // Draw line
  currentCtx.page.drawLine({
    start: { x: ctx.margin, y: currentCtx.y },
    end: { x: ctx.pageWidth - ctx.margin, y: currentCtx.y },
    thickness: 1,
    color: ctx.themeColor,
    opacity: 0.3,
  })
  currentCtx.y -= 20

  sections.forEach((section, index) => {
    if (section.title) {
      currentCtx = checkPageSpace(ctx, currentCtx, 25)

      const num = `${index + 1}.`
      currentCtx.page.drawText(num, {
        x: ctx.margin,
        y: currentCtx.y,
        size: 11,
        font: ctx.fontBold,
      })

      const titleWrapped = wrapText(section.title, ctx.maxWidth - 80, ctx.font, 11)
      titleWrapped.forEach((line, i) => {
        currentCtx.page.drawText(line, {
          x: ctx.margin + 30,
          y: currentCtx.y - (i * 14),
          size: 11,
          font: ctx.font,
        })
      })

      currentCtx.y -= 25
    }
  })

  return currentCtx
}

const renderContent = async (params: {
  ctx: RenderContext
  sections: Section[]
  startPageCtx: PageContext
}) => {
  const { ctx, sections } = params
  let pageCtx = params.startPageCtx

  sections.forEach((section) => {
    // Section title
    if (section.title) {
      pageCtx = checkPageSpace(ctx, pageCtx, 60)

      // Accent bar
      pageCtx.page.drawRectangle({
        x: ctx.margin - 5,
        y: pageCtx.y - 18,
        width: 5,
        height: 20,
        color: ctx.themeColor,
      })

      const titleWrapped = wrapText(section.title, ctx.maxWidth - 20, ctx.fontBold, 14)
      titleWrapped.forEach((line) => {
        pageCtx.page.drawText(line, {
          x: ctx.margin + 5,
          y: pageCtx.y - 14,
          size: 14,
          font: ctx.fontBold,
          color: ctx.themeColor,
        })
        pageCtx.y -= 18
      })
      pageCtx.y -= 10
    }

    // Section lines
    section.lines.forEach((line) => {
      if (!line) {
        pageCtx.y -= 8
        return
      }

      // Markdown headers
      if (line.startsWith("# ")) {
        pageCtx = checkPageSpace(ctx, pageCtx, 40)
        const text = line.replace(/^#\s+/, "")
        const wrapped = wrapText(text, ctx.maxWidth, ctx.fontBold, 16)
        wrapped.forEach((item) => {
          pageCtx.page.drawText(item, {
            x: ctx.margin,
            y: pageCtx.y - 16,
            size: 16,
            font: ctx.fontBold,
          })
          pageCtx.y -= 20
        })
        pageCtx.y -= 6
        return
      }

      if (line.startsWith("## ")) {
        pageCtx = checkPageSpace(ctx, pageCtx, 35)
        const text = line.replace(/^##\s+/, "")
        const wrapped = wrapText(text, ctx.maxWidth, ctx.fontBold, 13)
        wrapped.forEach((item) => {
          pageCtx.page.drawText(item, {
            x: ctx.margin,
            y: pageCtx.y - 13,
            size: 13,
            font: ctx.fontBold,
            color: ctx.themeColor,
          })
          pageCtx.y -= 17
        })
        pageCtx.y -= 4
        return
      }

      if (line.startsWith("### ")) {
        pageCtx = checkPageSpace(ctx, pageCtx, 30)
        const text = line.replace(/^###\s+/, "")
        const wrapped = wrapText(text, ctx.maxWidth, ctx.fontBold, 12)
        wrapped.forEach((item) => {
          pageCtx.page.drawText(item, {
            x: ctx.margin,
            y: pageCtx.y - 12,
            size: 12,
            font: ctx.fontBold,
          })
          pageCtx.y -= 16
        })
        pageCtx.y -= 4
        return
      }

      if (line.startsWith("#### ")) {
        pageCtx = checkPageSpace(ctx, pageCtx, 28)
        const text = line.replace(/^####\s+/, "")
        const wrapped = wrapText(text, ctx.maxWidth, ctx.fontBold, 11)
        wrapped.forEach((item) => {
          pageCtx.page.drawText(item, {
            x: ctx.margin,
            y: pageCtx.y - 11,
            size: 11,
            font: ctx.fontBold,
          })
          pageCtx.y -= 15
        })
        pageCtx.y -= 3
        return
      }

      if (line.trim() === "---") {
        pageCtx = checkPageSpace(ctx, pageCtx, 20)
        pageCtx.page.drawLine({
          start: { x: ctx.margin, y: pageCtx.y },
          end: { x: ctx.pageWidth - ctx.margin, y: pageCtx.y },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        })
        pageCtx.y -= 12
        return
      }

      // Bullet points
      let indent = 0
      let bullet = ""
      let actualLine = line

      if (line.match(/^\d+\.\s+/)) {
        const match = line.match(/^(\d+\.)\s+(.*)/)
        if (match) {
          bullet = match[1]
          actualLine = match[2]
          indent = 20
        }
      } else if (line.startsWith("- ")) {
        bullet = "-"
        actualLine = line.slice(2)
        indent = 20
      } else if (line.match(/^\s{2,}-\s+/)) {
        bullet = "-"
        actualLine = line.replace(/^\s{2,}-\s+/, "")
        indent = 40
      }

      pageCtx = checkPageSpace(ctx, pageCtx, 18)

      if (bullet) {
        pageCtx.page.drawText(bullet, {
          x: ctx.margin + indent - 15,
          y: pageCtx.y - 10,
          size: 10,
          font: ctx.font,
          color: ctx.themeColor,
        })
      }

      const wrapped = wrapText(actualLine, ctx.maxWidth - indent, ctx.font, 10)
      wrapped.forEach((item) => {
        pageCtx = checkPageSpace(ctx, pageCtx, 14)
        pageCtx.page.drawText(item, {
          x: ctx.margin + indent,
          y: pageCtx.y - 10,
          size: 10,
          font: ctx.font,
        })
        pageCtx.y -= 14
      })
    })

    pageCtx.y -= 10
  })

  return pageCtx
}

const splitRoleSections = (lines: string[]) => {
  const roleHeadings = [
    "### 5.1 Staff Umum (Non-GA)",
    "### 5.2 Teknisi (di bawah GA)",
    "### 5.3 Driver (di bawah GA)",
    "### 5.4 Security (di bawah GA)",
    "### 5.5 GA (General Affair)",
    "### 5.6 Kepala Departemen",
    "### 5.7 Production Supervisor",
    "### 5.8 HR",
    "### 5.9 Manager",
    "### 5.10 Super Admin",
  ]

  const roles: Record<string, Section> = {}
  const manualIndex = findLineIndex(lines, "## 5. MANUAL PER ROLE")
  const troubleshootingIndex = findLineIndex(lines, "## 6. TROUBLESHOOTING SINGKAT")
  const endIndex = troubleshootingIndex > -1 ? troubleshootingIndex : lines.length

  for (let i = 0; i < roleHeadings.length; i += 1) {
    const heading = roleHeadings[i]
    const start = findLineIndex(lines, heading)
    if (start === -1) continue
    const nextHeading = roleHeadings[i + 1]
    const nextIndex = nextHeading ? findLineIndex(lines, nextHeading) : endIndex
    const sectionLines = getSectionLines(lines, start, nextIndex).filter(Boolean)
    roles[heading] = {
      title: heading.replace(/^###\s+\d+\.\d+\s+/, ""),
      lines: sectionLines.map((line) => {
        if (line.startsWith("### ")) return `## ${line.replace(/^###\s+/, "")}`
        return line
      }),
    }
  }

  const generalStart = findLineIndex(lines, "## 1. PENDAHULUAN")
  const generalEnd = manualIndex > -1 ? manualIndex : endIndex
  const generalLines = generalStart > -1 ? getSectionLines(lines, generalStart, generalEnd) : []
  const troubleshootingLines =
    troubleshootingIndex > -1 ? getSectionLines(lines, troubleshootingIndex, lines.length) : []

  return {
    general: {
      title: "",
      lines: generalLines,
    },
    troubleshooting: {
      title: "",
      lines: troubleshootingLines,
    },
    roles,
  }
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error("MANUAL_PER_ROLE.md tidak ditemukan.")
  }

  const content = fs.readFileSync(INPUT_PATH, "utf8")
  const lines = readLines(content).map(normalizeLine)
  const meta = parseMeta(lines)
  const { general, troubleshooting, roles } = splitRoleSections(lines)

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const manuals: RoleManual[] = [
    {
      key: "staff-umum",
      title: "Manual Pengguna Staff Umum (Non-GA)",
      role: "STAFF (NON-GA)",
      color: rgb(0.2, 0.5, 0.8), // Blue
      description: "Panduan lengkap untuk staff non-GA dalam mengajukan SPL, realisasi, dan riwayat.",
      section: roles["### 5.1 Staff Umum (Non-GA)"],
    },
    {
      key: "teknisi",
      title: "Manual Pengguna Teknisi (di bawah GA)",
      role: "TEKNISI",
      color: rgb(0.2, 0.6, 0.6), // Teal
      description: "Panduan teknisi yang disupervisi GA, termasuk bukti foto wajib.",
      section: roles["### 5.2 Teknisi (di bawah GA)"],
    },
    {
      key: "driver",
      title: "Manual Pengguna Driver (di bawah GA)",
      role: "DRIVER",
      color: rgb(0.9, 0.5, 0.1), // Orange
      description: "Panduan driver dengan aturan GA dan bukti foto wajib.",
      section: roles["### 5.3 Driver (di bawah GA)"],
    },
    {
      key: "security",
      title: "Manual Pengguna Security (di bawah GA)",
      role: "STAFF - SECURITY",
      color: rgb(0.8, 0.3, 0.2), // Red
      description: "Panduan khusus security dengan aturan shift dan lintas hari.",
      extraIntro: [
        "## CATATAN KHUSUS SECURITY",
        "",
        "Manual ini khusus untuk staff departemen Security.",
        "Pastikan memilih shift yang benar dan unggah bukti foto saat submit dan realisasi.",
        "",
        "---",
      ],
      section: roles["### 5.4 Security (di bawah GA)"],
    },
    {
      key: "ga",
      title: "Manual Pengguna GA (General Affair)",
      role: "GA",
      color: rgb(0.2, 0.6, 0.3), // Green
      description: "Panduan GA sebagai pengaju SPL dan supervisor tim.",
      section: roles["### 5.5 GA (General Affair)"],
    },
    {
      key: "kepala-departemen",
      title: "Manual Pengguna Kepala Departemen",
      role: "DEPARTMENT_HEAD",
      color: rgb(0.5, 0.3, 0.7), // Purple
      description: "Panduan Kepala Departemen untuk persetujuan SPL tim dan pengajuan pribadi.",
      section: roles["### 5.6 Kepala Departemen"],
    },
    {
      key: "production-supervisor",
      title: "Manual Pengguna Production Supervisor",
      role: "PRODUCTION_SUPERVISOR",
      color: rgb(0.9, 0.5, 0.1), // Orange
      description: "Panduan Production Supervisor untuk pengajuan SPL pribadi.",
      section: roles["### 5.7 Production Supervisor"],
    },
    {
      key: "hr",
      title: "Manual Pengguna HR (Human Resources)",
      role: "HR",
      color: rgb(0.1, 0.6, 0.7), // Teal
      description: "Panduan HR untuk data SPL, ekspor, dan cek absensi.",
      section: roles["### 5.8 HR"],
    },
    {
      key: "manager",
      title: "Manual Pengguna Manager",
      role: "MANAGER",
      color: rgb(0.7, 0.2, 0.4), // Magenta
      description: "Panduan Manager untuk persetujuan final SPL dan pengaturan batas waktu.",
      section: roles["### 5.9 Manager"],
    },
    {
      key: "super-admin",
      title: "Manual Pengguna Super Admin",
      role: "SUPER_ADMIN",
      color: rgb(0.3, 0.3, 0.3), // Dark Gray
      description: "Panduan lengkap untuk Super Admin dalam mengelola seluruh sistem SPL.",
      section: roles["### 5.10 Super Admin"],
    },
  ]

  for (const manual of manuals) {
    if (!manual.section) {
      console.warn(`Section tidak ditemukan untuk ${manual.title}`)
      continue
    }

    const pdf = await PDFDocument.create()
    const ctx = await createContext(pdf, manual.color)

    // 1. Cover page
    drawCoverPage(ctx, manual, meta)

    // 2. Table of Contents
    const sections: Section[] = [general]
    if (manual.extraIntro && manual.extraIntro.length > 0) {
      sections.push({ title: "", lines: manual.extraIntro })
    }
    sections.push(manual.section, troubleshooting)

    let pageCtx: PageContext = addNewPage(ctx, { page: null, y: 0, pageNumber: 0 })
    pageCtx = drawTableOfContents(ctx, sections, pageCtx)

    // 3. Content
    pageCtx = addNewPage(ctx, pageCtx)
    await renderContent({ ctx, sections, startPageCtx: pageCtx })

    const outputPath = path.join(OUTPUT_DIR, `${manual.key}.pdf`)
    const pdfBytes = await pdf.save()
    fs.writeFileSync(outputPath, pdfBytes)
    console.log(`✓ Generated: ${outputPath}`)
  }

  console.log("\n✓ Semua manual berhasil di-generate!")
  console.log(`  Total: ${manuals.length} PDF files`)
  console.log(`  Output: ${OUTPUT_DIR}`)
}

main().catch((error) => {
  console.error("✗ Gagal generate PDF manual:", error)
  process.exit(1)
})
