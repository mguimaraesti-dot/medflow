"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { Supplier } from "../domain/supplier.entity";

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/api/suppliers"),
  });
}
