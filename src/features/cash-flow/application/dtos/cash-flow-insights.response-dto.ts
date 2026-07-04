import { toMoneyString } from "@/shared/lib/money";
import type { CashFlowInsights } from "../get-cash-flow-insights.use-case";

export interface CashFlowCategoryTotalResponseDTO {
  categoryId: string;
  categoryName: string;
  color: string;
  total: string;
}

export interface CashFlowHourTotalResponseDTO {
  hour: number;
  total: string;
}

export interface CashFlowInsightsResponseDTO {
  byCategory: CashFlowCategoryTotalResponseDTO[];
  byHour: CashFlowHourTotalResponseDTO[];
}

export function toCashFlowInsightsResponseDTO(
  insights: CashFlowInsights,
): CashFlowInsightsResponseDTO {
  return {
    byCategory: insights.byCategory.map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      color: category.color,
      total: toMoneyString(category.total) as string,
    })),
    byHour: insights.byHour.map((hour) => ({
      hour: hour.hour,
      total: toMoneyString(hour.total) as string,
    })),
  };
}
