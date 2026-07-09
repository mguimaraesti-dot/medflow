import { toMoneyString } from "@/shared/lib/money";
import type { CashFlowDailyTotal } from "../get-cash-flow-daily-totals.use-case";

export interface CashFlowDailyTotalResponseDTO {
  date: string;
  totalIn: string;
  totalOut: string;
  net: string;
}

export function toCashFlowDailyTotalsResponseDTO(
  items: CashFlowDailyTotal[],
): CashFlowDailyTotalResponseDTO[] {
  return items.map((item) => ({
    date: item.date,
    totalIn: toMoneyString(item.totalIn) as string,
    totalOut: toMoneyString(item.totalOut) as string,
    net: toMoneyString(item.net) as string,
  }));
}
