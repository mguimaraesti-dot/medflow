"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export interface AccountsPayableFilter {
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDateFrom?: Date;
  dueDateTo?: Date;
  page?: number;
  pageSize?: number;
}

export function useAccountsPayable(filter: AccountsPayableFilter) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.dueDateFrom)
    params.set("dueDateFrom", filter.dueDateFrom.toISOString());
  if (filter.dueDateTo) params.set("dueDateTo", filter.dueDateTo.toISOString());
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
