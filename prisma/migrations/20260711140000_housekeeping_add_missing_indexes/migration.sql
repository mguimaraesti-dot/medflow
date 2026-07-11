-- DropIndex
DROP INDEX "accounts_payable_deletedAt_idx";

-- CreateIndex
CREATE INDEX "accounts_payable_organizationId_deletedAt_idx" ON "accounts_payable"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "accounts_payable_organizationId_status_dueDate_idx" ON "accounts_payable"("organizationId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "accounts_payable_organizationId_status_paidAt_idx" ON "accounts_payable"("organizationId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "cash_flow_entries_cashRegisterDayId_idx" ON "cash_flow_entries"("cashRegisterDayId");

-- CreateIndex
CREATE INDEX "safe_movements_organizationId_confirmedAt_idx" ON "safe_movements"("organizationId", "confirmedAt");

