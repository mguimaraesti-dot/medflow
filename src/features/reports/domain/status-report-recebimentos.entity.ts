/**
 * Uma linha da tabela de lançamentos — detalhe, não agregado (diferente
 * dos outros Status Reports). `frascos` é `null` quando a categoria não
 * é um kit (mostra "—" no PDF).
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
 * Relatório de Recebimentos — PDF de múltiplas páginas
 * (`infrastructure/status-report-recebimentos-pdf.ts`). Detalhe
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

  /** Sem teto — o PDF pagina automaticamente via `jspdf-autotable`, ao contrário da imagem única dos outros dois relatórios. */
  entries: StatusReportRecebimentosEntry[];
  kitRows: StatusReportRecebimentosKitRow[];
}
