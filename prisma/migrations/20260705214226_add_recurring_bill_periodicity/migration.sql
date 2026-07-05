-- CreateEnum
CREATE TYPE "RecurrencePeriodicity" AS ENUM ('MONTHLY', 'BIWEEKLY', 'WEEKLY', 'YEARLY');

-- AlterTable
ALTER TABLE "recurring_bills" ADD COLUMN     "periodicity" "RecurrencePeriodicity" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "maxOccurrences" INTEGER,
ADD COLUMN     "firstDueDate" DATE;

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "occurrenceNumber" INTEGER;
