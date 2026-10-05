import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const normalizeEndpoint = (value?: string | null) => value?.trim() || ""

const isLikelyFcmToken = (value?: string | null) => {
  const endpoint = normalizeEndpoint(value)
  if (!endpoint) return false
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return false
  if (endpoint === "user-token" || endpoint.startsWith("fallback-")) return false
  if (endpoint.length < 80) return false
  return /^[A-Za-z0-9:_-]+$/.test(endpoint)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { endpoint, keys } = body
    const normalizedEndpoint = normalizeEndpoint(endpoint)

    if (!isLikelyFcmToken(normalizedEndpoint)) {
      return NextResponse.json(
        { error: "FCM token tidak valid" },
        { status: 400 }
      )
    }

    // Pastikan endpoint tidak terdaftar untuk user lain (hindari notifikasi tercampur)
    await prisma.userNotification.deleteMany({
      where: {
        endpoint: normalizedEndpoint,
        userId: {
          not: session.user.id,
        },
      },
    })

    // Cek apakah subscription sudah ada untuk user ini
    const existingSubscription = await prisma.userNotification.findFirst({
      where: {
        userId: session.user.id,
        endpoint: normalizedEndpoint,
      },
    })

    if (existingSubscription) {
      return NextResponse.json({ message: "Already subscribed" })
    }

    // Simpan subscription
    await prisma.userNotification.create({
      data: {
        userId: session.user.id,
        endpoint: normalizedEndpoint,
        p256dh: keys?.p256dh || normalizedEndpoint,
        auth: keys?.auth || normalizedEndpoint,
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
    const normalizedEndpoint = normalizeEndpoint(endpoint)

    if (!normalizedEndpoint) {
      return NextResponse.json(
        { error: "Endpoint required" },
        { status: 400 }
      )
    }

    // Hapus subscription
    await prisma.userNotification.deleteMany({
      where: {
        userId: session.user.id,
        endpoint: normalizedEndpoint,
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
