"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CashRegisterDayDetailResponseDTO } from "../application/dtos/get-cash-register-day-detail.response-dto";

export function useCashRegisterDayDetail(id: string | null) {
  return useQuery({
    queryKey: ["cash-register", "detail", id],
    queryFn: () =>
      apiFetch<CashRegisterDayDetailResponseDTO>(`/api/cash-register/${id}`),
    enabled: id !== null,
  });
}
