import { Prisma } from "@prisma/client";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";

export interface AccountsPayableByCategoryItem {
  categoryId: string;
  categoryName: string;
  color: string;
  total: Prisma.Decimal;
}

export interface GetAccountsPayableByCategoryInput {
  dateFrom: Date;
  dateTo: Date;
}

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  categoryRepository: CategoryRepository;
}

/**
 * Despesas por categoria — Central de Relatórios (Contas a Pagar).
 * Mesmo padrão de `getExpensesByCategoryUseCase` (cash-flow), mas a
 * fonte é conta paga (`paidAt` no período), não lançamento de caixa —
 * são conceitos diferentes (uma conta pode ser paga sem nunca passar
 * pelo Caixa Recepção, ex: pagamento via Cofre/Banco).
 */
export async function getAccountsPayableByCategoryUseCase(
  input: GetAccountsPayableByCategoryInput,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayableByCategoryItem[]> {
  const [{ items: payables }, categories] = await Promise.all([
    deps.accountsPayableRepository.list(
      {
        organizationId,
        status: "PAID",
        paidAtFrom: input.dateFrom,
        paidAtTo: input.dateTo,
      },
      { page: 1, pageSize: 10000 },
    ),
    deps.categoryRepository.listActive(organizationId),
  ]);

  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const totalsByCategory = new Map<string, Prisma.Decimal>();

  for (const payable of payables) {
    const current =
      totalsByCategory.get(payable.categoryId) ?? new Prisma.Decimal(0);
    totalsByCategory.set(payable.categoryId, current.plus(payable.amount));
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
