import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { SafeMovementType } from "@/features/treasury/domain/safe-movement.entity";
import type {
  StatusReportSafeBalancePoint,
  StatusReportSafeCompositionRow,
  StatusReportSafeGranularity,
  StatusReportSafeSummary,
} from "../domain/status-report-safe.entity";
import { buildCalendarWeekBuckets } from "./build-calendar-week-buckets";

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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Teto prático de barras com rótulo legível no gráfico de evolução do
 * saldo. Canvas tem 1080px, com 52px de padding lateral (ver
 * `status-report-safe-image.tsx`) e o card ainda soma 24px de padding
 * interno de cada lado — sobram ~928px de área útil. Cada coluna
 * precisa de uma largura mínima (~65px) pra caber o valor em R$ e o
 * rótulo de duas linhas sem colidir com a vizinha: 928/65 ≈ 14 — daí o
 * teto. Os limiares de granularidade (`determineGranularity`) foram
 * escolhidos exatamente pra ficar dentro desse teto no caso comum
 * (diário até 14 barras, semanal até ~14 barras em 3 meses); quando um
 * período muito longo ainda assim ultrapassa o teto (ex.: multi-anos),
 * `computeLabeledIndices` degrada os RÓTULOS (não as barras) pra nunca
 * sobrepor.
 */
const MAX_LABELED_BARS = 14;

/** Período de até 2 semanas: cada barra é 1 dia — parte do "cabe sem sobrepor". */
const DAILY_MAX_DAYS = 14;
/** Período de até ~3 meses: cada barra é 1 semana de calendário (~13 barras no limite). */
const WEEKLY_MAX_DAYS = 92;

function formatShortDayMonth(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

const MONTH_ABBR_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatShortMonthYear(date: Date): string {
  const month = MONTH_ABBR_PT[date.getUTCMonth()];
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Meia-noite UTC do dia calendário de `date`, descartando a hora — pra
 * contar dias mesmo quando `dateFrom` chega com hora 00:00:00.000 e
 * `dateTo` chega com hora 23:59:59.999 (convenção de fim de dia de
 * `period-selector.tsx`); sem isso, um período "domingo 00:00 a sábado
 * 23:59:59.999" (7 dias corridos) calculava 8 dias por causa do
 * arredondamento dos 999ms residuais.
 */
function toUtcDateOnly(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Granularidade do gráfico "Saldo por dia/semana/mês" conforme o
 * tamanho do período — período longo com granularidade fina (ex.: 6
 * meses em semanas) gerava dezenas de barras cujos rótulos viravam uma
 * sopa ilegível (bug real reportado: 26 barras semanais num período de
 * 13/01 a 17/07). `dateFrom`/`dateTo` já chegam como rótulos de dia
 * corretos (ver nota de fuso abaixo), então a duração é só contagem de
 * dias de calendário.
 */
function determineGranularity(
  dateFrom: Date,
  dateTo: Date,
): StatusReportSafeGranularity {
  const diffDays =
    Math.round((toUtcDateOnly(dateTo) - toUtcDateOnly(dateFrom)) / ONE_DAY_MS) +
    1;
  if (diffDays <= DAILY_MAX_DAYS) return "DAILY";
  if (diffDays <= WEEKLY_MAX_DAYS) return "WEEKLY";
  return "MONTHLY";
}

const GRANULARITY_TITLE: Record<StatusReportSafeGranularity, string> = {
  DAILY: "Saldo por dia",
  WEEKLY: "Saldo por semana",
  MONTHLY: "Saldo por mês",
};

type Bucket = { start: Date; end: Date; label: string };

/** Um bucket por dia do calendário dentro do período — sem noção de "parcial" (cada dia já é uma unidade inteira). */
function buildDailyBuckets(dateFrom: Date, dateTo: Date): Bucket[] {
  const buckets: Bucket[] = [];

  let dayStart = new Date(dateFrom);
  dayStart.setUTCHours(0, 0, 0, 0);

  while (dayStart.getTime() <= dateTo.getTime()) {
    const dayEnd = new Date(dayStart.getTime());
    dayEnd.setUTCHours(23, 59, 59, 999);
    const clippedEnd = dayEnd.getTime() > dateTo.getTime() ? dateTo : dayEnd;

    buckets.push({
      start: dayStart,
      end: clippedEnd,
      label: formatShortDayMonth(dayStart),
    });

    dayStart = new Date(dayStart.getTime() + ONE_DAY_MS);
  }

  return buckets;
}

/**
 * Meses de CALENDÁRIO dentro do período — mesmo espírito de
 * `buildCalendarWeekBuckets`, mas usando `Date.UTC` pra achar o fim de
 * cada mês (cobre meses de 28/29/30/31 dias sem contar manualmente). A
 * primeira e a última barra podem ser PARCIAIS quando o período não
 * começa no dia 1 ou não termina no último dia do mês.
 */
function buildCalendarMonthBuckets(dateFrom: Date, dateTo: Date): Bucket[] {
  const buckets: Bucket[] = [];

  let monthStart = new Date(
    Date.UTC(dateFrom.getUTCFullYear(), dateFrom.getUTCMonth(), 1),
  );

  while (monthStart.getTime() <= dateTo.getTime()) {
    const nextMonthStart = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
    );
    const monthEnd = new Date(nextMonthStart.getTime() - 1);

    const clippedStart =
      monthStart.getTime() < dateFrom.getTime() ? dateFrom : monthStart;
    const clippedEnd =
      monthEnd.getTime() > dateTo.getTime() ? dateTo : monthEnd;
    const isPartial =
      clippedStart.getTime() !== monthStart.getTime() ||
      clippedEnd.getTime() !== monthEnd.getTime();

    buckets.push({
      start: clippedStart,
      end: clippedEnd,
      label: `${formatShortMonthYear(monthStart)}${isPartial ? " (parcial)" : ""}`,
    });

    monthStart = nextMonthStart;
  }

  return buckets;
}

/**
 * Quais índices ganham rótulo de texto (valor + data) quando o total
 * de barras passa do teto legível (`MAX_LABELED_BARS`) — sempre a
 * primeira e a última, mais pontos igualmente espaçados no meio. A
 * barra em si sempre aparece (a posição/altura carrega a informação);
 * só o TEXTO some nas colunas não selecionadas, pra nunca sobrepor.
 */
function computeLabeledIndices(count: number, maxLabels: number): Set<number> {
  if (count <= maxLabels) {
    return new Set(Array.from({ length: count }, (_, index) => index));
  }
  const step = Math.ceil((count - 1) / (maxLabels - 1));
  const indices = new Set<number>();
  for (let index = 0; index < count; index += step) {
    indices.add(index);
  }
  indices.add(count - 1);
  return indices;
}

async function buildBalanceHistory(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  granularity: StatusReportSafeGranularity,
  safeRepository: SafeRepository,
): Promise<StatusReportSafeBalancePoint[]> {
  const buckets =
    granularity === "DAILY"
      ? buildDailyBuckets(dateFrom, dateTo)
      : granularity === "WEEKLY"
        ? buildCalendarWeekBuckets(dateFrom, dateTo)
        : buildCalendarMonthBuckets(dateFrom, dateTo);

  const labeledIndices = computeLabeledIndices(
    buckets.length,
    MAX_LABELED_BARS,
  );

  return Promise.all(
    buckets.map(async (bucket, index) => ({
      label: bucket.label,
      balance: (
        await safeRepository.getBalanceAsOf(
          organizationId,
          new Date(bucket.end.getTime() + 1),
        )
      ).toFixed(2),
      showLabel: labeledIndices.has(index),
    })),
  );
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
      description: `Troco para abertura do caixa da recepção · ${describeMovementCount(sentToRegister.count)}`,
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

  const granularity = determineGranularity(dateFrom, dateTo);
  const balanceHistory = await buildBalanceHistory(
    organizationId,
    dateFrom,
    dateTo,
    granularity,
    deps.safeRepository,
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
    granularity,
    balanceHistoryTitle: GRANULARITY_TITLE[granularity],
    balanceHistory,
  };
}
