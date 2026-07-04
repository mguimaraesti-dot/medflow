"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CreateRecurringBillInput } from "../application/dtos/create-recurring-bill.dto";
import type { RecurringBillResponseDTO } from "../application/dtos/recurring-bill.response-dto";

export function useCreateRecurringBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRecurringBillInput) =>
      apiFetch<RecurringBillResponseDTO>("/api/recurring-bills", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bills"] });
    },
  });
}
