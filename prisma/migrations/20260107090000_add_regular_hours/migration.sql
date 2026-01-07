-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "regularStartTime" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "regularEndTime" TEXT;
