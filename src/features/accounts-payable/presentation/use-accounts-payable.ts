"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export interface AccountsPayableFilter {
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDateFrom?: Date;
  dueDateTo?: Date;
  /** Filtro por data de pagamento (`paidAt`) — usado pelo relatório "Contas Pagas". */
  paidAtFrom?: Date;
  paidAtTo?: Date;
  categoryId?: string;
  /** Filtro "Fornecedor" da barra "Mais filtros" — já existe ponta a ponta no backend. */
  supplierId?: string;
  /** Só as ocorrências de uma recorrência — usado pelo Drawer "Ver Ocorrências"/"Linha do Tempo". */
  recurringBillId?: string;
  /** Filtro "Recorrência" da tela: só recorrentes ou só avulsas. */
  recurringOnly?: "RECURRING" | "NON_RECURRING";
  search?: string;
  page?: number;
  pageSize?: number;
  /** Só usado pela tela "Contas Excluídas" (requer payable:delete no backend). */
  deletedOnly?: boolean;
  /** "Dr. Flávio" (BANCO) ou "Cofre" — usado pelo Relatório de Contas a Pagar consolidado. */
  paymentOrigin?: "BANCO" | "COFRE";
  /** Combinado com `status` omitido, pra listar Pagas+Pendentes+Vencidas juntas sem Canceladas — usado pelo Relatório de Contas a Pagar consolidado. */
  excludeCancelled?: boolean;
}

export function useAccountsPayable(filter: AccountsPayableFilter) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.dueDateFrom)
    params.set("dueDateFrom", filter.dueDateFrom.toISOString());
  if (filter.dueDateTo) params.set("dueDateTo", filter.dueDateTo.toISOString());
  if (filter.paidAtFrom)
    params.set("paidAtFrom", filter.paidAtFrom.toISOString());
  if (filter.paidAtTo) params.set("paidAtTo", filter.paidAtTo.toISOString());
  if (filter.categoryId) params.set("categoryId", filter.categoryId);
  if (filter.supplierId) params.set("supplierId", filter.supplierId);
  if (filter.recurringBillId)
    params.set("recurringBillId", filter.recurringBillId);
  if (filter.recurringOnly) params.set("recurringOnly", filter.recurringOnly);
  if (filter.search) params.set("search", filter.search);
  if (filter.deletedOnly) params.set("deletedOnly", "true");
  if (filter.paymentOrigin) params.set("paymentOrigin", filter.paymentOrigin);
  if (filter.excludeCancelled) params.set("excludeCancelled", "true");
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  return useQuery({
    queryKey: ["accounts-payable", filter],
    queryFn: () =>
      apiFetch<PaginatedResult<AccountsPayableResponseDTO>>(
        `/api/accounts-payable?${params.toString()}`,
      ),
    placeholderData: keepPreviousData,
    // Enquanto houver alguma conta pendente com lembrete de WhatsApp já
    // enviado (aguardando confirmação via clique no botão "Pago"), busca
    // de novo a cada 15s — o webhook confirma o pagamento em segundo
    // plano, sem nenhuma ação do usuário na tela, então sem isso o
    // status só atualizava depois de um F5 manual. Escolhido por ser o
    // mais simples de manter no estágio atual do projeto (sem
    // infraestrutura nova — Supabase Realtime exigiria configurar
    // canal/policies à parte só pra isso).
    refetchInterval: (query) => {
      const hasPendingReminder = query.state.data?.items.some(
        (item) => item.status === "PENDING" && item.lastReminderSentAt !== null,
      );
      return hasPendingReminder ? 15_000 : false;
    },
  });
}
