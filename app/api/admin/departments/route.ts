import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - List all departments (Super Admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error("Error fetching departments:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST - Create new department (Super Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const supervised =
      typeof body.supervised === "boolean"
        ? body.supervised
        : String(body.supervised).toLowerCase() === "true"
    const approvalModeInput = typeof body.approvalMode === "string" ? body.approvalMode : null
    const approvalMode =
      supervised && approvalModeInput && ["GA", "DEPARTMENT_HEAD", "DIRECT"].includes(approvalModeInput)
        ? approvalModeInput
        : supervised
        ? "DEPARTMENT_HEAD"
        : "DIRECT"

    if (!name) {
      return NextResponse.json({ error: "Nama departemen wajib diisi" }, { status: 400 })
    }

    const existing = await prisma.department.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: "Departemen sudah ada" }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: {
        name,
        supervised,
        approvalMode,
      },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error("Error creating department:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
