-- CreateTable
CREATE TABLE "accounts_payable_attachments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountsPayableId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_payable_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_payable_attachments_organizationId_idx" ON "accounts_payable_attachments"("organizationId");

-- CreateIndex
CREATE INDEX "accounts_payable_attachments_accountsPayableId_idx" ON "accounts_payable_attachments"("accountsPayableId");

-- AddForeignKey
ALTER TABLE "accounts_payable_attachments" ADD CONSTRAINT "accounts_payable_attachments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable_attachments" ADD CONSTRAINT "accounts_payable_attachments_accountsPayableId_fkey" FOREIGN KEY ("accountsPayableId") REFERENCES "accounts_payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable_attachments" ADD CONSTRAINT "accounts_payable_attachments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

