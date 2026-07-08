"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";

export interface CashRegisterDaysFilter {
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export function useCashRegisterDays(filter: CashRegisterDaysFilter) {
  const params = new URLSearchParams();
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom.toISOString());
  if (filter.dateTo) params.set("dateTo", filter.dateTo.toISOString());
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  return useQuery({
    queryKey: ["cash-register", "history", filter],
    queryFn: () =>
      apiFetch<PaginatedResult<CashRegisterDayResponseDTO>>(
        `/api/cash-register?${params.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}
