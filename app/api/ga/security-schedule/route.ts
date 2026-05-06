import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  buildSecuritySchedule,
  formatJakartaDateKey,
  HolidayItem,
  serializeGeneratedSchedule,
} from "@/lib/security-schedule"

export const dynamic = "force-dynamic"

const HOLIDAY_API_URL = "https://libur.deno.dev/api"
const ALLOWED_ROLES = new Set(["GA", "SUPER_ADMIN"])

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

const parseYearMonthFromBody = (body: any) => {
  const now = new Date()
  const year = Number(body?.year || now.getFullYear())
  const month = Number(body?.month || now.getMonth() + 1)

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("Tahun jadwal tidak valid")
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Bulan jadwal tidak valid")
  }

  return { year, month }
}

const fetchHolidays = async (year: number, month: number) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(`${HOLIDAY_API_URL}?year=${year}`, {
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error("Gagal mengambil data libur nasional")
    }

    const payload = await response.json()
    const data = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.value)
      ? payload.value
      : []

    return {
      holidays: data
        .filter(
          (item: any) =>
            typeof item?.date === "string" &&
            typeof item?.name === "string" &&
            item.date.startsWith(`${year}-${String(month).padStart(2, "0")}`)
        )
        .map((item: any) => ({ date: item.date, name: item.name })) as HolidayItem[],
      error: null as string | null,
    }
  } catch (error: any) {
    return {
      holidays: [] as HolidayItem[],
      error:
        error?.name === "AbortError"
          ? "Timeout mengambil data libur nasional"
          : error?.message || "Gagal mengambil data libur nasional",
    }
  } finally {
    clearTimeout(timeout)
  }
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
    },
    orderBy: { name: "asc" },
  })

const getExistingAssignments = async (
  userIds: string[],
  workDates: Date[]
) => {
  if (userIds.length === 0 || workDates.length === 0) return []

  return prisma.securityShiftAssignment.findMany({
    where: {
      userId: { in: userIds },
      workDate: { in: workDates },
    },
    select: {
      userId: true,
      workDate: true,
      shiftCode: true,
    },
  })
}

const attachExistingAssignments = (
  serializedSchedule: ReturnType<typeof serializeGeneratedSchedule>,
  existingAssignments: Awaited<ReturnType<typeof getExistingAssignments>>
) => {
  const existingByKey = new Map(
    existingAssignments.map((assignment) => [
      `${assignment.userId}:${formatJakartaDateKey(assignment.workDate)}`,
      assignment.shiftCode,
    ])
  )

  let existingCount = 0
  let overwriteCount = 0

  const users = serializedSchedule.users.map((user) => ({
    ...user,
    days: user.days.map((day) => {
      const existingShiftCode = existingByKey.get(`${user.id}:${day.dateKey}`) || null
      const willOverwrite = Boolean(
        existingShiftCode && existingShiftCode !== day.shiftCode
      )

      if (existingShiftCode) existingCount += 1
      if (willOverwrite) overwriteCount += 1

      return {
        ...day,
        existingShiftCode,
        willOverwrite,
      }
    }),
  }))

  return {
    ...serializedSchedule,
    users,
    existingCount,
    overwriteCount,
  }
}

const buildPayload = async (year: number, month: number) => {
  const [securityUsers, holidayResult] = await Promise.all([
    getSecurityUsers(),
    fetchHolidays(year, month),
  ])
  const schedule = buildSecuritySchedule(
    securityUsers,
    year,
    month,
    holidayResult.holidays
  )
  const workDates = schedule.dates.map((day) => day.date)
  const userIds = schedule.users.map((user) => user.id)
  const existingAssignments = await getExistingAssignments(userIds, workDates)
  const serializedSchedule = serializeGeneratedSchedule(schedule)

  return {
    ...attachExistingAssignments(serializedSchedule, existingAssignments),
    year,
    month,
    securityUsers,
    holidays: holidayResult.holidays,
    holidayError: holidayResult.error,
    holidaySource: HOLIDAY_API_URL,
  }
}

const authorize = async () => {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED_ROLES.has(session.user.role)) {
    return null
  }
  return session
}

export async function GET(req: NextRequest) {
  try {
    const session = await authorize()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { year, month } = parseYearMonth(req)
    const payload = await buildPayload(year, month)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error("Error previewing security schedule:", error)
    return NextResponse.json(
      { error: error?.message || "Gagal membuat preview jadwal security" },
      { status: 400 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authorize()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { year, month } = parseYearMonthFromBody(body)
    const payload = await buildPayload(year, month)

    if (payload.missingRules.length > 0) {
      return NextResponse.json(
        {
          error: `User security untuk pola belum lengkap: ${payload.missingRules.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const operations = payload.users.flatMap((user) =>
      user.days.map((day) =>
        prisma.securityShiftAssignment.upsert({
          where: {
            userId_workDate: {
              userId: user.id,
              workDate: new Date(day.date),
            },
          },
          update: {
            shiftCode: day.shiftCode,
          },
          create: {
            userId: user.id,
            workDate: new Date(day.date),
            shiftCode: day.shiftCode,
          },
        })
      )
    )

    await prisma.$transaction(operations)

    const refreshedPayload = await buildPayload(year, month)
    return NextResponse.json({
      ...refreshedPayload,
      message: "Jadwal security berhasil disimpan",
      savedCount: operations.length,
    })
  } catch (error: any) {
    console.error("Error generating security schedule:", error)
    return NextResponse.json(
      { error: error?.message || "Gagal menyimpan jadwal security" },
      { status: 500 }
    )
  }
}
