"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";

/**
 * Forma mínima duplicada de propósito (mesmo padrão já usado em
 * `use-upcoming-payables.ts`) — evita import cross-feature da
 * presentation/domain de Contas a Pagar só pra reaproveitar um DTO.
 */
export interface DashboardAgendaItemDTO {
  id: string;
  description: string;
  amount: string;
  dueDate: string;
  supplierId: string;
}

const AGENDA_PAGE_SIZE = 8;

/** "Vencem Hoje": PENDING já restringe `dueDate >= hoje` no backend — só falta o teto (`dueDateTo`) pra fechar em "hoje". */
export function useDashboardAgendaDueToday() {
  return useQuery({
    queryKey: ["dashboard", "agenda", "due-today"],
    queryFn: async () => {
      const dueDateTo = new Date();
      dueDateTo.setUTCHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        status: "PENDING",
        dueDateTo: dueDateTo.toISOString(),
        page: "1",
        pageSize: String(AGENDA_PAGE_SIZE),
      });
      const result = await apiFetch<PaginatedResult<DashboardAgendaItemDTO>>(
        `/api/accounts-payable?${params.toString()}`,
      );
      return result;
    },
  });
}

export function useDashboardAgendaOverdue() {
  return useQuery({
    queryKey: ["dashboard", "agenda", "overdue"],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "OVERDUE",
        page: "1",
        pageSize: String(AGENDA_PAGE_SIZE),
      });
      const result = await apiFetch<PaginatedResult<DashboardAgendaItemDTO>>(
        `/api/accounts-payable?${params.toString()}`,
      );
      return result;
    },
  });
}
