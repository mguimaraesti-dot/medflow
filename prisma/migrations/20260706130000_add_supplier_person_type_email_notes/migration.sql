-- CreateEnum
CREATE TYPE "SupplierPersonType" AS ENUM ('PESSOA_FISICA', 'PESSOA_JURIDICA');

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "personType" "SupplierPersonType" NOT NULL DEFAULT 'PESSOA_JURIDICA',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "notes" TEXT;
