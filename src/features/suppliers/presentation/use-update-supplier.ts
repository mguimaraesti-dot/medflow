"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { UpdateSupplierInput } from "../application/dtos/update-supplier.dto";
import type { Supplier } from "../domain/supplier.entity";

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      input,
    }: {
      supplierId: string;
      input: UpdateSupplierInput;
    }) =>
      apiFetch<Supplier>(`/api/suppliers/${supplierId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
