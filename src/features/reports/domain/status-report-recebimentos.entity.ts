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

/**
 * Uma linha do bloco "Frascos vendidos no período" — categorias de kit
 * COM movimentação, mais (no máximo) uma linha sintética "Frasco
 * (avulso)" agregando lançamentos de categoria exatamente "Frasco".
 * `isAvulso` distingue as duas — necessário porque `kitSize: 1` sozinho
 * seria ambíguo (uma hipotética categoria "Kit 1" também teria
 * `kitSize: 1`).
 */
export interface StatusReportRecebimentosKitRow {
  categoryId: string;
  label: string;
  kitSize: number;
  count: number;
  frascos: number;
  isAvulso: boolean;
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

  /** Frascos de kits + lançamentos avulsos de categoria "Frasco" (1 cada). */
  totalFrascos: number;
  /** Só kits — usado no subtítulo "X de kits", nunca inclui a linha avulsa de `kitRows`. */
  totalKits: number;
  /** Nº de lançamentos de categoria exatamente "Frasco" (0 quando nenhum no período). */
  frascosAvulsos: number;

  /** Sem teto — o PDF pagina automaticamente via `jspdf-autotable`, ao contrário da imagem única dos outros dois relatórios. */
  entries: StatusReportRecebimentosEntry[];
  kitRows: StatusReportRecebimentosKitRow[];
}
