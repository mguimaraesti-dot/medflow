"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { DashboardSummaryResponseDTO } from "../application/dtos/dashboard-summary.response-dto";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () =>
      apiFetch<DashboardSummaryResponseDTO>("/api/dashboard/summary"),
  });
}
