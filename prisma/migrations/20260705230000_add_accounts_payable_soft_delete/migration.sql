-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedByUserId" TEXT,
ADD COLUMN     "deletionReason" TEXT;

-- CreateIndex
CREATE INDEX "accounts_payable_deletedAt_idx" ON "accounts_payable"("deletedAt");

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
