import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import {
  getJakartaDayOfWeek,
  parseDateOnly,
  SECURITY_SHIFT_DEFINITIONS,
  SecurityShiftCode,
  startOfDay,
} from "@/lib/spl-time"
import { makeRegularOverrideKey, parseRegularOverrideValue } from "@/lib/regular-hours"

const normalizeTimeValue = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    const targetDate = dateParam ? parseDateOnly(dateParam) : null

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        departmentName: true,
        department: { select: { id: true, name: true } },
        position: true,
        pin: true,
        regularStartTime: true,
        regularEndTime: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let effectiveRegularStartTime = user.regularStartTime
    let effectiveRegularEndTime = user.regularEndTime
    let overrideDayOfWeek: number | null = null
    const departmentName = user.department?.name || user.departmentName || ""
    const isSecurityDepartment = departmentName.toLowerCase() === "security"

    if (targetDate) {
      const dayOfWeek = getJakartaDayOfWeek(targetDate)
      overrideDayOfWeek = dayOfWeek

      if (isSecurityDepartment) {
        const shiftAssignment = await prisma.securityShiftAssignment.findUnique({
          where: {
            userId_workDate: {
              userId: user.id,
              workDate: targetDate,
            },
          },
          select: { shiftCode: true },
        })

        if (shiftAssignment?.shiftCode) {
          const shiftDefinition =
            SECURITY_SHIFT_DEFINITIONS[
              shiftAssignment.shiftCode as SecurityShiftCode
            ]

          if (!shiftDefinition) {
            return NextResponse.json(
              { error: "Shift security tidak valid" },
              { status: 400 }
            )
          }

          effectiveRegularStartTime = shiftDefinition.start
          effectiveRegularEndTime = shiftDefinition.end
        } else if (dayOfWeek === 6) {
          // Security 5-day rule: Saturday without assigned shift is treated as holiday.
          effectiveRegularStartTime = null
          effectiveRegularEndTime = null
        }
      } else {
        const overrideKey = makeRegularOverrideKey(user.id, dayOfWeek)
        const overrideSetting = await prisma.setting.findUnique({
          where: { key: overrideKey },
          select: { value: true },
        })
        const overrideValue = parseRegularOverrideValue(overrideSetting?.value)
        if (overrideValue) {
          effectiveRegularStartTime = overrideValue.startTime
          effectiveRegularEndTime = overrideValue.endTime
        }
      }
    } else {
      // Keep behavior unchanged when no date is provided.
      overrideDayOfWeek = getJakartaDayOfWeek(startOfDay(new Date()))
    }

    return NextResponse.json({
      ...user,
      regularStartTime: effectiveRegularStartTime,
      regularEndTime: effectiveRegularEndTime,
      baseRegularStartTime: user.regularStartTime,
      baseRegularEndTime: user.regularEndTime,
      overrideDayOfWeek,
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, currentPassword, newPassword, regularStartTime, regularEndTime } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updateData: any = {}

    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "Email sudah digunakan" },
          { status: 400 }
        )
      }

      updateData.email = email
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Password lama harus diisi" },
          { status: 400 }
        )
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      )

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Password lama tidak sesuai" },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password baru minimal 6 karakter" },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      updateData.password = hashedPassword
    }

    const hasRegularHoursUpdate =
      Object.prototype.hasOwnProperty.call(body, "regularStartTime") ||
      Object.prototype.hasOwnProperty.call(body, "regularEndTime")

    if (hasRegularHoursUpdate) {
      const isSecurityDepartment =
        (session.user.department || "").toLowerCase() === "security"

      if (!isSecurityDepartment) {
        return NextResponse.json(
          { error: "Hanya user Security yang dapat mengubah jam reguler" },
          { status: 403 }
        )
      }

      const startValue = normalizeTimeValue(regularStartTime)
      const endValue = normalizeTimeValue(regularEndTime)

      if ((startValue && !endValue) || (!startValue && endValue)) {
        return NextResponse.json(
          { error: "Jam mulai dan selesai harus diisi bersamaan" },
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

        // Allow overnight shifts for Security (e.g., 22:00-06:00)
        // Only reject if start and end are exactly the same
        if (startMinutes === endMinutes) {
          return NextResponse.json(
            { error: "Jam selesai tidak boleh sama dengan jam mulai" },
            { status: 400 }
          )
        }
      }

      updateData.regularStartTime = startValue
      updateData.regularEndTime = endValue
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada perubahan" },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        departmentName: true,
        department: { select: { id: true, name: true } },
        position: true,
        regularStartTime: true,
        regularEndTime: true,
      },
    })

    return NextResponse.json({
      message: "Profile berhasil diupdate",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
