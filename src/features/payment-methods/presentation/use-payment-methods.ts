"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaymentMethod } from "../domain/payment-method.entity";

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiFetch<PaymentMethod[]>("/api/payment-methods"),
    // Lista praticamente estática (Dinheiro/PIX/etc.) — acima do
    // staleTime padrão (30s, ver providers.tsx).
    staleTime: 5 * 60_000,
  });
}
