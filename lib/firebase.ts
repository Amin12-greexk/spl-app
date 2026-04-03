import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging"

// Fungsi untuk validasi konfigurasi yang lebih robust
const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }

  // Log detailed config status untuk debugging
  console.log('🔧 Firebase Config Status:', {
    apiKey: config.apiKey ? '✅ Present' : '❌ Missing',
    authDomain: config.authDomain ? '✅ Present' : '❌ Missing',
    projectId: config.projectId ? '✅ Present' : '❌ Missing',
    storageBucket: config.storageBucket ? '✅ Present' : '❌ Missing',
    messagingSenderId: config.messagingSenderId ? '✅ Present' : '❌ Missing',
    appId: config.appId ? '✅ Present' : '❌ Missing',
  })

  return config
}

const validateFirebaseConfig = () => {
  const config = getFirebaseConfig()
  
  const requiredKeys = [
    'apiKey',
    'authDomain', 
    'projectId',
    'messagingSenderId',
    'appId'
  ]
  
  const missingKeys = requiredKeys.filter(key => !config[key as keyof typeof config])
  
  if (missingKeys.length > 0) {
    console.warn('⚠️ Missing Firebase configuration:', missingKeys.map(key => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`))
    return false
  }
  
  return true
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null
let initializationAttempted = false

// Inisialisasi Firebase dengan error handling yang lebih baik
const initializeFirebase = () => {
  if (initializationAttempted) {
    return { app, messaging }
  }

  initializationAttempted = true

  if (typeof window === "undefined") {
    console.log('🚫 Firebase initialization skipped (server-side)')
    return { app: null, messaging: null }
  }

  if (!validateFirebaseConfig()) {
    console.warn('🚫 Firebase initialization skipped (invalid config)')
    return { app: null, messaging: null }
  }

  try {
    const firebaseConfig = getFirebaseConfig()

    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
      console.log('✅ Firebase app initialized successfully')
    } else {
      app = getApps()[0]
      console.log('✅ Firebase app already initialized')
    }
    
    // Inisialisasi messaging hanya jika service worker tersedia
    if ("serviceWorker" in navigator && app) {
      messaging = getMessaging(app)
      console.log('✅ Firebase messaging initialized successfully')
    } else {
      console.warn('⚠️ Service Worker not supported, messaging disabled')
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error)
    app = null
    messaging = null
  }

  return { app, messaging }
}

// Request notification permission dengan better error handling
export const requestNotificationPermission = async (): Promise<string | null> => {
  const { messaging: currentMessaging } = initializeFirebase()
  
  if (!currentMessaging) {
    console.error('❌ Firebase messaging not available')
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
      console.log('❌ Notification permission not granted:', permission)
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

    const token = await getToken(currentMessaging, {
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

export const onMessageListener = (callback: (payload: any) => void) => {
  const { messaging: currentMessaging } = initializeFirebase()
  
  if (!currentMessaging) {
    console.warn('Firebase messaging not initialized')
    return () => {}
  }

  try {
    const unsubscribe = onMessage(currentMessaging, (payload) => {
      console.log('📬 Foreground message received:', payload)
      callback(payload)
    })
    
    // Simpan unsubscribe function untuk cleanup jika diperlukan
    if (typeof window !== 'undefined') {
      (window as any).__firebaseUnsubscribe = unsubscribe
    }
    return unsubscribe
  } catch (error) {
    console.error('❌ Error setting up message listener:', error)
    return () => {}
  }
}

// Utility function untuk check apakah Firebase siap
export const isFirebaseReady = (): boolean => {
  if (typeof window === "undefined") return false
  
  const { app: currentApp, messaging: currentMessaging } = initializeFirebase()
  return !!(currentApp && currentMessaging)
}

// Utility function untuk mendapatkan informasi status
export const getFirebaseStatus = () => {
  const config = getFirebaseConfig()
  const { app: currentApp, messaging: currentMessaging } = initializeFirebase()
  
  return {
    isConfigured: validateFirebaseConfig(),
    configDetails: {
      apiKey: !!config.apiKey,
      authDomain: !!config.authDomain,
      projectId: !!config.projectId,
      messagingSenderId: !!config.messagingSenderId,
      appId: !!config.appId,
      vapidKey: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    },
    isInitialized: !!currentApp,
    isMessagingReady: !!currentMessaging,
    isServiceWorkerSupported: typeof window !== "undefined" && "serviceWorker" in navigator,
    isNotificationSupported: typeof window !== "undefined" && "Notification" in window,
    permissionStatus: typeof window !== "undefined" ? Notification.permission : 'unavailable'
  }
}

// Initialize saat module di-load (hanya di client-side)
if (typeof window !== "undefined") {
  initializeFirebase()
}

export { app, messaging }