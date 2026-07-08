import { Prisma } from "@prisma/client";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { CashFlowEntryRepository } from "../domain/cash-flow-entry.repository";

export interface ExpensesByCategoryItem {
  categoryId: string;
  categoryName: string;
  color: string;
  total: Prisma.Decimal;
}

export interface GetExpensesByCategoryInput {
  dateFrom: Date;
  dateTo: Date;
}

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  categoryRepository: CategoryRepository;
}

/**
 * Despesas por categoria, filtrável por período — Relatório de Sprint 3
 * (Product Vision). Agregação em código (Coding Standards item 15) sobre
 * `type: "OUT"` (despesa), período arbitrário.
 */
export async function getExpensesByCategoryUseCase(
  input: GetExpensesByCategoryInput,
  organizationId: string,
  deps: Deps,
): Promise<ExpensesByCategoryItem[]> {
  const [entries, categories] = await Promise.all([
    deps.cashFlowEntryRepository.listByDateRange(
      organizationId,
      input.dateFrom,
      input.dateTo,
    ),
    deps.categoryRepository.listActive(organizationId),
  ]);

  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const totalsByCategory = new Map<string, Prisma.Decimal>();

  for (const entry of entries) {
    if (entry.type !== "OUT") continue;

    const current =
      totalsByCategory.get(entry.categoryId) ?? new Prisma.Decimal(0);
    totalsByCategory.set(entry.categoryId, current.plus(entry.amount));
  }

  return Array.from(totalsByCategory.entries()).map(([categoryId, total]) => {
    const category = categoryById.get(categoryId);
    return {
      categoryId,
      categoryName: category?.name ?? "Sem categoria",
      color: category?.color ?? "#64748B",
      total,
    };
  });
}
