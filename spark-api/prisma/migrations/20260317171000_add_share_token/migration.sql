-- AlterTable
ALTER TABLE "users" ADD COLUMN "share_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_share_token_key" ON "users"("share_token");
