"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export function useRestoreAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountsPayableId: string) =>
      apiFetch<AccountsPayableResponseDTO>(
        `/api/accounts-payable/${accountsPayableId}/restore`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
    },
  });
}
