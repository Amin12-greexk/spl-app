import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - List departments for public usage (registration dropdown, etc.)
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        supervised: true,
        approvalMode: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error("Error fetching departments:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
