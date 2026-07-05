"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { RejectConferenceInput } from "../application/dtos/reject-conference.dto";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";
import { cashRegisterTodayQueryKey } from "./use-cash-register-today";

export function useRejectConference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectConferenceInput) =>
      apiFetch<CashRegisterDayResponseDTO>(
        "/api/cash-register/reject-conference",
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterTodayQueryKey });
    },
  });
}
