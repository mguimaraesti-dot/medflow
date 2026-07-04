"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { DashboardAlerts } from "../domain/dashboard-alerts.entity";

export function useDashboardAlerts() {
  return useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: () => apiFetch<DashboardAlerts>("/api/dashboard/alerts"),
  });
}
