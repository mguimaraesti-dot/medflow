/**
 * Resumo agregado do "Relatório de Contas Pagas" — PDF de múltiplas
 * páginas (`infrastructure/status-report-contas-pagas-pdf.ts`), não
 * mais imagem única: categorias e beneficiários precisam listar TODOS
 * os itens do período (sem corte "Top N"), e uma tabela via
 * `jspdf-autotable` pagina sozinha, ao contrário do canvas de altura
 * fixa do `next/og`/Satori (mesmo motivo da conversão do Relatório de
 * Recebimentos). Todo o conteúdo visual vem deste único objeto —
 * facilita testar o layout com dados mock antes de ligar ao banco real.
 */

/** Rótulos reais do sistema (`AccountsPayable.paymentOrigin` — ver `accounts-payable-form.tsx`), não os do mockup ("Caixa"/"Conta Bancária"). */
export interface StatusReportContasPagasOrigin {
  origin: "BANCO" | "COFRE";
  label: "Banco" | "Cofre (Dinheiro)";
  color: string;
  count: number;
  amount: string;
  percentage: number;
}

/**
 * Uma linha da tabela de categorias — TODAS as categorias com
 * movimentação no período (sem corte "Top 5 + Outros": o PDF pagina
 * sozinho via `jspdf-autotable`, então não há motivo pra esconder
 * categoria nenhuma). `color` vem direto de `Category.color` (já
 * cadastrado, reaproveitado — não é uma paleta nova).
 */
export interface StatusReportContasPagasCategory {
  categoryId: string;
  label: string;
  color: string;
  amount: string;
  percentage: number;
}

/** Um beneficiário com pelo menos 1 pagamento no período — TODOS, não só os maiores (mesmo motivo de `StatusReportContasPagasCategory`). */
export interface StatusReportContasPagasBeneficiary {
  supplierId: string;
  name: string;
  paymentsCount: number;
  amount: string;
}

export interface StatusReportContasPagasWeek {
  /**
   * Semana de CALENDÁRIO (domingo a sábado) — mesma regra do
   * "Saldo por semana" do Relatório Executivo do Cofre
   * (`buildCalendarWeekBuckets`). Ex.: "05/07 a 11/07"; nas pontas do
   * período, "01/07 a 04/07 (parcial)".
   */
  label: string;
  amount: string;
}

export interface StatusReportContasPagasSummary {
  organizationName: string;
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;

  totalPaid: string;
  /** `null` = sem dado do período anterior pra comparar (esconde a tendência). */
  totalPaidPreviousPeriod: string | null;

  paidCount: number;
  paidCountPreviousPeriod: number | null;

  /** Sempre as 2 origens (Banco, Cofre), mesmo com valor zero. */
  origins: StatusReportContasPagasOrigin[];

  /** TODAS as categorias com pagamento no período, maior valor primeiro. */
  categories: StatusReportContasPagasCategory[];

  /** TODOS os beneficiários com pagamento no período, maior valor total primeiro. */
  beneficiaries: StatusReportContasPagasBeneficiary[];

  /** Semanas de calendário (domingo a sábado) dentro do período selecionado — 4-5 pra um período mensal típico, primeira/última podem vir "(parcial)". */
  weeks: StatusReportContasPagasWeek[];
}
