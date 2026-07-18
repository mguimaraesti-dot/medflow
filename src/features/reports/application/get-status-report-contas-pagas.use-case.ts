import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type {
  StatusReportContasPagasBeneficiary,
  StatusReportContasPagasCategory,
  StatusReportContasPagasOrigin,
  StatusReportContasPagasSummary,
  StatusReportContasPagasWeek,
} from "../domain/status-report-contas-pagas.entity";
import { buildCalendarWeekBuckets } from "./build-calendar-week-buckets";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  categoryRepository: CategoryRepository;
}

const TOP_CATEGORIES_LIMIT = 5;
const TOP_BENEFICIARIES_LIMIT = 10;
const OUTROS_COLOR = "#CBD5E1";

/** Cores/rótulos já em uso no resto do app (Drawer de Contas a Pagar: 🟢 Cofre / 🏦 Banco) — reaproveitados aqui, não uma paleta nova. */
const ORIGIN_COLORS = { BANCO: "#2563EB", COFRE: "#16A34A" } as const;
const ORIGIN_LABELS = {
  BANCO: "Banco",
  COFRE: "Cofre (Dinheiro)",
} as const;

function sumDecimalStrings(values: string[]): string {
  return values
    .reduce((total, value) => total.plus(value), new Prisma.Decimal(0))
    .toFixed(2);
}

function percentageOf(amount: string, total: string): number {
  const totalNumber = Number(total);
  if (totalNumber === 0) return 0;
  return (Number(amount) / totalNumber) * 100;
}

/**
 * Agregação para o Status Report: Contas Pagas (imagem 1080x1920 — ver
 * `infrastructure/status-report-contas-pagas-image.tsx`). Busca as
 * contas pagas do período uma única vez (`listPaidForReport`) e deriva
 * em código todas as quebras (origem/categoria/beneficiários/semana) —
 * mesmo padrão de agregação em código já usado no projeto (ex:
 * `get-status-report-summary`, `run-accounts-payable-reminders`).
 * Tendência vs. período anterior usa `sumPaidByDateRange` sobre uma
 * janela de mesma duração imediatamente anterior a `dateFrom`; `null`
 * quando não há nenhum pagamento nessa janela (esconde a tendência).
 *
 * "Semana" usa `buildCalendarWeekBuckets` (mesma função do "Saldo por
 * semana" do Relatório Executivo do Cofre) — domingo a sábado, com
 * recorte e rótulo "(parcial)" nas pontas do período. Antes tinha uma
 * cópia local (`buildWeekBuckets`) com blocos fixos de 7 dias a partir
 * de `dateFrom`, que divergia da regra do Cofre (bug real, corrigido).
 */
export async function getStatusReportContasPagasUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<StatusReportContasPagasSummary> {
  const durationMs = dateTo.getTime() - dateFrom.getTime();
  const previousTo = new Date(dateFrom.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs);

  const [organization, rows, previousPeriod, categories] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    deps.accountsPayableRepository.listPaidForReport(
      organizationId,
      dateFrom,
      dateTo,
    ),
    deps.accountsPayableRepository.sumPaidByDateRange(
      organizationId,
      previousFrom,
      previousTo,
    ),
    deps.categoryRepository.listActive(organizationId, "OUT"),
  ]);

  const totalPaid = sumDecimalStrings(rows.map((row) => row.amount));
  const paidCount = rows.length;

  const hasPreviousData = previousPeriod.count > 0;
  const totalPaidPreviousPeriod = hasPreviousData
    ? previousPeriod.amount.toFixed(2)
    : null;
  const paidCountPreviousPeriod = hasPreviousData ? previousPeriod.count : null;

  const origins: StatusReportContasPagasOrigin[] = (
    ["BANCO", "COFRE"] as const
  ).map((origin) => {
    const originRows = rows.filter((row) => row.paymentOrigin === origin);
    const amount = sumDecimalStrings(originRows.map((row) => row.amount));
    return {
      origin,
      label: ORIGIN_LABELS[origin],
      color: ORIGIN_COLORS[origin],
      count: originRows.length,
      amount,
      percentage: percentageOf(amount, totalPaid),
    };
  });

  const categoryTotals = new Map<string, string>();
  for (const row of rows) {
    const current = categoryTotals.get(row.categoryId) ?? "0.00";
    categoryTotals.set(
      row.categoryId,
      sumDecimalStrings([current, row.amount]),
    );
  }
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const sortedCategoryEntries = [...categoryTotals.entries()].sort(
    (a, b) => Number(b[1]) - Number(a[1]),
  );
  const topCategoryEntries = sortedCategoryEntries.slice(
    0,
    TOP_CATEGORIES_LIMIT,
  );
  const restCategoryEntries = sortedCategoryEntries.slice(TOP_CATEGORIES_LIMIT);

  const categoryBreakdown: StatusReportContasPagasCategory[] =
    topCategoryEntries.map(([categoryId, amount]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        label: category?.name ?? "Sem categoria",
        color: category?.color ?? OUTROS_COLOR,
        amount,
        percentage: percentageOf(amount, totalPaid),
      };
    });
  if (restCategoryEntries.length > 0) {
    const outrosAmount = sumDecimalStrings(
      restCategoryEntries.map(([, amount]) => amount),
    );
    categoryBreakdown.push({
      categoryId: null,
      label: "Outros",
      color: OUTROS_COLOR,
      amount: outrosAmount,
      percentage: percentageOf(outrosAmount, totalPaid),
    });
  }

  const beneficiaryTotals = new Map<
    string,
    { name: string; count: number; amount: string }
  >();
  for (const row of rows) {
    const current = beneficiaryTotals.get(row.supplierId);
    beneficiaryTotals.set(row.supplierId, {
      name: row.supplierName,
      count: (current?.count ?? 0) + 1,
      amount: sumDecimalStrings([current?.amount ?? "0.00", row.amount]),
    });
  }
  const topBeneficiaries: StatusReportContasPagasBeneficiary[] = [
    ...beneficiaryTotals.entries(),
  ]
    .sort((a, b) => Number(b[1].amount) - Number(a[1].amount))
    .slice(0, TOP_BENEFICIARIES_LIMIT)
    .map(([supplierId, data]) => ({
      supplierId,
      name: data.name,
      paymentsCount: data.count,
      amount: data.amount,
    }));

  const weeks: StatusReportContasPagasWeek[] = buildCalendarWeekBuckets(
    dateFrom,
    dateTo,
  ).map((bucket) => ({
    label: bucket.label,
    amount: sumDecimalStrings(
      rows
        .filter(
          (row) =>
            row.paidAt.getTime() >= bucket.start.getTime() &&
            row.paidAt.getTime() <= bucket.end.getTime(),
        )
        .map((row) => row.amount),
    ),
  }));

  return {
    organizationName: organization?.name ?? "MedFlow",
    dateFrom,
    dateTo,
    generatedAt: new Date(),
    totalPaid,
    totalPaidPreviousPeriod,
    paidCount,
    paidCountPreviousPeriod,
    origins,
    categories: categoryBreakdown,
    topBeneficiaries,
    weeks,
  };
}
