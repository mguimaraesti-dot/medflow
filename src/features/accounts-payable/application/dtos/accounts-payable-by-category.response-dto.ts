import { toMoneyString } from "@/shared/lib/money";
import type { AccountsPayableByCategoryItem } from "../get-accounts-payable-by-category.use-case";

export interface AccountsPayableByCategoryItemResponseDTO {
  categoryId: string;
  categoryName: string;
  color: string;
  total: string;
}

export function toAccountsPayableByCategoryResponseDTO(
  items: AccountsPayableByCategoryItem[],
): AccountsPayableByCategoryItemResponseDTO[] {
  return items.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    color: item.color,
    total: toMoneyString(item.total) as string,
  }));
}
