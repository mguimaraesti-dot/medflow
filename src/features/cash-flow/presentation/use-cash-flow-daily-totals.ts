"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CashFlowDailyTotalResponseDTO } from "../application/dtos/cash-flow-daily-totals.response-dto";

export function useCashFlowDailyTotals(period: {
  dateFrom: Date;
  dateTo: Date;
}) {
  const params = new URLSearchParams();
  params.set("dateFrom", period.dateFrom.toISOString());
  params.set("dateTo", period.dateTo.toISOString());

  return useQuery({
    queryKey: ["cash-flow", "daily-totals", period],
    queryFn: () =>
      apiFetch<CashFlowDailyTotalResponseDTO[]>(
        `/api/cash-flow/daily-totals?${params.toString()}`,
      ),
  });
}
