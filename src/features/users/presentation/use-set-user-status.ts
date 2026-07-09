"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { UserResponseDTO } from "../application/dtos/user.response-dto";

/** Usado tanto por "Desativar" quanto "Reativar". */
export function useSetUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: "ACTIVE" | "INACTIVE";
    }) =>
      apiFetch<UserResponseDTO>(`/api/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
