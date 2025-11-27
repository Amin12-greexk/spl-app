import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { sendNotification } from "@/lib/firebase-admin"
import { prisma } from "@/lib/prisma"

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

    // Ambil semua token notifikasi user
    const userNotifications = await prisma.userNotification.findMany({
      where: {
        userId,
      },
    })

    if (userNotifications.length === 0) {
      return NextResponse.json(
        { message: "No notification tokens found for user" },
        { status: 200 }
      )
    }

    // Kirim notifikasi ke semua token
    const notificationPromises = userNotifications.map((token) =>
      sendNotification(token.endpoint, title, notificationBody, data).catch((error) => {
        console.error(`Failed to send to token ${token.id}:`, error.message)
        return { error: error.message, tokenId: token.id }
      })
    )

    const results = await Promise.allSettled(notificationPromises)

    // Count success and failures
    const successful = results.filter(
      (result) => result.status === "fulfilled" && !(result.value as any)?.error
    ).length
    const failed = results.length - successful

    console.log(`📊 Notification results: ${successful} sent, ${failed} failed`)

    if (successful > 0) {
      return NextResponse.json({
        message: `Notifications sent to ${successful} device(s)${failed > 0 ? `, ${failed} failed` : ""}`,
        successful,
        failed,
      })
    } else {
      return NextResponse.json(
        { error: "Failed to send notifications to all devices" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error sending notifications:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}