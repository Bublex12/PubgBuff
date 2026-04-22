-- CreateTable
CREATE TABLE "SpotlightEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SpotlightEntry_role_normalized_key" ON "SpotlightEntry"("role", "normalized");
