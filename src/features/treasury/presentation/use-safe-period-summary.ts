"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { SafePeriodSummaryResponseDTO } from "../application/dtos/safe-period-summary.response-dto";

export function useSafePeriodSummary(dateFrom: Date, dateTo: Date) {
  return useQuery({
    queryKey: ["treasury", "safe", "period-summary", dateFrom, dateTo],
    queryFn: () =>
      apiFetch<SafePeriodSummaryResponseDTO>(
        `/api/treasury/safe/period-summary?dateFrom=${dateFrom.toISOString()}&dateTo=${dateTo.toISOString()}`,
      ),
  });
}
