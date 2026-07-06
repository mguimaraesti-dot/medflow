"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export interface AccountsPayableFilter {
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDateFrom?: Date;
  dueDateTo?: Date;
  categoryId?: string;
  /** Só as ocorrências de uma recorrência — usado pela aba "Próximas Ocorrências" do Drawer. */
  recurringBillId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  /** Só usado pela tela "Contas Excluídas" (requer payable:delete no backend). */
  deletedOnly?: boolean;
}

export function useAccountsPayable(filter: AccountsPayableFilter) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.dueDateFrom)
    params.set("dueDateFrom", filter.dueDateFrom.toISOString());
  if (filter.dueDateTo) params.set("dueDateTo", filter.dueDateTo.toISOString());
  if (filter.categoryId) params.set("categoryId", filter.categoryId);
  if (filter.recurringBillId)
    params.set("recurringBillId", filter.recurringBillId);
  if (filter.search) params.set("search", filter.search);
  if (filter.deletedOnly) params.set("deletedOnly", "true");
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  return useQuery({
    queryKey: ["accounts-payable", filter],
    queryFn: () =>
      apiFetch<PaginatedResult<AccountsPayableResponseDTO>>(
        `/api/accounts-payable?${params.toString()}`,
      ),
  });
}
