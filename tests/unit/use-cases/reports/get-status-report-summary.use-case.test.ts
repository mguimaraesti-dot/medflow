import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getStatusReportSummaryUseCase } from "@/features/reports/application/get-status-report-summary.use-case";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { PaymentMethodRepository } from "@/features/payment-methods/domain/payment-method.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ name: "Clínica MAE" }),
    },
  },
}));

const DATE_FROM = new Date("2026-07-01T00:00:00.000Z");
const DATE_TO = new Date("2026-07-31T23:59:59.999Z");

const CASH_METHOD = { id: "method-cash", name: "Dinheiro" };
const PIX_METHOD = { id: "method-pix", name: "PIX" };
const CONVENIO_CATEGORY = { id: "cat-convenio", name: "Convênio", type: "IN" };
const PARTICULAR_CATEGORY = {
  id: "cat-particular",
  name: "Consulta Particular",
  type: "IN",
};
const SALARY_CATEGORY = { id: "cat-salarios", name: "Salários", type: "OUT" };
const RENT_CATEGORY = { id: "cat-aluguel", name: "Aluguel", type: "OUT" };

function buildDeps(
  overrides: {
    openingBalance?: string;
    signedSum?: { in: string; out: string };
    cashFlowEntries?: Array<{
      type: "IN" | "OUT";
      amount: Prisma.Decimal;
      occurredAt: Date;
      categoryId: string;
      paymentMethodId: string;
    }>;
    payableByCategory?: Array<{ categoryId: string; amount: string }>;
    adjustments?: { in: string; out: string };
    incomeCategories?: (typeof CONVENIO_CATEGORY)[];
    expenseCategories?: (typeof SALARY_CATEGORY)[];
    paymentMethods?: (typeof CASH_METHOD)[];
  } = {},
) {
  const safeRepository = {
    getBalanceAsOf: vi
      .fn()
      .mockResolvedValue(
        new Prisma.Decimal(overrides.openingBalance ?? "1000.00"),
      ),
  } as unknown as SafeRepository;

  const safeMovementRepository = {
    sumSignedByDateRangeAndStatus: vi
      .fn()
      .mockResolvedValue(
        overrides.signedSum ?? { in: "500.00", out: "300.00" },
      ),
    sumAdjustmentsSignedByDateRange: vi
      .fn()
      .mockResolvedValue(overrides.adjustments ?? { in: "0.00", out: "0.00" }),
  } as unknown as SafeMovementRepository;

  const cashFlowEntryRepository = {
    listByDateRange: vi.fn().mockResolvedValue(overrides.cashFlowEntries ?? []),
  } as unknown as CashFlowEntryRepository;

  const accountsPayableRepository = {
    sumPaidByCategoryAndDateRange: vi
      .fn()
      .mockResolvedValue(overrides.payableByCategory ?? []),
  } as unknown as AccountsPayableRepository;

  const categoryRepository = {
    listActive: vi.fn((_organizationId: string, type?: "IN" | "OUT") =>
      Promise.resolve(
        type === "OUT"
          ? (overrides.expenseCategories ?? [SALARY_CATEGORY, RENT_CATEGORY])
          : (overrides.incomeCategories ?? [
              CONVENIO_CATEGORY,
              PARTICULAR_CATEGORY,
            ]),
      ),
    ),
  } as unknown as CategoryRepository;

  const paymentMethodRepository = {
    listActive: vi
      .fn()
      .mockResolvedValue(overrides.paymentMethods ?? [CASH_METHOD, PIX_METHOD]),
  } as unknown as PaymentMethodRepository;

  return {
    safeRepository,
    safeMovementRepository,
    cashFlowEntryRepository,
    accountsPayableRepository,
    categoryRepository,
    paymentMethodRepository,
  };
}

describe("getStatusReportSummaryUseCase", () => {
  it("calcula saldo final como saldo inicial + entradas - saídas (só Cofre)", async () => {
    const deps = buildDeps({
      openingBalance: "1000.00",
      signedSum: { in: "500.00", out: "300.00" },
    });

    const result = await getStatusReportSummaryUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.openingBalance).toBe("1000.00");
    expect(result.totalIn).toBe("500.00");
    expect(result.totalOut).toBe("300.00");
    expect(result.closingBalance).toBe("1200.00");
  });

  it("separa Recepção (forma Dinheiro) de Convênios/Particular (categoria) nas entradas", async () => {
    const deps = buildDeps({
      cashFlowEntries: [
        {
          type: "IN",
          amount: new Prisma.Decimal("100.00"),
          occurredAt: DATE_FROM,
          categoryId: "cat-outros",
          paymentMethodId: CASH_METHOD.id,
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("200.00"),
          occurredAt: DATE_FROM,
          categoryId: CONVENIO_CATEGORY.id,
          paymentMethodId: PIX_METHOD.id,
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("300.00"),
          occurredAt: DATE_FROM,
          categoryId: PARTICULAR_CATEGORY.id,
          paymentMethodId: PIX_METHOD.id,
        },
      ],
    });

    const result = await getStatusReportSummaryUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const byCode = Object.fromEntries(
      result.categories.map((row) => [row.code, row]),
    );
    expect(byCode.RECEPCAO.income).toBe("100.00");
    expect(byCode.CONVENIOS.income).toBe("200.00");
    expect(byCode.PARTICULAR.income).toBe("300.00");
  });

  it("Contas a Pagar soma todas as saídas da Caixa Recepção, sem filtrar por categoria", async () => {
    const deps = buildDeps({
      cashFlowEntries: [
        {
          type: "OUT",
          amount: new Prisma.Decimal("50.00"),
          occurredAt: DATE_FROM,
          categoryId: "any",
          paymentMethodId: CASH_METHOD.id,
        },
        {
          type: "OUT",
          amount: new Prisma.Decimal("70.00"),
          occurredAt: DATE_FROM,
          categoryId: "other",
          paymentMethodId: CASH_METHOD.id,
        },
      ],
    });

    const result = await getStatusReportSummaryUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const contasAPagar = result.categories.find(
      (row) => row.code === "CONTAS_A_PAGAR",
    );
    expect(contasAPagar?.expense).toBe("120.00");
  });

  it("separa Despesas Operacionais de Salários dentro dos pagamentos de Contas a Pagar", async () => {
    const deps = buildDeps({
      payableByCategory: [
        { categoryId: RENT_CATEGORY.id, amount: "800.00" },
        { categoryId: SALARY_CATEGORY.id, amount: "1450.00" },
      ],
    });

    const result = await getStatusReportSummaryUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const byCode = Object.fromEntries(
      result.categories.map((row) => [row.code, row]),
    );
    expect(byCode.DESPESAS_OPERACIONAIS.expense).toBe("800.00");
    expect(byCode.SALARIOS.expense).toBe("1450.00");
  });

  it("Ajustes tem entrada e saída independentes, vindas do Cofre", async () => {
    const deps = buildDeps({
      adjustments: { in: "500.00", out: "120.00" },
    });

    const result = await getStatusReportSummaryUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const ajustes = result.categories.find((row) => row.code === "AJUSTES");
    expect(ajustes?.income).toBe("500.00");
    expect(ajustes?.expense).toBe("120.00");
  });

  it("zera a linha quando a categoria/forma de pagamento esperada não existe mais", async () => {
    const deps = buildDeps({
      incomeCategories: [],
      paymentMethods: [PIX_METHOD],
      cashFlowEntries: [
        {
          type: "IN",
          amount: new Prisma.Decimal("999.00"),
          occurredAt: DATE_FROM,
          categoryId: "some-other-category",
          paymentMethodId: PIX_METHOD.id,
        },
      ],
    });

    const result = await getStatusReportSummaryUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const byCode = Object.fromEntries(
      result.categories.map((row) => [row.code, row]),
    );
    expect(byCode.RECEPCAO.income).toBe("0.00");
    expect(byCode.CONVENIOS.income).toBe("0.00");
    expect(byCode.PARTICULAR.income).toBe("0.00");
  });
});
