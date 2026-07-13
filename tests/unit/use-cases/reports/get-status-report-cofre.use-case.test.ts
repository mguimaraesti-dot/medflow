import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getStatusReportCofreUseCase } from "@/features/reports/application/get-status-report-cofre.use-case";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ name: "Clínica MAE" }),
    },
  },
}));

const DATE_FROM = new Date("2026-07-01T00:00:00.000Z");
const DATE_TO = new Date("2026-07-31T23:59:59.999Z");

const KIT_CATEGORY = { id: "cat-kit", name: "KIT 2 - Rio Preto" };
const CONVENIO_CATEGORY = { id: "cat-convenio", name: "Convênios" };
const PARTICULAR_CATEGORY = { id: "cat-particular", name: "Particular" };

const CONTAS_A_PAGAR_CATEGORY = { id: "cat-cp", name: "Contas a Pagar" };
const DESPESAS_CATEGORY = { id: "cat-op", name: "Despesas Operacionais" };

type CashFlowRow = {
  type: "IN" | "OUT";
  amount: Prisma.Decimal;
  categoryId: string;
  paymentMethodIsCash: boolean;
};

type PayableRow = {
  supplierId: string;
  supplierName: string;
  categoryId: string;
  amount: string;
  paidAt: Date;
  paymentOrigin: "BANCO" | "COFRE";
};

function buildDeps(
  overrides: {
    cashFlowRows?: CashFlowRow[];
    payableRows?: PayableRow[];
    openingBalance?: Prisma.Decimal;
    incomeCategories?: { id: string; name: string }[];
    outcomeCategories?: { id: string; name: string }[];
  } = {},
) {
  const cashFlowRows = overrides.cashFlowRows ?? [];
  const payableRows = overrides.payableRows ?? [];
  const openingBalance = overrides.openingBalance ?? new Prisma.Decimal(0);
  const incomeCategories = overrides.incomeCategories ?? [
    KIT_CATEGORY,
    CONVENIO_CATEGORY,
    PARTICULAR_CATEGORY,
  ];
  const outcomeCategories = overrides.outcomeCategories ?? [
    CONTAS_A_PAGAR_CATEGORY,
    DESPESAS_CATEGORY,
  ];

  const cashFlowEntryRepository = {
    listForCofreReport: vi.fn().mockResolvedValue(cashFlowRows),
  } as unknown as CashFlowEntryRepository;

  const accountsPayableRepository = {
    listPaidForReport: vi.fn().mockResolvedValue(payableRows),
  } as unknown as AccountsPayableRepository;

  const categoryRepository = {
    listActive: vi
      .fn()
      .mockImplementation((_orgId: string, type: string) =>
        Promise.resolve(type === "IN" ? incomeCategories : outcomeCategories),
      ),
  } as unknown as CategoryRepository;

  const cashRegisterDayRepository = {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          date: DATE_FROM,
          openingBalance,
        },
      ],
      page: 1,
      pageSize: 366,
      total: 1,
      totalPages: 1,
    }),
  } as unknown as CashRegisterDayRepository;

  return {
    cashFlowEntryRepository,
    accountsPayableRepository,
    categoryRepository,
    cashRegisterDayRepository,
  };
}

describe("getStatusReportCofreUseCase", () => {
  it("calcula Saldo Final = Saldo Inicial + Entradas Dinheiro - Saída Dinheiro (PIX nunca entra na conta)", async () => {
    const deps = buildDeps({
      cashFlowRows: [
        {
          type: "IN",
          amount: new Prisma.Decimal("1000.00"),
          categoryId: KIT_CATEGORY.id,
          paymentMethodIsCash: true,
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("2000.00"),
          categoryId: KIT_CATEGORY.id,
          paymentMethodIsCash: false,
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("280.00"),
          categoryId: PARTICULAR_CATEGORY.id,
          paymentMethodIsCash: false,
        },
        {
          type: "OUT",
          amount: new Prisma.Decimal("150.00"),
          categoryId: "irrelevante-para-retirada",
          paymentMethodIsCash: true,
        },
      ],
      payableRows: [
        {
          supplierId: "s1",
          supplierName: "Fornecedor A",
          categoryId: CONTAS_A_PAGAR_CATEGORY.id,
          amount: "80.00",
          paidAt: new Date("2026-07-10T00:00:00.000Z"),
          paymentOrigin: "COFRE",
        },
        {
          supplierId: "s2",
          supplierName: "Fornecedor B",
          categoryId: DESPESAS_CATEGORY.id,
          amount: "570.00",
          paidAt: new Date("2026-07-15T00:00:00.000Z"),
          paymentOrigin: "COFRE",
        },
        {
          supplierId: "s3",
          supplierName: "Fornecedor C (Banco)",
          categoryId: DESPESAS_CATEGORY.id,
          amount: "9999.00",
          paidAt: new Date("2026-07-20T00:00:00.000Z"),
          paymentOrigin: "BANCO",
        },
      ],
    });

    const result = await getStatusReportCofreUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.openingBalance).toBe("0.00");
    expect(result.cashIncomeTotal).toBe("1000.00");
    expect(result.cashIncomeCount).toBe(1);
    expect(result.pixIncomeTotal).toBe("2280.00");
    expect(result.pixIncomeCount).toBe(2);
    // 150 (retirada) + 80 + 570 (Cofre) — nunca os 9999 pagos via Banco
    expect(result.cashOutcomeTotal).toBe("800.00");
    expect(result.cashOutcomeCount).toBe(3);
    expect(result.finalBalance).toBe("200.00");
    expect(result.isSurplus).toBe(true);

    // Só categorias com movimentação real aparecem nas linhas — Convênios
    // (sem nenhum lançamento) some de Entradas Dinheiro e Entradas PIX,
    // mas os totais acima continuam somando todo mundo (fonte separada).
    expect(result.cashIncomeByCategory).toEqual([
      {
        categoryId: KIT_CATEGORY.id,
        label: "KIT 2 - Rio Preto",
        count: 1,
        amount: "1000.00",
      },
    ]);
    expect(result.pixIncomeByCategory).toEqual([
      {
        categoryId: KIT_CATEGORY.id,
        label: "KIT 2 - Rio Preto",
        count: 1,
        amount: "2000.00",
      },
      {
        categoryId: PARTICULAR_CATEGORY.id,
        label: "Particular",
        count: 1,
        amount: "280.00",
      },
    ]);
    expect(result.cashOutcomeByCategory).toEqual([
      {
        categoryId: CONTAS_A_PAGAR_CATEGORY.id,
        label: "Contas a Pagar",
        count: 1,
        amount: "80.00",
      },
      {
        categoryId: DESPESAS_CATEGORY.id,
        label: "Despesas Operacionais",
        count: 1,
        amount: "570.00",
      },
      {
        categoryId: null,
        label: "Retirada de Caixa (secretária)",
        count: 1,
        amount: "150.00",
      },
    ]);
  });

  it("esconde categorias sem movimentação no período; sem nenhuma entrada/saída, todas as 3 seções mostram o placeholder — inclusive Saídas, já que a Retirada de Caixa zerada some igual às demais", async () => {
    const deps = buildDeps({ cashFlowRows: [], payableRows: [] });

    const result = await getStatusReportCofreUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const placeholder = [
      {
        categoryId: null,
        label: "Sem movimentação no período",
        count: 0,
        amount: "0.00",
      },
    ];
    expect(result.cashIncomeByCategory).toEqual(placeholder);
    expect(result.pixIncomeByCategory).toEqual(placeholder);
    // Sem nenhuma retirada nem pagamento via Cofre, a Retirada de Caixa
    // (count 0) segue a mesma regra das categorias reais e some — Saídas
    // cai no mesmo placeholder das outras seções, não fica com uma linha
    // zerada sozinha.
    expect(result.cashOutcomeByCategory).toEqual(placeholder);
  });

  it("Retirada de Caixa com valor > 0 continua aparecendo normalmente, mesmo sem nenhum pagamento via Cofre", async () => {
    const deps = buildDeps({
      cashFlowRows: [
        {
          type: "OUT",
          amount: new Prisma.Decimal("90.00"),
          categoryId: "irrelevante-para-retirada",
          paymentMethodIsCash: true,
        },
      ],
      payableRows: [],
    });

    const result = await getStatusReportCofreUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.cashOutcomeTotal).toBe("90.00");
    expect(result.cashOutcomeByCategory).toEqual([
      {
        categoryId: null,
        label: "Retirada de Caixa (secretária)",
        count: 1,
        amount: "90.00",
      },
    ]);
  });

  it("reversão de entrada PIX gera um OUT com paymentMethodIsCash=false — nunca conta como Saída Dinheiro", async () => {
    const deps = buildDeps({
      cashFlowRows: [
        {
          type: "IN",
          amount: new Prisma.Decimal("500.00"),
          categoryId: KIT_CATEGORY.id,
          paymentMethodIsCash: false,
        },
        // Estorno do lançamento acima: OUT, mas ainda forma de pagamento PIX (isCash: false).
        {
          type: "OUT",
          amount: new Prisma.Decimal("500.00"),
          categoryId: KIT_CATEGORY.id,
          paymentMethodIsCash: false,
        },
      ],
    });

    const result = await getStatusReportCofreUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.cashOutcomeTotal).toBe("0.00");
    expect(result.cashOutcomeCount).toBe(0);
    expect(result.pixIncomeTotal).toBe("500.00");
  });

  it("marca déficit quando o saldo final fica negativo", async () => {
    const deps = buildDeps({
      openingBalance: new Prisma.Decimal("0.00"),
      cashFlowRows: [
        {
          type: "OUT",
          amount: new Prisma.Decimal("300.00"),
          categoryId: "x",
          paymentMethodIsCash: true,
        },
      ],
    });

    const result = await getStatusReportCofreUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.finalBalance).toBe("-300.00");
    expect(result.isSurplus).toBe(false);
  });
});
