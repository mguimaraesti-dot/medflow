"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export type RecurrencePeriodicity =
  "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "YEARLY";

// Formato local, deliberadamente duplicado do DTO de recurring-bills — não
// importamos código de outra feature (só a URL da API), mesmo padrão já
// usado no PrismaCashFlowEntryRepository.
export interface RecurringBillDetail {
  id: string;
  periodicity: RecurrencePeriodicity;
  maxOccurrences: number | null;
  firstDueDate: string | null;
}

export function useRecurringBill(recurringBillId: string | null) {
  return useQuery({
    queryKey: ["recurring-bills", recurringBillId],
    queryFn: () =>
      apiFetch<RecurringBillDetail>(`/api/recurring-bills/${recurringBillId}`),
    enabled: recurringBillId !== null,
  });
}
