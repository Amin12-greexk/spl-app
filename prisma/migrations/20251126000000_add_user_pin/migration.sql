-- Add required PIN column for users
ALTER TABLE "users" ADD COLUMN "pin" TEXT;

-- Fill existing rows with a placeholder PIN to satisfy NOT NULL
UPDATE "users" SET "pin" = COALESCE("pin", '0000');

-- Make column required
ALTER TABLE "users" ALTER COLUMN "pin" SET NOT NULL;
