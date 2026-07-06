import type { Prisma } from "@prisma/client";

export interface AccountsPayableSummaryBucket {
  count: number;
  amount: Prisma.Decimal;
}

/**
 * Agregação usada pelos cards de KPI da tela de Contas a Pagar — sempre
 * calculada no backend (Coding Standards, item 15), nunca somando a
 * lista paginada no frontend. `total` é a soma dos outros 4 (exclui
 * CANCELLED, mesma lógica do `displayStatus`).
 */
export interface AccountsPayableSummary {
  total: AccountsPayableSummaryBucket;
  dueToday: AccountsPayableSummaryBucket;
  /** Só para comparação (tendência do card "Hoje") — nunca entra na soma de `total`. */
  dueYesterday: AccountsPayableSummaryBucket;
  upcoming: AccountsPayableSummaryBucket;
  overdue: AccountsPayableSummaryBucket;
  paid: AccountsPayableSummaryBucket;
}
