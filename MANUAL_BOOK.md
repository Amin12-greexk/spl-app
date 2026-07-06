# MANUAL BOOK SISTEM SPL
## Sistem Pengajuan Surat Perintah Lembur
### PT Tunas Esta Indonesia

**Versi:** 1.2
**Tanggal:** November 2025
**Platform:** Web-Based Application

---

## DAFTAR ISI

1. [Pendahuluan](#1-pendahuluan)
2. [Akses Sistem](#2-akses-sistem)
3. [Panduan untuk Staff](#3-panduan-untuk-staff)
4. [Panduan untuk Manager](#4-panduan-untuk-manager)
5. [Panduan untuk HR](#5-panduan-untuk-hr)
6. [Fitur Notifikasi](#6-fitur-notifikasi)
7. [Troubleshooting](#7-troubleshooting)
8. [Glossary](#8-glossary)

---

## 1. PENDAHULUAN

### 1.1 Tentang Sistem SPL

Sistem SPL (Surat Perintah Lembur) adalah aplikasi berbasis web yang dirancang untuk memfasilitasi proses pengajuan, persetujuan, dan pengelolaan data lembur karyawan PT Tunas Esta Indonesia. Sistem ini mengintegrasikan proses manual menjadi digital untuk meningkatkan efisiensi dan transparansi.

### 1.2 Tujuan Manual Book

Manual book ini disusun untuk memberikan panduan lengkap dan mendetail kepada seluruh pengguna sistem dalam mengoperasikan aplikasi SPL dengan benar dan efektif.

### 1.3 Pengguna Sistem

Sistem SPL memiliki tiga level pengguna dengan hak akses yang berbeda:

- **Staff**: Karyawan yang mengajukan Surat Perintah Lembur
- **Supervisor/Manager**: Pihak berwenang (berjenjang) yang menyetujui atau menolak pengajuan SPL
- **HR (Human Resources)**: Administrator yang mengelola data dan laporan SPL secara keseluruhan

### 1.4 Spesifikasi Teknis

- **Platform**: Web-Based (dapat diakses melalui browser)
- **Browser yang Didukung**:
  - Google Chrome (versi terbaru)
  - Mozilla Firefox (versi terbaru)
  - Microsoft Edge (versi terbaru)
  - Safari (versi terbaru)
- **Koneksi Internet**: Diperlukan koneksi internet yang stabil
- **Resolusi Layar**: Optimal pada resolusi 1366x768 atau lebih tinggi
- **Protokol Keamanan**: HTTPS (untuk notifikasi push)

---

## 2. AKSES SISTEM

### 2.1 Registrasi Akun Baru

Untuk pengguna baru yang belum memiliki akun:

#### Langkah-langkah Registrasi:

1. **Akses Halaman Registrasi**
   - Buka browser dan akses URL sistem SPL
   - Klik tombol "Daftar" atau "Register" pada halaman login
   - Anda akan diarahkan ke halaman formulir registrasi

2. **Mengisi Formulir Registrasi**

   Isi seluruh field yang tersedia dengan informasi yang valid:

   - **Nama Lengkap**: Masukkan nama lengkap sesuai identitas resmi
   - **Email**: Gunakan alamat email aktif yang valid
     - Format: nama@domain.com
     - Email ini akan digunakan untuk login dan notifikasi
   - **Password**: Buat password yang kuat
     - Minimal 8 karakter
     - Gunakan kombinasi huruf, angka, dan simbol
     - Contoh: Pass123!@#
   - **Konfirmasi Password**: Masukkan ulang password yang sama
   - **PIN**: Masukkan 3 digit PIN pribadi
     - Digunakan untuk verifikasi dan identifikasi
     - Harus berupa angka
     - Contoh: 123, 456, 789
   - **Departemen** (Opsional): Pilih departemen tempat Anda bekerja
     - IT
     - Production
     - Quality Control
     - Warehouse
     - Finance
     - Marketing
     - Dan lain-lain

3. **Submit Registrasi**
   - Pastikan semua data telah diisi dengan benar
   - Klik tombol "Daftar" atau "Register"
   - Tunggu konfirmasi pendaftaran berhasil

4. **Verifikasi Akun**
   - Sistem akan menampilkan notifikasi pendaftaran berhasil
   - Role/peran Anda akan diatur sebagai "STAFF" secara default
   - Untuk role Manager atau HR, hubungi administrator sistem

### 2.2 Login ke Sistem

#### Langkah-langkah Login:

1. **Akses Halaman Login**
   - Buka browser dan akses URL sistem SPL
   - Anda akan melihat halaman login

2. **Memasukkan Kredensial**
   - **Email**: Masukkan alamat email yang terdaftar
   - **Password**: Masukkan password akun Anda
   - Centang "Remember me" jika ingin sistem menyimpan sesi login (opsional)

3. **Submit Login**
   - Klik tombol "Masuk" atau "Login"
   - Sistem akan memverifikasi kredensial Anda

4. **Akses Dashboard**
   - Jika kredensial benar, Anda akan diarahkan ke dashboard
   - Dashboard yang ditampilkan sesuai dengan role Anda (Staff/Manager/HR)

### 2.3 Lupa Password

Jika Anda lupa password:

1. Klik link "Lupa Password?" pada halaman login
2. Masukkan alamat email terdaftar
3. Sistem akan mengirimkan link reset password ke email Anda
4. Buka email dan klik link reset password
5. Masukkan password baru
6. Login dengan password baru

### 2.4 Melihat Informasi Profil

Untuk melihat informasi profil Anda:

1. **Klik foto profil** atau nama pengguna di pojok kanan atas header
2. **Dropdown menu** akan terbuka menampilkan:
   - **Foto profil**: Lingkaran dengan inisial nama Anda
   - **Nama lengkap**: Nama Anda
   - **Email**: Alamat email terdaftar
   - **Role badge**: Staff / Manager / HR (dengan warna berbeda)
   - **Departemen**: Departemen Anda (jika tersedia)
   - **PIN**: Badge biru menampilkan 3 digit PIN Anda (contoh: "PIN: 123")
   - **Menu Dashboard**: Link untuk kembali ke dashboard
   - **Tombol Keluar**: Untuk logout dari sistem

**Fungsi PIN:**
- PIN ditampilkan untuk referensi dan verifikasi identitas
- Dapat digunakan untuk absensi manual
- Tercantum dalam laporan rekap lembur

### 2.5 Logout dari Sistem

Untuk keluar dari sistem:

1. Klik ikon profil atau nama pengguna di pojok kanan atas
2. Dropdown menu akan terbuka
3. Pilih menu "Keluar dari Sistem" (tombol merah di bagian bawah)
4. Anda akan diarahkan kembali ke halaman login
5. Sesi Anda telah berakhir dengan aman

---

## 3. PANDUAN UNTUK STAFF

### 3.1 Dashboard Staff

Setelah login sebagai Staff, Anda akan melihat dashboard dengan informasi berikut:

#### Komponen Dashboard:

1. **Header Sambutan**
   - Menampilkan ucapan selamat (sesuai waktu: pagi/siang/sore)
   - Nama lengkap Anda
   - Role: Staff
   - Departemen Anda

2. **Kartu Statistik**

   Dashboard menampilkan 4 kartu statistik:

   - **Total SPL**: Total seluruh pengajuan SPL Anda
   - **Menunggu**: Jumlah SPL dengan status PENDING (belum diproses)
   - **Disetujui**: Jumlah SPL yang telah disetujui (APPROVED)
   - **Ditolak**: Jumlah SPL yang ditolak (REJECTED)

3. **Aksi Cepat**

   Dua tombol akses cepat:

   - **Buat SPL Baru**: Membuat pengajuan lembur baru
   - **Riwayat SPL**: Melihat semua pengajuan Anda

4. **Pengaturan Notifikasi**

   Panel untuk mengaktifkan/menonaktifkan notifikasi push

5. **Informasi Akun** (Dropdown Profile)

   Klik foto profil atau nama di pojok kanan atas untuk membuka dropdown yang menampilkan:
   - Foto profil (inisial nama)
   - Nama lengkap
   - Email
   - Role badge (Staff/Manager/HR)
   - Departemen
   - PIN (3 digit, ditampilkan dalam badge biru)
   - Menu Dashboard
   - Tombol Keluar

6. **Aktivitas Terbaru**

   Menampilkan 3 pengajuan SPL terbaru dengan status masing-masing

### 3.2 Membuat Pengajuan SPL Baru

#### 3.2.1 Persiapan Sebelum Mengajukan SPL

Sebelum membuat pengajuan, pastikan:

- Waktu pengajuan masih dalam batas yang ditentukan (default: sebelum pukul 16:30)
- Anda memiliki alasan yang jelas dan valid untuk lembur
- Informasi proyek/pekerjaan yang akan dikerjakan telah disiapkan
- Perangkat Anda mendukung fitur tanda tangan digital

**PENTING**:
- Pengajuan SPL hanya dapat dilakukan sebelum batas waktu yang ditentukan oleh Manager
- Jika melewati batas waktu, pengajuan akan ditolak secara otomatis
- Untuk kasus urgent yang melewati batas waktu, temui Manager secara langsung

#### 3.2.2 Langkah-langkah Membuat Pengajuan SPL

1. **Akses Halaman Pengajuan**

   Dari dashboard:
   - Klik tombol "Buat SPL Baru" pada panel Aksi Cepat, ATAU
   - Klik menu "Pengajuan" di sidebar, ATAU
   - Navigasi ke "Dashboard > Staff > Pengajuan"

2. **Membaca Peringatan Sistem**

   Pada bagian atas formulir, terdapat kotak peringatan berwarna kuning:

   ```
   Perhatian:
   Pengajuan setelah melewati batas jam minimal akan ditolak.
   Jika sudah lewat jam batas, temui Manager secara langsung untuk persetujuan.
   ```

   Bacalah peringatan ini dengan seksama sebelum melanjutkan.

3. **Mengisi Formulir Pengajuan**

   Formulir meliputi bagian-bagian berikut:
   - **Data Dasar**: Tanggal Lembur dan Nama Proyek.
   - **Jam Kerja Reguler**: Jam mulai dan selesai reguler. Khusus Security dapat memilih preset Shift (P1, P2, M1, M2, F1).
   - **Waktu Lembur**: Jam mulai dan selesai lembur (tidak boleh bentrok dengan jam reguler).
   - **Alasan & Foto**: Alasan lembur dan Foto Bukti (wajib untuk Security/Teknik/Driver).
   - **Tanda Tangan**: Tanda tangan digital wajib diisi.

   **A. Informasi Dasar**

   - **Tanggal Lembur** (Wajib)
     - Klik field tanggal untuk membuka kalender
     - Pilih tanggal ketika Anda akan melakukan lembur
     - Format: DD/MM/YYYY
     - Contoh: 27/11/2025

   - **Nama Proyek** (Opsional)
     - Masukkan nama proyek atau kegiatan yang akan dikerjakan
     - Maksimal 255 karakter
     - Contoh: "Project Alpha", "Website Revamp", "Urgent Bug Fix"

   **B. Waktu Lembur**

   - **Waktu Mulai** (Wajib)
     - Klik field waktu untuk memilih jam mulai lembur
     - Format 24 jam: HH:MM
     - Contoh: 17:00, 18:30, 20:00
     - CATATAN: Sistem akan memvalidasi apakah Anda masih dalam batas waktu pengajuan

   - **Waktu Selesai** (Wajib)
     - Pilih jam selesai lembur
     - Format 24 jam: HH:MM
     - Harus lebih besar dari waktu mulai
     - Contoh: 20:00, 22:00

   - **Durasi Lembur** (Otomatis)
     - Sistem akan otomatis menghitung durasi berdasarkan waktu mulai dan selesai
     - Ditampilkan dalam format: "X jam Y menit"
     - Contoh: "3 jam 30 menit"

   **C. Alasan Lembur**

   - **Keterangan** (Wajib)
     - Jelaskan secara detail alasan dan kebutuhan lembur
     - Minimal 10 karakter
     - Gunakan bahasa yang profesional dan jelas
     - Contoh yang BAIK:
       ```
       Menyelesaikan laporan bulanan yang harus diserahkan besok pagi
       kepada direktur. Terdapat 15 sheet Excel yang perlu direkap dan
       dianalisis, serta pembuatan presentasi PowerPoint.
       ```
     - Contoh yang KURANG BAIK:
       ```
       Lembur
       ```

   **D. Tanda Tangan**

   - **Signature Pad** (Wajib)
     - Gunakan mouse atau touchscreen untuk membuat tanda tangan
     - Gambar tanda tangan Anda pada area yang disediakan
     - Tanda tangan harus jelas dan terbaca
     - Tombol yang tersedia:
       - **Hapus**: Menghapus tanda tangan dan menggambar ulang
       - **Bersihkan**: Membersihkan seluruh area tanda tangan

4. **Membaca Panduan Pengajuan SPL**

   Sebelum submit, baca kotak informasi biru yang berisi:

   - Jelaskan alasan lembur dengan detail dan jelas
   - Anda akan mendapat notifikasi status persetujuan via sistem

5. **Submit Pengajuan**

   - **Sebelum submit, pastikan:**
     - Semua field wajib telah diisi
     - Waktu mulai dan selesai sudah benar
     - Alasan lembur telah dijelaskan dengan detail
     - Tanda tangan telah dibuat

   - **Klik tombol "Ajukan SPL"**
     - Tombol berwarna hijau di bagian bawah formulir
     - Sistem akan memproses pengajuan Anda
     - Tampil loading "Sedang Mengajukan..."

   - **Konfirmasi Berhasil**
     - Jika berhasil, akan muncul notifikasi: "SPL berhasil diajukan!"
     - Anda akan diarahkan ke halaman riwayat SPL
     - Status pengajuan: PENDING (Menunggu Persetujuan)

6. **Pembatalan Pengajuan**

   Jika ingin membatalkan:
   - Klik tombol "Batal" di bagian bawah formulir
   - Anda akan kembali ke halaman sebelumnya
   - Data yang telah diisi tidak akan disimpan

#### 3.2.3 Validasi dan Error Handling

Sistem akan melakukan validasi sebagai berikut:

1. **Validasi Tanda Tangan**
   - Error: "Tanda tangan belum diisi"
   - Solusi: Pastikan Anda telah membuat tanda tangan di signature pad

2. **Validasi Batas Waktu**
   - Error: "Lewat Batas Waktu - Pengajuan hanya bisa sebelum pukul XX:XX"
   - Solusi: Pengajuan Anda melewati batas waktu yang ditentukan. Temui Manager secara langsung.

3. **Validasi Field Wajib**
   - Error: "Field [nama field] harus diisi"
   - Solusi: Lengkapi semua field yang ditandai dengan tanda bintang (*)

4. **Validasi Waktu**
   - Error: "Waktu selesai harus lebih besar dari waktu mulai"
   - Solusi: Periksa kembali waktu mulai dan selesai

### 3.3 Melihat Riwayat SPL

#### 3.3.1 Mengakses Halaman Riwayat

Dari dashboard:
- Klik tombol "Riwayat SPL" pada panel Aksi Cepat, ATAU
- Klik menu "SPL Saya" di sidebar, ATAU
- Navigasi ke "Dashboard > Staff"

#### 3.3.2 Komponen Halaman Riwayat

1. **Header**
   - Judul: "Riwayat Pengajuan SPL"
   - Deskripsi: "Lihat semua pengajuan Surat Perintah Lembur Anda"

2. **Filter dan Pencarian**
   - Filter berdasarkan status (Semua/Pending/Approved/Rejected)
   - Pencarian berdasarkan tanggal atau kata kunci

3. **Daftar SPL**
   - Ditampilkan dalam bentuk kartu (card)
   - Setiap kartu menampilkan:
     - Status (badge berwarna)
     - Tanggal lembur
     - Waktu mulai - selesai
     - Total jam lembur
     - Nama proyek (jika ada)
     - Tanggal pengajuan
     - Tombol aksi

#### 3.3.3 Status Badge

Sistem menggunakan 3 jenis status dengan kode warna:

1. **PENDING (Menunggu Persetujuan)**
   - Warna: Kuning
   - Keterangan: Pengajuan masih menunggu review dari Manager
   - Aksi yang tersedia: Lihat Detail, Hapus

2. **APPROVED (Disetujui)**
   - Warna: Hijau
   - Keterangan: Pengajuan telah disetujui oleh Manager
   - Aksi yang tersedia: Lihat Detail

3. **REJECTED (Ditolak)**
   - Warna: Merah
   - Keterangan: Pengajuan ditolak oleh Manager
   - Aksi yang tersedia: Lihat Detail (termasuk alasan penolakan)

### 3.4 Melihat Detail SPL

#### 3.4.1 Akses Detail SPL

Dari halaman riwayat:
1. Cari SPL yang ingin dilihat detailnya
2. Klik tombol "Lihat Detail" pada kartu SPL
3. Anda akan diarahkan ke halaman detail SPL

#### 3.4.2 Informasi dalam Detail SPL

Halaman detail menampilkan informasi lengkap:

1. **Header**
   - Nama pengaju (Anda)
   - Email pengaju
   - Status badge (besar)

2. **Informasi Lembur**
   - **Tanggal Lembur**: Format lengkap (DD MMMM YYYY)
   - **Total Jam**: Durasi lembur dalam jam
   - **Waktu Mulai**: Jam mulai lembur (HH:MM)
   - **Waktu Selesai**: Jam selesai lembur (HH:MM)
   - **Nama Proyek**: Nama proyek/kegiatan (jika diisi)

3. **Alasan Lembur**
   - Ditampilkan dalam box dengan latar abu-abu
   - Menampilkan keterangan lengkap yang Anda input saat pengajuan

4. **Informasi Penolakan** (Jika status REJECTED)
   - Ditampilkan dalam box merah
   - Berisi:
     - Alasan penolakan dari Manager
     - Penjelasan detail mengapa pengajuan ditolak

5. **Informasi Persetujuan** (Jika status APPROVED atau REJECTED)
   - **Diproses oleh**: Nama Manager yang memproses
   - **Email Manager**: Email Manager yang memproses
   - **Tanggal Persetujuan**: Waktu kapan diproses (DD MMMM YYYY HH:MM)

6. **Tombol Aksi**
   - **Kembali**: Kembali ke halaman riwayat
   - **Hapus Pengajuan**: Hanya tersedia untuk status PENDING

### 3.5 Menghapus Pengajuan SPL

#### 3.5.1 Syarat Menghapus Pengajuan

- Hanya pengajuan dengan status **PENDING** yang dapat dihapus
- Pengajuan yang sudah APPROVED atau REJECTED tidak dapat dihapus
- Penghapusan bersifat permanen dan tidak dapat dibatalkan

#### 3.5.2 Langkah-langkah Menghapus Pengajuan

1. **Akses Detail SPL**
   - Buka halaman detail SPL yang ingin dihapus
   - Pastikan status masih PENDING

2. **Klik Tombol Hapus**
   - Scroll ke bagian bawah halaman detail
   - Klik tombol "Hapus Pengajuan" (berwarna merah)

3. **Konfirmasi Penghapusan**
   - Sistem akan menampilkan dialog konfirmasi:
     ```
     Apakah Anda yakin ingin menghapus pengajuan SPL ini?
     ```
   - Klik "OK" untuk melanjutkan penghapusan
   - Klik "Batal" untuk membatalkan

4. **Verifikasi Penghapusan**
   - Jika berhasil, akan muncul notifikasi: "SPL berhasil dihapus"
   - Anda akan diarahkan kembali ke halaman riwayat
   - Pengajuan yang dihapus tidak akan muncul lagi di daftar

### 3.6 Tips dan Best Practices untuk Staff

1. **Perencanaan Pengajuan**
   - Ajukan SPL sesegera mungkin setelah mengetahui kebutuhan lembur
   - Jangan menunda hingga mendekati batas waktu
   - Siapkan detail pekerjaan yang akan dilakukan

2. **Penulisan Alasan Lembur**
   - Gunakan bahasa yang formal dan profesional
   - Jelaskan dengan spesifik pekerjaan yang akan dilakukan
   - Cantumkan urgensi atau deadline jika ada
   - Hindari alasan yang terlalu singkat atau tidak jelas

3. **Tanda Tangan Digital**
   - Buat tanda tangan yang konsisten
   - Pastikan tanda tangan cukup besar dan jelas
   - Jika salah, gunakan tombol "Hapus" untuk menggambar ulang

4. **Monitoring Pengajuan**
   - Aktifkan notifikasi untuk mendapat update real-time
   - Cek status pengajuan secara berkala
   - Jika ditolak, baca alasan penolakan dengan seksama

5. **Komunikasi dengan Manager**
   - Jika pengajuan ditolak, komunikasikan dengan Manager
   - Untuk kasus urgent di luar jam, koordinasi langsung dengan Manager
   - Pastikan alasan penolakan dipahami untuk perbaikan di masa depan

---

## 4. PANDUAN UNTUK MANAGER

### 4.1 Dashboard Manager

Dashboard Manager menampilkan:

1. **Header Sambutan**
   - Ucapan selamat
   - Nama Manager
   - Role: Manager
   - Departemen

2. **Kartu Statistik**
   - **Total SPL**: Semua pengajuan yang perlu direview
   - **Menunggu**: SPL yang belum diproses
   - **Disetujui**: SPL yang telah disetujui
   - **Ditolak**: SPL yang telah ditolak

3. **Aksi Cepat**

   Manager memiliki akses ke dua fitur utama:

   **A. Persetujuan SPL**
   - Tombol untuk mereview SPL yang pending
   - Menampilkan jumlah SPL yang menunggu

   **B. Atur Batas Maksimal Pengajuan**
   - Mengatur jam batas maksimal staff mengajukan SPL
   - Default: 16:30
   - Format 24 jam
   - Dapat disesuaikan untuk fleksibilitas

4. **Informasi Akun** (Dropdown Profile)

   Klik foto profil di pojok kanan atas untuk melihat:
   - Data profil Manager (nama, email, role, departemen, PIN)

5. **Aktivitas Terbaru**
   - 3 pengajuan SPL terbaru di sistem

### 4.2 Mengatur Batas Waktu Pengajuan

#### 4.2.1 Fungsi Batas Waktu

Batas waktu pengajuan adalah waktu maksimal di mana staff diperbolehkan mengajukan SPL. Setelah melewati waktu ini:

- Sistem akan menolak otomatis pengajuan baru
- Staff harus menemui Manager secara langsung untuk persetujuan
- Bertujuan untuk memastikan perencanaan lembur yang lebih terorganisir

#### 4.2.2 Langkah-langkah Mengatur Batas Waktu

1. **Akses Pengaturan**
   - Dari dashboard Manager
   - Temukan panel "Atur Batas Maksimal Pengajuan"
   - Panel berwarna ungu dengan ikon pengaturan

2. **Membaca Informasi**

   Panel menampilkan informasi:
   - Default waktu: 16:30
   - Format waktu: 24 jam (HH:MM)
   - Contoh format: 07:30, 13:45, 16:30
   - Keterangan: "Pengajuan setelah jam ini ditolak otomatis"

3. **Mengubah Waktu**

   - **Klik field waktu**
     - Field bertipe time picker dengan format 24 jam

   - **Pilih jam dan menit**
     - Gunakan selector waktu yang muncul
     - Atau ketik manual dalam format HH:MM
     - Contoh: 15:00, 17:30, 20:00

   - **Pertimbangan dalam memilih waktu:**
     - Waktu operasional kantor
     - Kebutuhan koordinasi lembur
     - Waktu yang masuk akal untuk perencanaan
     - Kebijakan perusahaan

4. **Menyimpan Pengaturan**

   - Klik tombol "Simpan"
   - Sistem akan memproses perubahan
   - Tampil loading: "Menyimpan..."

5. **Konfirmasi Perubahan**

   - Jika berhasil, muncul notifikasi:
     ```
     Berhasil
     Waktu minimal lembur diset ke XX:XX
     ```
   - Pengaturan langsung berlaku untuk semua staff
   - Staff akan melihat waktu terbaru saat membuat pengajuan

#### 4.2.3 Catatan Penting

- Perubahan waktu berdampak ke SEMUA staff
- Pengaturan disimpan di database dan persistent
- Validasi dilakukan di:
  - Frontend (form pengajuan)
  - Backend (API endpoint)
- Format waktu harus HH:MM (contoh: 13:30, bukan 1:30 PM)

### 4.3 Mereview Pengajuan SPL

#### 4.3.1 Mengakses Halaman Persetujuan

Dari dashboard Manager:
1. Klik tombol "Review SPL" pada panel Aksi Cepat, ATAU
2. Klik menu "Persetujuan" di sidebar, ATAU
3. Navigasi ke "Dashboard > HR > Persetujuan"

**CATATAN**: Menu persetujuan dapat diakses oleh Manager dan HR

#### 4.3.2 Halaman Persetujuan SPL

**Header Halaman:**
- Judul: "Persetujuan SPL"
- Deskripsi: "Kelola pengajuan SPL yang menunggu persetujuan"

**Daftar Pengajuan:**
- Menampilkan semua SPL dengan status PENDING
- Format: Grid cards responsif
- Setiap kartu menampilkan:
  - Nama staff pengaju
  - Departemen
  - Tanggal lembur
  - Waktu lembur (mulai - selesai)
  - Total jam
  - Nama proyek (jika ada)
  - Alasan lembur
  - Tanggal pengajuan
  - Tombol aksi: Setujui dan Tolak

**Jika tidak ada pengajuan pending:**
- Tampil pesan:
  ```
  Tidak ada pengajuan SPL yang menunggu persetujuan
  Semua pengajuan telah diproses
  ```

### 4.4 Menyetujui Pengajuan SPL

#### 4.4.1 Proses Review

Sebelum menyetujui, pastikan:

1. **Verifikasi Informasi**
   - Cek tanggal dan waktu lembur
   - Pastikan durasi lembur masuk akal
   - Review alasan lembur
   - Pertimbangkan urgensi pekerjaan

2. **Verifikasi Staff**
   - Cek nama dan departemen pengaju
   - Pastikan staff berhak mengajukan lembur
   - Verifikasi dengan schedule kerja

3. **Validasi Kebutuhan**
   - Apakah pekerjaan memang urgent?
   - Apakah waktu lembur sesuai?
   - Apakah ada alternative selain lembur?

#### 4.4.2 Langkah-langkah Menyetujui

1. **Pilih SPL**
   - Dari daftar pengajuan pending
   - Baca informasi lengkap di kartu SPL

2. **Klik Tombol Setujui**
   - Tombol berwarna hijau dengan ikon checklist
   - Bertuliskan "Setujui" atau "Approve"

3. **Konfirmasi Persetujuan**
   - Sistem menampilkan dialog konfirmasi:
     ```
     Apakah Anda yakin ingin menyetujui pengajuan SPL ini?
     ```
   - Klik "OK" untuk melanjutkan
   - Klik "Cancel" untuk membatalkan

4. **Proses Sistem**
   - Tampil loading: "Memproses..."
   - Sistem menyimpan persetujuan ke database
   - Status SPL berubah menjadi APPROVED
   - Data approver (Manager) tercatat
   - Timestamp persetujuan tersimpan

5. **Notifikasi**

   **Ke Manager:**
   - Muncul notifikasi: "SPL berhasil disetujui"
   - Warna hijau

   **Ke Staff:**
   - Jika notifikasi aktif, staff menerima push notification
   - Pesan: "Pengajuan SPL Anda telah disetujui"
   - Staff dapat melihat status APPROVED di riwayat SPL

6. **Update Tampilan**
   - SPL yang disetujui hilang dari daftar pending
   - Counter "Menunggu" berkurang
   - Counter "Disetujui" bertambah

### 4.5 Menolak Pengajuan SPL

#### 4.5.1 Alasan Penolakan

Pengajuan SPL dapat ditolak dengan berbagai alasan, antara lain:

- Waktu lembur tidak sesuai dengan kebutuhan
- Alasan lembur tidak cukup urgent atau tidak jelas
- Pekerjaan dapat diselesaikan di jam kerja normal
- Tidak ada budget lembur
- Staff belum menyelesaikan pekerjaan prioritas lain
- Informasi tidak lengkap atau tidak akurat
- Pelanggaran kebijakan perusahaan
- Dan alasan valid lainnya

**PENTING**: Setiap penolakan HARUS disertai alasan yang jelas dan detail agar staff memahami mengapa pengajuannya ditolak.

#### 4.5.2 Langkah-langkah Menolak Pengajuan

1. **Pilih SPL yang Akan Ditolak**
   - Dari daftar pengajuan pending
   - Review informasi lengkap

2. **Klik Tombol Tolak**
   - Tombol berwarna merah dengan ikon X
   - Bertuliskan "Tolak" atau "Reject"

3. **Form Alasan Penolakan**

   Sistem akan menampilkan modal dialog dengan:

   **Header:**
   - Judul: "Tolak Pengajuan SPL"

   **Field Input:**
   - Label: "Alasan Penolakan *"
   - Jenis: Textarea (kotak teks besar)
   - Placeholder: "Jelaskan alasan penolakan secara detail..."
   - Validasi: Wajib diisi

   **Tombol:**
   - "Batal": Membatalkan penolakan
   - "Tolak": Melanjutkan penolakan

4. **Mengisi Alasan Penolakan**

   **Panduan penulisan:**

   - Gunakan bahasa yang profesional dan sopan
   - Jelaskan alasan dengan spesifik dan jelas
   - Berikan saran atau arahan jika perlu
   - Minimal 20 karakter

   **Contoh alasan yang BAIK:**
   ```
   Pengajuan ditolak karena pekerjaan yang disebutkan dapat diselesaikan
   dalam jam kerja normal. Disarankan untuk lebih mengoptimalkan waktu
   kerja regular. Jika masih diperlukan lembur untuk pekerjaan urgent
   lainnya, silakan ajukan kembali dengan alasan yang lebih spesifik.
   ```

   **Contoh alasan yang KURANG BAIK:**
   ```
   Ditolak
   ```

5. **Submit Penolakan**

   - Pastikan alasan telah diisi dengan lengkap
   - Klik tombol "Tolak" (merah) di modal
   - Sistem memproses penolakan
   - Tampil loading: "Memproses..."

6. **Validasi Sistem**

   Sistem akan melakukan validasi:
   - Jika alasan kosong: Error "Alasan penolakan harus diisi"
   - Jika alasan terlalu singkat: Error "Alasan harus lebih detail"
   - Jika valid: Lanjut ke proses penyimpanan

7. **Proses Sistem**

   - Status SPL berubah menjadi REJECTED
   - Alasan penolakan tersimpan di database
   - Data approver (Manager) tercatat
   - Timestamp penolakan tersimpan

8. **Notifikasi**

   **Ke Manager:**
   - Muncul notifikasi: "SPL berhasil ditolak"
   - Warna merah

   **Ke Staff:**
   - Jika notifikasi aktif, staff menerima push notification
   - Pesan: "Pengajuan SPL Anda ditolak"
   - Staff dapat melihat alasan penolakan di detail SPL

9. **Update Tampilan**
   - SPL yang ditolak hilang dari daftar pending
   - Counter "Menunggu" berkurang
   - Counter "Ditolak" bertambah
   - Modal otomatis tertutup

#### 4.5.3 Membatalkan Penolakan

Jika Manager ingin membatalkan proses penolakan:

1. Saat modal alasan penolakan terbuka
2. Klik tombol "Batal" (abu-abu)
3. Modal akan tertutup
4. Pengajuan tetap berstatus PENDING
5. Tidak ada perubahan data

### 4.6 Tips untuk Manager

1. **Responsif dalam Review**
   - Proses pengajuan sesegera mungkin
   - Jangan biarkan pengajuan tertunda terlalu lama
   - Aktifkan notifikasi untuk alert pengajuan baru

2. **Objektif dalam Keputusan**
   - Pertimbangkan kebutuhan bisnis
   - Evaluasi dengan adil dan konsisten
   - Jangan terpengaruh preferensi personal

3. **Komunikatif**
   - Berikan alasan penolakan yang konstruktif
   - Jika perlu, komunikasi langsung dengan staff
   - Buka diskusi untuk kasus-kasus khusus

4. **Dokumentasi**
   - Sistem mencatat semua keputusan Anda
   - Alasan penolakan tersimpan untuk referensi
   - Dapat digunakan untuk evaluasi performa

5. **Pengaturan Batas Waktu**
   - Review dan sesuaikan batas waktu pengajuan secara berkala
   - Pertimbangkan kebutuhan operasional
   - Komunikasikan perubahan kepada team

---

## 5. PANDUAN UNTUK HR

### 5.1 Dashboard HR

Dashboard HR adalah command center untuk mengelola seluruh data SPL di perusahaan.

**Komponen Dashboard HR:**

1. **Header Sambutan**
   - Ucapan selamat
   - Nama HR
   - Role: Human Resources
   - Departemen: HR

2. **Kartu Statistik**
   - **Total SPL**: Semua SPL di sistem (bukan hanya milik HR)
   - **Menunggu**: Total SPL PENDING dari semua staff
   - **Disetujui**: Total SPL APPROVED
   - **Ditolak**: Total SPL REJECTED

3. **Aksi Cepat**

   **A. Data & Laporan**
   - Akses ke halaman data lengkap SPL
   - Fitur export dan analisis

   **B. Persetujuan SPL**
   - HR juga dapat menyetujui/menolak SPL
   - Sama seperti fungsi Manager
   - Jumlah pending ditampilkan

4. **Notifikasi Settings**
   - Aktifkan untuk mendapat alert pengajuan baru

5. **Informasi Akun** (Dropdown Profile)

   Klik foto profil di pojok kanan atas untuk melihat:
   - Data profil HR (nama, email, role, departemen, PIN)

6. **Aktivitas Terbaru**
   - 3 SPL terbaru dari seluruh sistem

### 5.2 Halaman Data & Laporan SPL

Ini adalah fitur paling powerful untuk HR dalam mengelola dan menganalisis data lembur.

#### 5.2.1 Mengakses Halaman Data & Laporan

Dari dashboard HR:
1. Klik tombol "Lihat Data" pada panel Data & Laporan, ATAU
2. Klik menu "Data & Laporan" di sidebar, ATAU
3. Navigasi ke "Dashboard > HR"

#### 5.2.2 Header Halaman

**Informasi di Header:**
- Judul: "📊 Data & Laporan SPL"
- Deskripsi: "Kelola dan export data Surat Perintah Lembur"
- Info Filter Aktif:
  - Periode yang dipilih (contoh: "Bulan Ini", "Semua Periode")
  - Status yang dipilih (contoh: "Semua", "APPROVED")
- Statistik Ringkas:
  - Total SPL yang ditampilkan
  - Total jam lembur

**Contoh:**
```
Filter: Bulan Ini • Status: Semua
25 SPL • 187.5 Jam
```

#### 5.2.3 Kartu Statistik

5 kartu statistik berwarna menampilkan:

1. **Total SPL** (Biru)
   - Jumlah total SPL sesuai filter

2. **Menunggu** (Kuning)
   - Jumlah SPL status PENDING

3. **Disetujui** (Hijau)
   - Jumlah SPL status APPROVED

4. **Ditolak** (Merah)
   - Jumlah SPL status REJECTED

5. **Total Jam** (Ungu)
   - Akumulasi jam lembur dari data yang difilter
   - Format: Desimal (contoh: 187.5)

### 5.3 Filter Data SPL

Sistem filtering sangat powerful dan fleksibel.

#### 5.3.1 Filter Berdasarkan Status

**Pilihan Status:**
- **Semua (ALL)**: Menampilkan semua status
- **Menunggu (PENDING)**: Hanya SPL yang belum diproses
- **Disetujui (APPROVED)**: Hanya SPL yang disetujui
- **Ditolak (REJECTED)**: Hanya SPL yang ditolak

**Cara Menggunakan:**
1. Temukan panel "Filter Data"
2. Pada bagian "Filter Status"
3. Klik tombol status yang diinginkan
4. Tombol aktif berwarna hijau
5. Data otomatis terfilter

#### 5.3.2 Filter Berdasarkan Periode

**Pilihan Periode:**

1. **Semua Periode (ALL)**
   - Menampilkan seluruh data tanpa batasan waktu
   - Dari awal sistem hingga sekarang

2. **Minggu Ini (THIS_WEEK)**
   - SPL dengan tanggal lembur di minggu berjalan
   - Minggu dimulai dari Senin hingga Minggu

3. **Bulan Ini (THIS_MONTH)**
   - SPL dengan tanggal lembur di bulan berjalan
   - Dari tanggal 1 hingga akhir bulan

4. **Bulan Lalu (LAST_MONTH)**
   - SPL di bulan sebelumnya
   - Berguna untuk laporan bulanan

5. **3 Bulan Terakhir (LAST_3_MONTHS)**
   - SPL dalam 3 bulan terakhir
   - Untuk analisis quarterly

6. **Custom (CUSTOM)**
   - Rentang tanggal bebas sesuai kebutuhan
   - Dapat memilih tanggal mulai dan tanggal selesai

**Cara Menggunakan Periode:**
1. Pada panel "Filter Data"
2. Bagian "Filter Periode"
3. Klik tombol periode yang diinginkan
4. Tombol aktif berwarna biru
5. Data otomatis terfilter

#### 5.3.3 Filter Custom (Rentang Tanggal)

Untuk analisis spesifik dengan rentang tanggal tertentu:

**Langkah-langkah:**

1. **Pilih Mode Custom**
   - Klik tombol "Custom" pada filter periode
   - Akan muncul 2 field tanggal

2. **Masukkan Tanggal Mulai**
   - Field pertama: "Tanggal Mulai"
   - Klik field untuk membuka date picker
   - Pilih tanggal awal periode
   - Format: DD/MM/YYYY

3. **Masukkan Tanggal Selesai**
   - Field kedua: "Tanggal Selesai"
   - Klik field untuk membuka date picker
   - Pilih tanggal akhir periode
   - Harus sama atau setelah tanggal mulai

4. **Filter Otomatis**
   - Setelah kedua tanggal diisi
   - Sistem otomatis memfilter data
   - Menampilkan SPL dalam rentang tersebut

**Contoh Use Case:**
- Laporan tahunan: 01/01/2025 - 31/12/2025
- Laporan semester: 01/01/2025 - 30/06/2025
- Periode spesifik: 15/11/2025 - 25/11/2025

#### 5.3.4 Kombinasi Filter

Filter status dan periode dapat dikombinasikan:

**Contoh Kombinasi:**

1. **SPL Disetujui Bulan Ini**
   - Status: APPROVED
   - Periode: THIS_MONTH
   - Use case: Perhitungan biaya lembur bulan ini

2. **SPL Pending 3 Bulan Terakhir**
   - Status: PENDING
   - Periode: LAST_3_MONTHS
   - Use case: Identifikasi pengajuan yang terlalu lama pending

3. **Semua SPL Periode Custom**
   - Status: ALL
   - Periode: CUSTOM (01/01/2025 - 31/03/2025)
   - Use case: Laporan quarterly Q1

### 5.4 Export Data

HR memiliki 3 metode export data:

#### 5.4.1 Export ke Excel

**Fitur:**
- Export data lengkap ke file Excel (.xlsx)
- Semua field dan informasi tersimpan
- Format siap untuk analisis lanjutan
- Column width otomatis disesuaikan

**Data yang Di-export:**

| No | Kolom | Keterangan |
|----|-------|------------|
| 1 | No | Nomor urut |
| 2 | Nama Karyawan | Nama lengkap pengaju |
| 3 | Email | Email pengaju |
| 4 | Departemen | Departemen pengaju |
| 5 | Tanggal Lembur | Tanggal lembur (DD/MM/YYYY) |
| 6 | Waktu Mulai | Jam mulai (HH:MM) |
| 7 | Waktu Selesai | Jam selesai (HH:MM) |
| 8 | Total Jam | Durasi lembur |
| 9 | Nama Proyek | Nama proyek (jika ada) |
| 10 | Alasan Lembur | Keterangan lengkap |
| 11 | Status | Menunggu/Disetujui/Ditolak |
| 12 | Disetujui Oleh | Nama approver |
| 13 | Tanggal Persetujuan | Waktu diproses |
| 14 | Alasan Penolakan | Jika ditolak |
| 15 | Tanggal Pengajuan | Waktu diajukan |
| 16 | Tanda Tangan | Ada/Tidak |

**Langkah-langkah Export Excel:**

1. **Atur Filter**
   - Pilih status yang diinginkan
   - Pilih periode yang diinginkan
   - Pastikan data yang ditampilkan sudah sesuai

2. **Klik Tombol Export Excel**
   - Tombol hijau dengan ikon download
   - Bertuliskan "Export Excel"
   - Terletak di bagian atas daftar SPL

3. **Proses Export**
   - Sistem memproses data
   - Membuat file Excel
   - Download otomatis dimulai

4. **Nama File**

   Format nama file otomatis:
   ```
   Data_SPL_[STATUS]_[PERIODE]_[TANGGAL_EXPORT].xlsx
   ```

   Contoh:
   - `Data_SPL_ALL_Semua_Periode_20251127_143022.xlsx`
   - `Data_SPL_APPROVED_Bulan_Ini_20251127_143022.xlsx`
   - `Data_SPL_PENDING_2025-01-01_sampai_2025-01-31_20251127_143022.xlsx`

5. **Lokasi File**
   - File tersimpan di folder Downloads browser
   - Siap dibuka dengan Microsoft Excel, Google Sheets, atau aplikasi spreadsheet lainnya

6. **Notifikasi**
   - Muncul pesan: "Data berhasil diexport ke Excel!"
   - Warna hijau

**Tips Penggunaan Excel:**
- Gunakan fitur Pivot Table untuk analisis
- Buat grafik untuk visualisasi data
- Filter dan sort sesuai kebutuhan
- Simpan file dengan nama yang deskriptif

#### 5.4.2 Copy Table Data

**Fitur:**
- Copy data dalam format tabel ke clipboard
- Dapat langsung di-paste ke Excel, Google Sheets, Word, atau aplikasi lain
- Format: Tab-separated values (TSV)
- Cepat dan praktis untuk sharing data

**Langkah-langkah:**

1. **Atur Filter**
   - Sama seperti export Excel
   - Pastikan data yang ditampilkan sudah sesuai

2. **Klik Tombol Copy Table**
   - Tombol abu-abu dengan ikon copy
   - Bertuliskan "Copy Table"

3. **Proses Copy**
   - Sistem meng-copy data ke clipboard
   - Termasuk header kolom
   - Format tabel dengan tab separator

4. **Notifikasi**
   - Muncul pesan: "Data berhasil disalin ke clipboard!"
   - Warna hijau

5. **Paste Data**

   Data dapat di-paste ke:

   **Microsoft Excel / Google Sheets:**
   - Buka aplikasi
   - Klik cell A1
   - Paste (Ctrl+V / Cmd+V)
   - Data otomatis terformat sebagai tabel

   **Microsoft Word / Google Docs:**
   - Paste sebagai tabel
   - Dapat di-format lebih lanjut

   **Email / Chat:**
   - Paste untuk sharing cepat
   - Format tabel tetap terjaga

**Keuntungan Copy Table:**
- Lebih cepat dari export file
- Tidak perlu download dan upload file
- Cocok untuk sharing data cepat
- Dapat langsung diolah

#### 5.4.3 Generate Rekap PDF

**Fitur Khusus:**
- Generate PDF dengan format resmi PT Tunas Esta Indonesia
- Desain profesional dan siap cetak
- Include logo perusahaan
- Tanda tangan digital staff tersimpan
- Header dan footer standar perusahaan

**Format PDF:**

**A. Header Dokumen:**
- Logo PT Tunas Esta Indonesia
- Judul: "REKAP ABSEN MANUAL STAFF PT TUNAS ESTA INDONESIA"
- Profesional dan formal

**B. Tabel Data:**

Kolom yang ditampilkan:
1. No - Nomor urut
2. Nama - Nama staff
3. PIN - PIN karyawan
4. Tanggal - Tanggal lembur (DD/MM/YYYY)
5. Mulai - Waktu mulai (HH:MM)
6. Selesai - Waktu selesai (HH:MM)
7. Keterangan - Alasan lembur (dengan word wrap)
8. Tanda Tangan - Gambar tanda tangan digital

**C. Footer Dokumen:**

Tanda tangan pejabat (3 kolom):

| Diajukan Oleh | Disetujui Oleh | Mengetahui |
|---------------|----------------|------------|
| .................. | Zhalilla Viola R.S. | Tiyas Indah S. |
| Pemohon / Leader | HR & GA Supervisor | Plant Manager |

Lokasi dan tanggal: Demak, [Tanggal Generate]

**Layout:**
- Ukuran: A4 (595x842 points)
- Orientasi: Portrait
- Margin: 30 points
- Rows per page: 8 SPL
- Multi-page: Otomatis jika data lebih dari 8

**Langkah-langkah Generate PDF:**

1. **Atur Filter**
   - Pilih data yang ingin di-generate
   - Status dan periode sesuai kebutuhan
   - Untuk rekap formal, biasanya APPROVED only

2. **Klik Tombol Generate Rekap PDF**
   - Tombol ungu dengan ikon dokumen
   - Bertuliskan "Generate Rekap PDF"

3. **Proses Generate**
   - Sistem memproses data
   - Embed tanda tangan digital
   - Buat layout profesional
   - Tampil progress (beberapa detik untuk data besar)

4. **Download Otomatis**
   - File PDF otomatis terdownload
   - Nama file:
     ```
     Rekap_Lembur_Manual_[YYYYMMDD_HHMMSS].pdf
     ```
   - Contoh: `Rekap_Lembur_Manual_20251127_143530.pdf`

5. **Notifikasi**
   - Muncul pesan: "Rekap PDF berhasil dibuat"
   - Warna hijau

6. **Verifikasi PDF**
   - Buka file PDF
   - Periksa kelengkapan data
   - Pastikan tanda tangan muncul dengan jelas
   - Verifikasi header dan footer

**Use Case PDF:**
- Laporan bulanan untuk manajemen
- Arsip untuk HR records
- Lampiran payroll
- Dokumentasi untuk audit
- Presentasi ke direksi

**Kelebihan Format PDF:**
- Tidak dapat diedit (secure)
- Format konsisten di semua device
- Profesional untuk dokumen resmi
- Ukuran file kecil
- Mudah di-share via email

### 5.5 Analisis Data SPL

#### 5.5.1 Melihat Statistik

Statistik real-time ditampilkan di:

1. **Kartu Statistik (5 kartu)**
   - Update otomatis saat filter berubah
   - Visualisasi dengan angka besar dan jelas
   - Warna berbeda untuk setiap metrik

2. **Info Ringkas di Header**
   - Total SPL dan total jam
   - Update sesuai filter

3. **Info di Footer Filter Panel**
   - "Menampilkan X dari Y data SPL"
   - "Total X jam lembur"

#### 5.5.2 Analisis Berdasarkan Periode

**Bulanan:**
- Set filter: THIS_MONTH
- Lihat total jam dan jumlah SPL
- Bandingkan dengan LAST_MONTH

**Quarterly:**
- Set filter: CUSTOM
- Rentang 3 bulan (contoh: Jan-Mar)
- Analisis trend

**Tahunan:**
- Set filter: CUSTOM
- Rentang 1 tahun penuh
- Untuk annual report

#### 5.5.3 Analisis Berdasarkan Status

**Approval Rate:**
- Hitung: (APPROVED / TOTAL) × 100%
- Indikator efektivitas proses

**Rejection Rate:**
- Hitung: (REJECTED / TOTAL) × 100%
- Jika tinggi, perlu evaluasi komunikasi atau policy

**Pending Time:**
- Pantau berapa lama SPL masih PENDING
- Jika terlalu lama, perlu follow up dengan Manager

#### 5.5.4 Analisis Jam Lembur

**Total Jam per Periode:**
- Lihat di statistik "Total Jam"
- Bandingkan antar periode

**Average Jam per SPL:**
- Hitung: Total Jam / Jumlah SPL
- Indikator durasi lembur rata-rata

**Identifikasi Pattern:**
- Apakah ada periode dengan lembur tinggi?
- Departemen mana yang paling banyak lembur?
- Staff mana yang sering lembur?

### 5.6 Mengelola Persetujuan (HR sebagai Approver)

HR juga memiliki akses ke halaman Persetujuan SPL, sama seperti Manager.

**Akses:**
- Menu "Persetujuan" di sidebar
- Atau dari panel Aksi Cepat di dashboard

**Fungsi:**
- Sama dengan Manager (lihat bagian 4.3 - 4.5)
- Dapat menyetujui SPL
- Dapat menolak SPL dengan alasan
- Semua notifikasi dan logging sama

**Use Case HR sebagai Approver:**
- Backup saat Manager tidak ada
- Emergency approval
- Koordinasi antar departemen
- Dual approval untuk policy tertentu

### 5.7 Tips untuk HR

1. **Rutin Generate Laporan**
   - Weekly: Review SPL yang masih pending lama
   - Monthly: Generate rekap PDF untuk arsip
   - Quarterly: Analisis trend dan pattern

2. **Optimasi Filter**
   - Gunakan filter custom untuk analisis spesifik
   - Save hasil export dengan nama deskriptif
   - Buat folder terorganisir untuk arsip

3. **Monitoring Proaktif**
   - Pantau approval rate
   - Identifikasi bottleneck di proses approval
   - Follow up Manager jika ada pending terlalu lama

4. **Data Quality**
   - Pastikan semua pengajuan memiliki data lengkap
   - Verifikasi tanda tangan tersimpan dengan baik
   - Check consistency data antar export

5. **Komunikasi**
   - Koordinasi dengan Manager untuk proses approval
   - Sosialisasi kebijakan lembur ke staff
   - Feedback loop untuk improvement sistem

6. **Backup Data**
   - Export data secara berkala
   - Simpan arsip PDF bulanan
   - Gunakan Excel untuk backup database

---

## 6. FITUR NOTIFIKASI

### 6.1 Tentang Notifikasi Push

Sistem SPL dilengkapi dengan fitur notifikasi push web yang memungkinkan pengguna menerima pemberitahuan real-time tentang status pengajuan SPL tanpa perlu membuka aplikasi.

**Jenis Notifikasi:**

1. **Untuk Staff:**
   - SPL disetujui oleh Manager
   - SPL ditolak oleh Manager
   - Pengingat tindak lanjut (jika ada)

2. **Untuk Manager/HR:**
   - Pengajuan SPL baru
   - Pengingat SPL pending yang perlu direview

### 6.2 Persyaratan Teknis

Untuk menggunakan notifikasi push:

1. **Browser yang Mendukung:**
   - Google Chrome (versi terbaru)
   - Mozilla Firefox (versi terbaru)
   - Microsoft Edge (versi terbaru)
   - Safari (versi terbaru)

2. **Protokol:**
   - Harus mengakses aplikasi via HTTPS
   - HTTP tidak mendukung push notification

3. **Sistem Operasi:**
   - Windows 10/11
   - macOS
   - Linux
   - Android
   - iOS (dengan batasan tertentu)

4. **Permission:**
   - Browser harus diberi izin untuk menampilkan notifikasi

### 6.3 Mengaktifkan Notifikasi

#### 6.3.1 Langkah-langkah Aktivasi

1. **Login ke Sistem**
   - Login dengan akun Anda
   - Akses dashboard

2. **Temukan Panel Notifikasi**
   - Di dashboard, scroll ke bagian bawah
   - Cari panel dengan judul "Notifikasi Push"
   - Icon: 🔔 atau 🔕 (tergantung status)

3. **Klik Tombol Aktifkan**
   - Tombol bertuliskan "🔔 Aktifkan Notifikasi"
   - Warna biru atau hijau

4. **Izinkan Permission Browser**

   Browser akan menampilkan popup:

   **Google Chrome:**
   ```
   [domain] ingin menampilkan notifikasi
   [Blokir] [Izinkan]
   ```

   **Mozilla Firefox:**
   ```
   [domain] ingin mengirim notifikasi
   [Blokir] [Izinkan]
   ```

   **Klik "Izinkan" atau "Allow"**

5. **Proses Registrasi**
   - Sistem mendaftarkan device Anda
   - Service Worker diaktifkan
   - Token notifikasi dibuat dan disimpan
   - Tampil loading: "Mengaktifkan..."

6. **Konfirmasi Berhasil**
   - Status berubah menjadi "✅ Aktif"
   - Warna badge hijau
   - Muncul notifikasi: "Notifikasi berhasil diaktifkan"

7. **Test Notifikasi** (Development Mode)
   - Jika dalam mode development
   - Tersedia tombol "🧪 Test"
   - Klik untuk mengirim test notification
   - Verifikasi notifikasi muncul

#### 6.3.2 Status Notifikasi

Panel notifikasi menampilkan 2 status:

**1. Tidak Aktif (🔕)**
- Badge: "⭕ Tidak Aktif"
- Warna: Abu-abu
- Pesan: "Aktifkan notifikasi untuk mendapatkan pemberitahuan real-time tentang pengajuan SPL Anda."
- Tombol: "🔔 Aktifkan Notifikasi"

**2. Aktif (🔔)**
- Badge: "✅ Aktif"
- Warna: Hijau
- Pesan: "Anda akan menerima notifikasi tentang pengajuan SPL dan persetujuan."
- Tombol: "🔕 Nonaktifkan"

### 6.4 Menonaktifkan Notifikasi

Jika ingin berhenti menerima notifikasi:

#### Langkah-langkah:

1. **Akses Panel Notifikasi**
   - Di dashboard
   - Panel "Notifikasi Push"

2. **Klik Tombol Nonaktifkan**
   - Tombol bertuliskan "🔕 Nonaktifkan"
   - Warna abu-abu atau merah

3. **Konfirmasi Nonaktifkan**

   Sistem menampilkan dialog konfirmasi:
   ```
   Apakah Anda yakin ingin menonaktifkan notifikasi?
   Anda tidak akan menerima pemberitahuan tentang pengajuan SPL.
   ```

   - Klik "OK" untuk melanjutkan
   - Klik "Cancel" untuk membatalkan

4. **Proses Unsubscribe**
   - Sistem menghapus subscription
   - Token notifikasi dihapus dari database
   - Tampil loading: "Menonaktifkan..."

5. **Konfirmasi Berhasil**
   - Status berubah menjadi "⭕ Tidak Aktif"
   - Muncul notifikasi: "Notifikasi berhasil dinonaktifkan"
   - Halaman reload otomatis

### 6.5 Menerima Notifikasi

#### 6.5.1 Tampilan Notifikasi

Saat ada update, notifikasi akan muncul:

**Lokasi:**
- Desktop: Pojok kanan bawah layar (Windows)
- Desktop: Pojok kanan atas layar (macOS)
- Mobile: Notification bar

**Komponen Notifikasi:**
- **Icon**: Logo aplikasi SPL
- **Title**: Judul notifikasi
- **Body**: Pesan detail
- **Action Buttons** (jika didukung browser):
  - "Lihat Detail"
  - "Tutup"

#### 6.5.2 Contoh Notifikasi

**1. Pengajuan Disetujui (ke Staff):**
```
Title: Pengajuan SPL Disetujui
Body: Pengajuan SPL Anda untuk tanggal 27 Nov 2025 telah disetujui oleh Manager.
Icon: ✅
```

**2. Pengajuan Ditolak (ke Staff):**
```
Title: Pengajuan SPL Ditolak
Body: Pengajuan SPL Anda untuk tanggal 27 Nov 2025 ditolak. Lihat detail untuk alasan penolakan.
Icon: ❌
```

**3. Pengajuan Baru (ke Manager/HR):**
```
Title: Pengajuan SPL Baru
Body: [Nama Staff] mengajukan SPL untuk tanggal 27 Nov 2025. Klik untuk review.
Icon: 📋
```

#### 6.5.3 Interaksi dengan Notifikasi

**Klik Notifikasi:**
- Browser membuka tab aplikasi SPL
- Jika sudah ada tab terbuka, fokus ke tab tersebut
- Langsung ke halaman detail SPL terkait

**Abaikan Notifikasi:**
- Notifikasi otomatis hilang setelah beberapa detik
- Dapat di-dismiss manual
- Tidak mempengaruhi status SPL

### 6.6 Troubleshooting Notifikasi

#### 6.6.1 Notifikasi Tidak Muncul

**Penyebab dan Solusi:**

1. **Browser Block Permission**
   - Cek permission di browser settings
   - Chrome: Settings > Privacy > Site Settings > Notifications
   - Allow untuk domain aplikasi SPL

2. **Focus Assist / Do Not Disturb Aktif**
   - Windows: Turn off Focus Assist
   - macOS: Turn off Do Not Disturb
   - Check di system settings

3. **Browser Tidak Mendukung**
   - Update browser ke versi terbaru
   - Gunakan browser yang didukung (Chrome, Firefox, Edge)

4. **Akses via HTTP (bukan HTTPS)**
   - Push notification hanya bekerja di HTTPS
   - Hubungi IT untuk mengaktifkan HTTPS

5. **Service Worker Error**
   - Clear browser cache
   - Logout dan login kembali
   - Re-subscribe notifikasi

#### 6.6.2 Status "Notifikasi Tidak Didukung"

Jika muncul panel:
```
📱 Notifikasi Tidak Didukung
Browser Anda tidak mendukung notifikasi push atau Anda mengakses
aplikasi dari HTTP. Untuk menggunakan fitur notifikasi, gunakan
browser modern dan akses aplikasi melalui HTTPS.
```

**Solusi:**
- Pastikan mengakses via HTTPS (https://)
- Update browser ke versi terbaru
- Gunakan browser yang didukung
- Hubungi IT jika masih error

#### 6.6.3 Error "Konfigurasi Firebase Tidak Lengkap"

Jika muncul panel:
```
⚠️ Konfigurasi Firebase Tidak Lengkap
Notifikasi tidak dapat diaktifkan karena konfigurasi Firebase
belum lengkap. Silakan hubungi administrator untuk menyelesaikan setup.
```

**Solusi:**
- Hubungi Administrator IT
- Ini adalah masalah konfigurasi server
- Bukan kesalahan user

### 6.7 Best Practices Notifikasi

1. **Aktifkan Notifikasi**
   - Sangat disarankan untuk semua user
   - Memastikan tidak ada update yang terlewat
   - Real-time awareness

2. **Check Permission**
   - Pastikan browser permission "Allow"
   - Jangan block notification
   - Check system Do Not Disturb settings

3. **Multi-Device**
   - Aktifkan di semua device yang digunakan
   - Desktop + Mobile untuk coverage maksimal
   - Subscribe terpisah untuk setiap device

4. **Responsif**
   - Segera check notifikasi yang masuk
   - Klik untuk langsung ke detail
   - Jangan ignore notification penting

5. **Maintenance**
   - Jika ganti device, re-subscribe
   - Jika clear browser data, re-subscribe
   - Periodic check apakah masih aktif

---

## 7. TROUBLESHOOTING

### 7.1 Masalah Login

#### 7.1.1 "Email atau Password Salah"

**Penyebab:**
- Email tidak terdaftar
- Password salah
- Typo saat input
- Caps Lock aktif

**Solusi:**
1. Periksa kembali email yang digunakan
2. Pastikan Caps Lock tidak aktif
3. Coba fitur "Lupa Password"
4. Hubungi HR jika akun belum dibuat

#### 7.1.2 Tidak Bisa Akses Halaman Tertentu

**Penyebab:**
- Role tidak sesuai
- Session expired
- Permission tidak cukup

**Solusi:**
1. Logout dan login kembali
2. Clear browser cache
3. Periksa role akun Anda
4. Hubungi administrator jika role salah

### 7.2 Masalah Pengajuan SPL

#### 7.2.1 Error "Lewat Batas Waktu"

**Pesan Error:**
```
Lewat Batas Waktu
Pengajuan hanya bisa sebelum pukul 16:30 (atur oleh Manager).
```

**Penyebab:**
- Waktu saat ini sudah melewati batas yang ditentukan Manager

**Solusi:**
- Temui Manager secara langsung untuk persetujuan
- Koordinasi via komunikasi internal (WA, email, dll)
- Manager dapat melakukan approval manual
- Untuk masa depan, ajukan lebih awal

#### 7.2.2 Signature Tidak Tersimpan

**Penyebab:**
- Tanda tangan terlalu kecil
- Browser tidak support
- JavaScript error

**Solusi:**
1. Gambar tanda tangan lebih besar
2. Clear signature dan gambar ulang
3. Gunakan browser lain (Chrome recommended)
4. Refresh halaman dan coba lagi

#### 7.2.3 Data Tidak Tersimpan

**Penyebab:**
- Koneksi internet terputus
- Server error
- Validation error

**Solusi:**
1. Check koneksi internet
2. Pastikan semua field wajib terisi
3. Screenshot data jika perlu
4. Coba submit lagi
5. Hubungi IT jika masih error

### 7.3 Masalah Export Data (HR)

#### 7.3.1 Excel Tidak Ter-download

**Penyebab:**
- Browser block download
- Download folder penuh
- Permission error

**Solusi:**
1. Allow download di browser settings
2. Check folder Downloads
3. Clear space di hard drive
4. Coba browser lain

#### 7.3.2 PDF Corrupt atau Error

**Penyebab:**
- Data terlalu besar
- Memory browser tidak cukup
- Image signature corrupt

**Solusi:**
1. Reduce data dengan filter
2. Generate per bulan, bukan per tahun
3. Close tab lain untuk free memory
4. Try again dengan fewer data

### 7.4 Masalah Umum

#### 7.4.1 Halaman Tidak Loading

**Solusi:**
1. Refresh halaman (F5 atau Ctrl+R)
2. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete
   - Pilih "Cached images and files"
   - Clear data
3. Logout dan login kembali
4. Restart browser
5. Check koneksi internet

#### 7.4.2 Tampilan Berantakan / Tidak Responsive

**Solusi:**
1. Hard refresh: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)
2. Clear browser cache
3. Update browser ke versi terbaru
4. Zoom browser di 100% (Ctrl+0)
5. Coba browser lain

#### 7.4.3 Session Expired

**Pesan:**
```
Session Anda telah berakhir. Silakan login kembali.
```

**Penyebab:**
- Tidak ada aktivitas terlalu lama
- Session timeout (biasanya 24 jam)
- Security policy

**Solusi:**
1. Login kembali
2. Centang "Remember me" saat login
3. Refresh halaman secara berkala jika idle

### 7.5 Menghubungi Support

Jika masalah tidak dapat diselesaikan dengan panduan di atas:

**1. Hubungi IT Support:**
- Email: it@tunasesta.com (contoh)
- Ext: 123 (contoh)

**2. Hubungi HR:**
- Email: hr@tunasesta.com (contoh)
- Ext: 456 (contoh)

**3. Informasi yang Perlu Disiapkan:**
- Nama lengkap dan email akun
- Role (Staff/Manager/HR)
- Screenshot error (jika ada)
- Deskripsi masalah detail
- Langkah-langkah yang sudah dicoba
- Browser dan OS yang digunakan

---

## 8. GLOSSARY

### 8.1 Istilah Teknis

**API (Application Programming Interface)**
- Interface komunikasi antar komponen sistem
- Digunakan untuk request dan response data

**Browser**
- Aplikasi untuk mengakses website (Chrome, Firefox, Edge, Safari)

**Cache**
- Data temporary yang disimpan browser untuk mempercepat loading
- Perlu di-clear jika ada masalah tampilan

**Clipboard**
- Tempat penyimpanan temporary saat copy-paste
- Digunakan fitur Copy Table

**Cookie**
- Data kecil yang disimpan browser untuk session
- Digunakan untuk menjaga login

**Database**
- Tempat penyimpanan seluruh data sistem
- PostgreSQL

**HTTPS (HyperText Transfer Protocol Secure)**
- Protokol aman untuk akses website
- Diperlukan untuk notifikasi push

**JWT (JSON Web Token)**
- Token untuk authentication
- Digunakan saat login

**Notifikasi Push (Push Notification)**
- Notifikasi yang dikirim dari server ke browser
- Real-time tanpa perlu buka aplikasi

**PDF (Portable Document Format)**
- Format dokumen digital
- Digunakan untuk rekap lembur

**Service Worker**
- Script yang berjalan di background browser
- Menangani notifikasi push

**Session**
- Periode waktu user login
- Expired setelah waktu tertentu

**Signature Pad**
- Area untuk membuat tanda tangan digital
- Menggunakan mouse atau touch

**SSL (Secure Sockets Layer)**
- Teknologi keamanan untuk enkripsi data
- Bagian dari HTTPS

**Token**
- Kode unik untuk authentication
- Digunakan sistem notifikasi

**URL (Uniform Resource Locator)**
- Alamat website
- Contoh: https://spl.tunasesta.com

### 8.2 Istilah Sistem SPL

**Approver**
- Manager atau HR yang menyetujui/menolak SPL
- Tercatat dalam data SPL

**APPROVED**
- Status SPL yang telah disetujui
- Badge hijau

**Batas Waktu Pengajuan**
- Jam maksimal staff dapat mengajukan SPL
- Default 16:30, dapat diubah Manager

**Dashboard**
- Halaman utama setelah login
- Menampilkan ringkasan dan menu utama

**Departemen**
- Divisi tempat user bekerja
- Opsional saat registrasi

**Export**
- Proses mengeluarkan data ke file eksternal
- Format: Excel atau PDF

**Filter**
- Fitur untuk menyaring data
- Berdasarkan status, periode, dll

**HR (Human Resources)**
- Role dengan akses penuh ke data dan laporan
- Dapat export dan generate PDF

**Lembur (Overtime)**
- Kerja di luar jam kerja normal
- Objek dari SPL

**Manager**
- Role yang berwenang approve/reject SPL
- Dapat mengatur batas waktu pengajuan

**PENDING**
- Status SPL yang menunggu persetujuan
- Badge kuning

**PIN**
- Personal Identification Number
- 3 digit angka, untuk verifikasi dan identifikasi
- Ditampilkan di dropdown profile
- Digunakan dalam rekap absensi manual

**Rekap PDF**
- PDF dengan format resmi PT Tunas Esta Indonesia
- Include tanda tangan dan layout formal

**REJECTED**
- Status SPL yang ditolak
- Badge merah
- Disertai alasan penolakan

**Requester**
- Staff yang mengajukan SPL
- Pemilik pengajuan

**Role**
- Peran user dalam sistem
- 3 jenis: Staff, Manager, HR

**Riwayat SPL**
- Halaman daftar semua pengajuan staff
- Dengan berbagai status

**Signature (Tanda Tangan Digital)**
- Tanda tangan dalam bentuk gambar
- Dibuat dengan signature pad

**SPL (Surat Perintah Lembur)**
- Dokumen pengajuan lembur
- Objek utama sistem

**Staff**
- Role karyawan yang mengajukan lembur
- Akses terbatas

**Statistik**
- Data ringkasan numerik
- Total, pending, approved, rejected, jam

**Status**
- Kondisi pengajuan SPL
- PENDING, APPROVED, atau REJECTED

**Submit**
- Proses mengirim/menyimpan data
- Mengajukan SPL

### 8.3 Singkatan

| Singkatan | Kepanjangan |
|-----------|-------------|
| API | Application Programming Interface |
| CSV | Comma-Separated Values |
| HR | Human Resources |
| HTTPS | HyperText Transfer Protocol Secure |
| JWT | JSON Web Token |
| PDF | Portable Document Format |
| PIN | Personal Identification Number |
| SPL | Surat Perintah Lembur |
| SSL | Secure Sockets Layer |
| TSV | Tab-Separated Values |
| UI | User Interface |
| URL | Uniform Resource Locator |
| UX | User Experience |
| XLSX | Excel Open XML Spreadsheet |

---

## LAMPIRAN

### A. Format Data Export Excel

**Sheet Name:** Data SPL

**Columns (16 kolom):**
1. No (Number)
2. Nama Karyawan (Text)
3. Email (Text)
4. Departemen (Text)
5. Tanggal Lembur (Date: DD/MM/YYYY)
6. Waktu Mulai (Time: HH:MM)
7. Waktu Selesai (Time: HH:MM)
8. Total Jam (Number)
9. Nama Proyek (Text)
10. Alasan Lembur (Text)
11. Status (Text: Menunggu/Disetujui/Ditolak)
12. Disetujui Oleh (Text)
13. Tanggal Persetujuan (DateTime: DD/MM/YYYY HH:MM)
14. Alasan Penolakan (Text)
15. Tanggal Pengajuan (DateTime: DD/MM/YYYY HH:MM)
16. Tanda Tangan (Text: Ada/Tidak)

### B. Shortcut Keyboard

| Aksi | Windows | macOS |
|------|---------|-------|
| Refresh Halaman | F5 atau Ctrl+R | Cmd+R |
| Hard Refresh | Ctrl+Shift+R | Cmd+Shift+R |
| Clear Cache | Ctrl+Shift+Delete | Cmd+Shift+Delete |
| Zoom In | Ctrl + | Cmd + |
| Zoom Out | Ctrl - | Cmd - |
| Zoom Reset | Ctrl+0 | Cmd+0 |
| Paste | Ctrl+V | Cmd+V |
| New Tab | Ctrl+T | Cmd+T |
| Close Tab | Ctrl+W | Cmd+W |

### C. Browser Settings

**Google Chrome - Allow Notifications:**
1. Click icon 3 titik (⋮) di kanan atas
2. Settings
3. Privacy and security
4. Site settings
5. Notifications
6. Allow untuk domain SPL

**Google Chrome - Clear Cache:**
1. Ctrl+Shift+Delete
2. Pilih "Cached images and files"
3. Time range: All time
4. Clear data

**Mozilla Firefox - Allow Notifications:**
1. Click icon 3 garis (☰) di kanan atas
2. Settings
3. Privacy & Security
4. Permissions > Notifications > Settings
5. Allow untuk domain SPL

**Mozilla Firefox - Clear Cache:**
1. Ctrl+Shift+Delete
2. Pilih "Cache"
3. Time range: Everything
4. Clear Now

### D. Kontak Support

**IT Support:**
- Email: it@tunasesta.com
- Phone: (024) 123-4567 ext. 100
- Jam Operasional: Senin-Jumat, 08:00-17:00

**HR Department:**
- Email: hr@tunasesta.com
- Phone: (024) 123-4567 ext. 200
- Jam Operasional: Senin-Jumat, 08:00-17:00

**Alamat Perusahaan:**
PT Tunas Esta Indonesia
Jl. Industri No. 123
Demak, Jawa Tengah
Indonesia

---

## PENUTUP

Manual book ini disusun untuk membantu seluruh pengguna Sistem SPL dalam mengoperasikan aplikasi dengan efektif dan efisien. Diharapkan dengan panduan ini, proses pengajuan dan persetujuan lembur dapat berjalan lebih lancar dan terorganisir.

Jika terdapat pertanyaan, saran, atau masukan terkait manual book ini atau sistem SPL secara keseluruhan, silakan hubungi:

**Tim Pengembang Sistem SPL**
Email: dev-spl@tunasesta.com

**HR Department**
Email: hr@tunasesta.com

---

**Document Control:**
- Version: 1.2
- Last Updated: November 2025
- Prepared by: Tim IT PT Tunas Esta Indonesia
- Reviewed by: HR Department
- Approved by: Management

**Disclaimer:**
Informasi dalam manual book ini dapat berubah seiring dengan update sistem. Pastikan Anda menggunakan versi manual book terbaru.

---

**© 2025 PT Tunas Esta Indonesia**
**All Rights Reserved**
