"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export function useDeleteAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountsPayableId,
      reason,
    }: {
      accountsPayableId: string;
      reason?: string;
    }) =>
      apiFetch<AccountsPayableResponseDTO>(
        `/api/accounts-payable/${accountsPayableId}`,
        { method: "DELETE", body: JSON.stringify({ reason }) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
    },
  });
}
