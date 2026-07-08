"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { SupplierResponseDTO } from "../application/dtos/supplier.response-dto";

/** Sempre retorna ativos e inativos — quem precisa esconder inativos (ex: `SupplierCombobox`) filtra por `supplier.active` na apresentação. */
export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<SupplierResponseDTO[]>("/api/suppliers"),
  });
}
