# Schema Database - Update Log

## Perubahan Terbaru

### 1. Penambahan Cascade Rules (Data Integrity)

Schema database telah diupdate dengan aturan cascade yang tepat untuk menjaga integritas data:

#### **Model Spl (SPL/Lembur)**

**Requester (Pembuat SPL):**
- `onDelete: Restrict` - User yang punya SPL **TIDAK BISA DIHAPUS**
- `onUpdate: Cascade` - Jika user ID berubah, SPL akan ikut update
- **Alasan:** Data historis SPL harus tetap ada

**Supervisor (Penyetuju Level 1):**
- `onDelete: SetNull` - Jika supervisor dihapus, field supervisor di SPL jadi NULL
- `onUpdate: Cascade` - Jika supervisor ID berubah, SPL akan ikut update
- **Alasan:** SPL tetap ada meskipun supervisor resign/dihapus

**Approver/Manager (Penyetuju Level 2):**
- `onDelete: SetNull` - Jika manager dihapus, field approver di SPL jadi NULL
- `onUpdate: Cascade` - Jika manager ID berubah, SPL akan ikut update
- **Alasan:** SPL tetap ada meskipun manager resign/dihapus

#### **Model UserNotification**

**User (Pemilik Notifikasi):**
- `onDelete: Cascade` - Jika user dihapus, notifikasi ikut terhapus
- `onUpdate: Cascade` - Jika user ID berubah, notifikasi akan ikut update
- **Alasan:** Notifikasi tidak perlu disimpan jika user sudah dihapus

### 2. Implikasi untuk Aplikasi

#### **Saat Hapus User:**

1. **User dengan SPL (sebagai requester):**
   - ❌ **TIDAK BISA DIHAPUS** (akan error)
   - Solusi: Delete SPL-nya dulu, baru hapus user
   - Atau: Jangan hapus user yang punya SPL (untuk menjaga data historis)

2. **User sebagai Supervisor/Manager:**
   - ✅ **BISA DIHAPUS**
   - SPL yang dia approve akan tetap ada
   - Field `supervisorId` atau `approverId` akan jadi `NULL`
   - Nama approver masih tersimpan di data lain (jika diperlukan)

3. **User dengan Notifikasi:**
   - ✅ **BISA DIHAPUS**
   - Notifikasi akan otomatis terhapus

4. **User dengan Subordinates (Bawahan):**
   - API sudah handle: cek dulu apakah punya bawahan
   - Jika punya, tidak bisa dihapus
   - Harus reassign subordinates dulu

### 3. Best Practices

#### **Hapus User:**

```typescript
// ✅ BENAR - Cek dulu sebelum hapus
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    _count: {
      select: {
        splRequests: true,
        subordinates: true,
      }
    }
  }
})

if (user._count.splRequests > 0) {
  throw new Error('User masih memiliki SPL, tidak bisa dihapus')
}

if (user._count.subordinates > 0) {
  throw new Error('User masih menjadi supervisor, tidak bisa dihapus')
}

await prisma.user.delete({ where: { id: userId } })
```

#### **Arsip User (Alternatif):**

Alih-alih hapus user, tambahkan field `isActive` atau `deletedAt`:

```prisma
model User {
  // ... fields lainnya
  isActive  Boolean   @default(true)
  deletedAt DateTime?
}
```

Lalu filter user yang aktif:

```typescript
const activeUsers = await prisma.user.findMany({
  where: { isActive: true }
})
```

### 4. Migration Status

✅ Schema sudah diupdate dengan `npx prisma db push`
✅ Database sudah sync dengan schema terbaru
⚠️ Prisma Client perlu di-generate ulang

### 5. Cara Update Prisma Client

Jika ada error saat generate, ikuti langkah ini:

1. **Stop semua dev server:**
   ```bash
   # Tekan Ctrl+C di terminal yang running dev server
   ```

2. **Close IDE/Editor** (opsional, jika masih error)

3. **Generate ulang Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Atau langsung build:**
   ```bash
   npm run build
   ```
   (Build akan otomatis generate Prisma Client)

### 6. Testing

Setelah schema update, test scenario berikut:

1. ✅ Buat user baru → Berhasil
2. ✅ Buat SPL untuk user → Berhasil
3. ❌ Hapus user yang punya SPL → Gagal (sesuai expected)
4. ✅ Hapus SPL dulu → Berhasil
5. ✅ Hapus user setelah SPL dihapus → Berhasil
6. ✅ Hapus supervisor → Berhasil, SPL tetap ada, supervisorId jadi NULL

### 7. Rollback (Jika Diperlukan)

Jika ingin rollback ke schema lama:

```bash
# Restore dari backup atau
npx prisma migrate reset
```

---

**Last Updated:** 2026-01-05
**Schema Version:** Latest with Cascade Rules
