/**
 * Linhas fixas do "Resumo por Categoria" — 3 de entrada (dados da Caixa
 * Recepção) + 4 de saída (Caixa Recepção, Contas a Pagar e Tesouraria).
 * Cada fonte é independente; a linha "Ajustes" é a única com os dois
 * lados (entrada e saída) ao mesmo tempo.
 */
export type StatusReportCategoryCode =
  | "RECEPCAO"
  | "CONVENIOS"
  | "PARTICULAR"
  | "CONTAS_A_PAGAR"
  | "DESPESAS_OPERACIONAIS"
  | "SALARIOS"
  | "AJUSTES";

export interface StatusReportCategoryRow {
  code: StatusReportCategoryCode;
  label: string;
  /** `null` renderiza "–" (linha não tem esse lado — ex: Recepção nunca tem saída). */
  income: string | null;
  expense: string | null;
}

/**
 * Resumo financeiro do período pro Status Report (imagem 1080x1920).
 * `openingBalance`/`closingBalance`/`totalIn`/`totalOut` vêm 100% do
 * saldo do Cofre (`SafeMovement` confirmado) — por construção,
 * `closingBalance = openingBalance + totalIn - totalOut`. As linhas de
 * `categories` são uma quebra informativa separada (Caixa Recepção +
 * Contas a Pagar + Ajustes), não precisam somar exatamente os mesmos
 * totais (ex: PIX/Cartão recebidos na Recepção não entram em nenhuma
 * categoria — decisão já confirmada com o usuário).
 */
export interface StatusReportSummary {
  organizationName: string;
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;
  openingBalance: string;
  closingBalance: string;
  totalIn: string;
  totalOut: string;
  categories: StatusReportCategoryRow[];
}
