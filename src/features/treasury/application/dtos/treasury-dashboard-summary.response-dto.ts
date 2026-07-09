export interface TreasuryDashboardSummaryResponseDTO {
  balance: string;
  /** Entradas/saídas confirmadas no período pedido (hoje, por padrão) — usado tanto pelos cards do dashboard quanto pelo Resumo do Período com um range explícito. */
  periodIn: string;
  periodOut: string;
  pendingCount: number;
  pendingSum: string;
  lastConfirmedAt: string | null;
  lastConfirmedByUserName: string | null;
}
