import type { Prisma } from "@prisma/client";
import type { CashFlowEntry } from "@/features/cash-flow/domain/cash-flow-entry.entity";
import type { CashRegisterDayStatus } from "@/features/cash-register/domain/cash-register-day.entity";

export interface DashboardDailyTotal {
  date: Date;
  totalIn: Prisma.Decimal;
  totalOut: Prisma.Decimal;
}

export type DashboardCashRegisterStatus = CashRegisterDayStatus | "NOT_OPENED";

export interface DashboardSummary {
  currentBalance: Prisma.Decimal;
  cashRegisterStatus: DashboardCashRegisterStatus;
  revenueToday: Prisma.Decimal;
  expensesToday: Prisma.Decimal;
  resultToday: Prisma.Decimal;
  resultMonth: Prisma.Decimal;
  dailySeries: DashboardDailyTotal[];
  recentEntries: CashFlowEntry[];
}
