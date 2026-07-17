import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { SafeMovementType } from "@/features/treasury/domain/safe-movement.entity";
import type {
  StatusReportSafeCompositionRow,
  StatusReportSafeSummary,
  StatusReportSafeWeek,
} from "../domain/status-report-safe.entity";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
}

function sumDecimals(values: (string | Prisma.Decimal)[]): Prisma.Decimal {
  return values.reduce(
    (total: Prisma.Decimal, value) => total.plus(value),
    new Prisma.Decimal(0),
  );
}

function formatShortDayMonth(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

/** Janelas de 7 dias dentro do período (a última pode ser mais curta) — mesmo padrão de `get-status-report-contas-pagas.use-case.ts`. */
function buildWeekBuckets(
  dateFrom: Date,
  dateTo: Date,
): { start: Date; end: Date; label: string }[] {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const buckets: { start: Date; end: Date; label: string }[] = [];
  let start = new Date(dateFrom);
  while (start.getTime() <= dateTo.getTime()) {
    const end = new Date(
      Math.min(start.getTime() + 7 * ONE_DAY_MS - 1, dateTo.getTime()),
    );
    buckets.push({
      start,
      end,
      label: `${formatShortDayMonth(start)} a ${formatShortDayMonth(end)}`,
    });
    start = new Date(end.getTime() + 1);
  }
  return buckets;
}

function describeMovementCount(count: number): string {
  if (count === 0) return "nenhuma";
  return `${count} movimentaç${count === 1 ? "ão" : "ões"}`;
}

/**
 * Soma + conta movimentações `CONFIRMED` de um (ou mais) tipo no período —
 * mesmo padrão de `findSangriaForPeriod` em `get-status-report-cofre.use-case.ts`
 * (list + reduce em código; não há um "sumByType" dedicado no repositório
 * pra cada quebra fina da composição).
 */
async function sumMovementsForPeriod(
  organizationId: string,
  types: SafeMovementType[],
  dateFrom: Date,
  dateTo: Date,
  safeMovementRepository: SafeMovementRepository,
): Promise<{ count: number; amount: Prisma.Decimal }> {
  const { items } = await safeMovementRepository.list(
    {
      organizationId,
      types,
      status: "CONFIRMED",
      createdAtFrom: dateFrom,
      createdAtTo: dateTo,
    },
    { page: 1, pageSize: 1000 },
  );
  return {
    count: items.length,
    amount: sumDecimals(items.map((m) => m.amount)),
  };
}

/**
 * Relatório Executivo do Cofre (imagem 1080xN —
 * `infrastructure/status-report-safe-image.tsx`). Sobre o Cofre da
 * Tesouraria (`Safe`/`SafeMovement`) — não confundir com
 * `get-status-report-cofre.use-case.ts`, que apesar do nome é o
 * relatório do Caixa Recepção (domínio diferente).
 *
 * Saldo Inicial/Final vêm de `getBalanceAsOf` (ponto no tempo real, não
 * reconstruído por soma) — Final = Inicial + `periodReceived` −
 * `periodSent`, usando `sumSignedByDateRangeAndStatus` (mesmo
 * agrupamento Entradas/Saídas já usado no Dashboard da Tesouraria), o
 * que garante que o waterfall sempre reconcilia com o saldo real. A
 * composição por tipo (recebido do caixa / enviado ao caixa / pago a
 * fornecedores / ajustes) é uma quebra mais fina só pra exibição —
 * soma exatamente o mesmo total, sem duplicar nem reinventar a regra
 * de Entradas/Saídas.
 */
export async function getStatusReportSafeUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<StatusReportSafeSummary> {
  const [
    organization,
    openingBalanceDecimal,
    periodSums,
    pending,
    received,
    sentToRegister,
    paidToSuppliers,
    adjustments,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    deps.safeRepository.getBalanceAsOf(organizationId, dateFrom),
    deps.safeMovementRepository.sumSignedByDateRangeAndStatus(
      organizationId,
      dateFrom,
      dateTo,
      "CONFIRMED",
    ),
    deps.safeMovementRepository.countAndSumPending(organizationId),
    sumMovementsForPeriod(
      organizationId,
      ["SANGRIA", "CASH_REGISTER_HANDOFF"],
      dateFrom,
      dateTo,
      deps.safeMovementRepository,
    ),
    sumMovementsForPeriod(
      organizationId,
      ["FUNDING"],
      dateFrom,
      dateTo,
      deps.safeMovementRepository,
    ),
    sumMovementsForPeriod(
      organizationId,
      ["ACCOUNTS_PAYABLE_PAYMENT"],
      dateFrom,
      dateTo,
      deps.safeMovementRepository,
    ),
    sumMovementsForPeriod(
      organizationId,
      ["MANUAL_ADJUSTMENT"],
      dateFrom,
      dateTo,
      deps.safeMovementRepository,
    ),
  ]);

  const openingBalance = openingBalanceDecimal;
  const finalBalance = openingBalance.plus(periodSums.in).minus(periodSums.out);

  const composition: StatusReportSafeCompositionRow[] = [
    {
      label: "Recebido do caixa",
      description: `Fechamentos do dia e retiradas · ${describeMovementCount(received.count)}`,
      count: received.count,
      amount: received.amount.toFixed(2),
    },
    {
      label: "Enviado ao caixa",
      description: `Fundos de abertura da recepção · ${describeMovementCount(sentToRegister.count)}`,
      count: sentToRegister.count,
      amount: sentToRegister.amount.negated().toFixed(2),
    },
    {
      label: "Pago a fornecedores",
      description: `Contas pagas com dinheiro do cofre · ${describeMovementCount(paidToSuppliers.count)}`,
      count: paidToSuppliers.count,
      amount: paidToSuppliers.amount.negated().toFixed(2),
    },
    {
      label: "Ajustes manuais",
      description: `Correções feitas por um gerente · ${describeMovementCount(adjustments.count)}`,
      count: adjustments.count,
      amount: adjustments.amount.toFixed(2),
    },
  ];

  const weeks: StatusReportSafeWeek[] = await Promise.all(
    buildWeekBuckets(dateFrom, dateTo).map(async (bucket) => ({
      label: bucket.label,
      balance: (
        await deps.safeRepository.getBalanceAsOf(
          organizationId,
          new Date(bucket.end.getTime() + 1),
        )
      ).toFixed(2),
    })),
  );

  return {
    organizationName: organization?.name ?? "MedFlow",
    dateFrom,
    dateTo,
    generatedAt: new Date(),
    openingBalance: openingBalance.toFixed(2),
    finalBalance: finalBalance.toFixed(2),
    isSurplus: finalBalance.greaterThanOrEqualTo(0),
    periodReceived: periodSums.in,
    periodSent: periodSums.out,
    pendingCount: pending.count,
    pendingSum: pending.sum,
    composition,
    weeks,
  };
}
