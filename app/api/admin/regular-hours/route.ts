import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  SATURDAY_DAY,
  makeRegularOverrideKey,
  parseRegularOverrideKey,
  parseRegularOverrideValue,
  serializeRegularOverrideValue,
} from "@/lib/regular-hours"

const parseTimeToMinutes = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const [hour, minute] = value.split(":").map(Number)
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

const normalizeTime = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: { role: { notIn: ["SUPER_ADMIN", "MANAGER"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentName: true,
        department: { select: { name: true } },
        regularStartTime: true,
        regularEndTime: true,
      },
      orderBy: { name: "asc" },
    })

    const overrideSettings = await prisma.setting.findMany({
      where: { key: { startsWith: "REGULAR_HOURS_OVERRIDE:" } },
      select: { key: true, value: true },
    })

    const saturdayOverrideByUser = new Map<string, { startTime: string; endTime: string }>()
    for (const setting of overrideSettings) {
      const parsedKey = parseRegularOverrideKey(setting.key)
      if (!parsedKey || parsedKey.dayOfWeek !== SATURDAY_DAY) continue
      const parsedValue = parseRegularOverrideValue(setting.value)
      if (!parsedValue) continue
      saturdayOverrideByUser.set(parsedKey.userId, parsedValue)
    }

    const usersWithOverrides = users.map((user) => {
      const saturdayOverride = saturdayOverrideByUser.get(user.id)
      return {
        ...user,
        saturdayStartTime: saturdayOverride?.startTime || null,
        saturdayEndTime: saturdayOverride?.endTime || null,
      }
    })

    return NextResponse.json(usersWithOverrides)
  } catch (error) {
    console.error("Error fetching regular hours:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const {
      userId,
      regularStartTime,
      regularEndTime,
      saturdayStartTime,
      saturdayEndTime,
    } = body

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID wajib diisi" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    if (["SUPER_ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Jam reguler tidak berlaku untuk role ini" },
        { status: 400 }
      )
    }

    const startValue = normalizeTime(regularStartTime)
    const endValue = normalizeTime(regularEndTime)

    if ((startValue && !endValue) || (!startValue && endValue)) {
      return NextResponse.json(
        { error: "Jam mulai dan selesai harus diisi bersamaan" },
        { status: 400 }
      )
    }

    const saturdayStartValue = normalizeTime(saturdayStartTime)
    const saturdayEndValue = normalizeTime(saturdayEndTime)

    if ((saturdayStartValue && !saturdayEndValue) || (!saturdayStartValue && saturdayEndValue)) {
      return NextResponse.json(
        { error: "Jam Sabtu mulai dan selesai harus diisi bersamaan" },
        { status: 400 }
      )
    }

    if (startValue && endValue) {
      const startMinutes = parseTimeToMinutes(startValue)
      const endMinutes = parseTimeToMinutes(endValue)

      if (startMinutes === null || endMinutes === null) {
        return NextResponse.json(
          { error: "Format jam reguler tidak valid (HH:MM)" },
          { status: 400 }
        )
      }

      // Allow overnight shifts (e.g., 22:00-06:00 for night security)
      // Only reject if start and end are exactly the same
      if (startMinutes === endMinutes) {
        return NextResponse.json(
          { error: "Jam selesai tidak boleh sama dengan jam mulai" },
          { status: 400 }
        )
      }
    }

    if (saturdayStartValue && saturdayEndValue) {
      const startMinutes = parseTimeToMinutes(saturdayStartValue)
      const endMinutes = parseTimeToMinutes(saturdayEndValue)

      if (startMinutes === null || endMinutes === null) {
        return NextResponse.json(
          { error: "Format jam Sabtu tidak valid (HH:MM)" },
          { status: 400 }
        )
      }

      if (startMinutes === endMinutes) {
        return NextResponse.json(
          { error: "Jam Sabtu selesai tidak boleh sama dengan jam mulai" },
          { status: 400 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        regularStartTime: startValue,
        regularEndTime: endValue,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentName: true,
        department: { select: { name: true } },
        regularStartTime: true,
        regularEndTime: true,
      },
    })

    const saturdayOverrideKey = makeRegularOverrideKey(userId, SATURDAY_DAY)

    if (saturdayStartValue && saturdayEndValue) {
      await prisma.setting.upsert({
        where: { key: saturdayOverrideKey },
        create: {
          key: saturdayOverrideKey,
          value: serializeRegularOverrideValue({
            startTime: saturdayStartValue,
            endTime: saturdayEndValue,
          }),
        },
        update: {
          value: serializeRegularOverrideValue({
            startTime: saturdayStartValue,
            endTime: saturdayEndValue,
          }),
        },
      })
    } else {
      await prisma.setting.deleteMany({
        where: { key: saturdayOverrideKey },
      })
    }

    const saturdayOverrideSetting = await prisma.setting.findUnique({
      where: { key: saturdayOverrideKey },
      select: { value: true },
    })
    const saturdayOverride = parseRegularOverrideValue(saturdayOverrideSetting?.value)

    return NextResponse.json({
      message: "Jam reguler berhasil diperbarui",
      user: {
        ...updatedUser,
        saturdayStartTime: saturdayOverride?.startTime || null,
        saturdayEndTime: saturdayOverride?.endTime || null,
      },
    })
  } catch (error) {
    console.error("Error updating regular hours:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
