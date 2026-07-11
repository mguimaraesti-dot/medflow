"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CashRegisterPeriodSummaryResponseDTO } from "../application/dtos/cash-register-period-summary.response-dto";

export function useCashRegisterPeriodSummary(dateFrom: Date, dateTo: Date) {
  return useQuery({
    queryKey: [
      "cash-flow",
      "cash-register",
      "period-summary",
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      apiFetch<CashRegisterPeriodSummaryResponseDTO>(
        `/api/cash-flow/period-summary?dateFrom=${dateFrom.toISOString()}&dateTo=${dateTo.toISOString()}`,
      ),
  });
}
