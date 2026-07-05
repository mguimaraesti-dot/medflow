"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { RequestSangriaInput } from "../application/dtos/request-sangria.dto";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export function useRequestSangria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RequestSangriaInput) =>
      apiFetch<SafeMovementResponseDTO>("/api/treasury/sangria", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
    },
  });
}
