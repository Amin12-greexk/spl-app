import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { sendNotificationToUser } from "@/lib/notification-utils"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { userId, title, body: notificationBody, data } = body

    if (!userId || !title || !notificationBody) {
      return NextResponse.json(
        { error: "userId, title, and body are required" },
        { status: 400 }
      )
    }

    const summary = await sendNotificationToUser(
      userId,
      title,
      notificationBody,
      data
    )

    if (summary.total === 0) {
      return NextResponse.json(
        { message: "No notification tokens found for user" },
        { status: 200 }
      )
    }

    console.log(
      `dY"S Notification results: ${summary.successful} sent, ${summary.failed} failed`
    )

    if (summary.successful > 0) {
      return NextResponse.json({
        message: `Notifications sent to ${summary.successful} device(s)${summary.failed > 0 ? `, ${summary.failed} failed` : ""}`,
        successful: summary.successful,
        failed: summary.failed,
      })
    }

    return NextResponse.json(
      { error: "Failed to send notifications to all devices" },
      { status: 500 }
    )
  } catch (error) {
    console.error("Error sending notifications:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
