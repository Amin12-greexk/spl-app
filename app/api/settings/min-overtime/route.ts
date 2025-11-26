import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

const SETTING_KEY = "MIN_OVERTIME_START"

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    })
    return NextResponse.json({
      value: setting?.value || "16:30",
    })
  } catch (error) {
    console.error("Error fetching min overtime setting:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role as Role) !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { value } = body
    if (!value || typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
      return NextResponse.json({ error: "Format waktu tidak valid (HH:MM)" }, { status: 400 })
    }

    const setting = await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value },
      create: { key: SETTING_KEY, value },
    })

    return NextResponse.json({ value: setting.value })
  } catch (error) {
    console.error("Error updating min overtime setting:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
