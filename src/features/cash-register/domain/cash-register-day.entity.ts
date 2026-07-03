import { Prisma } from "@prisma/client";

export type CashRegisterDayStatus = "OPEN" | "CLOSED";

/**
 * Entidade de domínio do "dia de caixa". Deliberadamente parecida com o
 * model do Prisma, mas é um tipo à parte — o domínio nunca importa
 * `@prisma/client` diretamente em outro lugar além do campo `Decimal`
 * (que é apenas o tipo de valor, não uma dependência de runtime do
 * Prisma Client em si).
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
}
