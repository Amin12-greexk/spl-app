ALTER TABLE "spls"
ADD COLUMN "actualStartAt" TIMESTAMP(3),
ADD COLUMN "actualEndAt" TIMESTAMP(3),
ADD COLUMN "actualTotalHours" DOUBLE PRECISION,
ADD COLUMN "realizationNote" TEXT,
ADD COLUMN "realizationProofImage" TEXT,
ADD COLUMN "overrunReason" TEXT;
