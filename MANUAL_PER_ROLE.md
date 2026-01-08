# MANUAL PER ROLE SISTEM SPL
## PT Tunas Esta Indonesia

Versi: 2.0
Tanggal: Januari 2026
Platform: Web (Browser)

---

## DAFTAR ISI

1. Pendahuluan
2. Aturan Umum dan Istilah
3. Alur Persetujuan SPL
4. Navigasi, Notifikasi, dan Profil
5. Manual Per Role
   5.1 Staff, Teknisi, Driver
   5.2 GA (General Affair)
   5.3 Kepala Departemen
   5.4 Production Supervisor
   5.5 HR
   5.6 Manager
   5.7 Super Admin
6. Troubleshooting Singkat

---

## 1. PENDAHULUAN

Manual ini menjelaskan langkah kerja yang jelas untuk setiap role di Sistem SPL:
- STAFF
- TEKNISI
- DRIVER
- GA
- DEPARTMENT_HEAD (Kepala Departemen)
- PRODUCTION_SUPERVISOR
- HR
- MANAGER
- SUPER_ADMIN

Catatan:
- "Security" adalah nama departemen, bukan role. Pengguna dengan departemen Security memiliki aturan jam reguler khusus.

---

## 2. ATURAN UMUM DAN ISTILAH

### 2.1 Istilah
- SPL: Surat Perintah Lembur.
- Pemohon: karyawan yang mengajukan SPL.
- Supervisor: GA atau Kepala Departemen (jika departemen supervised).
- Manager: approver final.
- Manual Entry: SPL yang dibuat oleh Super Admin karena telat input.

### 2.2 Status SPL
- PENDING_SUPERVISOR: menunggu persetujuan supervisor (GA/Kepala Departemen).
- PENDING_MANAGER: menunggu persetujuan manager.
- APPROVED: disetujui.
- REJECTED_BY_SUPERVISOR: ditolak supervisor.
- REJECTED_BY_MANAGER: ditolak manager.

### 2.3 Aturan Input SPL
- Tanggal lembur tidak boleh sebelum hari ini.
- Jam mulai lembur harus lebih besar dari jam pulang reguler.
- Format jam wajib 24 jam (HH:MM).
- Tanda tangan wajib diisi sebelum submit.
- Pengajuan setelah batas waktu (diset manager) akan ditolak untuk non-Security.
- Untuk Security: jam reguler bisa diubah langsung di form SPL (shift bisa lintas hari).

### 2.4 Bukti Foto
- Foto bukti bersifat opsional.
- Jika diunggah, harus file gambar (JPG/PNG) dan ukuran maksimal 5 MB.

---

## 3. ALUR PERSETUJUAN SPL

### 3.1 Staff, Teknisi, Driver
1. Jika departemen supervised:
   - Pemohon -> Supervisor (GA/Kepala Departemen) -> Manager
2. Jika departemen tidak supervised:
   - Pemohon -> Manager

### 3.2 GA, Kepala Departemen, Production Supervisor, HR
- Pengajuan langsung ke Manager (tanpa supervisor).

### 3.3 Manual Entry (Telat Input)
1. Super Admin membuat SPL manual.
2. Pemohon menandatangani di menu Telat Input.
3. SPL masuk ke alur persetujuan normal (supervisor atau manager sesuai departemen).

---

## 4. NAVIGASI, NOTIFIKASI, DAN PROFIL

### 4.1 Navigasi
Gunakan Sidebar untuk akses menu sesuai role.

### 4.2 Notifikasi
- Icon lonceng di header menunjukkan notifikasi terbaru.
- Badge akan hilang setelah notifikasi dibuka atau menu terkait dikunjungi.
- Notifikasi berisi status SPL, persetujuan, atau telat input.

### 4.3 Profil
Menu Profil berisi:
- Nama, email, role, departemen, PIN
- Form untuk ubah email dan password

---

## 5. MANUAL PER ROLE

### 5.1 Staff, Teknisi, Driver

#### Akses Menu
- Dashboard
- Pengajuan SPL
- Riwayat SPL
- Telat Input
- Profil Saya

#### Tugas Utama
1. Mengajukan SPL.
2. Melihat riwayat SPL.
3. Menandatangani SPL manual (Telat Input).

#### Langkah Ajukan SPL
1. Buka menu "Pengajuan SPL".
2. Isi tanggal lembur (tidak boleh sebelum hari ini).
3. Cek jam reguler (read-only untuk non-Security).
4. Isi jam mulai dan selesai lembur (format 24 jam).
5. Isi alasan lembur secara jelas.
6. (Opsional) unggah foto bukti.
7. Buat tanda tangan digital.
8. Klik "Ajukan SPL".
9. Sistem mengarahkan kembali ke Dashboard.

#### Validasi Penting
- Jam mulai lembur harus lebih besar dari jam pulang reguler.
- Pengajuan setelah batas waktu akan ditolak (non-Security).
- Jika jam reguler belum diatur, hubungi Super Admin.

#### Riwayat SPL
1. Buka menu "Riwayat SPL".
2. Gunakan filter status atau pencarian.
3. Klik detail untuk melihat info lengkap.
4. Pengajuan status "PENDING" bisa dihapus.

#### Telat Input (Manual Entry)
1. Buka menu "Telat Input".
2. Pilih SPL manual yang muncul.
3. Buat tanda tangan.
4. Klik "Simpan Tanda Tangan".
5. SPL diteruskan ke atasan.

#### Catatan Khusus Departemen Security
- Jam reguler bisa diubah langsung di form SPL.
- Shift malam (lintas hari) boleh, tetapi jam lembur tidak boleh masuk jam reguler.

---

### 5.2 GA (General Affair)

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Persetujuan SPL Tim
- Data SPL Tim
- Telat Input
- Profil Saya

#### Tugas Utama
1. Ajukan SPL untuk diri sendiri.
2. Review SPL tim (sebagai supervisor).
3. Monitor data SPL tim.

#### Ajukan SPL Sendiri
1. Buka "Pengajuan SPL Saya".
2. Isi form sama seperti staff.
3. Pengajuan langsung ke Manager.

#### Persetujuan SPL Tim
1. Buka "Persetujuan SPL Tim".
2. Pilih SPL yang menunggu persetujuan.
3. Klik "Setujui" lalu isi tanda tangan.
4. Atau "Tolak" dengan alasan.
5. Setelah disetujui, SPL lanjut ke Manager.

#### Data SPL Tim
1. Buka "Data SPL Tim".
2. Gunakan filter status, tanggal, atau pencarian.
3. Lihat perkembangan SPL tim.

#### Telat Input
- Hanya untuk SPL manual yang perlu tanda tangan Anda sebagai pemohon.

---

### 5.3 Kepala Departemen

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Persetujuan SPL Tim
- Data SPL Tim
- Telat Input
- Profil Saya

#### Tugas Utama
1. Ajukan SPL untuk diri sendiri.
2. Review SPL tim (sebagai supervisor).
3. Monitor data SPL tim.

#### Proses Persetujuan
- Sama dengan GA, wajib tanda tangan saat menyetujui.

---

### 5.4 Production Supervisor

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Telat Input
- Profil Saya

#### Tugas Utama
1. Ajukan SPL untuk diri sendiri.
2. Melihat riwayat SPL.
3. Menandatangani SPL manual (Telat Input).

#### Catatan
- Pengajuan langsung ke Manager (tanpa supervisor).

---

### 5.5 HR

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Data dan Laporan SPL
- Telat Input
- Profil Saya
- Kelola Kepala Departemen (khusus HR Head)

#### Tugas Utama
1. Mengelola data dan laporan SPL.
2. Ekspor data Excel dan PDF.
3. Ajukan SPL untuk diri sendiri.
4. Menandatangani SPL manual (Telat Input).

#### Data dan Laporan SPL
1. Buka menu "Data dan Laporan SPL".
2. Gunakan filter status, tanggal, dan pencarian.
3. Klik "Export Excel" untuk data tabular.
4. Klik "Generate Rekap PDF" untuk rekap resmi.

Catatan:
- PDF berisi tanda tangan pemohon dan atasan jika tersedia.

#### Kelola Kepala Departemen (HR Head)
1. Buka menu "Kelola Kepala Departemen".
2. Cari staff berdasarkan departemen.
3. Klik "Jadikan Kepala Dept" atau "Unassign".

#### Catatan
- HR tidak dapat menyetujui SPL final kecuali menggunakan akun Manager.

---

### 5.6 Manager

#### Akses Menu
- Dashboard
- Persetujuan SPL
- Kelola Kepala Departemen
- Profil Saya

#### Tugas Utama
1. Menyetujui atau menolak SPL level manager.
2. Mengatur batas waktu pengajuan lembur.
3. Menetapkan Kepala Departemen.

#### Mengatur Batas Waktu Pengajuan
1. Buka Dashboard Manager.
2. Set waktu minimal lembur (HH:MM).
3. Klik "Simpan Perubahan".
4. Batas ini berlaku untuk semua non-Security.

#### Persetujuan SPL
1. Buka menu "Persetujuan SPL".
2. Pilih pengajuan PENDING_MANAGER.
3. Klik "Setujui" atau "Tolak".
4. Jika menolak, isi alasan penolakan.

#### Kelola Kepala Departemen
1. Buka menu "Kelola Kepala Departemen".
2. Assign atau unassign staff menjadi Kepala Departemen.

---

### 5.7 Super Admin

#### Akses Menu
- Admin Panel
- Kelola User
- Kelola Departemen
- Jam Reguler
- Input SPL Manual
- Riwayat SPL
- Telat Input
- Profil Saya

#### Tugas Utama
1. Kelola user dan role.
2. Kelola departemen dan status supervised.
3. Atur jam reguler per user.
4. Input SPL manual untuk telat input.
5. Audit riwayat SPL.

#### Kelola User
1. Buka "Kelola User".
2. Tambah user baru atau edit user.
3. Atur role, departemen, supervisor, dan posisi.
4. Hapus user jika tidak memiliki subordinates.

#### Kelola Departemen
1. Buka "Kelola Departemen".
2. Tambah atau edit departemen.
3. Atur:
   - supervised: ya/tidak
   - approvalMode: DIRECT, GA, atau DEPARTMENT_HEAD

#### Jam Reguler
1. Buka "Jam Reguler".
2. Pilih user.
3. Set jam kerja reguler (HH:MM).
4. Simpan perubahan.

#### Input SPL Manual
1. Buka "Input SPL Manual".
2. Pilih user dan isi tanggal lembur.
3. Isi waktu lembur, alasan, dan detail lain.
4. Simpan. Sistem akan meminta user tanda tangan di Telat Input.

#### Riwayat SPL
1. Buka "Riwayat SPL".
2. Lihat semua SPL (manual dan non-manual).
3. Hapus SPL jika diperlukan.

---

## 6. TROUBLESHOOTING SINGKAT

1. Tidak bisa login:
   - Periksa email dan password.
   - Hubungi HR atau Super Admin jika akun belum dibuat.
2. SPL gagal diajukan:
   - Cek tanggal lembur (tidak boleh sebelum hari ini).
   - Cek jam lembur vs jam reguler.
   - Pastikan tanda tangan terisi.
3. Telat Input kosong:
   - Tidak ada SPL manual yang menunggu tanda tangan.
4. Notifikasi tidak muncul:
   - Pastikan izin notifikasi di browser aktif.
   - Buka menu Notifikasi untuk refresh.

---

Dokumen ini menjadi referensi resmi penggunaan Sistem SPL per role.
Jika ada perubahan sistem, manual ini akan diperbarui.
