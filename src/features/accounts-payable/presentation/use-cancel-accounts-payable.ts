"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export function useCancelAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountsPayableId: string) =>
      apiFetch<AccountsPayableResponseDTO>(
        `/api/accounts-payable/${accountsPayableId}/cancel`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
    },
  });
}
