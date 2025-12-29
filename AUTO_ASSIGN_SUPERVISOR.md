# 🎯 Auto-Assign Supervisor - Implementation Guide

## ✅ Status: **COMPLETED**

Sistem auto-assign supervisor berdasarkan department sudah selesai diimplementasikan!

---

## 📋 **Apa yang Sudah Dibuat?**

### **1. Helper Function - Department Mapping** (`lib/supervisor-mapping.ts`)

Mapping department ke supervisor role:

| Department | Supervisor Role | Supervisor |
|------------|----------------|------------|
| Security | GA | General Affair Supervisor |
| Satpam | GA | General Affair Supervisor |
| Cleaning Service | GA | General Affair Supervisor |
| IT | DEPARTMENT_HEAD | Kepala IT |
| Lainnya | - | Langsung ke Manager |

**Functions:**
- ✅ `getSupervisorForDepartment()` - Dapatkan supervisor user untuk department
- ✅ `hasSupervisorMapping()` - Cek apakah department punya mapping
- ✅ `getSupervisorRoleName()` - Get supervisor role name
- ✅ `getDepartmentsWithSupervisor()` - List semua department dengan supervisor

---

### **2. API Register - Auto Assign** (`app/api/auth/register/route.ts`)

**Fitur Baru:**
- ✅ Auto-assign `supervisorId` saat user registrasi
- ✅ Auto-set `position` berdasarkan department
- ✅ Return message dengan info supervisor
- ✅ Include supervisor info di response

**Flow:**
```
User register dengan department "Security"
    ↓
System cari GA user dari database
    ↓
Set user.supervisorId = GA.id
    ↓
Set user.position = "Security Staff"
    ↓
User berhasil dibuat dengan supervisor!
```

---

### **3. API Supervisor Info** (`app/api/auth/supervisor-info/route.ts`)

**Endpoint:** `GET /api/auth/supervisor-info?department=Security`

**Response:**
```json
{
  "hasSupervisor": true,
  "supervisor": {
    "id": "xxx",
    "name": "General Affair Supervisor",
    "position": "GA Supervisor",
    "department": "General Affair"
  },
  "message": "Atasan Anda: General Affair Supervisor",
  "approvalFlow": [
    "Staff (Anda)",
    "GA Supervisor (General Affair Supervisor)",
    "Manager",
    "Approved"
  ]
}
```

---

### **4. Register Form - Live Preview** (`components/auth/RegisterForm.tsx`)

**Fitur Baru:**
- ✅ **Real-time supervisor info** saat user ketik department
- ✅ **Approval flow visualization** dengan badge
- ✅ **Auto-complete feedback** (500ms debounce)
- ✅ **Success message** dengan info supervisor

**UI Features:**
- Loading spinner saat fetch supervisor info
- Info box dengan approval flow steps
- Color-coded badges (green → blue → purple)
- Warning message jika supervisor belum setup

---

## 🧪 **Testing Guide**

### **Test Case 1: Security Staff Registration**

1. **Buka halaman registrasi:** `http://localhost:3000/register`

2. **Isi form dengan:**
   - PIN: `1003`
   - Nama: `Security Staff Test`
   - Email: `security.test@tunasesta.com`
   - Department: **`Security`** ← Ketik ini
   - Password: `password123`

3. **Observe:**
   - ✅ Loading spinner muncul
   - ✅ Info box muncul dengan "Atasan Anda: General Affair Supervisor"
   - ✅ Approval flow: `Staff → GA Supervisor → Manager → Approved`

4. **Klik "Daftar Akun Baru"**

5. **Verify:**
   - ✅ Toast success: "Registrasi berhasil! Atasan Anda: General Affair Supervisor (GA Supervisor)"
   - ✅ Redirect ke login page

6. **Login dengan akun baru** → Buat SPL

7. **Verify SPL:**
   - ✅ Status: `PENDING_SUPERVISOR`
   - ✅ Notifikasi dikirim ke GA (bukan Manager!)

---

### **Test Case 2: IT Staff Registration**

1. **Isi form dengan department:** `IT`

2. **Observe:**
   - ✅ Info box: "Atasan Anda: Kepala IT"
   - ✅ Approval flow: `Staff → IT Manager (Kepala IT) → Manager → Approved`

3. **Register & verify** supervisor = Kepala IT

---

### **Test Case 3: Department Tanpa Supervisor**

1. **Isi form dengan department:** `Marketing` (tidak ada mapping)

2. **Observe:**
   - ✅ Info box: "SPL Anda akan langsung diajukan ke Manager"
   - ✅ Approval flow: `Staff → Manager → Approved`

3. **Register & verify:**
   - ✅ `supervisorId` = `null`
   - ✅ SPL status: `PENDING_MANAGER` (skip supervisor)

---

## 🔧 **Menambahkan Department Baru**

### **Cara 1: Edit Mapping File**

Edit `lib/supervisor-mapping.ts`:

```typescript
export const DEPARTMENT_SUPERVISOR_MAPPING: Record<string, string> = {
  // Existing mappings...

  // Tambahkan department baru
  "Production": "DEPARTMENT_HEAD",  // Butuh Kepala Produksi
  "Marketing": "DEPARTMENT_HEAD",   // Butuh Kepala Marketing
  "Finance": "DEPARTMENT_HEAD",     // Butuh Kepala Finance
}
```

### **Cara 2: Buat User Department Head**

```bash
# Login sebagai Manager/HR
# Call API:
POST /api/admin/setup-users

# Atau manual via database:
INSERT INTO users (email, name, password, pin, role, department, position)
VALUES (
  'production.head@tunasesta.com',
  'Kepala Produksi',
  '$2a$10$...', -- hash of password123
  '2001',
  'DEPARTMENT_HEAD',
  'Production',
  'Production Manager'
);
```

---

## 📊 **Database Schema**

### **User Table - New Fields:**

```sql
ALTER TABLE users ADD COLUMN position TEXT;
ALTER TABLE users ADD COLUMN supervisorId TEXT REFERENCES users(id);
```

**Example Data:**

| email | name | role | department | position | supervisorId |
|-------|------|------|-----------|----------|--------------|
| ga@tunasesta.com | GA Supervisor | GA | General Affair | GA Supervisor | NULL |
| security1@tunasesta.com | Security 1 | STAFF | Security | Security Staff | [GA_ID] |
| it.head@tunasesta.com | Kepala IT | DEPARTMENT_HEAD | IT | IT Manager | NULL |
| amin@tunasesta.com | Abdul Wahid | STAFF | IT | IT Staff | [IT_HEAD_ID] |

---

## 🎯 **Approval Flow After Auto-Assign**

### **Security Staff:**
```
Security Staff mengajukan SPL
    ↓ (supervisorId = GA.id)
Status: PENDING_SUPERVISOR
    ↓
GA approve dengan TTD
    ↓
Status: PENDING_MANAGER
    ↓
Manager approve
    ↓
Status: APPROVED ✅
```

### **IT Staff:**
```
IT Staff mengajukan SPL
    ↓ (supervisorId = IT_HEAD.id)
Status: PENDING_SUPERVISOR
    ↓
Kepala IT approve dengan TTD
    ↓
Status: PENDING_MANAGER
    ↓
Manager approve
    ↓
Status: APPROVED ✅
```

### **Staff Tanpa Supervisor (Marketing, etc):**
```
Marketing Staff mengajukan SPL
    ↓ (supervisorId = null)
Status: PENDING_MANAGER (skip supervisor!)
    ↓
Manager approve
    ↓
Status: APPROVED ✅
```

---

## 🔍 **Troubleshooting**

### Q: User registrasi tapi supervisorId tetap NULL
**A:** Pastikan:
1. User GA/Department Head sudah dibuat (`POST /api/admin/setup-users`)
2. Department name exact match (case-sensitive di mapping)
3. Cek console log di API register

### Q: Form tidak menampilkan supervisor info
**A:**
1. Cek browser console untuk errors
2. Pastikan API `/api/auth/supervisor-info` berjalan
3. Test manual: `GET /api/auth/supervisor-info?department=Security`

### Q: Ingin mengubah mapping department
**A:** Edit `lib/supervisor-mapping.ts` → Restart dev server

### Q: Department dengan typo (misal: "Scurity" vs "Security")
**A:** System tidak akan match → User akan tidak punya supervisor → Direct to manager

---

## ✅ **Checklist Implementation**

- [x] Helper function `supervisor-mapping.ts` created
- [x] API register auto-assign supervisor
- [x] API supervisor-info endpoint
- [x] RegisterForm live preview supervisor
- [x] Auto-set position based on department
- [x] Success message with supervisor info
- [x] Approval flow visualization
- [x] Database migration completed
- [x] Testing documentation

---

## 🚀 **Next Steps**

Sekarang Anda bisa:
1. ✅ **Setup GA & Department Heads** - Run `POST /api/admin/setup-users`
2. ✅ **Test registrasi** dengan department Security/IT
3. ✅ **Verify approval flow** end-to-end
4. ✅ **Buat dashboard GA** untuk approval SPL subordinates
5. ✅ **Update UI** untuk menampilkan multi-level status

---

**🎉 Selamat! Auto-assign supervisor sudah berjalan!**

Sekarang setiap user baru yang register dengan department **Security**, **IT**, dll akan otomatis mendapat supervisor sesuai mapping.
