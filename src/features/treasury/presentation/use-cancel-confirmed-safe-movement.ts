"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CancelConfirmedSafeMovementInput } from "../application/dtos/cancel-confirmed-safe-movement.dto";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export function useCancelConfirmedSafeMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      safeMovementId,
      input,
    }: {
      safeMovementId: string;
      input: CancelConfirmedSafeMovementInput;
    }) =>
      apiFetch<SafeMovementResponseDTO>(
        `/api/treasury/movements/${safeMovementId}/cancel-confirmed`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
    },
  });
}
