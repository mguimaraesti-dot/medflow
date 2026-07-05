"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { UpdateAccountsPayableInput } from "../application/dtos/update-accounts-payable.dto";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export function useUpdateAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountsPayableId,
      input,
    }: {
      accountsPayableId: string;
      input: UpdateAccountsPayableInput;
    }) =>
      apiFetch<AccountsPayableResponseDTO>(
        `/api/accounts-payable/${accountsPayableId}`,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
    },
  });
}
