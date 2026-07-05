"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { ManualAdjustmentInput } from "../application/dtos/manual-adjustment.dto";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export function useManualAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManualAdjustmentInput) =>
      apiFetch<SafeMovementResponseDTO>("/api/treasury/manual-adjustment", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
    },
  });
}
