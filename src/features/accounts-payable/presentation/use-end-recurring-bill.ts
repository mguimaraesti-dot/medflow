"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

// Duplicado de propósito (não importamos código de outra feature) — mesmo
// padrão de use-recurring-bill.ts/use-recurring-bill-insights.ts: só a URL
// da API é compartilhada.
export function useEndRecurringBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recurringBillId: string) =>
      apiFetch(`/api/recurring-bills/${recurringBillId}/deactivate`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bills"] });
    },
  });
}
