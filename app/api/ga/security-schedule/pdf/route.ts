import { NextRequest, NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"
import {
  PDFDocument,
  PDFPage,
  PDFFont,
  rgb,
  RGB,
  StandardFonts,
} from "pdf-lib"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildSecuritySchedule, HolidayItem } from "@/lib/security-schedule"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HOLIDAY_API_URL = "https://libur.deno.dev/api"
const ALLOWED_ROLES = new Set(["GA", "SUPER_ADMIN"])

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

const SHIFT_TIMES = [
  ["P1", "07:00 - 15:00"],
  ["P2", "11:00 - 19:00"],
  ["M1", "16:00 - 04:00"],
  ["M2", "23:00 - 07:00"],
]

const COLORS = {
  black: rgb(0, 0, 0),
  white: rgb(1, 1, 1),
  red: rgb(1, 0, 0),
  blue: rgb(0, 0.68, 0.9),
  yellow: rgb(1, 1, 0),
  green: rgb(0.56, 0.8, 0.31),
}

type FontSet = {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
}

type PdfSignatory = {
  label: string
  name: string
  role: string
}

const parseYearMonth = (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = Number(searchParams.get("year") || now.getFullYear())
  const month = Number(searchParams.get("month") || now.getMonth() + 1)

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("Tahun jadwal tidak valid")
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Bulan jadwal tidak valid")
  }

  return { year, month }
}

const authorize = async () => {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED_ROLES.has(session.user.role)) return null
  return session
}

const getSecurityUsers = () =>
  prisma.user.findMany({
    where: {
      OR: [
        { departmentName: { equals: "Security", mode: "insensitive" } },
        {
          department: {
            is: { name: { equals: "Security", mode: "insensitive" } },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentName: true,
      department: { select: { name: true } },
      supervisor: {
        select: {
          name: true,
          role: true,
          position: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

const getLatestUserByRole = (role: "GA" | "MANAGER") =>
  prisma.user.findFirst({
    where: { role },
    select: {
      name: true,
      position: true,
      role: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  })

type PdfSecurityUser = Awaited<ReturnType<typeof getSecurityUsers>>[number]

const getPdfSignatories = async (
  session: Session,
  securityUsers: PdfSecurityUser[]
): Promise<PdfSignatory[]> => {
  const securitySupervisor = securityUsers
    .map((user) => user.supervisor)
    .find((supervisor) => supervisor?.role === "GA")
  const shouldUseSessionGa = session.user.role === "GA"

  const [fallbackGaUser, managerUser] = await Promise.all([
    securitySupervisor || shouldUseSessionGa
      ? Promise.resolve(null)
      : getLatestUserByRole("GA"),
    getLatestUserByRole("MANAGER"),
  ])

  return [
    {
      label: "Dibuat oleh",
      name:
        securitySupervisor?.name ||
        (shouldUseSessionGa ? session.user.name : null) ||
        fallbackGaUser?.name ||
        "-",
      role:
        securitySupervisor?.position ||
        (shouldUseSessionGa ? session.user.position : null) ||
        fallbackGaUser?.position ||
        "GA",
    },
    {
      label: "Disetujui Oleh",
      name: managerUser?.name || "Tiyas Indah Setyowuri",
      role: managerUser?.position || "Plant Manager",
    },
  ]
}

const fetchHolidays = async (year: number, month: number) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(`${HOLIDAY_API_URL}?year=${year}`, {
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) return []

    const payload = await response.json()
    const data = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.value)
      ? payload.value
      : []

    return data
      .filter(
        (item: any) =>
          typeof item?.date === "string" &&
          typeof item?.name === "string" &&
          item.date.startsWith(`${year}-${String(month).padStart(2, "0")}`)
      )
      .map((item: any) => ({ date: item.date, name: item.name }))
      .sort((a: HolidayItem, b: HolidayItem) => a.date.localeCompare(b.date)) as HolidayItem[]
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

const sanitizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")

const fitTextToWidth = (
  value: string,
  maxWidth: number,
  font: PDFFont,
  size: number
) => {
  const safeValue = sanitizeText(value)
  if (font.widthOfTextAtSize(safeValue, size) <= maxWidth) return safeValue

  let result = safeValue
  while (
    result.length > 1 &&
    font.widthOfTextAtSize(`${result}.`, size) > maxWidth
  ) {
    result = result.slice(0, -1)
  }

  return `${result}.`
}

const drawCell = (
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGB = COLORS.white,
  borderWidth = 0.6
) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color,
    borderColor: COLORS.black,
    borderWidth,
  })
}

const drawTextInCell = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  font: PDFFont,
  size: number,
  align: "center" | "left" = "center",
  padding = 3
) => {
  const fittedText = fitTextToWidth(text, width - padding * 2, font, size)
  const textWidth = font.widthOfTextAtSize(fittedText, size)
  const textX =
    align === "left" ? x + padding : x + Math.max(padding, (width - textWidth) / 2)
  const textY = y + height / 2 - size / 2 + 1

  page.drawText(fittedText, {
    x: textX,
    y: textY,
    size,
    font,
    color: COLORS.black,
  })
}

const drawCenteredText = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number
) => {
  const safeText = sanitizeText(text)
  const textWidth = font.widthOfTextAtSize(safeText, size)
  page.drawText(safeText, {
    x: x + (width - textWidth) / 2,
    y,
    size,
    font,
    color: COLORS.black,
  })
}

const drawUnderlinedCenteredText = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number
) => {
  const safeText = fitTextToWidth(text, width, font, size)
  const textWidth = font.widthOfTextAtSize(safeText, size)
  const textX = x + (width - textWidth) / 2

  page.drawText(safeText, {
    x: textX,
    y,
    size,
    font,
    color: COLORS.black,
  })
  page.drawLine({
    start: { x: textX, y: y - 1.5 },
    end: { x: textX + textWidth, y: y - 1.5 },
    thickness: 0.6,
    color: COLORS.black,
  })
}

const getHeaderColor = (day: { isHoliday: boolean; isSunday: boolean }) => {
  if (day.isHoliday) return COLORS.green
  if (day.isSunday) return COLORS.yellow
  return COLORS.blue
}

const formatHolidayDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

const drawScheduleTable = (
  page: PDFPage,
  fonts: FontSet,
  users: ReturnType<typeof buildSecuritySchedule>["users"],
  dates: ReturnType<typeof buildSecuritySchedule>["dates"],
  topY: number
) => {
  const tableX = 30
  const tableWidth = 782
  const noWidth = 28
  const nameWidth = 168
  const dayWidth = (tableWidth - noWidth - nameWidth) / dates.length
  const dayHeaderHeight = 15
  const dateHeaderHeight = 14
  const rowHeight = 18
  const headerHeight = dayHeaderHeight + dateHeaderHeight
  const headerY = topY - headerHeight

  drawCell(page, tableX, headerY, noWidth, headerHeight)
  drawTextInCell(page, "NO", tableX, headerY, noWidth, headerHeight, fonts.bold, 6.5)

  drawCell(page, tableX + noWidth, headerY, nameWidth, headerHeight)
  drawTextInCell(
    page,
    "NAMA",
    tableX + noWidth,
    headerY,
    nameWidth,
    headerHeight,
    fonts.bold,
    6.5
  )

  dates.forEach((day, index) => {
    const x = tableX + noWidth + nameWidth + index * dayWidth
    const headerColor = getHeaderColor(day)

    drawCell(page, x, topY - dayHeaderHeight, dayWidth, dayHeaderHeight, headerColor)
    drawTextInCell(
      page,
      day.dayName.toUpperCase(),
      x,
      topY - dayHeaderHeight,
      dayWidth,
      dayHeaderHeight,
      fonts.bold,
      5.7
    )

    drawCell(
      page,
      x,
      topY - dayHeaderHeight - dateHeaderHeight,
      dayWidth,
      dateHeaderHeight,
      headerColor
    )
    drawTextInCell(
      page,
      String(day.dayNumber),
      x,
      topY - dayHeaderHeight - dateHeaderHeight,
      dayWidth,
      dateHeaderHeight,
      fonts.bold,
      8
    )
  })

  users.forEach((user, userIndex) => {
    const rowY = topY - headerHeight - (userIndex + 1) * rowHeight
    const dayByDate = new Map(user.days.map((day) => [day.dateKey, day]))

    drawCell(page, tableX, rowY, noWidth, rowHeight)
    drawTextInCell(page, String(userIndex + 1), tableX, rowY, noWidth, rowHeight, fonts.bold, 7)

    drawCell(page, tableX + noWidth, rowY, nameWidth, rowHeight)
    drawTextInCell(
      page,
      user.name.toUpperCase(),
      tableX + noWidth,
      rowY,
      nameWidth,
      rowHeight,
      fonts.bold,
      6.6,
      "left",
      4
    )

    dates.forEach((date, dateIndex) => {
      const day = dayByDate.get(date.dateKey)
      const x = tableX + noWidth + nameWidth + dateIndex * dayWidth
      const isOff = day?.shiftCode === "OFF"

      drawCell(page, x, rowY, dayWidth, rowHeight, isOff ? COLORS.red : COLORS.white)
      drawTextInCell(
        page,
        day?.shiftCode || "-",
        x,
        rowY,
        dayWidth,
        rowHeight,
        fonts.bold,
        7.2
      )
    })
  })

  return topY - headerHeight - users.length * rowHeight
}

const drawLegend = (
  page: PDFPage,
  fonts: FontSet,
  holidays: HolidayItem[],
  x: number,
  topY: number
) => {
  const boxWidth = 390
  const boxHeight = 155
  drawCell(page, x, topY - boxHeight, boxWidth, boxHeight, COLORS.white, 0.8)

  const shiftX = x + 12
  const shiftTopY = topY - 16
  const shiftWidth = 158
  const shiftHeaderHeight = 18
  const shiftRowHeight = 13

  drawCell(page, shiftX, shiftTopY - shiftHeaderHeight, shiftWidth, shiftHeaderHeight, rgb(0, 0.69, 0.31))
  drawTextInCell(
    page,
    "SENIN - SABTU",
    shiftX,
    shiftTopY - shiftHeaderHeight,
    shiftWidth,
    shiftHeaderHeight,
    fonts.bold,
    7
  )

  SHIFT_TIMES.forEach(([code, time], index) => {
    const y = shiftTopY - shiftHeaderHeight - (index + 1) * shiftRowHeight
    drawCell(page, shiftX, y, shiftWidth, shiftRowHeight)
    drawTextInCell(page, `${code}: ${time}`, shiftX, y, shiftWidth, shiftRowHeight, fonts.bold, 6.5)
  })

  const infoX = x + 195
  const infoTopY = topY - 24
  const infoWidth = 170
  const infoRowHeight = 18
  const infoLabels = ["PIKET KEBERSIHAN POS", "M1 & M2", "Ket. Wajib Lapor"]

  infoLabels.forEach((label, index) => {
    const y = infoTopY - (index + 1) * infoRowHeight
    drawCell(page, infoX, y, infoWidth, infoRowHeight)
    drawTextInCell(page, label, infoX, y, infoWidth, infoRowHeight, fonts.bold, 6.5)
  })

  const colorX = x + 280
  const colorY = topY - 92
  const colorBoxWidth = 24
  const colorBoxHeight = 13
  const colorLabels = [
    { color: COLORS.red, label: ":Libur" },
    { color: COLORS.yellow, label: ":Minggu" },
    { color: COLORS.green, label: ":Libur nasional" },
  ]

  colorLabels.forEach((item, index) => {
    const y = colorY - index * colorBoxHeight
    drawCell(page, colorX, y, colorBoxWidth, colorBoxHeight, item.color)
    page.drawText(item.label, {
      x: colorX + colorBoxWidth + 3,
      y: y + 3.5,
      size: 6.5,
      font: fonts.bold,
      color: COLORS.black,
    })
  })

  const holidayX = x + 12
  const holidayTopY = topY - 92
  const holidayWidth = 255
  const holidayHeaderHeight = 14
  const holidayRowHeight = 12

  drawCell(
    page,
    holidayX,
    holidayTopY - holidayHeaderHeight,
    holidayWidth,
    holidayHeaderHeight,
    COLORS.green
  )
  drawTextInCell(
    page,
    "Ket Libur Nasional",
    holidayX,
    holidayTopY - holidayHeaderHeight,
    holidayWidth,
    holidayHeaderHeight,
    fonts.bold,
    6.5
  )

  const holidayRows =
    holidays.length > 0
      ? holidays
      : [{ date: "-", name: "Tidak ada libur nasional" }]

  holidayRows.slice(0, 5).forEach((holiday, index) => {
    const y = holidayTopY - holidayHeaderHeight - (index + 1) * holidayRowHeight
    const label =
      holiday.date === "-"
        ? holiday.name
        : `${formatHolidayDate(holiday.date)} : ${holiday.name}`

    drawCell(page, holidayX, y, holidayWidth, holidayRowHeight)
    drawTextInCell(
      page,
      label,
      holidayX,
      y,
      holidayWidth,
      holidayRowHeight,
      fonts.italic,
      6,
      "left",
      3
    )
  })
}

const drawSignatures = (
  page: PDFPage,
  fonts: FontSet,
  signatures: PdfSignatory[]
) => {
  signatures.forEach((signature) => {
    const width = 135
    const x = signature.label === "Dibuat oleh" ? 500 : 670
    drawCenteredText(page, signature.label, x, 165, width, fonts.bold, 8)
    drawUnderlinedCenteredText(page, signature.name, x, 74, width, fonts.bold, 7.4)
    drawCenteredText(page, signature.role, x, 60, width, fonts.bold, 7)
  })
}

const buildPdf = async (year: number, month: number, session: Session) => {
  const [users, holidays] = await Promise.all([
    getSecurityUsers(),
    fetchHolidays(year, month),
  ])
  const signatories = await getPdfSignatories(session, users)
  const schedule = buildSecuritySchedule(users, year, month, holidays)

  if (schedule.missingRules.length > 0) {
    throw new Error(
      `User security untuk pola belum lengkap: ${schedule.missingRules.join(", ")}`
    )
  }

  const pdfDoc = await PDFDocument.create()
  const fonts: FontSet = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
  }
  const page = pdfDoc.addPage([841.89, 595.28])
  const pageWidth = page.getWidth()
  const visibleUsers = schedule.users.filter((user) => user.type === "ROTATION")
  const firstDates = schedule.dates.slice(0, 16)
  const secondDates = schedule.dates.slice(16)

  drawCenteredText(page, "JADWAL SECURITY", 0, 556, pageWidth, fonts.bold, 12)
  drawCenteredText(
    page,
    `PERIODE ${MONTHS[month - 1].toUpperCase()} ${year}`,
    0,
    538,
    pageWidth,
    fonts.bold,
    12
  )
  drawCenteredText(page, "PT TUNAS ESTA INDONESIA", 0, 520, pageWidth, fonts.bold, 12)

  const firstBottom = drawScheduleTable(page, fonts, visibleUsers, firstDates, 488)
  if (secondDates.length > 0) {
    drawScheduleTable(page, fonts, visibleUsers, secondDates, firstBottom - 28)
  }

  drawLegend(page, fonts, holidays, 28, 188)
  drawSignatures(page, fonts, signatories)

  return pdfDoc.save()
}

export async function GET(req: NextRequest) {
  try {
    const session = await authorize()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { year, month } = parseYearMonth(req)
    const pdfBytes = await buildPdf(year, month, session)
    const fileName = `Jadwal_Security_${year}_${String(month).padStart(2, "0")}.pdf`

    return new NextResponse(
      new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error: any) {
    console.error("Error generating security schedule PDF:", error)
    return NextResponse.json(
      { error: error?.message || "Gagal membuat PDF jadwal security" },
      { status: 500 }
    )
  }
}
