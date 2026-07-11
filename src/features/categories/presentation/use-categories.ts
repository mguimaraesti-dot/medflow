"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { CategoryType } from "../domain/category.entity";
import type { CategoryResponseDTO } from "../application/dtos/category.response-dto";

export function useCategories(type?: CategoryType) {
  return useQuery({
    queryKey: ["categories", type ?? "all"],
    queryFn: () =>
      apiFetch<CategoryResponseDTO[]>(
        type ? `/api/categories?type=${type}` : "/api/categories",
      ),
    // Cadastro gerenciado por admin, muda raramente — acima do
    // staleTime padrão (30s, ver providers.tsx) pra não refazer essa
    // busca a cada foco de janela; uma categoria desatualizada por
    // alguns minutos num dropdown não afeta integridade financeira.
    staleTime: 5 * 60_000,
  });
}
