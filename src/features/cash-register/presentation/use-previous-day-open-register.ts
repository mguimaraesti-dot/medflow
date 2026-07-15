"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";

export const previousDayOpenRegisterQueryKey = [
  "cash-register",
  "previous-day-open",
] as const;

/**
 * Alimenta o aviso de `cash-balance-header.tsx` (e o resumo do
 * `CloseRegisterDialog`, quando fechando esse caixa) quando existe um
 * caixa esquecido aberto de dia anterior — ver
 * `PreviousDayCashRegisterOpenError`. Mesmo DTO de `useCashRegisterToday`
 * (já vem com `cashIn`/`totalIn`/`expectedCashAmount` calculados ao vivo).
 */
export function usePreviousDayOpenRegister() {
  return useQuery({
    queryKey: previousDayOpenRegisterQueryKey,
    queryFn: () =>
      apiFetch<CashRegisterDayResponseDTO | null>(
        "/api/cash-register/previous-day-open",
      ),
  });
}
