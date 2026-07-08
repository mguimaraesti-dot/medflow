-- CreateEnum
CREATE TYPE "PaymentOrigin" AS ENUM ('BANCO', 'COFRE');

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "paymentOrigin" "PaymentOrigin" NOT NULL DEFAULT 'BANCO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SafeMovementType" ADD VALUE 'ACCOUNTS_PAYABLE_PAYMENT';

-- AlterTable
ALTER TABLE "safe_movements" ADD COLUMN     "relatedAccountsPayableId" TEXT;

-- CreateIndex
CREATE INDEX "safe_movements_relatedAccountsPayableId_idx" ON "safe_movements"("relatedAccountsPayableId");

-- AddForeignKey
ALTER TABLE "safe_movements" ADD CONSTRAINT "safe_movements_relatedAccountsPayableId_fkey" FOREIGN KEY ("relatedAccountsPayableId") REFERENCES "accounts_payable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
