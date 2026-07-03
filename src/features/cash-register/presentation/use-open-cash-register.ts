"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { OpenCashRegisterInput } from "../application/dtos/open-cash-register.dto";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";
import { cashRegisterTodayQueryKey } from "./use-cash-register-today";

export function useOpenCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OpenCashRegisterInput) =>
      apiFetch<CashRegisterDayResponseDTO>("/api/cash-register", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterTodayQueryKey });
    },
  });
}
