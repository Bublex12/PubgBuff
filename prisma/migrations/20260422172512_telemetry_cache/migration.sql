-- CreateTable
CREATE TABLE "TelemetryCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "telemetryUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "eventCount" INTEGER,
    "fetchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TelemetryCache_platform_matchId_key" ON "TelemetryCache"("platform", "matchId");
