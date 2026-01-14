-- Add source field to SPLs to distinguish SYSTEM, MANUAL, LEGACY
ALTER TABLE "spls" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'SYSTEM';

-- Backfill existing manual entries
UPDATE "spls" SET "source" = 'MANUAL' WHERE "isManualEntry" = true;
