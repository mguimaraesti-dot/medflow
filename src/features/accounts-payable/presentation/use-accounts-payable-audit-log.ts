"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

/** Espelha AuditLogEntry (core/audit) — deliberadamente duplicado, mesmo padrão já usado entre features/camadas neste projeto. */
export interface AccountsPayableAuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  entity: string;
  entityId: string;
  action: string;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export function useAccountsPayableAuditLog(accountsPayableId: string | null) {
  return useQuery({
    queryKey: ["accounts-payable-audit-log", accountsPayableId],
    queryFn: () =>
      apiFetch<AccountsPayableAuditLogEntry[]>(
        `/api/accounts-payable/${accountsPayableId}/audit-log`,
      ),
    enabled: accountsPayableId !== null,
  });
}
