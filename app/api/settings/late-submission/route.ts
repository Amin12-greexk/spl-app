import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getLateSubmissionMaxDays,
  LATE_SUBMISSION_MAX_DAYS_KEY,
  MAX_LATE_SUBMISSION_MAX_DAYS,
} from "@/lib/late-submission"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const maxDays = await getLateSubmissionMaxDays(prisma)
    return NextResponse.json({ maxDays })
  } catch (error) {
    console.error("Error fetching late submission setting:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const maxDays = Number(body?.maxDays)
    if (
      !Number.isInteger(maxDays) ||
      maxDays < 0 ||
      maxDays > MAX_LATE_SUBMISSION_MAX_DAYS
    ) {
      return NextResponse.json(
        { error: `Batas mundur harus bilangan bulat 0-${MAX_LATE_SUBMISSION_MAX_DAYS} hari` },
        { status: 400 }
      )
    }

    await prisma.setting.upsert({
      where: { key: LATE_SUBMISSION_MAX_DAYS_KEY },
      update: { value: String(maxDays) },
      create: { key: LATE_SUBMISSION_MAX_DAYS_KEY, value: String(maxDays) },
    })

    return NextResponse.json({ maxDays })
  } catch (error) {
    console.error("Error updating late submission setting:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
