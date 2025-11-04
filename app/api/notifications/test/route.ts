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
    const { title, message } = body

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Title dan message harus diisi" },
        { status: 400 }
      )
    }

    // Get user's notification tokens
    const userNotifications = await prisma.userNotification.findMany({
      where: {
        userId: session.user.id,
      },
    })

    if (userNotifications.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: "Tidak ada token notifikasi ditemukan. Silakan aktifkan notifikasi terlebih dahulu." 
        },
        { status: 200 }
      )
    }

    // Log notification details
    console.log(`📱 Test notification sent to ${session.user.name}:`)
    console.log(`   Title: ${title.trim()}`)
    console.log(`   Message: ${message.trim()}`)
    console.log(`   Tokens: ${userNotifications.length}`)

    // Filter only valid FCM tokens (start with specific patterns or have proper length)
    const validFcmTokens = userNotifications.filter(token => {
      const endpoint = token.endpoint
      // FCM tokens typically start with specific patterns and are long
      return (
        endpoint.startsWith('c') && endpoint.length > 50 ||
        endpoint.startsWith('f') && endpoint.length > 50 ||
        endpoint.startsWith('e') && endpoint.length > 50 ||
        endpoint.includes('fcm') ||
        endpoint.includes('firebase')
      )
    })

    // Try to send real Firebase notifications if valid tokens exist
    if (validFcmTokens.length > 0) {
      try {
        const { sendNotification } = await import("@/lib/firebase-admin")
        
        const notificationPromises = validFcmTokens.map((token) =>
          sendNotification(
            token.endpoint,
            title.trim(),
            message.trim(),
            { 
              type: "test",
              click_action: "/dashboard",
              timestamp: new Date().toISOString()
            }
          ).catch(error => {
            console.error(`Failed to send to token ${token.id}:`, error.message)
            return { error: error.message, tokenId: token.id }
          })
        )

        const results = await Promise.allSettled(notificationPromises)
        
        const successCount = results.filter(result => 
  result.status === 'fulfilled' && !(result.value as any)?.error
).length

        const failCount = results.length - successCount

        if (successCount > 0) {
          return NextResponse.json({ 
            success: true,
            message: `Notifikasi test berhasil dikirim ke ${successCount} device${failCount > 0 ? `, ${failCount} gagal` : ''}!`
          })
        } else {
          // All Firebase sends failed, fall back to simulation
          console.log("All Firebase notifications failed, using simulation")
          return NextResponse.json({ 
            success: true,
            message: `Notifikasi test disimulasikan (Firebase gagal). Total tokens: ${userNotifications.length}`
          })
        }
      } catch (firebaseError) {
        console.error("Firebase admin error:", firebaseError)
        // Firebase not available, fall back to simulation
        return NextResponse.json({ 
          success: true,
          message: `Notifikasi test disimulasikan (Firebase tidak tersedia). Total tokens: ${userNotifications.length}`
        })
      }
    } else {
      // No valid FCM tokens, simulate notification
      console.log("No valid FCM tokens found, simulating notification")
      
      // Check if any tokens exist but are invalid
      const invalidTokens = userNotifications.filter(token => {
        const endpoint = token.endpoint
        return endpoint.startsWith('fallback-') || endpoint.startsWith('cmhiti')
      })

      if (invalidTokens.length > 0) {
        return NextResponse.json({ 
          success: true,
          message: `Notifikasi test disimulasikan berhasil! (${invalidTokens.length} mock tokens)`
        })
      } else {
        return NextResponse.json({ 
          success: true,
          message: `Notifikasi test disimulasikan berhasil! (${userNotifications.length} tokens)`
        })
      }
    }

  } catch (error) {
    console.error("Error sending test notification:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error",
        message: "Terjadi kesalahan saat mengirim notifikasi test"
      },
      { status: 500 }
    )
  }
}