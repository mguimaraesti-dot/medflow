"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export function useConfirmSafeMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (safeMovementId: string) =>
      apiFetch<SafeMovementResponseDTO>(
        `/api/treasury/movements/${safeMovementId}/confirm`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
    },
  });
}
