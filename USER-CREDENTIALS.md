# 🔐 Daftar User & Kredensial Login

## Password Semua User: `password123`

---

## 👤 Daftar User

| No | Email | Nama | PIN | Role | Department | Supervisor |
|----|-------|------|-----|------|------------|------------|
| 1 | admin@tunasestaindonesia.com | Super Administrator | 000000 | SUPER_ADMIN | System | - |
| 2 | tiyas@tunasestaindonesia.com | TIYAS INDAH SETYOWURI | 210 | MANAGER | Management | - |
| 3 | nizar@tunasestaindonesia.com | NIZAR NAZARUDIN | 222 | GA | General Affair | - |
| 4 | hayyu@tunasestaindonesia.com | HAYYU SABRINA | 212 | HR | HR | - |
| 5 | ganes@tunasestaindonesia.com | GANES TIRZA YEMIMA | 137 | PRODUCTION_SUPERVISOR | Produksi | - |
| 6 | amin@tunasestaindonesia.com | ABDUL WAHID AMIN | 209 | STAFF | IT | - |
| 7 | hajar@tunasestaindonesia.com | HAJAR ANNISA SEPTIARANI | 219 | STAFF | Lab | - |
| 8 | pandu@tunasestaindonesia.com | PANDU BIRAWANTO | 221 | TEKNISI | Teknik | GA (Nizar) |
| 9 | rico@tunasestaindonesia.com | Rico effendy | 206 | DRIVER | Driver | GA (Nizar) |
| 10 | fina@tunasestaindonesia.com | FINA OKTAVIANI | 111 | STAFF | Security | GA (Nizar) |
| 11 | teguh@tunasestaindonesia.com | TEGUH WIYONO | 198 | STAFF | Security | GA (Nizar) |
| 12 | wahyu@tunasestaindonesia.com | WAHYU SETYAWAHIDIN | 199 | STAFF | Security | GA (Nizar) |
| 13 | bibit@tunasestaindonesia.com | BIBIT MUHAMMAD ABDURROHMAN | 207 | STAFF | Security | GA (Nizar) |
| 14 | david@tunasestaindonesia.com | DAVID AIBI AMZAH | 208 | STAFF | Security | GA (Nizar) |
| 15 | joko@tunasestaindonesia.com | JOKO BUDIONO | 170 | STAFF | Security | GA (Nizar) |

---

## 🔄 Alur Approval SPL

### Security Staff (6 orang)
```
Security → GA (Nizar) → Manager (Tiyas) → Approved
```

### Teknisi
```
Teknisi (Pandu) → GA (Nizar) → Manager (Tiyas) → Approved
```

### Driver
```
Driver (Rico) → GA (Nizar) → Manager (Tiyas) → Approved
```

### Production Supervisor
```
Production Spv (Ganes) → Manager (Tiyas) → Approved
```

### IT Staff
```
IT Staff (Amin) → Manager (Tiyas) → Approved
```

### Lab Staff
```
Lab Staff (Hajar) → Manager (Tiyas) → Approved
```

### HR
```
HR (Hayyu) → Manager (Tiyas) → Approved
```

### GA
```
GA (Nizar) → Manager (Tiyas) → Approved
```

---

## 📋 Cara Login

1. Buka: `http://localhost:3000/login`
2. Masukkan:
   - **Email:** Pilih dari tabel di atas
   - **Password:** `password123`
3. Klik Login
4. Dashboard akan muncul sesuai role

---

## 🎯 Role & Akses

| Role | Jumlah | Akses Fitur |
|------|--------|-------------|
| **SUPER_ADMIN** | 1 | Admin Panel, CRUD User, Input SPL Manual, Delete SPL, View All Data |
| **MANAGER** | 1 | Approve/Reject SPL Level Final, View All SPL |
| **GA** | 1 | Approve/Reject SPL Tim (Security, Teknisi, Driver), Ajukan SPL Sendiri |
| **HR** | 1 | View Data SPL, Export Report, Ajukan SPL Sendiri |
| **PRODUCTION_SUPERVISOR** | 1 | Ajukan SPL (direct to Manager) |
| **TEKNISI** | 1 | Ajukan SPL (via GA) |
| **DRIVER** | 1 | Ajukan SPL (via GA) |
| **STAFF** | 8 | Ajukan SPL (via Supervisor/GA atau direct to Manager) |

---

## 📝 Testing Scenario

### Test 1: Security Staff Ajukan SPL
1. Login: `fina@tunasestaindonesia.com` / `password123`
2. Menu: Pengajuan SPL
3. Isi form & submit
4. ✅ Status: PENDING_SUPERVISOR (menunggu GA)
5. Logout

### Test 2: GA Approve SPL Security
1. Login: `nizar@tunasestaindonesia.com` / `password123`
2. Menu: Persetujuan SPL Tim
3. Lihat SPL dari Fina
4. Approve
5. ✅ Status: PENDING_MANAGER (menunggu Manager)
6. Logout

### Test 3: Manager Approve SPL
1. Login: `tiyas@tunasestaindonesia.com` / `password123`
2. Menu: Persetujuan SPL
3. Lihat SPL dari Fina (sudah approved by GA)
4. Approve
5. ✅ Status: APPROVED

### Test 4: Production Supervisor Ajukan SPL (Direct to Manager)
1. Login: `ganes@tunasestaindonesia.com` / `password123`
2. Menu: Pengajuan SPL Saya
3. Isi form & submit
4. ✅ Status: PENDING_MANAGER (skip GA, langsung ke Manager)

### Test 5: Admin Create User
1. Login: `admin@tunasestaindonesia.com` / `password123`
2. Menu: Admin Panel → Kelola User → + Tambah User
3. Isi data user baru
4. Submit
5. ✅ User baru terbuat

---

## ⚠️ PENTING - Security

**Jangan commit file ini ke Git!**

File ini sudah ada di `.gitignore`:
```
USER-CREDENTIALS.md
*.credentials.md
```

Pastikan file ini hanya untuk referensi internal.

---

**Last Updated:** 2026-01-05
**Total Users:** 15
**Status:** ✅ Production Ready
