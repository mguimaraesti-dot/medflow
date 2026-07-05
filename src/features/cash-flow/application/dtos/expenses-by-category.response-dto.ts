import { toMoneyString } from "@/shared/lib/money";
import type { ExpensesByCategoryItem } from "../get-expenses-by-category.use-case";

export interface ExpensesByCategoryItemResponseDTO {
  categoryId: string;
  categoryName: string;
  color: string;
  total: string;
}

export function toExpensesByCategoryResponseDTO(
  items: ExpensesByCategoryItem[],
): ExpensesByCategoryItemResponseDTO[] {
  return items.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    color: item.color,
    total: toMoneyString(item.total) as string,
  }));
}
