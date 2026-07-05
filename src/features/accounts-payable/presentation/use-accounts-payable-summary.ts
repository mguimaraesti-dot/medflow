"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { AccountsPayableSummaryResponseDTO } from "../application/dtos/accounts-payable-summary.response-dto";

export function useAccountsPayableSummary(period: {
  dueDateFrom?: Date;
  dueDateTo?: Date;
}) {
  const params = new URLSearchParams();
  if (period.dueDateFrom)
    params.set("dueDateFrom", period.dueDateFrom.toISOString());
  if (period.dueDateTo) params.set("dueDateTo", period.dueDateTo.toISOString());

  return useQuery({
    queryKey: ["accounts-payable", "summary", period],
    queryFn: () =>
      apiFetch<AccountsPayableSummaryResponseDTO>(
        `/api/accounts-payable/summary?${params.toString()}`,
      ),
  });
}
