"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

/** Catálogo estático de perfis (Admin/Proprietário/Secretária/Financeiro/Contador) para o seletor da Gestão de Acessos. */
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<RoleOption[]>("/api/roles"),
    // A própria rota (`/api/roles`) documenta isso como "cinco linhas
    // estáticas" — não muda em runtime, não precisa refazer a busca.
    staleTime: Infinity,
  });
}
