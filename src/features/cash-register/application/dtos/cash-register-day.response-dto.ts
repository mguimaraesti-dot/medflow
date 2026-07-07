import { toMoneyString } from "@/shared/lib/money";
import type { CashRegisterDay } from "../../domain/cash-register-day.entity";

/**
 * DTO de saída — único formato de `CashRegisterDay` autorizado a
 * cruzar para o frontend (Coding Standards, item 13.1). Valores
 * monetários saem como string decimal fixa, nunca `Prisma.Decimal`.
 */
export interface CashRegisterDayResponseDTO {
  id: string;
  organizationId: string;
  date: Date;
  status: CashRegisterDay["status"];
  openingBalance: string;
  totalIn: string | null;
  totalOut: string | null;
  closingBalance: string | null;
  openedByUserId: string;
  openedByUserName: string;
  openedAt: Date;
  closedByUserId: string | null;
  closedAt: Date | null;
  reopenedByUserId: string | null;
  reopenedAt: Date | null;
  reopenCount: number;
  expectedCashAmount: string | null;
  countedAmount: string | null;
  receivedAmount: string | null;
  difference: string | null;
  confirmedDifference: string | null;
  closureNote: string | null;
  handoffConfirmedByUserId: string | null;
  handoffConfirmedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
}

export function toCashRegisterDayResponseDTO(
  day: CashRegisterDay,
): CashRegisterDayResponseDTO {
  return {
    id: day.id,
    organizationId: day.organizationId,
    date: day.date,
    status: day.status,
    openingBalance: toMoneyString(day.openingBalance) as string,
    totalIn: toMoneyString(day.totalIn),
    totalOut: toMoneyString(day.totalOut),
    closingBalance: toMoneyString(day.closingBalance),
    openedByUserId: day.openedByUserId,
    openedByUserName: day.openedByUserName,
    openedAt: day.openedAt,
    closedByUserId: day.closedByUserId,
    closedAt: day.closedAt,
    reopenedByUserId: day.reopenedByUserId,
    reopenedAt: day.reopenedAt,
    reopenCount: day.reopenCount,
    expectedCashAmount: toMoneyString(day.expectedCashAmount),
    countedAmount: toMoneyString(day.countedAmount),
    receivedAmount: toMoneyString(day.receivedAmount),
    difference: toMoneyString(day.difference),
    confirmedDifference: toMoneyString(day.confirmedDifference),
    closureNote: day.closureNote,
    handoffConfirmedByUserId: day.handoffConfirmedByUserId,
    handoffConfirmedAt: day.handoffConfirmedAt,
    rejectedAt: day.rejectedAt,
    rejectionReason: day.rejectionReason,
  };
}
