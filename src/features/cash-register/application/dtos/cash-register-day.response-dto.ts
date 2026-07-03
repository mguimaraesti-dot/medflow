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
  openedAt: Date;
  closedByUserId: string | null;
  closedAt: Date | null;
  reopenedByUserId: string | null;
  reopenedAt: Date | null;
  reopenCount: number;
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
    openedAt: day.openedAt,
    closedByUserId: day.closedByUserId,
    closedAt: day.closedAt,
    reopenedByUserId: day.reopenedByUserId,
    reopenedAt: day.reopenedAt,
    reopenCount: day.reopenCount,
  };
}
