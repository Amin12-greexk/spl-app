-- Add missing SPL columns (safety for reset/migrate)
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "proofImage" TEXT;
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "isManualEntry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "manualEntryBy" TEXT;
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "requesterSignedAt" TIMESTAMP(3);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_supervisorId_idx" ON "users"("supervisorId");
CREATE INDEX IF NOT EXISTS "users_departmentId_idx" ON "users"("departmentId");

CREATE INDEX IF NOT EXISTS "spls_requesterId_createdAt_idx" ON "spls"("requesterId", "createdAt");
CREATE INDEX IF NOT EXISTS "spls_status_createdAt_idx" ON "spls"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "spls_supervisorId_createdAt_idx" ON "spls"("supervisorId", "createdAt");
CREATE INDEX IF NOT EXISTS "spls_manual_unsigned_idx" ON "spls"("isManualEntry", "requesterSignedAt");
