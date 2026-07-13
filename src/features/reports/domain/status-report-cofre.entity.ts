/** Uma linha de categoria nas tabelas de Entradas (Dinheiro/PIX) ou Saídas (Dinheiro). */
export interface StatusReportCofreCategoryRow {
  /** `null` só na linha sintética "Retirada de Caixa (secretária)" — não vem de uma Category. */
  categoryId: string | null;
  label: string;
  count: number;
  amount: string;
}

/**
 * Relatório do Caixa Recepção — imagem 1080x1920 (`infrastructure/status-report-cofre-image.tsx`).
 * Saldo Final = Saldo Inicial + Entradas Dinheiro - Saída Dinheiro (PIX é só
 * informativo, nunca entra nessa conta — "PIX não fica em caixa", mesma
 * regra do Fluxo Financeiro do Dia no Dashboard).
 */
export interface StatusReportCofreSummary {
  organizationName: string;
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;

  openingBalance: string;
  cashIncomeTotal: string;
  cashIncomeCount: number;
  pixIncomeTotal: string;
  pixIncomeCount: number;
  cashOutcomeTotal: string;
  cashOutcomeCount: number;
  finalBalance: string;
  isSurplus: boolean;

  cashIncomeByCategory: StatusReportCofreCategoryRow[];
  pixIncomeByCategory: StatusReportCofreCategoryRow[];
  cashOutcomeByCategory: StatusReportCofreCategoryRow[];
}
