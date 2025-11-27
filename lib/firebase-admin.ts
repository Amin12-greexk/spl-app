import admin from "firebase-admin"

// ======================================================
// 🔐 VALIDATION: Ensure all required environment variables exist
// ======================================================
const validateAdminConfig = () => {
  const requiredEnvVars = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
  ]

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.error("❌ Missing Firebase Admin environment variables:", missingVars)
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`)
  }

  return true
}

// ======================================================
// 🚀 INITIALIZE FIREBASE ADMIN SDK (only once)
// ======================================================
if (!admin.apps.length) {
  try {
    validateAdminConfig()

    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!privateKey) {
      throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is not properly formatted")
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        privateKey,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      }),
    })

    console.log("✅ Firebase Admin initialized successfully")
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error)
    throw error
  }
}

// ======================================================
// 📩 TYPES
// ======================================================
export type SendResult =
  | { success: true; messageId: string; timestamp: string }
  | { error: string; token: string }

// ======================================================
// 🗑️ CLEANUP INVALID TOKEN FROM DATABASE
// ======================================================
export const cleanupInvalidToken = async (token: string): Promise<void> => {
  try {
    const { prisma } = await import("@/lib/prisma")

    const deleted = await prisma.userNotification.deleteMany({
      where: {
        endpoint: token,
      },
    })

    if (deleted.count > 0) {
      console.log(`🗑️ Cleaned up ${deleted.count} invalid token(s)`)
    }
  } catch (error) {
    console.error("❌ Error cleaning up invalid token:", error)
  }
}

// ======================================================
// 📩 SEND A SINGLE NOTIFICATION
// ======================================================
export const sendNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<SendResult> => {
  try {
    if (!token?.trim()) throw new Error("Token is required")
    if (!title?.trim()) throw new Error("Title is required")
    if (!body?.trim()) throw new Error("Body is required")

    const message = {
      notification: {
        title: title.trim(),
        body: body.trim(),
      },
      data: {
        ...(data &&
          Object.keys(data).reduce((acc, key) => {
            acc[key] = String(data[key])
            return acc
          }, {} as Record<string, string>)),
      },
      token: token.trim(),

      // Android config
      android: {
        notification: {
          icon: "ic_notification",
          color: "#3B82F6",
          sound: "default",
          priority: "high" as const,
          defaultSound: true,
          channelId: "spl_notifications",
        },
        priority: "high" as const,
      },

      // iOS config (APNs)
      apns: {
        payload: {
          aps: {
            alert: {
              title: title.trim(),
              body: body.trim(),
            },
            badge: 1,
            sound: "default",
            "content-available": 1,
          },
        },
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
      },

      // WebPush config
      webpush: {
        notification: {
          title: title.trim(),
          body: body.trim(),
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          requireInteraction: true,
          tag: data?.splId || `notification_${Date.now()}`,
          data: data || {},
        },
        fcmOptions: {
          link: data?.click_action || "/dashboard",
        },
      },
    }

    const response = await admin.messaging().send(message)
    console.log("✅ Notification sent successfully:", response)

    return {
      success: true as const, // ✅ literal true to satisfy SendResult
      messageId: response,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error("❌ Error sending notification:", error)

    // Handle specific Firebase errors and cleanup invalid tokens
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/invalid-argument"
    ) {
      console.warn("⚠️ Token is invalid, removing from database...")
      await cleanupInvalidToken(token)
      throw new Error("Token tidak valid atau sudah expired")
    }

    if (error.code === "messaging/mismatched-credential") {
      console.error("❌ Firebase Admin credentials mismatch")
      throw new Error("Kredensial Firebase tidak cocok")
    }

    // Generic fallback
    throw new Error(error.message || "Gagal mengirim notifikasi")
  }
}

// ======================================================
// 📢 SEND TO MULTIPLE TOKENS (parallel & type-safe)
// ======================================================
export const sendNotificationToMultiple = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{
  total: number
  successful: number
  failed: number
  results: PromiseSettledResult<SendResult>[]
}> => {
  try {
    if (!tokens?.length) throw new Error("Tidak ada token yang valid")

    const validTokens = tokens.filter((token) => token?.trim())
    if (validTokens.length === 0) throw new Error("Tidak ada token yang valid")

    // Send notifications concurrently
    const promises: Promise<SendResult>[] = validTokens.map((token) =>
      sendNotification(token, title, body, data).catch((error) => ({
        error: error.message,
        token,
      }))
    )

    const results = await Promise.allSettled(promises)

    // ✅ SAFE FILTER: Use `"error" in result.value` instead of direct access
    const successful = results.filter(
      (result) => result.status === "fulfilled" && !("error" in result.value)
    ).length

    const failed = results.length - successful

    console.log(`📊 Notification results: ${successful} success, ${failed} failed`)

    return {
      total: tokens.length,
      successful,
      failed,
      results,
    }
  } catch (error) {
    console.error("❌ Error sending multiple notifications:", error)
    throw error
  }
}

// ======================================================
// 🔍 VALIDATE TOKEN UTILITY
// ======================================================
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    if (!token?.trim()) return false

    // Dry-run send to test token validity
    await admin.messaging().send(
      {
        token: token.trim(),
        notification: {
          title: "Test",
          body: "Test",
        },
      },
      true // dry run
    )

    return true
  } catch (error: any) {
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      return false
    }
    // Other errors (network, etc.) → assume still valid
    return true
  }
}

export default admin
