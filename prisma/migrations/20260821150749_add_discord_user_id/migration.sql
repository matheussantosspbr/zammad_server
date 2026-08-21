-- AlterTable
ALTER TABLE "user" ADD COLUMN "discordUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_discordUserId_key" ON "user"("discordUserId");
