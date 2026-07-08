"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { Supplier } from "../domain/supplier.entity";

/** Usado tanto por "Inativar" (`active: false`) quanto "Reativar" (`active: true`). */
export function useSetSupplierActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      active,
    }: {
      supplierId: string;
      active: boolean;
    }) =>
      apiFetch<Supplier>(`/api/suppliers/${supplierId}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
