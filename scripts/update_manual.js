const fs = require('fs');
const file = 'C:/Users/USER/Desktop/spl-app/MANUAL_BOOK.md';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '- Jika melewati batas waktu, pengajuan akan ditolak secara otomatis\n- Untuk kasus urgent yang melewati batas waktu, temui Manager secara langsung',
  '- Jika melewati batas waktu pengajuan normal, pengajuan berstatus Telat (PENDING_SUPERADMIN) dan memerlukan review awal dari Super Admin sebelum masuk ke Supervisor/Manager.\n- Khusus untuk departemen yang disupervisi GA (Security, Teknik, Driver), pengajuan wajib menyertakan Foto Bukti.'
);

content = content.replace(
  'Formulir dibagi menjadi 4 bagian:',
  'Formulir meliputi bagian-bagian berikut:\n   - **Data Dasar**: Tanggal Lembur dan Nama Proyek.\n   - **Jam Kerja Reguler**: Jam mulai dan selesai reguler. Khusus Security dapat memilih preset Shift (P1, P2, M1, M2, F1).\n   - **Waktu Lembur**: Jam mulai dan selesai lembur (tidak boleh bentrok dengan jam reguler).\n   - **Alasan & Foto**: Alasan lembur dan Foto Bukti (wajib untuk Security/Teknik/Driver).\n   - **Tanda Tangan**: Tanda tangan digital wajib diisi.'
);

content = content.replace(
  '**PENDING**\n- Status SPL yang menunggu persetujuan\n- Badge kuning',
  '**PENDING_SUPERADMIN**\n- Status SPL yang diajukan telat/melewati batas waktu.\n\n**PENDING_SUPERVISOR**\n- Menunggu persetujuan dari Supervisor langsung.\n\n**PENDING_MANAGER**\n- Menunggu persetujuan Manager (setelah disetujui Supervisor atau jika tidak ada Supervisor).'
);

content = content.replace(
  '**Manager**: Pihak yang berwenang menyetujui atau menolak pengajuan SPL',
  '**Supervisor/Manager**: Pihak berwenang (berjenjang) yang menyetujui atau menolak pengajuan SPL'
);

// Also let's append version to 1.3
content = content.replace(
  '**Versi:** 1.2\n**Tanggal:** November 2025',
  '**Versi:** 1.3\n**Tanggal:** Juni 2026'
);

content = content.replace(
  '- Version: 1.2\n- Last Updated: November 2025',
  '- Version: 1.3\n- Last Updated: Juni 2026'
);

fs.writeFileSync(file, content);
console.log('Update success');
