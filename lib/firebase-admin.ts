import admin from "firebase-admin"

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
  })
}

export const sendNotification = async (
  token: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    }

    const response = await admin.messaging().send(message)
    console.log("Successfully sent message:", response)
    return response
  } catch (error) {
    console.error("Error sending message:", error)
    throw error
  }
}