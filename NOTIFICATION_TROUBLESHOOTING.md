# Push Notification Troubleshooting Guide

## Overview
Aplikasi SPL menggunakan Firebase Cloud Messaging (FCM) untuk push notifications. Guide ini membantu troubleshoot masalah notification yang tidak bekerja.

## Checklist Setup

### 1. Firebase Configuration
Pastikan semua environment variables sudah diset di `.env`:

```env
# Client-side Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Server-side Firebase Admin Config
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
```

### 2. Browser Requirements
- ✅ Browser modern (Chrome, Firefox, Edge, Safari)
- ✅ HTTPS connection (atau localhost untuk development)
- ✅ Notification permission granted
- ✅ Service Worker support

### 3. Service Worker Registration
Check di browser console apakah service worker terdaftar:

```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations)
})
```

Expected: `/firebase-messaging-sw.js` harus terdaftar

## Common Issues & Solutions

### Issue 1: Notifikasi Tidak Muncul

**Diagnosis:**
1. Buka Browser DevTools → Console
2. Cari error messages
3. Check Service Worker status di DevTools → Application → Service Workers

**Solutions:**

#### A. Permission Denied
- Check permission status:
  ```javascript
  console.log(Notification.permission) // Should be "granted"
  ```
- Solution: Re-request permission dari settings atau clear browser data

#### B. Service Worker Tidak Terdaftar
- Check di console log apakah ada error saat registrasi
- Solution: Hapus cache browser dan reload:
  ```javascript
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister())
  })
  // Then reload page
  ```

#### C. Firebase Token Tidak Valid
- Check console untuk error "Token invalid"
- Solution: Hapus token dari database dan re-subscribe
  ```sql
  -- Via database console
  DELETE FROM "UserNotification" WHERE "endpoint" LIKE 'fallback-%';
  ```

### Issue 2: Notification Hanya Bekerja Saat App Terbuka (Foreground)

**Cause:** Background notifications tidak dihandle oleh service worker

**Solution:**
1. Verify `firebase-messaging-sw.js` exists di `/public/`
2. Check service worker console untuk errors
3. Verify FCM credentials benar

### Issue 3: "Firebase not configured" Error

**Diagnosis:**
Check Firebase status di console:
```javascript
// Di browser console
import { getFirebaseStatus } from '@/lib/firebase'
console.log(getFirebaseStatus())
```

**Solutions:**
- Pastikan semua NEXT_PUBLIC_* env vars ter-load
- Restart dev server setelah update .env
- Verify .env tidak di-gitignore

### Issue 4: Token Keeps Expiring

**Cause:** Token cleanup terlalu agresif atau Firebase project mismatch

**Solutions:**
1. Verify Firebase project ID sama antara client & server config
2. Check Firebase Console → Project Settings → Cloud Messaging
3. Pastikan VAPID key benar

## Testing Notifications

### Test 1: Manual Browser Notification
```javascript
// Di browser console (setelah permission granted)
new Notification("Test", {
  body: "This is a test notification",
  icon: "/icons/icon-192x192.png"
})
```

### Test 2: Firebase Cloud Messaging Test
1. Buka Firebase Console → Cloud Messaging
2. Klik "Send test message"
3. Paste FCM token dari database
4. Send notification

### Test 3: Application Test
1. Login ke aplikasi
2. Aktifkan notifications di Settings/Dashboard
3. Buka halaman Notification Tester (jika ada)
4. Kirim test notification

## Debug Logs

### Enable Verbose Logging
```javascript
// Add to browser console
localStorage.setItem('debug', 'firebase:*')
```

### Check Notification Tokens in Database
```sql
SELECT
  u.name,
  u.email,
  un.endpoint,
  un."createdAt"
FROM "UserNotification" un
JOIN "User" u ON u.id = un."userId"
ORDER BY un."createdAt" DESC;
```

### Monitor Firebase Admin Logs
Check server logs untuk:
- ✅ `Firebase Admin initialized successfully`
- ❌ `Firebase Admin initialization failed`
- 📨 `Notification sent successfully`
- ⚠️ `Token is invalid, removing from database`

## Production Deployment Checklist

- [ ] All Firebase env vars set di production environment
- [ ] HTTPS enabled (required for service workers)
- [ ] Service worker accessible di `/firebase-messaging-sw.js`
- [ ] Manifest.json includes `gcm_sender_id`
- [ ] Icons available di `/public/icons/`
- [ ] Firebase project billing enabled (jika diperlukan)
- [ ] Test notification dari production console

## Advanced Troubleshooting

### Clear All Application Data
```javascript
// Browser console
await caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key))
})
await navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister())
})
localStorage.clear()
sessionStorage.clear()
// Then reload page
```

### Force Service Worker Update
```javascript
navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  .then(reg => reg.update())
```

### Check Token Validity
Di server console:
```javascript
const { validateToken } = require('./lib/firebase-admin')
validateToken('YOUR_FCM_TOKEN_HERE').then(console.log)
```

## Contact Support

Jika masalah masih berlanjut:
1. Collect error logs dari browser console
2. Collect server logs
3. Check Firebase Console untuk quota/billing issues
4. Review recent code changes yang mungkin affect notifications

## Reference Links
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
