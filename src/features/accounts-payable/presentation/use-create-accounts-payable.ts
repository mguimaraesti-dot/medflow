"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CreateAccountsPayableInput } from "../application/dtos/create-accounts-payable.dto";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export function useCreateAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountsPayableInput) =>
      apiFetch<AccountsPayableResponseDTO>("/api/accounts-payable", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
    },
  });
}
