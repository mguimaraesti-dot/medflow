"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CreateCashFlowEntryInput } from "../application/dtos/create-cash-flow-entry.dto";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";

export function useCreateCashFlowEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCashFlowEntryInput) =>
      apiFetch<CashFlowEntryResponseDTO>("/api/cash-flow", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow", "entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow", "insights"] });
      // Chave de query da feature cash-register duplicada de propósito
      // (não importamos hooks de outra feature diretamente) — ver
      // use-cash-register-today.ts para a mesma chave.
      queryClient.invalidateQueries({ queryKey: ["cash-register", "today"] });
    },
  });
}
