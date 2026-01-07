import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const manager = await prisma.user.findFirst({
      where: { role: "MANAGER" },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(manager)
  } catch (error) {
    console.error("Error fetching manager:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
