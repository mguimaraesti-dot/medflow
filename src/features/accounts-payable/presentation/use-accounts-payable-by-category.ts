"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { AccountsPayableByCategoryItemResponseDTO } from "../application/dtos/accounts-payable-by-category.response-dto";

export function useAccountsPayableByCategory(period: {
  dateFrom: Date;
  dateTo: Date;
}) {
  const params = new URLSearchParams();
  params.set("dateFrom", period.dateFrom.toISOString());
  params.set("dateTo", period.dateTo.toISOString());

  return useQuery({
    queryKey: ["accounts-payable", "by-category", period],
    queryFn: () =>
      apiFetch<AccountsPayableByCategoryItemResponseDTO[]>(
        `/api/accounts-payable/by-category?${params.toString()}`,
      ),
  });
}
