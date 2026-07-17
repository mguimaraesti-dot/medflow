/** Uma linha da lista "O que entrou e o que saiu" — composição do Cofre por tipo de movimentação. */
export interface StatusReportSafeCompositionRow {
  label: string;
  description: string;
  count: number;
  /** Sinal já aplicado (negativo pra saídas) — pronto pra exibição. */
  amount: string;
}

/** Saldo do Cofre ao fim de uma semana do período — usado no gráfico "Saldo dia a dia". */
export interface StatusReportSafeWeek {
  label: string;
  balance: string;
}

/**
 * Relatório Executivo do Cofre — imagem 1080xN (`infrastructure/status-report-safe-image.tsx`).
 * Sobre o Cofre da Tesouraria (`Safe`/`SafeMovement`), não o Caixa
 * Recepção — são domínios diferentes (ver `status-report-cofre.entity.ts`,
 * que apesar do nome é o relatório do Caixa Recepção).
 */
export interface StatusReportSafeSummary {
  organizationName: string;
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;

  openingBalance: string;
  finalBalance: string;
  isSurplus: boolean;
  periodReceived: string;
  periodSent: string;

  pendingCount: number;
  pendingSum: string;

  composition: StatusReportSafeCompositionRow[];
  weeks: StatusReportSafeWeek[];
}
