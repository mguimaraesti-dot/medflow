"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { RecurringBillResponseDTO } from "../application/dtos/recurring-bill.response-dto";

export function useRecurringBills() {
  return useQuery({
    queryKey: ["recurring-bills"],
    queryFn: () => apiFetch<RecurringBillResponseDTO[]>("/api/recurring-bills"),
  });
}
