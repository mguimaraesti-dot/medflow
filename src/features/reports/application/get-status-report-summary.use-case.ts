import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { PaymentMethodRepository } from "@/features/payment-methods/domain/payment-method.repository";
import type {
  StatusReportCategoryRow,
  StatusReportSummary,
} from "../domain/status-report.entity";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  accountsPayableRepository: AccountsPayableRepository;
  categoryRepository: CategoryRepository;
  paymentMethodRepository: PaymentMethodRepository;
}

const SALARY_CATEGORY_NAME = "Salários";
const CONVENIO_CATEGORY_NAME = "Convênio";
const PARTICULAR_CATEGORY_NAME = "Consulta Particular";
const CASH_PAYMENT_METHOD_NAME = "Dinheiro";

function sumDecimalStrings(values: string[]): string {
  return values
    .reduce((total, value) => total.plus(value), new Prisma.Decimal(0))
    .toFixed(2);
}

/**
 * Agregação para o Status Report (imagem 1080x1920 — ver
 * `infrastructure/status-report-image.tsx`). Saldo inicial/final e
 * Entradas/Saídas do topo vêm só do Cofre (`SafeMovement` confirmado) —
 * é o único saldo contínuo do sistema (o dinheiro da Caixa Recepção é
 * recolhido ao Cofre todo dia no fechamento, não acumula de um dia pro
 * outro). O "Resumo por Categoria" é uma quebra informativa separada,
 * combinando 3 fontes diferentes (mapeamento confirmado com o
 * usuário):
 * - Recepção/Convênios/Particular: lançamentos de entrada da Caixa
 *   Recepção (Recepção = forma "Dinheiro"; Convênios/Particular = a
 *   categoria correspondente) — não soma necessariamente o Entradas do
 *   topo (PIX/Cartão recebidos na Recepção ficam fora, por decisão do
 *   usuário).
 * - Contas a Pagar: saídas registradas na própria Caixa Recepção
 *   (retiradas), não pagamentos do módulo Contas a Pagar.
 * - Despesas Operacionais/Salários: pagamentos do módulo Contas a Pagar
 *   dentro do período (`paidAt`), separados pela categoria "Salários".
 * - Ajustes: `SafeMovement` tipo `MANUAL_ADJUSTMENT` confirmado —
 *   mesma fonte do saldo do Cofre, mostrado aqui só informativamente.
 */
export async function getStatusReportSummaryUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<StatusReportSummary> {
  const [
    organization,
    openingBalance,
    signedSum,
    cashFlowEntries,
    payableByCategory,
    adjustments,
    incomeCategories,
    expenseCategories,
    paymentMethods,
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
    deps.cashFlowEntryRepository.listByDateRange(
      organizationId,
      dateFrom,
      dateTo,
    ),
    deps.accountsPayableRepository.sumPaidByCategoryAndDateRange(
      organizationId,
      dateFrom,
      dateTo,
    ),
    deps.safeMovementRepository.sumAdjustmentsSignedByDateRange(
      organizationId,
      dateFrom,
      dateTo,
    ),
    deps.categoryRepository.listActive(organizationId, "IN"),
    deps.categoryRepository.listActive(organizationId, "OUT"),
    deps.paymentMethodRepository.listActive(organizationId),
  ]);

  const totalIn = new Prisma.Decimal(signedSum.in);
  const totalOut = new Prisma.Decimal(signedSum.out);
  const closingBalance = openingBalance.plus(totalIn).minus(totalOut);

  const cashPaymentMethodId = paymentMethods.find(
    (method) => method.name === CASH_PAYMENT_METHOD_NAME,
  )?.id;
  const convenioCategoryId = incomeCategories.find(
    (category) => category.name === CONVENIO_CATEGORY_NAME,
  )?.id;
  const particularCategoryId = incomeCategories.find(
    (category) => category.name === PARTICULAR_CATEGORY_NAME,
  )?.id;
  const salaryCategoryId = expenseCategories.find(
    (category) => category.name === SALARY_CATEGORY_NAME,
  )?.id;

  const recepcaoTotal = sumDecimalStrings(
    cashFlowEntries
      .filter(
        (entry) =>
          entry.type === "IN" && entry.paymentMethodId === cashPaymentMethodId,
      )
      .map((entry) => entry.amount.toFixed(2)),
  );
  const conveniosTotal = sumDecimalStrings(
    cashFlowEntries
      .filter(
        (entry) =>
          entry.type === "IN" && entry.categoryId === convenioCategoryId,
      )
      .map((entry) => entry.amount.toFixed(2)),
  );
  const particularTotal = sumDecimalStrings(
    cashFlowEntries
      .filter(
        (entry) =>
          entry.type === "IN" && entry.categoryId === particularCategoryId,
      )
      .map((entry) => entry.amount.toFixed(2)),
  );
  const contasAPagarTotal = sumDecimalStrings(
    cashFlowEntries
      .filter((entry) => entry.type === "OUT")
      .map((entry) => entry.amount.toFixed(2)),
  );
  const salariosTotal = sumDecimalStrings(
    payableByCategory
      .filter((bucket) => bucket.categoryId === salaryCategoryId)
      .map((bucket) => bucket.amount),
  );
  const despesasOperacionaisTotal = sumDecimalStrings(
    payableByCategory
      .filter((bucket) => bucket.categoryId !== salaryCategoryId)
      .map((bucket) => bucket.amount),
  );

  const categories: StatusReportCategoryRow[] = [
    {
      code: "RECEPCAO",
      label: "Recepção",
      income: recepcaoTotal,
      expense: null,
    },
    {
      code: "CONVENIOS",
      label: "Convênios",
      income: conveniosTotal,
      expense: null,
    },
    {
      code: "PARTICULAR",
      label: "Particular",
      income: particularTotal,
      expense: null,
    },
    {
      code: "CONTAS_A_PAGAR",
      label: "Contas a Pagar",
      income: null,
      expense: contasAPagarTotal,
    },
    {
      code: "DESPESAS_OPERACIONAIS",
      label: "Despesas Operacionais",
      income: null,
      expense: despesasOperacionaisTotal,
    },
    {
      code: "SALARIOS",
      label: "Salários",
      income: null,
      expense: salariosTotal,
    },
    {
      code: "AJUSTES",
      label: "Ajustes",
      income: adjustments.in,
      expense: adjustments.out,
    },
  ];

  return {
    organizationName: organization?.name ?? "MedFlow",
    dateFrom,
    dateTo,
    generatedAt: new Date(),
    openingBalance: openingBalance.toFixed(2),
    closingBalance: closingBalance.toFixed(2),
    totalIn: totalIn.toFixed(2),
    totalOut: totalOut.toFixed(2),
    categories,
  };
}
