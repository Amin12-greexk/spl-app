import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const EMPLOYEE_ROLES = [
  "STAFF",
  "TEKNISI",
  "DRIVER",
  "GA",
  "DEPARTMENT_HEAD",
  "PRODUCTION_SUPERVISOR",
  "HR",
  "MANAGER",
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const employees = await prisma.user.findMany({
      where: {
        role: {
          in: EMPLOYEE_ROLES,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        role: true,
        departmentId: true,
        departmentName: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        position: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        regularStartTime: true,
        regularEndTime: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error("Error fetching employee mirror data:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
