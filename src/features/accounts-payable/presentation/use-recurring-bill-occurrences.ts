"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/** Todas as ocorrências (irmãs) de uma recorrência — usado pela aba "Próximas Ocorrências" do Drawer. */
export function useRecurringBillOccurrences(recurringBillId: string | null) {
  return useQuery({
    queryKey: [
      "accounts-payable",
      "recurring-bill-occurrences",
      recurringBillId,
    ],
    queryFn: () =>
      apiFetch<PaginatedResult<AccountsPayableResponseDTO>>(
        `/api/accounts-payable?recurringBillId=${recurringBillId}&pageSize=100`,
      ),
    enabled: recurringBillId !== null,
  });
}
