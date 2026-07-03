"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";

export interface CashFlowEntriesFilter {
  cashRegisterDayId?: string;
  type?: "IN" | "OUT";
  page?: number;
  pageSize?: number;
}

export const cashFlowEntriesQueryKey = (filter: CashFlowEntriesFilter) =>
  ["cash-flow", "entries", filter] as const;

export function useCashFlowEntries(filter: CashFlowEntriesFilter) {
  const params = new URLSearchParams();
  if (filter.cashRegisterDayId) {
    params.set("cashRegisterDayId", filter.cashRegisterDayId);
  }
  if (filter.type) params.set("type", filter.type);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  return useQuery({
    queryKey: cashFlowEntriesQueryKey(filter),
    queryFn: () =>
      apiFetch<PaginatedResult<CashFlowEntryResponseDTO>>(
        `/api/cash-flow?${params.toString()}`,
      ),
    enabled: Boolean(filter.cashRegisterDayId),
  });
}
