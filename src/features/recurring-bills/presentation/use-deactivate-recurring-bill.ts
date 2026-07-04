"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { RecurringBillResponseDTO } from "../application/dtos/recurring-bill.response-dto";

export function useDeactivateRecurringBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<RecurringBillResponseDTO>(
        `/api/recurring-bills/${id}/deactivate`,
        {
          method: "POST",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bills"] });
    },
  });
}
