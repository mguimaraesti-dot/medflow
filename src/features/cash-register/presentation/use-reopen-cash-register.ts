"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { ReopenCashRegisterInput } from "../application/dtos/reopen-cash-register.dto";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";
import { cashRegisterTodayQueryKey } from "./use-cash-register-today";

export function useReopenCashRegister(cashRegisterDayId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReopenCashRegisterInput) =>
      apiFetch<CashRegisterDayResponseDTO>(
        `/api/cash-register/${cashRegisterDayId}/reopen`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterTodayQueryKey });
    },
  });
}
