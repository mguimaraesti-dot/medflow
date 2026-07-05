"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { ConfirmHandoffInput } from "../application/dtos/confirm-handoff.dto";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";
import { cashRegisterTodayQueryKey } from "./use-cash-register-today";

export function useConfirmHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfirmHandoffInput) =>
      apiFetch<CashRegisterDayResponseDTO>(
        "/api/cash-register/confirm-handoff",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterTodayQueryKey });
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
    },
  });
}
