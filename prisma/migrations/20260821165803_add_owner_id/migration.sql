-- AlterTable
ALTER TABLE "user" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_ownerId_key" ON "user"("ownerId");
