"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PreviousDayOpenRegisterInfo } from "../application/get-previous-day-open-register.use-case";

export const previousDayOpenRegisterQueryKey = [
  "cash-register",
  "previous-day-open",
] as const;

/** Alimenta o aviso de `cash-balance-header.tsx` quando existe um caixa esquecido aberto de dia anterior — ver `PreviousDayCashRegisterOpenError`. */
export function usePreviousDayOpenRegister() {
  return useQuery({
    queryKey: previousDayOpenRegisterQueryKey,
    queryFn: () =>
      apiFetch<PreviousDayOpenRegisterInfo | null>(
        "/api/cash-register/previous-day-open",
      ),
  });
}
