-- CreateTable
CREATE TABLE "PlayerCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MatchCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCache_platform_playerName_key" ON "PlayerCache"("platform", "playerName");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCache_platform_matchId_key" ON "MatchCache"("platform", "matchId");
