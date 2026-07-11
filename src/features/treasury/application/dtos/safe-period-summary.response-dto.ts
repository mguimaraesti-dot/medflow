import type { SafePeriodSummary } from "../get-safe-period-summary.use-case";

export interface SafePeriodSummaryResponseDTO {
  openingBalance: string;
  closingBalance: string;
  totalIn: string;
  totalOut: string;
}

export function toSafePeriodSummaryResponseDTO(
  summary: SafePeriodSummary,
): SafePeriodSummaryResponseDTO {
  return { ...summary };
}
