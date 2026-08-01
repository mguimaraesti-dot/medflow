import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getStatusReportRecebimentosUseCase } from "@/features/reports/application/get-status-report-recebimentos.use-case";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ name: "Clínica MAE" }),
    },
  },
}));

const DATE_FROM = new Date("2026-07-01T00:00:00.000Z");
const DATE_TO = new Date("2026-07-31T23:59:59.999Z");

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "entry-1",
    occurredAt: new Date("2026-07-15T14:22:00.000Z"),
    categoryId: "cat-1",
    patientName: "Ana Lucia Ferreira",
    amount: new Prisma.Decimal("30.00"),
    paymentMethodName: "PIX",
    paymentMethodIsCash: false,
    ...overrides,
  };
}

const CATEGORIES = [
  { id: "cat-kit2-rp", name: "Kit 2 - Rio Preto" },
  { id: "cat-kit3-rp", name: "Kit 3 - Rio Preto" },
  { id: "cat-kit2-ol", name: "Kit 2 - Olimpia" },
  { id: "cat-exames", name: "Exames" },
  { id: "cat-frasco", name: "Frasco" },
];

function buildDeps(rows: ReturnType<typeof row>[]) {
  const cashFlowEntryRepository = {
    listReceiptsForReport: vi.fn().mockResolvedValue(rows),
  } as unknown as CashFlowEntryRepository;
  const categoryRepository = {
    listActive: vi.fn().mockResolvedValue(CATEGORIES),
  } as unknown as CategoryRepository;
  return { cashFlowEntryRepository, categoryRepository };
}

describe("getStatusReportRecebimentosUseCase", () => {
  it("busca só o que o repositório entrega para o período — a exclusão de estornados é feita na query (type: IN, isReversed: false), o use case não refiltra nem confia em outro sinal", async () => {
    const deps = buildDeps([
      row({ id: "e1", amount: new Prisma.Decimal("100.00") }),
    ]);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(
      deps.cashFlowEntryRepository.listReceiptsForReport,
    ).toHaveBeenCalledWith("org-1", DATE_FROM, DATE_TO);
    expect(result.totalCount).toBe(1);
    expect(result.totalAmount).toBe("100.00");
  });

  it("calcula frascos por categoria de kit: nº de lançamentos × N extraído do nome", async () => {
    const rows = [
      row({
        id: "e1",
        categoryId: "cat-kit2-rp",
        amount: new Prisma.Decimal("60.00"),
      }),
      row({
        id: "e2",
        categoryId: "cat-kit2-rp",
        amount: new Prisma.Decimal("60.00"),
      }),
      row({
        id: "e3",
        categoryId: "cat-kit2-rp",
        amount: new Prisma.Decimal("60.00"),
      }),
      row({
        id: "e4",
        categoryId: "cat-kit2-rp",
        amount: new Prisma.Decimal("60.00"),
      }),
      row({
        id: "e5",
        categoryId: "cat-kit3-rp",
        amount: new Prisma.Decimal("90.00"),
      }),
    ];
    const deps = buildDeps(rows);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const kit2 = result.kitRows.find((r) => r.categoryId === "cat-kit2-rp");
    const kit3 = result.kitRows.find((r) => r.categoryId === "cat-kit3-rp");
    expect(kit2).toEqual({
      categoryId: "cat-kit2-rp",
      label: "Kit 2 - Rio Preto",
      kitSize: 2,
      count: 4,
      frascos: 8,
      isAvulso: false,
    });
    expect(kit3).toEqual({
      categoryId: "cat-kit3-rp",
      label: "Kit 3 - Rio Preto",
      kitSize: 3,
      count: 1,
      frascos: 3,
      isAvulso: false,
    });
    expect(result.totalFrascos).toBe(11);
    expect(result.totalKits).toBe(5);
    expect(result.frascosAvulsos).toBe(0);
  });

  it("conta lançamentos avulsos de categoria 'Frasco' (1 cada, PIX e dinheiro), somados aos frascos de kit sem dupla contagem", async () => {
    const rows = [
      // kits: 4×2 = 8 frascos, 5 kits vendidos
      row({
        id: "e1",
        categoryId: "cat-kit2-rp",
        amount: new Prisma.Decimal("60.00"),
      }),
      row({
        id: "e2",
        categoryId: "cat-kit2-rp",
        amount: new Prisma.Decimal("60.00"),
      }),
      // avulsos: 3 lançamentos "Frasco", valores e formas de pagamento variados
      row({
        id: "e3",
        categoryId: "cat-frasco",
        amount: new Prisma.Decimal("10.00"),
        paymentMethodIsCash: false, // PIX
      }),
      row({
        id: "e4",
        categoryId: "cat-frasco",
        amount: new Prisma.Decimal("30.00"),
        paymentMethodIsCash: true, // dinheiro
      }),
      row({
        id: "e5",
        categoryId: "cat-frasco",
        amount: new Prisma.Decimal("500.00"), // valor não importa — conta 1 igual
        paymentMethodIsCash: false,
      }),
    ];
    const deps = buildDeps(rows);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    // frascos de kit (4) + avulsos (3) = 7 — nenhum lançamento contado duas vezes
    expect(result.totalKits).toBe(2);
    expect(result.frascosAvulsos).toBe(3);
    expect(result.totalFrascos).toBe(7);

    const avulsoRow = result.kitRows.find((r) => r.isAvulso);
    expect(avulsoRow).toEqual({
      categoryId: "cat-frasco",
      label: "Frasco (avulso)",
      kitSize: 1,
      count: 3,
      frascos: 3,
      isAvulso: true,
    });
    // linha avulsa vem por último, depois das linhas de kit
    expect(result.kitRows[result.kitRows.length - 1]).toBe(avulsoRow);

    // coluna "Frascos" por lançamento: 1 pra cada "Frasco" avulso, independente de PIX/dinheiro/valor
    const avulsoEntries = result.entries.filter(
      (e) => e.categoryLabel === "Frasco",
    );
    expect(avulsoEntries).toHaveLength(3);
    expect(avulsoEntries.every((e) => e.frascos === 1)).toBe(true);
  });

  it("não confunde 'Frasco' avulso com variações de nome que não são igualdade exata (ex.: categoria fictícia 'Frascos' no plural)", async () => {
    const deps = buildDeps([
      row({
        id: "e1",
        categoryId: "cat-plural",
        amount: new Prisma.Decimal("10.00"),
      }),
    ]);
    vi.mocked(deps.categoryRepository.listActive).mockResolvedValue([
      { id: "cat-plural", name: "Frascos" } as never,
    ]);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.frascosAvulsos).toBe(0);
    expect(result.totalFrascos).toBe(0);
    expect(result.kitRows).toHaveLength(0);
    expect(result.entries[0].frascos).toBeNull();
  });

  it("categoria que não é kit não gera linha de frascos nem frascos na entry (frascos: null)", async () => {
    const rows = [
      row({
        id: "e1",
        categoryId: "cat-exames",
        amount: new Prisma.Decimal("2200.00"),
      }),
    ];
    const deps = buildDeps(rows);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.kitRows).toHaveLength(0);
    expect(result.totalFrascos).toBe(0);
    expect(result.entries[0].frascos).toBeNull();
  });

  it("não lista categoria de kit sem nenhuma movimentação no período (sem pré-semear o catálogo)", async () => {
    const rows = [
      row({
        id: "e1",
        categoryId: "cat-kit2-rp",
        amount: new Prisma.Decimal("60.00"),
      }),
    ];
    const deps = buildDeps(rows);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    // cat-kit2-ol e cat-kit3-rp existem no catálogo mas não tiveram
    // nenhum lançamento — não devem aparecer.
    expect(result.kitRows).toHaveLength(1);
    expect(result.kitRows[0].categoryId).toBe("cat-kit2-rp");
  });

  it("tolera variações de escrita no nome da categoria (KIT maiúsculo, sem espaço)", async () => {
    const deps = buildDeps([
      row({
        id: "e1",
        categoryId: "cat-a",
        amount: new Prisma.Decimal("40.00"),
      }),
    ]);
    vi.mocked(deps.categoryRepository.listActive).mockResolvedValue([
      { id: "cat-a", name: "KIT4" } as never,
    ]);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.kitRows[0]).toEqual({
      categoryId: "cat-a",
      label: "KIT4",
      kitSize: 4,
      count: 1,
      frascos: 4,
      isAvulso: false,
    });
  });

  it("totais por forma batem com a soma dos lançamentos brutos, não das linhas exibidas", async () => {
    const rows = [
      row({
        id: "e1",
        paymentMethodIsCash: true,
        amount: new Prisma.Decimal("60.00"),
      }),
      row({
        id: "e2",
        paymentMethodIsCash: true,
        amount: new Prisma.Decimal("60.00"),
      }),
      row({
        id: "e3",
        paymentMethodIsCash: false,
        amount: new Prisma.Decimal("2200.00"),
      }),
      row({
        id: "e4",
        paymentMethodIsCash: false,
        amount: new Prisma.Decimal("660.00"),
      }),
    ];
    const deps = buildDeps(rows);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.cashTotal).toBe("120.00");
    expect(result.cashCount).toBe(2);
    expect(result.pixTotal).toBe("2860.00");
    expect(result.pixCount).toBe(2);
    expect(result.totalAmount).toBe("2980.00");
    expect(result.totalCount).toBe(4);
  });

  it("não trunca a lista de entries — o PDF pagina sozinho, sem teto de linhas", async () => {
    const rows = Array.from({ length: 120 }, (_, index) =>
      row({ id: `e${index}`, amount: new Prisma.Decimal("10.00") }),
    );
    const deps = buildDeps(rows);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.entries).toHaveLength(120);
    expect(result.totalCount).toBe(120);
    expect(result.totalAmount).toBe("1200.00");
  });

  it("usa patientName '—' quando ausente", async () => {
    const deps = buildDeps([row({ id: "e1", patientName: null })]);

    const result = await getStatusReportRecebimentosUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.entries[0].patientName).toBe("—");
  });
});
