import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      )
    }

    // Pastikan endpoint tidak terdaftar untuk user lain (hindari notifikasi tercampur)
    await prisma.userNotification.deleteMany({
      where: {
        endpoint,
        userId: {
          not: session.user.id,
        },
      },
    })

    // Cek apakah subscription sudah ada untuk user ini
    const existingSubscription = await prisma.userNotification.findFirst({
      where: {
        userId: session.user.id,
        endpoint,
      },
    })

    if (existingSubscription) {
      return NextResponse.json({ message: "Already subscribed" })
    }

    // Simpan subscription
    await prisma.userNotification.create({
      data: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    return NextResponse.json({ message: "Subscribed successfully" })
  } catch (error) {
    console.error("Error subscribing to notifications:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint required" },
        { status: 400 }
      )
    }

    // Hapus subscription
    await prisma.userNotification.deleteMany({
      where: {
        userId: session.user.id,
        endpoint,
      },
    })

    return NextResponse.json({ message: "Unsubscribed successfully" })
  } catch (error) {
    console.error("Error unsubscribing from notifications:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
