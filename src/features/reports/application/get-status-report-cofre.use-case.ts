import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type {
  StatusReportCofreCategoryRow,
  StatusReportCofreSummary,
} from "../domain/status-report-cofre.entity";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  accountsPayableRepository: AccountsPayableRepository;
  categoryRepository: CategoryRepository;
  cashRegisterDayRepository: CashRegisterDayRepository;
}

/**
 * Um período pode abranger vários dias de caixa (ex.: um mês inteiro).
 * O Saldo Inicial do relatório é o fundo de abertura do PRIMEIRO dia de
 * caixa dentro do período — o valor com que a recepção começou o
 * período, vindo do Cofre (`SafeMovement` tipo `FUNDING`, ver
 * `open-cash-register.use-case.ts`). `pageSize` bem acima do que
 * qualquer período razoável (um relatório mensal tem no máximo ~31
 * dias de caixa) evita paginação de verdade aqui; sem nenhum dia de
 * caixa no período, zero-padroniza (nunca inventa um valor).
 */
async function findPeriodOpeningBalance(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  cashRegisterDayRepository: CashRegisterDayRepository,
): Promise<Prisma.Decimal> {
  const { items } = await cashRegisterDayRepository.list(
    { organizationId, dateFrom, dateTo },
    { page: 1, pageSize: 366 },
  );
  if (items.length === 0) return new Prisma.Decimal(0);

  const firstDay = items.reduce((earliest, day) =>
    day.date < earliest.date ? day : earliest,
  );
  return firstDay.openingBalance;
}

const RETIRADA_LABEL = "Retirada de Caixa (secretária)";

function sumDecimals(values: (string | Prisma.Decimal)[]): Prisma.Decimal {
  return values.reduce(
    (total: Prisma.Decimal, value) => total.plus(value),
    new Prisma.Decimal(0),
  );
}

const EMPTY_SECTION_LABEL = "Sem movimentação no período";

/**
 * Filtra pra exibição só as linhas com movimentação real no período —
 * `groupByCategory` inclui todo o catálogo (mesmo 0 lançamentos) de
 * propósito, pra alimentar os totais corretamente; aqui só decidimos o
 * que aparece nas linhas da imagem, sem tocar em nenhuma soma. A linha
 * sintética "Retirada de Caixa" (`categoryId: null`) segue a MESMA
 * regra das categorias reais — só aparece se tiver `count > 0`; não há
 * mais exceção pra ela (evita "Retirada de Caixa" zerada aparecer
 * sozinha quando não houve nenhuma saída no período). Se não sobrar
 * nenhuma linha (nenhuma movimentação no período), mostra um
 * placeholder em vez de uma tabela vazia.
 */
function filterVisibleRows(
  rows: StatusReportCofreCategoryRow[],
): StatusReportCofreCategoryRow[] {
  const visible = rows.filter((row) => row.count > 0);
  if (visible.length > 0) return visible;
  return [
    {
      categoryId: null,
      label: EMPTY_SECTION_LABEL,
      count: 0,
      amount: "0.00",
    },
  ];
}

/** Agrupa por categoria, garantindo que TODA categoria ativa apareça (mesmo com 0 lançamentos) — reflete o cadastro atual, nunca uma lista mockada (Coding Standards do relatório). */
function groupByCategory(
  rows: { categoryId: string; amount: Prisma.Decimal }[],
  categories: { id: string; name: string }[],
): StatusReportCofreCategoryRow[] {
  const totals = new Map<string, { count: number; amount: Prisma.Decimal }>();
  for (const row of rows) {
    const current = totals.get(row.categoryId) ?? {
      count: 0,
      amount: new Prisma.Decimal(0),
    };
    totals.set(row.categoryId, {
      count: current.count + 1,
      amount: current.amount.plus(row.amount),
    });
  }

  return categories.map((category) => {
    const current = totals.get(category.id) ?? {
      count: 0,
      amount: new Prisma.Decimal(0),
    };
    return {
      categoryId: category.id,
      label: category.name,
      count: current.count,
      amount: current.amount.toFixed(2),
    };
  });
}

/**
 * Status Report do Caixa Recepção — imagem 1080xN (`infrastructure/status-report-cofre-image.tsx`).
 * Reaproveita a mesma separação Dinheiro/PIX do Fluxo Financeiro do Dia
 * (`get-dashboard-overview.use-case.ts`: "PIX não fica em caixa").
 * Saldo Inicial vem do fundo de abertura do caixa da recepção
 * (`findPeriodOpeningBalance`), não do saldo do Cofre — este relatório
 * reflete só a recepção, não o Cofre consolidado.
 *
 * Saída (Dinheiro) combina duas fontes, por regra de negócio explícita:
 * retiradas feitas pela secretária no Caixa Recepção (`CashFlowEntry`
 * type OUT, sempre em dinheiro — o formulário só permite isso) e contas
 * pagas usando o Cofre como origem (`AccountsPayable.paymentOrigin ===
 * "COFRE"`). Pagamentos com origem "Banco" nunca entram aqui — não
 * afetam o saldo físico do Cofre.
 */
export async function getStatusReportCofreUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<StatusReportCofreSummary> {
  const [
    organization,
    openingBalance,
    cashFlowRows,
    paidPayableRows,
    incomeCategories,
    outcomeCategories,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    findPeriodOpeningBalance(
      organizationId,
      dateFrom,
      dateTo,
      deps.cashRegisterDayRepository,
    ),
    deps.cashFlowEntryRepository.listForCofreReport(
      organizationId,
      dateFrom,
      dateTo,
    ),
    deps.accountsPayableRepository.listPaidForReport(
      organizationId,
      dateFrom,
      dateTo,
    ),
    deps.categoryRepository.listActive(organizationId, "IN"),
    deps.categoryRepository.listActive(organizationId, "OUT"),
  ]);

  // Reversão preserva a forma de pagamento original (uma reversão de PIX
  // vira OUT+PIX, não Dinheiro) — por isso o filtro é sempre por
  // `paymentMethodIsCash`, nunca só por `type` (ver docstring do
  // repositório, `listForCofreReport`).
  const cashIncomeRows = cashFlowRows.filter(
    (row) => row.type === "IN" && row.paymentMethodIsCash,
  );
  const pixIncomeRows = cashFlowRows.filter(
    (row) => row.type === "IN" && !row.paymentMethodIsCash,
  );
  const cashOutcomeRows = cashFlowRows.filter(
    (row) => row.type === "OUT" && row.paymentMethodIsCash,
  );

  const cofrePaidPayableRows = paidPayableRows.filter(
    (row) => row.paymentOrigin === "COFRE",
  );

  const cashIncomeByCategory = groupByCategory(
    cashIncomeRows,
    incomeCategories,
  );
  const pixIncomeByCategory = groupByCategory(pixIncomeRows, incomeCategories);

  const cofrePayableByCategory = groupByCategory(
    cofrePaidPayableRows.map((row) => ({
      categoryId: row.categoryId,
      amount: new Prisma.Decimal(row.amount),
    })),
    outcomeCategories,
  );
  const retiradaRow: StatusReportCofreCategoryRow = {
    categoryId: null,
    label: RETIRADA_LABEL,
    count: cashOutcomeRows.length,
    amount: sumDecimals(cashOutcomeRows.map((row) => row.amount)).toFixed(2),
  };
  const cashOutcomeByCategory = [...cofrePayableByCategory, retiradaRow];

  const cashIncomeTotal = sumDecimals(cashIncomeRows.map((row) => row.amount));
  const pixIncomeTotal = sumDecimals(pixIncomeRows.map((row) => row.amount));
  const cashOutcomeTotal = sumDecimals(
    cashOutcomeRows.map((row) => row.amount),
  ).plus(sumDecimals(cofrePaidPayableRows.map((row) => row.amount)));
  const finalBalance = openingBalance
    .plus(cashIncomeTotal)
    .minus(cashOutcomeTotal);

  return {
    organizationName: organization?.name ?? "MedFlow",
    dateFrom,
    dateTo,
    generatedAt: new Date(),
    openingBalance: openingBalance.toFixed(2),
    cashIncomeTotal: cashIncomeTotal.toFixed(2),
    cashIncomeCount: cashIncomeRows.length,
    pixIncomeTotal: pixIncomeTotal.toFixed(2),
    pixIncomeCount: pixIncomeRows.length,
    cashOutcomeTotal: cashOutcomeTotal.toFixed(2),
    cashOutcomeCount: cashOutcomeRows.length + cofrePaidPayableRows.length,
    finalBalance: finalBalance.toFixed(2),
    isSurplus: finalBalance.greaterThanOrEqualTo(0),
    cashIncomeByCategory: filterVisibleRows(cashIncomeByCategory),
    pixIncomeByCategory: filterVisibleRows(pixIncomeByCategory),
    cashOutcomeByCategory: filterVisibleRows(cashOutcomeByCategory),
  };
}
