// firebase-messaging-sw.js
// Letakkan file ini di folder public/

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// Konfigurasi Firebase (gunakan kredensial yang sama dengan di aplikasi)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png', // Sesuaikan dengan icon Anda
    badge: '/badge-72x72.png',
    data: payload.data,
    tag: payload.data?.splId || 'notification',
    requireInteraction: true,
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  event.notification.close()

  const clickAction = event.notification.data?.click_action || '/dashboard'
  
  event.waitUntil(
    clients.openWindow(clickAction)
  )
})