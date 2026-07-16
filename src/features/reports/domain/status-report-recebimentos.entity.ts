/**
 * Uma linha da tabela de lançamentos — detalhe, não agregado (diferente
 * dos outros Status Reports). `frascos` é `null` quando a categoria não
 * é um kit (mostra "—" na imagem).
 */
export interface StatusReportRecebimentosEntry {
  id: string;
  occurredAt: Date;
  categoryLabel: string;
  patientName: string;
  frascos: number | null;
  paymentMethodLabel: string;
  paymentMethodIsCash: boolean;
  amount: string;
}

/** Uma linha do bloco "Frascos vendidos no período" — só categorias de kit COM movimentação. */
export interface StatusReportRecebimentosKitRow {
  categoryId: string;
  label: string;
  kitSize: number;
  count: number;
  frascos: number;
}

/**
 * Relatório de Recebimentos — imagem 1080xN
 * (`infrastructure/status-report-recebimentos-image.tsx`). Detalhe
 * lançamento a lançamento das ENTRADAS do Caixa Recepção no período
 * (relatório de conferência, não agregado como os outros dois Status
 * Reports).
 */
export interface StatusReportRecebimentosSummary {
  organizationName: string;
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;

  totalAmount: string;
  totalCount: number;

  cashTotal: string;
  cashCount: number;
  pixTotal: string;
  pixCount: number;

  totalFrascos: number;

  /**
   * Truncado em `MAX_DISPLAYED_ENTRIES` (ver use case) — pode ter menos
   * itens que `totalCount` num período com muitos lançamentos. Todos
   * os totais/KPIs/frascos acima já somam o período INTEIRO, mesmo
   * quando esta lista é truncada; a imagem deve mostrar um aviso
   * "mostrando N de totalCount" quando `entries.length < totalCount`.
   */
  entries: StatusReportRecebimentosEntry[];
  kitRows: StatusReportRecebimentosKitRow[];
}
