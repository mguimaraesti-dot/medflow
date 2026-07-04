import { Prisma } from "@prisma/client";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { CashFlowEntryRepository } from "../domain/cash-flow-entry.repository";

export interface CashFlowCategoryTotal {
  categoryId: string;
  categoryName: string;
  color: string;
  total: Prisma.Decimal;
}

export interface CashFlowHourTotal {
  hour: number;
  total: Prisma.Decimal;
}

export interface CashFlowInsights {
  byCategory: CashFlowCategoryTotal[];
  byHour: CashFlowHourTotal[];
}

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  categoryRepository: CategoryRepository;
  /** Injetado só para permitir teste determinístico — em produção é sempre `new Date()`. */
  referenceDate?: Date;
}

function emptyHourSeries(): CashFlowHourTotal[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: new Prisma.Decimal(0),
  }));
}

/**
 * Origem das receitas por categoria + entradas por hora, do caixa de
 * hoje — só `type: "IN"` (é sobre receita, não sobre movimentação
 * geral). Mesma convenção UTC de "hoje" já usada no resto do sistema.
 */
export async function getCashFlowInsightsUseCase(
  organizationId: string,
  deps: Deps,
): Promise<CashFlowInsights> {
  const today = new Date(deps.referenceDate ?? new Date());
  today.setUTCHours(0, 0, 0, 0);

  const todayRegister =
    await deps.cashRegisterDayRepository.findByOrganizationAndDate(
      organizationId,
      today,
    );

  if (!todayRegister) {
    return { byCategory: [], byHour: emptyHourSeries() };
  }

  const [entries, categories] = await Promise.all([
    deps.cashFlowEntryRepository.listByCashRegisterDay(todayRegister.id),
    deps.categoryRepository.listActive(organizationId),
  ]);

  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const totalsByCategory = new Map<string, Prisma.Decimal>();
  const byHour = emptyHourSeries();

  for (const entry of entries) {
    if (entry.type !== "IN") continue;

    const hour = entry.occurredAt.getUTCHours();
    byHour[hour].total = byHour[hour].total.plus(entry.amount);

    const current =
      totalsByCategory.get(entry.categoryId) ?? new Prisma.Decimal(0);
    totalsByCategory.set(entry.categoryId, current.plus(entry.amount));
  }

  const byCategory: CashFlowCategoryTotal[] = Array.from(
    totalsByCategory.entries(),
  ).map(([categoryId, total]) => {
    const category = categoryById.get(categoryId);
    return {
      categoryId,
      categoryName: category?.name ?? "Sem categoria",
      color: category?.color ?? "#64748B",
      total,
    };
  });

  return { byCategory, byHour };
}
