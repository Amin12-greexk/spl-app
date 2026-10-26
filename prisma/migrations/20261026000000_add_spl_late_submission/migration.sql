-- Pengajuan SPL telat oleh karyawan: penanda, alasan keterlambatan, dan hasil cek fingerprint
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "isLate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "lateReason" TEXT;
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "lateFingerprintStatus" TEXT;
