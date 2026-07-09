"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { SafeResponseDTO } from "../application/dtos/safe.response-dto";

export function useSafeSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["treasury", "safe"],
    queryFn: () => apiFetch<SafeResponseDTO>("/api/treasury/safe"),
    enabled: options?.enabled ?? true,
  });
}
