import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Validasi konfigurasi
const validateFirebaseConfig = () => {
  const requiredKeys = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ]
  
  const missingKeys = requiredKeys.filter(key => !process.env[key])
  
  if (missingKeys.length > 0) {
    console.error('❌ Missing Firebase configuration:', missingKeys)
    return false
  }
  
  return true
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

// Inisialisasi Firebase hanya di browser dan jika konfigurasi valid
if (typeof window !== "undefined" && validateFirebaseConfig()) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
      console.log('✅ Firebase app initialized')
    } else {
      app = getApps()[0]
    }
    
    // Inisialisasi messaging hanya jika service worker tersedia
    if ("serviceWorker" in navigator && app) {
      messaging = getMessaging(app)
      console.log('✅ Firebase messaging initialized')
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error)
  }
}

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging) {
    console.error('❌ Firebase messaging not initialized')
    return null
  }

  if (!("Notification" in window)) {
    console.error('❌ This browser does not support notifications')
    return null
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission()
    
    if (permission !== "granted") {
      console.log('❌ Notification permission not granted')
      return null
    }

    // Pastikan service worker terdaftar
    const registration = await navigator.serviceWorker.ready
    console.log('✅ Service worker ready:', registration.scope)

    // Dapatkan token FCM
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('❌ VAPID key not configured')
      return null
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    })

    if (token) {
      console.log('✅ FCM token received:', token.substring(0, 20) + '...')
      return token
    } else {
      console.error('❌ Failed to get FCM token')
      return null
    }
  } catch (error) {
    console.error('❌ Error getting notification permission:', error)
    return null
  }
}

export const onMessageListener = async () => {
  if (!messaging) {
    throw new Error('Firebase messaging not initialized')
  }

  return new Promise((resolve, reject) => {
    try {
      onMessage(messaging!, (payload) => {
        console.log('📬 Foreground message received:', payload)
        resolve(payload)
      })
    } catch (error) {
      console.error('❌ Error setting up message listener:', error)
      reject(error)
    }
  })
}

// Utility function untuk check apakah Firebase siap
export const isFirebaseReady = (): boolean => {
  return !!(app && messaging)
}

// Utility function untuk mendapatkan informasi status
export const getFirebaseStatus = () => {
  return {
    isConfigured: validateFirebaseConfig(),
    isInitialized: !!app,
    isMessagingReady: !!messaging,
    isServiceWorkerSupported: typeof window !== "undefined" && "serviceWorker" in navigator,
    isNotificationSupported: typeof window !== "undefined" && "Notification" in window,
    permissionStatus: typeof window !== "undefined" ? Notification.permission : 'unavailable'
  }
}

export { app, messaging }