import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  parseDateOnly,
  SECURITY_SHIFT_DEFINITIONS,
  startOfDay,
} from "@/lib/spl-time"

const normalizeShiftCode = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.toUpperCase()
}

const isSecurityDepartment = (departmentName?: string | null) =>
  (departmentName || "").toLowerCase() === "security"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get("date")
    const workDate = dateParam ? parseDateOnly(dateParam) : startOfDay(new Date())

    if (!workDate) {
      return NextResponse.json(
        { error: "Tanggal shift tidak valid" },
        { status: 400 }
      )
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { departmentName: { equals: "Security", mode: "insensitive" } },
          { department: { is: { name: { equals: "Security", mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentName: true,
        department: { select: { name: true } },
        securityShiftAssignments: {
          where: { workDate },
          select: { shiftCode: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const payload = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentName: user.departmentName,
      department: user.department,
      shiftCode: user.securityShiftAssignments[0]?.shiftCode || null,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching security shifts:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { userId, workDate, shiftCode } = body

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID wajib diisi" }, { status: 400 })
    }

    if (!workDate || typeof workDate !== "string") {
      return NextResponse.json({ error: "Tanggal shift wajib diisi" }, { status: 400 })
    }

    const parsedWorkDate = parseDateOnly(workDate)
    if (!parsedWorkDate) {
      return NextResponse.json(
        { error: "Tanggal shift tidak valid" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentName: true,
        department: { select: { name: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    const departmentName = user.department?.name || user.departmentName || null
    if (!isSecurityDepartment(departmentName)) {
      return NextResponse.json(
        { error: "Shift harian hanya untuk departemen Security" },
        { status: 400 }
      )
    }

    const normalizedShift = normalizeShiftCode(shiftCode)
    if (!normalizedShift) {
      await prisma.securityShiftAssignment.deleteMany({
        where: {
          userId,
          workDate: parsedWorkDate,
        },
      })

      return NextResponse.json({
        message: "Shift dihapus untuk tanggal tersebut",
      })
    }

    if (!Object.prototype.hasOwnProperty.call(SECURITY_SHIFT_DEFINITIONS, normalizedShift)) {
      return NextResponse.json(
        { error: "Kode shift tidak valid" },
        { status: 400 }
      )
    }

    const assignment = await prisma.securityShiftAssignment.upsert({
      where: {
        userId_workDate: {
          userId,
          workDate: parsedWorkDate,
        },
      },
      update: { shiftCode: normalizedShift },
      create: {
        userId,
        workDate: parsedWorkDate,
        shiftCode: normalizedShift,
      },
    })

    return NextResponse.json({
      message: "Shift berhasil disimpan",
      assignment,
    })
  } catch (error) {
    console.error("Error saving security shift:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
