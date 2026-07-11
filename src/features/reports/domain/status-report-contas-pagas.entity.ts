/**
 * Resumo agregado do "Status Report: Contas Pagas" (imagem 1080x1920,
 * ver `infrastructure/status-report-contas-pagas-image.tsx`). Todo o
 * conteúdo visual vem deste único objeto — facilita testar o layout
 * com dados mock antes de ligar ao banco real.
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
 * Uma linha do gráfico de barras/rosca de categorias. `color` vem
 * direto de `Category.color` (já cadastrado, reaproveitado — não é uma
 * paleta nova) — a linha sintética "Outros" usa cinza fixo.
 */
export interface StatusReportContasPagasCategory {
  categoryId: string | null; // null = bucket sintético "Outros"
  label: string;
  color: string;
  amount: string;
  percentage: number;
}

export interface StatusReportContasPagasBeneficiary {
  supplierId: string;
  name: string;
  paymentsCount: number;
  amount: string;
}

export interface StatusReportContasPagasWeek {
  /** Ex: "01/07 a 07/07". */
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

  /** Top 5 categorias por valor + "Outros" agrupando o restante (omitido se não sobrar nenhuma). */
  categories: StatusReportContasPagasCategory[];

  /** Até 5 beneficiários, maior valor total primeiro. */
  topBeneficiaries: StatusReportContasPagasBeneficiary[];

  /** 4-5 semanas dentro do período selecionado. */
  weeks: StatusReportContasPagasWeek[];
}
