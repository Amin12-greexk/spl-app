# Setup Awal - Database Kosong

Database sudah dikosongkan dan siap diisi dengan data real. Berikut langkah-langkah setup awal:

## 1. Membuat Akun Superadmin Pertama

Karena database kosong, Anda perlu membuat akun superadmin pertama secara manual:

### Opsi A: Via Halaman Register (Rekomendasi)

1. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

2. Buka browser dan akses: `http://localhost:3000/register`

3. Isi form registrasi dengan data superadmin:
   - **Nama:** Nama Anda
   - **Email:** email@tunasestaindonesia.com (atau email perusahaan)
   - **Password:** Password yang kuat
   - **PIN:** 6 digit PIN (contoh: 000000)
   - **Role:** Pilih "SUPER_ADMIN"
   - **Department:** System / IT
   - **Position:** Super Administrator

4. Setelah berhasil register, login dengan akun tersebut

### Opsi B: Manual via Database

Jika halaman register tidak tersedia atau ada masalah, Anda bisa insert manual via Prisma Studio:

1. Jalankan Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Buka table `users`

3. Klik "Add record" dan isi:
   - **email:** admin@tunasestaindonesia.com
   - **name:** Super Administrator
   - **password:** (hash dari password Anda - lihat cara di bawah)
   - **pin:** 000000
   - **role:** SUPER_ADMIN
   - **department:** System
   - **position:** Super Admin

4. Untuk hash password, buat file temporary `hash-password.js`:
   ```javascript
   const bcrypt = require('bcryptjs');
   const password = 'password_anda_disini';
   const hash = bcrypt.hashSync(password, 10);
   console.log(hash);
   ```

   Jalankan: `node hash-password.js`

## 2. Login Sebagai Superadmin

Setelah akun superadmin dibuat:

1. Akses: `http://localhost:3000/login`
2. Login dengan email dan password yang sudah dibuat
3. Anda akan diarahkan ke dashboard superadmin

## 3. Mulai Menambah Data

Dari dashboard superadmin, Anda bisa:

### A. Tambah User (Karyawan)

1. Klik menu **"Kelola User"** di sidebar atau dashboard admin
2. Klik tombol **"+ Tambah User"**
3. Isi data user:
   - Nama Lengkap
   - Email
   - Password
   - PIN (6 digit)
   - Role (STAFF, TEKNISI, GA, HR, PRODUCTION_SUPERVISOR, DEPARTMENT_HEAD, MANAGER)
   - Departemen (IT, HR, Production, Security, dll)
   - Posisi (IT Staff, Security Guard, dll)
   - Supervisor (Opsional - pilih atasan langsung)

4. Klik **"Buat User"**

### B. Role dan Hierarki yang Disarankan

**Setup yang disarankan:**

1. **Buat Manager terlebih dahulu** (untuk approval SPL level akhir)
   - Role: MANAGER
   - Tidak perlu supervisor

2. **Buat Supervisor/Kepala Departemen**
   - Role: GA / DEPARTMENT_HEAD / PRODUCTION_SUPERVISOR
   - Tidak perlu supervisor (atau langsung ke Manager)

3. **Buat Staff**
   - Role: STAFF / TEKNISI
   - Pilih supervisor yang sesuai (GA, Department Head, dll)

**Alur Approval SPL:**
- Staff → Supervisor → Manager → Approved
- GA/Department Head → Manager → Approved (skip supervisor level)

## 4. Setting Minimal Waktu Lembur

1. Dari dashboard admin atau via Prisma Studio
2. Tambahkan setting:
   - Key: `MIN_OVERTIME_START`
   - Value: `16:30` (atau jam minimal mulai lembur)

## 5. Command Berguna

```bash
# Jalankan aplikasi development
npm run dev

# Clear semua data (reset database)
npm run db:clear

# Isi database dengan data sample (untuk testing)
npm run db:seed

# Buka Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client (jika ada perubahan schema)
npx prisma generate

# Buat migration baru (jika ubah schema)
npx prisma migrate dev --name nama_migration
```

## 6. Struktur Role

| Role | Deskripsi | Bisa Approve SPL? |
|------|-----------|-------------------|
| SUPER_ADMIN | Akses penuh sistem | Ya (sebagai Manager) |
| MANAGER | Manager perusahaan | Ya (approval final) |
| DEPARTMENT_HEAD | Kepala Departemen | Ya (level 1) |
| PRODUCTION_SUPERVISOR | Pengawas Produksi | Ya (level 1) |
| GA | General Affair | Ya (level 1) |
| HR | Human Resource | Tidak (hanya lihat data) |
| TEKNISI | Teknisi | Tidak |
| STAFF | Staff biasa | Tidak |

## 7. Troubleshooting

### Database connection error
- Pastikan PostgreSQL running
- Cek file `.env` apakah `DATABASE_URL` sudah benar

### Tidak bisa login
- Pastikan email dan password benar
- Cek di Prisma Studio apakah user sudah ada

### Halaman error 403 Unauthorized
- Pastikan role user sudah benar
- Logout dan login ulang

## 8. Tips

1. **Backup Database Berkala**
   ```bash
   pg_dump database_name > backup.sql
   ```

2. **Testing dengan Data Sample**
   - Gunakan `npm run db:seed` untuk isi data testing
   - Gunakan `npm run db:clear` untuk reset

3. **Ubah Password User**
   - Via halaman Profile (user bisa ubah sendiri)
   - Via halaman Admin → Edit User (superadmin bisa ubah password user lain)

---

**Selamat! Database siap digunakan dengan data real.** 🎉

Jika ada pertanyaan atau masalah, silakan check dokumentasi atau hubungi developer.
