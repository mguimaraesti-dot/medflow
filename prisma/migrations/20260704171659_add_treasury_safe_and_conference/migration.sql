-- CreateEnum
CREATE TYPE "SafeMovementType" AS ENUM ('FUNDING', 'SANGRIA', 'CASH_REGISTER_HANDOFF', 'MANUAL_ADJUSTMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CASH_REGISTER_CONFERENCE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'CASH_REGISTER_HANDOFF_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'CASH_REGISTER_CONFERENCE_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'SAFE_SANGRIA';
ALTER TYPE "AuditAction" ADD VALUE 'SAFE_MANUAL_ADJUSTMENT';

-- AlterEnum
ALTER TYPE "CashRegisterStatus" ADD VALUE 'PENDING_CONFERENCE';

-- AlterTable
ALTER TABLE "cash_register_days" ADD COLUMN     "closureNote" TEXT,
ADD COLUMN     "confirmedDifference" DECIMAL(14,2),
ADD COLUMN     "countedAmount" DECIMAL(14,2),
ADD COLUMN     "difference" DECIMAL(14,2),
ADD COLUMN     "expectedCashAmount" DECIMAL(14,2),
ADD COLUMN     "handoffConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "handoffConfirmedByUserId" TEXT,
ADD COLUMN     "receivedAmount" DECIMAL(14,2),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "isCash" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "safes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safe_movements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "safeId" TEXT NOT NULL,
    "type" "SafeMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "relatedCashRegisterDayId" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safe_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "safes_organizationId_key" ON "safes"("organizationId");

-- CreateIndex
CREATE INDEX "safe_movements_organizationId_type_idx" ON "safe_movements"("organizationId", "type");

-- CreateIndex
CREATE INDEX "safe_movements_relatedCashRegisterDayId_idx" ON "safe_movements"("relatedCashRegisterDayId");

-- AddForeignKey
ALTER TABLE "cash_register_days" ADD CONSTRAINT "cash_register_days_handoffConfirmedByUserId_fkey" FOREIGN KEY ("handoffConfirmedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safes" ADD CONSTRAINT "safes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_movements" ADD CONSTRAINT "safe_movements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_movements" ADD CONSTRAINT "safe_movements_safeId_fkey" FOREIGN KEY ("safeId") REFERENCES "safes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_movements" ADD CONSTRAINT "safe_movements_relatedCashRegisterDayId_fkey" FOREIGN KEY ("relatedCashRegisterDayId") REFERENCES "cash_register_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_movements" ADD CONSTRAINT "safe_movements_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

