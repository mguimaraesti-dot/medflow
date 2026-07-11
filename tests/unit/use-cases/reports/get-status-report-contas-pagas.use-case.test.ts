import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getStatusReportContasPagasUseCase } from "@/features/reports/application/get-status-report-contas-pagas.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ name: "Clínica MAE" }),
    },
  },
}));

const DATE_FROM = new Date("2026-06-01T00:00:00.000Z");
const DATE_TO = new Date("2026-06-30T23:59:59.999Z");

const RENT_CATEGORY = { id: "cat-aluguel", name: "Aluguel", color: "#2563EB" };
const SALARY_CATEGORY = {
  id: "cat-salarios",
  name: "Salários",
  color: "#16A34A",
};
const MARKETING_CATEGORY = {
  id: "cat-marketing",
  name: "Marketing",
  color: "#DB2777",
};
const INTERNET_CATEGORY = {
  id: "cat-internet",
  name: "Internet",
  color: "#7C3AED",
};
const MATERIAL_CATEGORY = {
  id: "cat-material",
  name: "Material Médico",
  color: "#F59E0B",
};
const CLEANING_CATEGORY = {
  id: "cat-limpeza",
  name: "Limpeza",
  color: "#0EA5E9",
};

type ReportRow = {
  supplierId: string;
  supplierName: string;
  categoryId: string;
  amount: string;
  paidAt: Date;
  paymentOrigin: "BANCO" | "COFRE";
};

function buildDeps(
  overrides: {
    rows?: ReportRow[];
    previousPeriod?: { count: number; amount: Prisma.Decimal };
    categories?: { id: string; name: string; color: string }[];
  } = {},
) {
  const accountsPayableRepository = {
    listPaidForReport: vi.fn().mockResolvedValue(overrides.rows ?? []),
    sumPaidByDateRange: vi.fn().mockResolvedValue(
      overrides.previousPeriod ?? {
        count: 0,
        amount: new Prisma.Decimal(0),
      },
    ),
  } as unknown as AccountsPayableRepository;

  const categoryRepository = {
    listActive: vi
      .fn()
      .mockResolvedValue(
        overrides.categories ?? [RENT_CATEGORY, SALARY_CATEGORY],
      ),
  } as unknown as CategoryRepository;

  return { accountsPayableRepository, categoryRepository };
}

function row(overrides: Partial<ReportRow>): ReportRow {
  return {
    supplierId: "supplier-1",
    supplierName: "Fornecedor Padrão",
    categoryId: RENT_CATEGORY.id,
    amount: "100.00",
    paidAt: DATE_FROM,
    paymentOrigin: "BANCO",
    ...overrides,
  };
}

describe("getStatusReportContasPagasUseCase", () => {
  it("soma total pago e quantidade de contas a partir das linhas do período", async () => {
    const deps = buildDeps({
      rows: [
        row({ amount: "500.00" }),
        row({ amount: "300.00" }),
        row({ amount: "200.00" }),
      ],
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.totalPaid).toBe("1000.00");
    expect(result.paidCount).toBe(3);
  });

  it("esconde a tendência quando não há dado do período anterior", async () => {
    const deps = buildDeps({
      previousPeriod: { count: 0, amount: new Prisma.Decimal(0) },
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.totalPaidPreviousPeriod).toBeNull();
    expect(result.paidCountPreviousPeriod).toBeNull();
  });

  it("mostra a tendência quando há dado do período anterior", async () => {
    const deps = buildDeps({
      previousPeriod: { count: 10, amount: new Prisma.Decimal("900.00") },
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.totalPaidPreviousPeriod).toBe("900.00");
    expect(result.paidCountPreviousPeriod).toBe(10);
  });

  it("separa a origem do pagamento em Banco/Cofre com os rótulos e cores reais do sistema", async () => {
    const deps = buildDeps({
      rows: [
        row({ paymentOrigin: "BANCO", amount: "750.00" }),
        row({ paymentOrigin: "COFRE", amount: "250.00" }),
      ],
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const banco = result.origins.find((o) => o.origin === "BANCO");
    const cofre = result.origins.find((o) => o.origin === "COFRE");
    expect(banco).toMatchObject({
      label: "Banco",
      color: "#2563EB",
      count: 1,
      amount: "750.00",
      percentage: 75,
    });
    expect(cofre).toMatchObject({
      label: "Cofre (Dinheiro)",
      color: "#16A34A",
      count: 1,
      amount: "250.00",
      percentage: 25,
    });
  });

  it("sempre retorna as 2 origens, mesmo sem nenhum pagamento numa delas", async () => {
    const deps = buildDeps({
      rows: [row({ paymentOrigin: "BANCO", amount: "100.00" })],
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.origins).toHaveLength(2);
    const cofre = result.origins.find((o) => o.origin === "COFRE");
    expect(cofre).toMatchObject({ count: 0, amount: "0.00", percentage: 0 });
  });

  it("reaproveita a cor cadastrada da categoria (Category.color), não uma paleta nova", async () => {
    const deps = buildDeps({
      rows: [row({ categoryId: RENT_CATEGORY.id, amount: "100.00" })],
      categories: [RENT_CATEGORY],
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.categories).toEqual([
      {
        categoryId: RENT_CATEGORY.id,
        label: "Aluguel",
        color: RENT_CATEGORY.color,
        amount: "100.00",
        percentage: 100,
      },
    ]);
  });

  it('agrupa a partir da 6ª categoria em "Outros" (top 5 individuais + resto)', async () => {
    const categories = [
      RENT_CATEGORY,
      SALARY_CATEGORY,
      MARKETING_CATEGORY,
      INTERNET_CATEGORY,
      MATERIAL_CATEGORY,
      CLEANING_CATEGORY,
    ];
    const deps = buildDeps({
      rows: [
        row({ categoryId: RENT_CATEGORY.id, amount: "600.00" }),
        row({ categoryId: SALARY_CATEGORY.id, amount: "500.00" }),
        row({ categoryId: MARKETING_CATEGORY.id, amount: "400.00" }),
        row({ categoryId: INTERNET_CATEGORY.id, amount: "300.00" }),
        row({ categoryId: MATERIAL_CATEGORY.id, amount: "200.00" }),
        row({ categoryId: CLEANING_CATEGORY.id, amount: "100.00" }),
      ],
      categories,
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.categories).toHaveLength(6);
    const outros = result.categories.at(-1);
    expect(outros).toMatchObject({
      categoryId: null,
      label: "Outros",
      color: "#CBD5E1",
      amount: "100.00",
    });
    expect(result.categories.slice(0, 5).map((c) => c.label)).toEqual([
      "Aluguel",
      "Salários",
      "Marketing",
      "Internet",
      "Material Médico",
    ]);
  });

  it("agrega Top 5 Beneficiários por valor total pago, maior primeiro", async () => {
    const deps = buildDeps({
      rows: [
        row({
          supplierId: "s1",
          supplierName: "Fornecedor A",
          amount: "100.00",
        }),
        row({
          supplierId: "s1",
          supplierName: "Fornecedor A",
          amount: "50.00",
        }),
        row({
          supplierId: "s2",
          supplierName: "Fornecedor B",
          amount: "300.00",
        }),
      ],
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.topBeneficiaries).toEqual([
      {
        supplierId: "s2",
        name: "Fornecedor B",
        paymentsCount: 1,
        amount: "300.00",
      },
      {
        supplierId: "s1",
        name: "Fornecedor A",
        paymentsCount: 2,
        amount: "150.00",
      },
    ]);
  });

  it("limita Top 5 Beneficiários mesmo havendo mais de 5 fornecedores", async () => {
    const rows = Array.from({ length: 7 }, (_, index) =>
      row({
        supplierId: `s${index}`,
        supplierName: `Fornecedor ${index}`,
        amount: `${100 - index}.00`,
      }),
    );
    const deps = buildDeps({ rows });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.topBeneficiaries).toHaveLength(5);
    expect(result.topBeneficiaries[0].supplierId).toBe("s0");
  });

  it("divide o período em semanas de 7 dias, a última podendo ser mais curta", async () => {
    const deps = buildDeps({ rows: [] });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    // Junho/2026 tem 30 dias -> 4 semanas de 7 dias + 1 de 2 dias.
    expect(result.weeks).toHaveLength(5);
    expect(result.weeks[0].label).toBe("01/06 a 07/06");
    expect(result.weeks.at(-1)?.label).toBe("29/06 a 30/06");
  });

  it("soma cada pagamento na semana correta", async () => {
    const deps = buildDeps({
      rows: [
        row({ paidAt: new Date("2026-06-03T12:00:00.000Z"), amount: "100.00" }),
        row({ paidAt: new Date("2026-06-10T12:00:00.000Z"), amount: "50.00" }),
      ],
    });

    const result = await getStatusReportContasPagasUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.weeks[0].amount).toBe("100.00");
    expect(result.weeks[1].amount).toBe("50.00");
    expect(result.weeks[2].amount).toBe("0.00");
  });
});
