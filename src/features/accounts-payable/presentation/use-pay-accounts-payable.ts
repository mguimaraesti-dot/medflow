"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PayAccountsPayableInput } from "../application/dtos/pay-accounts-payable.dto";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export function usePayAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountsPayableId,
      input,
    }: {
      accountsPayableId: string;
      input: PayAccountsPayableInput;
    }) =>
      apiFetch<AccountsPayableResponseDTO>(
        `/api/accounts-payable/${accountsPayableId}/pay`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      // Pagar gera um lançamento de caixa OUT — invalida tudo que
      // depende do saldo, não só a lista de contas (chaves de outras
      // features duplicadas de propósito, sem import cross-feature).
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow", "entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow", "insights"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register", "today"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
