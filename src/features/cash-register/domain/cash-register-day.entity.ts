import { Prisma } from "@prisma/client";

export type CashRegisterDayStatus = "OPEN" | "CLOSED";

/**
 * Entidade de domínio do "dia de caixa". Deliberadamente parecida com o
 * model do Prisma, mas é um tipo à parte — o domínio nunca importa
 * `@prisma/client` diretamente em outro lugar além do campo `Decimal`
 * (que é apenas o tipo de valor, não uma dependência de runtime do
 * Prisma Client em si).
 *
 * Fechamento vai direto `OPEN` -> `CLOSED` (dupla conferência do Motor
 * de Tesouraria removida por decisão explícita — a secretária tem
 * autonomia de fechar e reabrir sozinha, sempre com justificativa).
 * Os campos de handoff/rejeição continuam no schema só por
 * compatibilidade com registros antigos; nenhum código novo os escreve.
 */
export interface CashRegisterDay {
  id: string;
  organizationId: string;
  date: Date;
  status: CashRegisterDayStatus;

  openingBalance: Prisma.Decimal;
  totalIn: Prisma.Decimal | null;
  totalOut: Prisma.Decimal | null;
  closingBalance: Prisma.Decimal | null;
  /**
   * Entradas só em dinheiro — transiente, sem coluna no banco. Só é
   * populado ao vivo enquanto `status === "OPEN"` (mesmo tratamento já
   * dado a `expectedCashAmount`), pro modal de fechamento poder mostrar
   * "Entradas em Dinheiro" x "Entradas PIX" antes de fechar. Sempre
   * `null` fora desse caso.
   */
  cashIn: Prisma.Decimal | null;

  openedByUserId: string;
  /** Denormalizado só pra exibição (card "Saldo Atual") — via join na infraestrutura. */
  openedByUserName: string;
  openedAt: Date;

  closedByUserId: string | null;
  /** Denormalizado só pra exibição ("Último fechamento" no card, quando o caixa está fechado) — via join na infraestrutura. */
  closedByUserName: string | null;
  closedAt: Date | null;

  reopenedByUserId: string | null;
  /** Denormalizado só pra exibição ("Reaberto hoje às..." no card, quando o caixa foi reaberto) — via join na infraestrutura. */
  reopenedByUserName: string | null;
  reopenedAt: Date | null;
  reopenCount: number;

  expectedCashAmount: Prisma.Decimal | null;
  countedAmount: Prisma.Decimal | null;
  receivedAmount: Prisma.Decimal | null;
  difference: Prisma.Decimal | null;
  confirmedDifference: Prisma.Decimal | null;
  closureNote: string | null;

  handoffConfirmedByUserId: string | null;
  handoffConfirmedAt: Date | null;

  rejectedAt: Date | null;
  rejectionReason: string | null;
}
