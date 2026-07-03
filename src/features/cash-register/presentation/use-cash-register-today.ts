"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";

export const cashRegisterTodayQueryKey = ["cash-register", "today"] as const;

export function useCashRegisterToday() {
  return useQuery({
    queryKey: cashRegisterTodayQueryKey,
    queryFn: () =>
      apiFetch<CashRegisterDayResponseDTO | null>("/api/cash-register/today"),
  });
}
