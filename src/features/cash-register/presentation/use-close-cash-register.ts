"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";
import { cashRegisterTodayQueryKey } from "./use-cash-register-today";

export function useCloseCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<CashRegisterDayResponseDTO>("/api/cash-register/close", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterTodayQueryKey });
      // Chave de query da feature cash-flow duplicada de propósito (não
      // importamos hooks de outra feature diretamente) — ver
      // use-cash-flow-entries.ts para a mesma chave.
      queryClient.invalidateQueries({ queryKey: ["cash-flow", "entries"] });
    },
  });
}
