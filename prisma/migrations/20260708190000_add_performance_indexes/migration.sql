-- CreateIndex
CREATE INDEX "accounts_payable_organizationId_dueDate_idx" ON "accounts_payable"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "accounts_payable_supplierId_idx" ON "accounts_payable"("supplierId");

-- CreateIndex
CREATE INDEX "accounts_payable_categoryId_idx" ON "accounts_payable"("categoryId");

-- CreateIndex
CREATE INDEX "accounts_payable_recurringBillId_idx" ON "accounts_payable"("recurringBillId");

-- CreateIndex
CREATE INDEX "cash_flow_entries_organizationId_occurredAt_idx" ON "cash_flow_entries"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "safe_movements_safeId_type_idx" ON "safe_movements"("safeId", "type");

-- CreateIndex
CREATE INDEX "safe_movements_organizationId_createdAt_idx" ON "safe_movements"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "recurring_bills_organizationId_idx" ON "recurring_bills"("organizationId");

-- CreateIndex
CREATE INDEX "recurring_bills_supplierId_idx" ON "recurring_bills"("supplierId");
