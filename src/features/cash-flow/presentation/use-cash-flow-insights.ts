"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CashFlowInsightsResponseDTO } from "../application/dtos/cash-flow-insights.response-dto";

export function useCashFlowInsights() {
  return useQuery({
    queryKey: ["cash-flow", "insights"],
    queryFn: () =>
      apiFetch<CashFlowInsightsResponseDTO>("/api/cash-flow/insights"),
  });
}
