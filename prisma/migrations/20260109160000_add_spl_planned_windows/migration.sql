-- Add planned/regular window snapshots + realization tracking
ALTER TABLE "spls" ADD COLUMN "regularStartAt" TIMESTAMP(3);
ALTER TABLE "spls" ADD COLUMN "regularEndAt" TIMESTAMP(3);
ALTER TABLE "spls" ADD COLUMN "plannedStartAt" TIMESTAMP(3);
ALTER TABLE "spls" ADD COLUMN "plannedEndAt" TIMESTAMP(3);
ALTER TABLE "spls" ADD COLUMN "realizedMinutes" INTEGER;
ALTER TABLE "spls" ADD COLUMN "realizationCounted" BOOLEAN;
ALTER TABLE "spls" ADD COLUMN "realizationCancelReason" TEXT;

-- Security shift assignments (per user per work date)
CREATE TABLE "security_shift_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_shift_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_shift_user_date_unique" ON "security_shift_assignments"("userId", "workDate");
CREATE INDEX "security_shift_workDate_idx" ON "security_shift_assignments"("workDate");
CREATE INDEX "security_shift_code_idx" ON "security_shift_assignments"("shiftCode");

ALTER TABLE "security_shift_assignments" ADD CONSTRAINT "security_shift_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
