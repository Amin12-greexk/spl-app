# MANUAL PER ROLE SISTEM SPL
## PT Tunas Esta Indonesia

Versi: 2.1
Tanggal: Januari 2026
Platform: Web (Browser)

---

## DAFTAR ISI

1. Pendahuluan
2. Aturan Umum dan Istilah
3. Alur Persetujuan SPL
4. Navigasi, Notifikasi, dan Profil
5. Manual Per Role
   5.1 Staff Umum (Non-GA)
   5.2 Teknisi (di bawah GA)
   5.3 Driver (di bawah GA)
   5.4 Security (di bawah GA)
   5.5 GA (General Affair)
   5.6 Kepala Departemen
   5.7 Production Supervisor
   5.8 HR
   5.9 Manager
   5.10 Super Admin
6. Troubleshooting Singkat

---

## 1. PENDAHULUAN

Manual ini berisi panduan lengkap, langkah demi langkah, sesuai role pengguna pada Sistem SPL:
- STAFF (Non-GA)
- TEKNISI (di bawah GA)
- DRIVER (di bawah GA)
- SECURITY (di bawah GA)
- GA
- DEPARTMENT_HEAD (Kepala Departemen)
- PRODUCTION_SUPERVISOR
- HR
- MANAGER
- SUPER_ADMIN

Catatan:
- "Security" adalah departemen, bukan role. User dengan departemen Security memiliki aturan jam reguler khusus.
- "Data Lama" adalah data lembur sebelum sistem berjalan (seed/migrasi). Wajib TTD dulu sebelum diproses.

---

## 2. ATURAN UMUM DAN ISTILAH

### 2.1 Istilah
- SPL: Surat Perintah Lembur.
- Pemohon: karyawan yang mengajukan SPL.
- Supervisor: GA atau Kepala Departemen (jika departemen supervised).
- Manager: approver final.
- Manual Entry: SPL yang dibuat oleh Super Admin karena telat input.
- Data Lama: SPL hasil seed/migrasi sebelum sistem berjalan.

### 2.2 Status SPL
- PENDING_SUPERVISOR: menunggu persetujuan supervisor (GA/Kepala Departemen).
- PENDING_MANAGER: menunggu persetujuan manager.
- APPROVED: disetujui.
- REJECTED_BY_SUPERVISOR: ditolak supervisor.
- REJECTED_BY_MANAGER: ditolak manager.
- IN_PROGRESS: realisasi sedang berjalan.
- DONE: realisasi selesai.

### 2.3 Aturan Input SPL
- Tanggal lembur tidak boleh sebelum hari ini.
- Jam mulai lembur harus >= jam pulang reguler (boleh sama).
- Format jam wajib 24 jam (HH:MM).
- Tanda tangan wajib diisi sebelum submit.
- Pengajuan setelah batas waktu (diatur Manager) akan ditolak untuk non-Security.
- Jam reguler diambil dari akun user. Jika kosong, hubungi Super Admin.

### 2.4 Jam Reguler Security
Shift Security:
- P1: 07:00 - 15:00
- P2: 11:00 - 19:00
- M1: 16:00 - 04:00 (lintas hari)
- M2: 23:00 - 07:00 (lintas hari)

Catatan:
- Jam lembur tidak boleh masuk jam reguler.
- Shift lintas hari tetap dihitung sesuai tanggal kerja.

### 2.5 Bukti Foto
Wajib:
- Security, Teknisi, Driver (departemen di bawah GA) pada saat submit dan saat selesai realisasi.

Opsional:
- Role lain dapat mengunggah foto bukti (JPG/PNG, maks 5 MB).

### 2.6 Realisasi Lembur (Mulai/Selesai)
- Tombol "Mulai" muncul di tabel riwayat saat waktu lembur sudah masuk.
- Security, Teknisi, Driver hanya bisa mulai setelah disetujui GA.
- Role lain boleh mulai walau masih menunggu Manager, selama masih dalam window lembur.
- Tombol "Selesai" muncul setelah realisasi dimulai.
- Jika durasi <= 30 menit, sistem meminta konfirmasi dan lembur tidak dihitung.
- Jika melebihi rencana, wajib isi alasan melebihi rencana.
- Jika waktu lembur lewat dan belum mulai, status menjadi "Kadaluarsa" dan tidak bisa dimulai.

### 2.7 Telat Input (Manual Entry)
- Dibuat oleh Super Admin.
- Pemohon harus TTD di menu Telat Input.
- Setelah TTD, SPL masuk ke alur persetujuan normal.

### 2.8 Data Lama (Legacy)
- Data lembur sebelum sistem berjalan (hasil seed/migrasi).
- Wajib TTD di menu Data Lama.
- Setelah TTD, data diteruskan ke atasan untuk persetujuan.
- Tidak ada proses mulai/selesai (hanya dokumentasi).
- Saat login, akan muncul popup jika ada Data Lama.

---

## 3. ALUR PERSETUJUAN SPL

### 3.1 Staff Umum (Non-GA)
- Jika departemen supervised: Pemohon -> Kepala Departemen -> Manager
- Jika departemen tidak supervised: Pemohon -> Manager

### 3.2 Teknisi, Driver, Security (di bawah GA)
- Pemohon -> GA -> Manager

### 3.3 GA, Kepala Departemen, Production Supervisor, HR
- Pemohon -> Manager

### 3.4 Telat Input (Manual Entry)
- Super Admin membuat SPL manual
- Pemohon TTD di menu Telat Input
- SPL masuk ke alur persetujuan normal sesuai departemen

### 3.5 Data Lama (Legacy)
- Pemohon TTD di menu Data Lama
- SPL diteruskan ke atasan
- Tidak ada realisasi mulai/selesai

---

## 4. NAVIGASI, NOTIFIKASI, DAN PROFIL

### 4.1 Navigasi
Gunakan Sidebar untuk akses menu sesuai role.

### 4.2 Notifikasi
- Icon lonceng di header menunjukkan notifikasi terbaru.
- Badge hilang setelah notifikasi dibuka atau menu terkait dikunjungi.
- Notifikasi berisi status SPL, persetujuan, telat input, atau data lama.

### 4.3 Profil
Menu Profil berisi:
- Nama, email, role, departemen, PIN
- Form ubah email dan password

---

## 5. MANUAL PER ROLE

### 5.1 Staff Umum (Non-GA)

#### Akses Menu
- Dashboard
- Pengajuan SPL
- Riwayat SPL
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Mengajukan SPL.
2. Memulai dan menyelesaikan realisasi lembur.
3. Menandatangani Telat Input dan Data Lama.
4. Melihat riwayat SPL.

#### Langkah Ajukan SPL
1. Buka menu "Pengajuan SPL".
2. Isi tanggal lembur (tidak boleh sebelum hari ini).
3. Cek jam reguler (read-only).
4. Isi jam mulai dan selesai lembur (format 24 jam).
5. Isi alasan lembur dengan jelas.
6. (Opsional) unggah foto bukti.
7. Buat tanda tangan digital.
8. Klik "Ajukan SPL".
9. Sistem kembali ke Dashboard.

#### Realisasi Mulai/Selesai
1. Buka Dashboard -> tabel "Riwayat Lembur Saya".
2. Saat jam lembur sudah masuk, klik "Mulai".
3. Setelah selesai, klik "Selesai".
4. Isi catatan realisasi (wajib).
5. (Opsional) unggah foto bukti.
6. Jika melebihi rencana, isi alasan melebihi rencana.
7. Simpan. Jika durasi <= 30 menit, konfirmasi terlebih dahulu.

#### Telat Input (Manual Entry)
1. Buka menu "Telat Input".
2. Pilih SPL manual yang muncul.
3. Buat tanda tangan.
4. Klik "Simpan Tanda Tangan".

#### Data Lama (Legacy)
1. Jika muncul popup, klik "Buka Data Lama".
2. Pilih data lama dan tanda tangan.
3. Data diteruskan ke atasan untuk persetujuan.

#### Riwayat SPL
1. Buka menu "Riwayat SPL".
2. Gunakan filter status atau pencarian.
3. Pengajuan status pending dapat dihapus.

---

### 5.2 Teknisi (di bawah GA)

#### Akses Menu
- Dashboard
- Pengajuan SPL
- Riwayat SPL
- Persetujuan SPL Tim (tidak tersedia)
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Mengajukan SPL dengan bukti foto.
2. Memulai realisasi setelah disetujui GA.
3. Menyelesaikan realisasi dengan bukti foto.
4. Menandatangani Telat Input dan Data Lama.

#### Langkah Ajukan SPL
1. Buka menu "Pengajuan SPL".
2. Isi tanggal lembur (>= hari ini).
3. Cek jam reguler (read-only).
4. Isi jam mulai dan selesai lembur.
5. Isi alasan lembur.
6. Unggah foto bukti (wajib).
7. Buat tanda tangan digital.
8. Klik "Ajukan SPL".

#### Realisasi Mulai/Selesai
1. Tunggu SPL disetujui GA (status jadi PENDING_MANAGER).
2. Saat jam lembur masuk, klik "Mulai".
3. Setelah selesai, klik "Selesai".
4. Isi catatan realisasi (wajib).
5. Unggah foto bukti realisasi (wajib).
6. Jika melebihi rencana, isi alasan melebihi rencana.

#### Telat Input dan Data Lama
Sama seperti Staff Umum, wajib tanda tangan di menu masing-masing.

---

### 5.3 Driver (di bawah GA)

#### Akses Menu
- Dashboard
- Pengajuan SPL
- Riwayat SPL
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Mengajukan SPL dengan bukti foto.
2. Memulai realisasi setelah disetujui GA.
3. Menyelesaikan realisasi dengan bukti foto.

#### Langkah Ajukan SPL
1. Buka "Pengajuan SPL".
2. Isi tanggal, jam lembur, alasan.
3. Unggah foto bukti (wajib).
4. Buat tanda tangan.
5. Klik "Ajukan SPL".

#### Realisasi Mulai/Selesai
1. Tunggu persetujuan GA.
2. Klik "Mulai" saat jam lembur masuk.
3. Klik "Selesai", isi catatan (wajib).
4. Unggah foto bukti (wajib).
5. Isi alasan jika melebihi rencana.

#### Telat Input dan Data Lama
Sama seperti Staff Umum.

---

### 5.4 Security (di bawah GA)

#### Akses Menu
- Dashboard
- Pengajuan SPL
- Riwayat SPL
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Mengajukan SPL sesuai shift Security.
2. Memulai realisasi setelah disetujui GA.
3. Menyelesaikan realisasi dengan bukti foto.

#### Langkah Ajukan SPL
1. Buka "Pengajuan SPL".
2. Pilih tanggal lembur.
3. Atur jam reguler sesuai shift (P1, P2, M1, M2).
4. Isi jam lembur (mulai >= selesai jam reguler).
5. Isi alasan lembur.
6. Unggah foto bukti (wajib).
7. Buat tanda tangan.
8. Klik "Ajukan SPL".

#### Realisasi Mulai/Selesai
1. Tunggu persetujuan GA.
2. Klik "Mulai" saat jam lembur masuk.
3. Klik "Selesai", isi catatan (wajib).
4. Unggah foto bukti realisasi (wajib).
5. Isi alasan jika melebihi rencana.

#### Telat Input dan Data Lama
Sama seperti Staff Umum.

---

### 5.5 GA (General Affair)

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Persetujuan SPL Tim
- Data SPL Tim
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Ajukan SPL untuk diri sendiri.
2. Review SPL tim sebagai supervisor.
3. Monitor data SPL tim.

#### Ajukan SPL Sendiri
1. Buka "Pengajuan SPL Saya".
2. Isi form seperti Staff Umum.
3. Pengajuan langsung ke Manager.
4. Realisasi bisa dimulai saat jam lembur masuk.

#### Persetujuan SPL Tim
1. Buka "Persetujuan SPL Tim".
2. Pilih SPL yang menunggu.
3. Klik "Setujui" lalu isi tanda tangan.
4. Atau "Tolak" dengan alasan.
5. SPL diteruskan ke Manager.

#### Data SPL Tim
1. Buka "Data SPL Tim".
2. Gunakan filter status, tanggal, atau pencarian.
3. Lihat perkembangan SPL tim.

#### Telat Input dan Data Lama
Jika GA memiliki SPL manual atau data lama, tanda tangan di menu masing-masing.

---

### 5.6 Kepala Departemen

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Persetujuan SPL Tim
- Data SPL Tim
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Ajukan SPL untuk diri sendiri.
2. Review SPL tim sebagai supervisor.
3. Monitor data SPL tim.

#### Proses Persetujuan
1. Buka "Persetujuan SPL Tim".
2. Pilih SPL yang menunggu persetujuan.
3. Setujui dengan tanda tangan, atau tolak dengan alasan.

Catatan khusus Kepala Departemen Produksi:
- Menu pengajuan, riwayat, telat input, dan data lama tidak ditampilkan.

---

### 5.7 Production Supervisor

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Ajukan SPL untuk diri sendiri.
2. Melakukan realisasi lembur sesuai jadwal.
3. Menandatangani Telat Input dan Data Lama jika ada.

#### Catatan
- Pengajuan langsung ke Manager (tanpa supervisor).

---

### 5.8 HR

#### Akses Menu
- Dashboard
- Pengajuan SPL Saya
- Riwayat SPL Saya
- Data dan Laporan SPL
- Cek Absensi
- Telat Input
- Data Lama
- Profil Saya

#### Tugas Utama
1. Mengelola data dan laporan SPL.
2. Ekspor data Excel dan PDF.
3. Cek absensi karyawan (API).
4. Ajukan SPL untuk diri sendiri.

#### Data dan Laporan SPL
1. Buka "Data dan Laporan SPL".
2. Gunakan filter status, tanggal, dan pencarian.
3. Klik "Export Excel" untuk data tabular.
4. Klik "Generate Rekap PDF" untuk rekap resmi.

#### Cek Absensi
1. Buka menu "Cek Absensi".
2. Cari user berdasarkan nama atau PIN.
3. Klik "Cek Absensi" untuk detail per tanggal.

Catatan:
- HR tidak dapat menyetujui SPL final (approval final hanya oleh Manager).

---

### 5.9 Manager

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
2. Atur waktu minimal lembur (HH:MM).
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

### 5.10 Super Admin

#### Akses Menu
- Admin Panel
- Kelola User
- Kelola Departemen
- Jam Reguler
- Input SPL Manual
- Riwayat SPL
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
4. Simpan. User wajib TTD di menu Telat Input.

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
   - Pastikan foto bukti diunggah (untuk Security, Teknisi, Driver).
3. Tidak bisa mulai lembur:
   - Cek apakah sudah disetujui GA (untuk Security, Teknisi, Driver).
   - Cek apakah jam lembur sudah masuk window rencana.
   - Jika status "Kadaluarsa", SPL tidak bisa dimulai.
4. Telat Input kosong:
   - Tidak ada SPL manual yang menunggu tanda tangan.
5. Data Lama tidak muncul:
   - Tidak ada data legacy untuk user tersebut.
   - Jika ada, cek menu Data Lama atau popup di dashboard.
6. Notifikasi tidak muncul:
   - Pastikan izin notifikasi browser aktif.
   - Buka menu Notifikasi untuk refresh.

---

Dokumen ini menjadi referensi resmi penggunaan Sistem SPL per role.
Jika ada perubahan sistem, manual ini akan diperbarui.
