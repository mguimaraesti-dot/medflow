import { toMoneyString } from "@/shared/lib/money";
import {
  toCashFlowEntryResponseDTO,
  type CashFlowEntryResponseDTO,
} from "@/features/cash-flow/application/dtos/cash-flow-entry.response-dto";
import type {
  DashboardSummary,
  DashboardCashRegisterStatus,
} from "../../domain/dashboard-summary.entity";

export interface DashboardDailyTotalResponseDTO {
  date: string;
  totalIn: string;
  totalOut: string;
}

export interface DashboardSummaryResponseDTO {
  currentBalance: string;
  cashRegisterStatus: DashboardCashRegisterStatus;
  revenueToday: string;
  expensesToday: string;
  resultToday: string;
  resultMonth: string;
  dailySeries: DashboardDailyTotalResponseDTO[];
  recentEntries: CashFlowEntryResponseDTO[];
}

export function toDashboardSummaryResponseDTO(
  summary: DashboardSummary,
): DashboardSummaryResponseDTO {
  return {
    currentBalance: toMoneyString(summary.currentBalance) as string,
    cashRegisterStatus: summary.cashRegisterStatus,
    revenueToday: toMoneyString(summary.revenueToday) as string,
    expensesToday: toMoneyString(summary.expensesToday) as string,
    resultToday: toMoneyString(summary.resultToday) as string,
    resultMonth: toMoneyString(summary.resultMonth) as string,
    dailySeries: summary.dailySeries.map((day) => ({
      date: day.date.toISOString().slice(0, 10),
      totalIn: toMoneyString(day.totalIn) as string,
      totalOut: toMoneyString(day.totalOut) as string,
    })),
    recentEntries: summary.recentEntries.map(toCashFlowEntryResponseDTO),
  };
}
