# Fitur Pengawas Produksi (PRODUCTION_SUPERVISOR)

## 📋 Overview

Role **PRODUCTION_SUPERVISOR** (Pengawas Produksi) telah ditambahkan ke sistem SPL dengan karakteristik khusus:
- **Tidak memerlukan supervisor** untuk approval SPL
- **SPL langsung ke Manager** untuk persetujuan final
- **Bisa mengajukan lembur** sendiri

## ✨ Fitur yang Ditambahkan

### 1. **Pendaftaran via Form Register**

Saat mendaftar, user bisa memilih:
- **Department:** `Produksi - Pengawas (Direct to Manager)`
- **Role Otomatis:** `PRODUCTION_SUPERVISOR`
- **Position Otomatis:** `Pengawas Produksi`
- **Supervisor:** `Tidak ada` (null)

**Alur Approval SPL yang ditampilkan:**
```
Pengawas Produksi (Anda) → Manager → Approved
```

### 2. **Pembuatan User via Admin Panel**

Superadmin bisa membuat user dengan role PRODUCTION_SUPERVISOR:

**Langkah:**
1. Login sebagai Superadmin
2. Menu: Admin Panel → Kelola User → + Tambah User
3. Pilih:
   - **Role:** Production Supervisor
   - **Department:** Produksi (atau nama lain)
   - **Position:** Pengawas Produksi
   - **Supervisor:** (Kosongkan atau pilih "Tidak Ada")

### 3. **Pengajuan SPL**

Pengawas Produksi bisa mengajukan SPL dengan:
- Akses menu: Dashboard → Pengajuan SPL Saya
- Isi form SPL seperti biasa
- Tanda tangan digital
- Submit

**Status SPL:**
- Awal: `PENDING_MANAGER` (langsung ke Manager)
- Setelah Manager approve: `APPROVED`
- Jika ditolak: `REJECTED_BY_MANAGER`

**Note:** Skip level supervisor approval karena Pengawas Produksi tidak punya atasan langsung.

## 🔄 Alur Approval SPL

### Untuk PRODUCTION_SUPERVISOR:

```
┌─────────────────────┐
│ Pengajuan SPL       │
│ (Pengawas Produksi) │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ PENDING_     │
    │ MANAGER      │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  Manager     │◄─── Approve/Reject
    │  Review      │
    └──────┬───────┘
           │
           ├─── Approved ──► APPROVED ✓
           │
           └─── Rejected ──► REJECTED_BY_MANAGER ✗
```

### Perbandingan dengan STAFF:

| Aspect | STAFF | PRODUCTION_SUPERVISOR |
|--------|-------|----------------------|
| **Supervisor** | Ada (wajib) | Tidak ada |
| **Approval Level 1** | Supervisor/GA/Dept Head | - (Skip) |
| **Approval Level 2** | Manager | Manager |
| **Initial Status** | PENDING_SUPERVISOR | PENDING_MANAGER |

## 📄 File yang Diupdate

### 1. **Form Register**
- File: `components/auth/RegisterForm.tsx`
- Perubahan: Tambah opsi "Produksi - Pengawas" di dropdown department

### 2. **API Register**
- File: `app/api/auth/register/route.ts`
- Perubahan:
  - Deteksi department "Produksi" → set role `PRODUCTION_SUPERVISOR`
  - Set position `Pengawas Produksi`
  - Skip assign supervisor untuk PRODUCTION_SUPERVISOR

### 3. **API Supervisor Info**
- File: `app/api/auth/supervisor-info/route.ts`
- Perubahan: Handle department "Produksi" → tampilkan approval flow langsung ke Manager

### 4. **API SPL Creation**
- File: `app/api/spl/route.ts`
- Perubahan:
  - Tambah PRODUCTION_SUPERVISOR ke list role yang bisa mengajukan SPL
  - Set initial status `PENDING_MANAGER` untuk PRODUCTION_SUPERVISOR (skip supervisor)

### 5. **Admin Forms** (Sudah Ada)
- File: `app/dashboard/admin/users/new/page.tsx`
- File: `app/dashboard/admin/users/[id]/page.tsx`
- PRODUCTION_SUPERVISOR sudah ada di ROLES dropdown

## 🧪 Testing Scenario

### Scenario 1: Register Pengawas Produksi
1. Buka `/register`
2. Pilih Department: "Produksi - Pengawas (Direct to Manager)"
3. Isi data lainnya
4. Submit
5. ✅ Expected: User terdaftar dengan role PRODUCTION_SUPERVISOR, tidak punya supervisor

### Scenario 2: Pengajuan SPL
1. Login sebagai Pengawas Produksi
2. Buat SPL baru
3. Submit
4. ✅ Expected: SPL status = PENDING_MANAGER (langsung ke Manager, skip supervisor)

### Scenario 3: Approval SPL
1. Login sebagai Manager
2. Buka menu Persetujuan SPL
3. Lihat SPL dari Pengawas Produksi
4. Approve/Reject
5. ✅ Expected: Status berubah ke APPROVED atau REJECTED_BY_MANAGER

### Scenario 4: Admin Create Pengawas Produksi
1. Login sebagai Superadmin
2. Admin Panel → Kelola User → Tambah User
3. Pilih Role: Production Supervisor
4. Kosongkan Supervisor
5. Submit
6. ✅ Expected: User terbuat dengan role PRODUCTION_SUPERVISOR tanpa supervisor

## 🔒 Role Permissions

PRODUCTION_SUPERVISOR memiliki akses:
- ✅ Dashboard
- ✅ Pengajuan SPL Saya
- ✅ Riwayat SPL Saya
- ✅ Persetujuan SPL Tim (jika punya subordinates)
- ✅ Data SPL Tim (jika punya subordinates)
- ❌ Admin Panel (hanya SUPER_ADMIN)
- ❌ Persetujuan SPL Manager (hanya MANAGER)

## 📊 Database Schema

```prisma
model User {
  role: String @default("STAFF")
  // Values: STAFF, TEKNISI, GA, HR, PRODUCTION_SUPERVISOR,
  //         DEPARTMENT_HEAD, MANAGER, SUPER_ADMIN

  supervisorId: String? // null untuk PRODUCTION_SUPERVISOR
}

model Spl {
  status: String @default("PENDING_SUPERVISOR")
  // Values: PENDING_SUPERVISOR, PENDING_MANAGER, APPROVED,
  //         REJECTED_BY_SUPERVISOR, REJECTED_BY_MANAGER

  supervisorId: String? // null untuk SPL dari PRODUCTION_SUPERVISOR
}
```

## 💡 Tips

1. **Untuk HR/Admin:**
   - Pastikan hanya buat role PRODUCTION_SUPERVISOR untuk user yang memang Pengawas Produksi
   - Jangan assign supervisor untuk Pengawas Produksi

2. **Untuk Pengawas Produksi:**
   - SPL Anda langsung di-review oleh Manager
   - Pastikan alasan lembur jelas dan lengkap
   - Tidak perlu approval dari GA atau Kepala Departemen

3. **Untuk Manager:**
   - Review SPL dari Pengawas Produksi langsung
   - Tidak ada approval dari level supervisor sebelumnya

## 🐛 Troubleshooting

### SPL Pengawas Produksi masih PENDING_SUPERVISOR?
**Penyebab:** User masih punya supervisor (supervisorId tidak null)
**Solusi:**
1. Cek via Admin Panel → Edit User
2. Set Supervisor ke "Tidak Ada"
3. Save
4. User buat SPL baru, harusnya langsung PENDING_MANAGER

### Tidak bisa pilih "Produksi" saat register?
**Penyebab:** Form register belum terupdate
**Solusi:**
1. Clear cache browser (Ctrl+Shift+R)
2. Restart dev server
3. Coba lagi

### Role masih STAFF padahal pilih Produksi?
**Penyebab:** API register belum terupdate
**Solusi:**
1. Restart dev server
2. Rebuild: `npm run build`
3. Try register lagi

---

**Last Updated:** 2026-01-05
**Feature Version:** v1.0
**Status:** ✅ Production Ready
