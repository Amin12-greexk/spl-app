-- AlterTable: Add multi-level approval fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;

-- AlterTable: Add multi-level approval fields to spls table
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "supervisorApprovalDate" TIMESTAMP(3);
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "supervisorSignature" TEXT;
ALTER TABLE "spls" ADD COLUMN IF NOT EXISTS "supervisorRejectionReason" TEXT;

-- Update existing SPL status from PENDING to PENDING_SUPERVISOR for backward compatibility
-- This allows existing pending requests to continue through the new approval flow
UPDATE "spls" SET "status" = 'PENDING_SUPERVISOR' WHERE "status" = 'PENDING';
UPDATE "spls" SET "status" = 'REJECTED_BY_MANAGER' WHERE "status" = 'REJECTED';

-- AddForeignKey for User supervisor relation
ALTER TABLE "users" ADD CONSTRAINT "users_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "users"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey for SPL supervisor relation
ALTER TABLE "spls" ADD CONSTRAINT "spls_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
