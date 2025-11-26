-- Settings table to store configurable values (e.g., minimal overtime start time)
CREATE TABLE "settings" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP (3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP (3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
