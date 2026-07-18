/** Uma linha da lista "O que entrou e o que saiu" — composição do Cofre por tipo de movimentação. */
export interface StatusReportSafeCompositionRow {
  label: string;
  description: string;
  count: number;
  /** Sinal já aplicado (negativo pra saídas) — pronto pra exibição. */
  amount: string;
}

/**
 * Granularidade do gráfico de evolução do saldo — escolhida conforme o
 * tamanho do período (`determineGranularity` em
 * `get-status-report-safe.use-case.ts`), pra sempre caber num número de
 * barras legível (período curto = diário, médio = semanal, longo =
 * mensal).
 */
export type StatusReportSafeGranularity = "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * Saldo do Cofre ao fim de um ponto do período (dia, semana ou mês,
 * conforme `granularity`) — usado no gráfico de evolução do saldo.
 * `showLabel` degrada com elegância quando há barras demais pro rótulo
 * caber sem sobrepor (sempre a primeira e a última, mais pontos
 * igualmente espaçados no meio).
 */
export interface StatusReportSafeBalancePoint {
  label: string;
  balance: string;
  showLabel: boolean;
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
  granularity: StatusReportSafeGranularity;
  /** "Saldo por dia" / "Saldo por semana" / "Saldo por mês", conforme `granularity`. */
  balanceHistoryTitle: string;
  balanceHistory: StatusReportSafeBalancePoint[];
}
