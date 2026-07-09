"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { TreasuryDashboardSummaryResponseDTO } from "../application/dtos/treasury-dashboard-summary.response-dto";

export function useTreasuryDashboardSummary(range?: { from: Date; to: Date }) {
  const params = new URLSearchParams();
  if (range) {
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
  }
  const query = params.toString();

  return useQuery({
    queryKey: ["treasury", "dashboard-summary", range?.from, range?.to],
    queryFn: () =>
      apiFetch<TreasuryDashboardSummaryResponseDTO>(
        `/api/treasury/dashboard-summary${query ? `?${query}` : ""}`,
      ),
  });
}
