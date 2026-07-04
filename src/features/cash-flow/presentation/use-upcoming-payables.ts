"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";

interface UpcomingPayableDTO {
  id: string;
  dueDate: string;
  description: string;
  amount: string;
}

/**
 * Hook fino duplicado (também existe em dashboard/presentation) — evita
 * import cross-feature de presentation só pra reaproveitar uma query
 * de poucas linhas.
 */
export function useUpcomingPayables() {
  return useQuery({
    queryKey: ["accounts-payable", "upcoming"],
    queryFn: async () => {
      const dueDateTo = new Date();
      dueDateTo.setUTCDate(dueDateTo.getUTCDate() + 7);
      const params = new URLSearchParams({
        status: "PENDING",
        dueDateTo: dueDateTo.toISOString(),
        pageSize: "5",
        page: "1",
      });
      const result = await apiFetch<PaginatedResult<UpcomingPayableDTO>>(
        `/api/accounts-payable?${params.toString()}`,
      );
      return result.items;
    },
  });
}
