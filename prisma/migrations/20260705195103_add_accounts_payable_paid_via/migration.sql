-- CreateEnum
CREATE TYPE "PaymentConfirmationSource" AS ENUM ('SYSTEM', 'WHATSAPP');

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "paidVia" "PaymentConfirmationSource";
