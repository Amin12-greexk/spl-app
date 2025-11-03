// firebase-messaging-sw.js
// Service Worker untuk menangani notifikasi Firebase di background

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js')

// Konfigurasi Firebase dengan kredensial Anda
const firebaseConfig = {
  apiKey: "AIzaSyCibrto2QDE5oAHVzGxtCMfO2PDWB5Io_0",
  authDomain: "spl-tunas-esta.firebaseapp.com",
  projectId: "spl-tunas-esta",
  storageBucket: "spl-tunas-esta.firebasestorage.app",
  messagingSenderId: "21158404061",
  appId: "1:21158404061:web:9007b06013dc3e0a1a6034",
  measurementId: "G-Y0EFM12L33"
}

// Inisialisasi Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

const messaging = firebase.messaging()

// Handle pesan yang diterima saat aplikasi berada di background
messaging.onBackgroundMessage((payload) => {
  console.log('📱 Received background message:', payload)
  
  const notificationTitle = payload.notification?.title || 'Aplikasi SPL'
  const notificationOptions = {
    body: payload.notification?.body || 'Anda memiliki notifikasi baru',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      ...payload.data,
      click_action: payload.data?.click_action || '/dashboard'
    },
    tag: payload.data?.splId || `notification_${Date.now()}`,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Lihat Detail'
      },
      {
        action: 'dismiss',
        title: 'Tutup'
      }
    ],
    timestamp: Date.now(),
    silent: false,
    vibrate: [200, 100, 200]
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle klik pada notifikasi
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event)
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  let clickAction = '/dashboard'
  
  if (event.notification.data?.click_action) {
    clickAction = event.notification.data.click_action
  } else if (event.action === 'view' && event.notification.data?.splId) {
    clickAction = `/dashboard/staff/pengajuan/${event.notification.data.splId}`
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            return client.navigate(clickAction)
          })
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(clickAction)
      }
    })
  )
})

self.addEventListener('notificationclose', (event) => {
  console.log('🚪 Notification closed:', event.notification.tag)
})

self.addEventListener('install', (event) => {
  console.log('⚙️ Firebase messaging service worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('✅ Firebase messaging service worker activated')
  event.waitUntil(self.clients.claim())
})