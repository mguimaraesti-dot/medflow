"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { DashboardOverviewResponseDTO } from "../application/dtos/dashboard-overview.response-dto";

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () =>
      apiFetch<DashboardOverviewResponseDTO>("/api/dashboard/overview"),
    refetchInterval: 60_000,
  });
}
