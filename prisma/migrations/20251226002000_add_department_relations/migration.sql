-- Add approval mode to departments
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "approvalMode" TEXT NOT NULL DEFAULT 'DIRECT';

-- Backfill approval mode based on current department names and supervised flag
UPDATE "departments"
SET "approvalMode" = CASE
  WHEN LOWER("name") IN ('security', 'teknik', 'driver') THEN 'GA'
  WHEN "supervised" = TRUE THEN 'DEPARTMENT_HEAD'
  ELSE 'DIRECT'
END
WHERE "approvalMode" = 'DIRECT';

-- Add departmentId to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- Backfill departmentId using department name match
UPDATE "users" u
SET "departmentId" = d.id
FROM "departments" d
WHERE u."department" IS NOT NULL
  AND u."departmentId" IS NULL
  AND LOWER(u."department") = LOWER(d."name");

-- Index + FK
CREATE INDEX IF NOT EXISTS "users_departmentId_idx" ON "users"("departmentId");

ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
