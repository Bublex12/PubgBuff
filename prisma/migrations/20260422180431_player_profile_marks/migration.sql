-- CreateTable
CREATE TABLE "PlayerProfileMark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL DEFAULT 'steam',
    "playerName" TEXT NOT NULL,
    "isStreamer" BOOLEAN NOT NULL DEFAULT false,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfileMark_platform_playerName_key" ON "PlayerProfileMark"("platform", "playerName");
