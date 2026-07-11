import type { CashRegisterPeriodSummary } from "../get-cash-register-period-summary.use-case";

export interface CashRegisterPeriodSummaryResponseDTO {
  cashIn: string;
  pixIn: string;
  totalIn: string;
  totalOut: string;
}

export function toCashRegisterPeriodSummaryResponseDTO(
  summary: CashRegisterPeriodSummary,
): CashRegisterPeriodSummaryResponseDTO {
  return { ...summary };
}
