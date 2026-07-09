"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CancelSafeMovementInput } from "../application/dtos/cancel-safe-movement.dto";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export function useCancelSafeMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      safeMovementId,
      input,
    }: {
      safeMovementId: string;
      input: CancelSafeMovementInput;
    }) =>
      apiFetch<SafeMovementResponseDTO>(
        `/api/treasury/movements/${safeMovementId}/cancel`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
    },
  });
}
