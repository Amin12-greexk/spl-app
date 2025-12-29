# 🚀 Setup Multi-Level Approval Users

## 📋 Overview

Dokumen ini menjelaskan cara setup user untuk sistem multi-level approval (GA dan Department Head).

## 🎯 Struktur Organisasi

```
Manager/HR (Level 3 - Final Approval)
    ↓
GA/Department Head (Level 2 - Supervisor Approval)
    ↓
Staff (Level 1 - Pengajuan)
```

### Contoh Alur Approval:

**Security Staff:**
```
Security Staff → GA (Approve + TTD) → Manager (Final Approve) → APPROVED
```

**IT Staff:**
```
IT Staff → Kepala IT (Approve + TTD) → Manager (Final Approve) → APPROVED
```

---

## 🛠️ Cara Setup Users

### **Metode 1: Menggunakan API Endpoint (Recommended)**

#### Step 1: Login sebagai Manager atau HR
Login ke aplikasi menggunakan akun:
- Email: `tiyas@tunasestaindonesia.com` atau `hr@example.com`
- Password: `password123`

#### Step 2: Call API Setup Users

**Menggunakan Browser/Postman:**

```bash
POST http://localhost:3000/api/admin/setup-users
```

**Menggunakan curl:**

```bash
curl -X POST http://localhost:3000/api/admin/setup-users \
  -H "Cookie: your-session-cookie"
```

**Response:**
```json
{
  "success": true,
  "message": "User setup completed",
  "results": {
    "created": [...],
    "updated": [...],
    "errors": []
  },
  "organizationStructure": [...],
  "info": {
    "defaultPassword": "password123",
    "users": {
      "ga": "ga@tunasestaindonesia.com",
      "itHead": "it.head@tunasestaindonesia.com",
      "security1": "security1@tunasestaindonesia.com",
      "security2": "security2@tunasestaindonesia.com"
    }
  }
}
```

#### Step 3: Verifikasi Struktur Organisasi

```bash
GET http://localhost:3000/api/admin/setup-users
```

Response akan menampilkan supervisor beserta subordinates mereka.

---

### **Metode 2: Menggunakan Prisma Seed Script**

Jika development server tidak running:

```bash
# 1. Stop development server (Ctrl+C)
# 2. Run seed script
npx tsx prisma/seed.ts

# 3. Restart development server
npm run dev
```

---

## 👥 Users yang Dibuat

### **GA (General Affair)**
- Email: `ga@tunasestaindonesia.com`
- Password: `password123`
- PIN: `8888`
- Role: `GA`
- Department: `General Affair`
- **Subordinates**: Security Staff 1 & 2

### **Kepala IT (Department Head)**
- Email: `it.head@tunasestaindonesia.com`
- Password: `password123`
- PIN: `9999`
- Role: `DEPARTMENT_HEAD`
- Department: `IT`
- **Subordinates**: Abdul Wahid Amin (dan staff IT lainnya)

### **Security Staff 1**
- Email: `security1@tunasestaindonesia.com`
- Password: `password123`
- PIN: `1001`
- Role: `STAFF`
- **Supervisor**: GA

### **Security Staff 2**
- Email: `security2@tunasestaindonesia.com`
- Password: `password123`
- PIN: `1002`
- Role: `STAFF`
- **Supervisor**: GA

---

## 🧪 Testing Multi-Level Approval

### Test Case 1: Security Staff SPL

1. **Login sebagai Security Staff 1**
   - Email: `security1@tunasestaindonesia.com`
   - Password: `password123`

2. **Buat pengajuan SPL baru**
   - Status initial: `PENDING_SUPERVISOR`
   - Notifikasi dikirim ke: GA

3. **Login sebagai GA**
   - Email: `ga@tunasestaindonesia.com`
   - Password: `password123`

4. **Approve SPL dengan tanda tangan**
   - Status berubah: `PENDING_MANAGER`
   - Notifikasi dikirim ke: Manager

5. **Login sebagai Manager**
   - Email: `tiyas@tunasestaindonesia.com`
   - Password: `password123`

6. **Final Approve**
   - Status berubah: `APPROVED`
   - Notifikasi dikirim ke: Security Staff 1

### Test Case 2: IT Staff SPL

1. **Login sebagai Abdul Wahid Amin**
   - Email: `amin@tunasestaindonesia.com`
   - Password: `password123`

2. **Buat pengajuan SPL**
   - Status: `PENDING_SUPERVISOR`
   - Notif ke: Kepala IT

3. **Login sebagai Kepala IT**
   - Email: `it.head@tunasestaindonesia.com`
   - Approve SPL

4. **Login sebagai Manager** → Final Approve

---

## 🔧 Troubleshooting

### Q: API endpoint mengembalikan 401 Unauthorized
**A:** Pastikan Anda sudah login sebagai Manager atau HR. Clear cookies dan login ulang.

### Q: User sudah ada tapi tidak punya supervisor
**A:** Jalankan ulang `POST /api/admin/setup-users`. Script akan update user yang sudah ada.

### Q: Ingin menambah department baru
**A:** Edit file `prisma/seed.ts` atau gunakan API endpoint untuk create user baru dengan supervisorId.

---

## 📊 Database Query untuk Manual Setup

Jika ingin manual setup via database:

```sql
-- Lihat semua user dengan supervisor mereka
SELECT
  u.name,
  u.email,
  u.role,
  u.position,
  s.name as supervisor_name
FROM users u
LEFT JOIN users s ON u."supervisorId" = s.id
ORDER BY u.role, u.name;

-- Set supervisor untuk user tertentu
UPDATE users
SET "supervisorId" = (SELECT id FROM users WHERE email = 'ga@tunasestaindonesia.com')
WHERE email = 'security1@tunasestaindonesia.com';
```

---

## ✅ Checklist Setup

- [ ] Prisma Client sudah di-generate (`npx prisma generate`)
- [ ] Database schema sudah up-to-date (`npx prisma db push`)
- [ ] Login sebagai Manager/HR
- [ ] Call API `POST /api/admin/setup-users`
- [ ] Verifikasi dengan `GET /api/admin/setup-users`
- [ ] Test login sebagai GA
- [ ] Test login sebagai Security Staff
- [ ] Test create SPL dan approval flow

---

## 🎓 Next Steps

Setelah setup users selesai:
1. ✅ Buat dashboard GA (`/dashboard/ga`)
2. ✅ Update UI untuk menampilkan multi-level status
3. ✅ Test end-to-end approval flow
4. ✅ Update export Excel/PDF dengan info supervisor

---

**🔑 Default Password:** `password123`

**⚠️ PENTING:** Ganti password default setelah setup untuk keamanan!
