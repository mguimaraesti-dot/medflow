import { Prisma } from "@prisma/client";

export type CashRegisterDayStatus = "OPEN" | "PENDING_CONFERENCE" | "CLOSED";

/**
 * Entidade de domínio do "dia de caixa". Deliberadamente parecida com o
 * model do Prisma, mas é um tipo à parte — o domínio nunca importa
 * `@prisma/client` diretamente em outro lugar além do campo `Decimal`
 * (que é apenas o tipo de valor, não uma dependência de runtime do
 * Prisma Client em si).
 *
 * Motor de Tesouraria (docs/decisions/adr-tesouraria.md): o fechamento
 * não vai mais direto para `CLOSED` — passa por `PENDING_CONFERENCE`
 * até a gerência confirmar o handoff (ou rejeitar, voltando pra `OPEN`).
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

  openedByUserId: string;
  openedAt: Date;

  closedByUserId: string | null;
  closedAt: Date | null;

  reopenedByUserId: string | null;
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
