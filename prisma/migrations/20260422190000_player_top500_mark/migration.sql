-- AlterTable
ALTER TABLE "PlayerProfileMark" ADD COLUMN "isTop500" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlayerProfileMark" ADD COLUMN "top500Rank" INTEGER;
ALTER TABLE "PlayerProfileMark" ADD COLUMN "top500SeasonId" TEXT;
ALTER TABLE "PlayerProfileMark" ADD COLUMN "top500GameMode" TEXT;
