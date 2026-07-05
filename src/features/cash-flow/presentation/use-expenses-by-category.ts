"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { ExpensesByCategoryItemResponseDTO } from "../application/dtos/expenses-by-category.response-dto";

export function useExpensesByCategory(period: {
  dateFrom: Date;
  dateTo: Date;
}) {
  const params = new URLSearchParams();
  params.set("dateFrom", period.dateFrom.toISOString());
  params.set("dateTo", period.dateTo.toISOString());

  return useQuery({
    queryKey: ["cash-flow", "expenses-by-category", period],
    queryFn: () =>
      apiFetch<ExpensesByCategoryItemResponseDTO[]>(
        `/api/cash-flow/expenses-by-category?${params.toString()}`,
      ),
  });
}
