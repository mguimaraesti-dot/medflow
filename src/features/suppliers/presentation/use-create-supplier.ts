"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CreateSupplierInput } from "../application/dtos/create-supplier.dto";
import type { Supplier } from "../domain/supplier.entity";

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSupplierInput) =>
      apiFetch<Supplier>("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
