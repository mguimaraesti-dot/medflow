import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getStatusReportSafeUseCase } from "@/features/reports/application/get-status-report-safe.use-case";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type {
  SafeMovementRepository,
  ListSafeMovementsFilter,
} from "@/features/treasury/domain/safe-movement.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ name: "Clínica MAE" }),
    },
  },
}));

const DATE_FROM = new Date("2026-07-01T00:00:00.000Z");
const DATE_TO = new Date("2026-07-17T00:00:00.000Z");

function buildDeps(
  overrides: {
    openingBalance?: Prisma.Decimal;
    periodIn?: string;
    periodOut?: string;
    pendingCount?: number;
    pendingSum?: string;
    movementsByType?: Record<string, Prisma.Decimal[]>;
  } = {},
) {
  const openingBalance = overrides.openingBalance ?? new Prisma.Decimal(0);
  const movementsByType = overrides.movementsByType ?? {};

  const safeRepository = {
    getBalanceAsOf: vi.fn().mockResolvedValue(openingBalance),
  } as unknown as SafeRepository;

  const safeMovementRepository = {
    sumSignedByDateRangeAndStatus: vi.fn().mockResolvedValue({
      in: overrides.periodIn ?? "0.00",
      out: overrides.periodOut ?? "0.00",
    }),
    countAndSumPending: vi.fn().mockResolvedValue({
      count: overrides.pendingCount ?? 0,
      sum: overrides.pendingSum ?? "0.00",
    }),
    list: vi.fn().mockImplementation((filter: ListSafeMovementsFilter) => {
      const key = (filter.types ?? []).join(",");
      const amounts = movementsByType[key] ?? [];
      return Promise.resolve({
        items: amounts.map((amount) => ({ amount })),
        page: 1,
        pageSize: 1000,
        total: amounts.length,
        totalPages: 1,
      });
    }),
  } as unknown as SafeMovementRepository;

  return { safeRepository, safeMovementRepository };
}

describe("getStatusReportSafeUseCase", () => {
  it("calcula finalBalance = openingBalance + periodReceived - periodSent (waterfall sempre reconcilia)", async () => {
    const deps = buildDeps({
      openingBalance: new Prisma.Decimal("2372.00"),
      periodIn: "1240.00",
      periodOut: "400.00",
    });

    const result = await getStatusReportSafeUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.openingBalance).toBe("2372.00");
    expect(result.periodReceived).toBe("1240.00");
    expect(result.periodSent).toBe("400.00");
    expect(result.finalBalance).toBe("3212.00");
    expect(result.isSurplus).toBe(true);
  });

  it("marca déficit quando o saldo final fica negativo", async () => {
    const deps = buildDeps({
      openingBalance: new Prisma.Decimal("100.00"),
      periodIn: "0.00",
      periodOut: "500.00",
    });

    const result = await getStatusReportSafeUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.finalBalance).toBe("-400.00");
    expect(result.isSurplus).toBe(false);
  });

  it("composição: recebido do caixa fica positivo; enviado ao caixa e pago a fornecedores ficam negativos (saída)", async () => {
    const deps = buildDeps({
      movementsByType: {
        "SANGRIA,CASH_REGISTER_HANDOFF": [
          new Prisma.Decimal("1000.00"),
          new Prisma.Decimal("240.00"),
        ],
        FUNDING: [new Prisma.Decimal("400.00")],
        ACCOUNTS_PAYABLE_PAYMENT: [],
        MANUAL_ADJUSTMENT: [],
      },
    });

    const result = await getStatusReportSafeUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const received = result.composition.find(
      (row) => row.label === "Recebido do caixa",
    );
    const sent = result.composition.find(
      (row) => row.label === "Enviado ao caixa",
    );
    const paid = result.composition.find(
      (row) => row.label === "Pago a fornecedores",
    );

    expect(received?.amount).toBe("1240.00");
    expect(received?.count).toBe(2);
    expect(sent?.amount).toBe("-400.00");
    expect(sent?.count).toBe(1);
    expect(paid?.amount).toBe("0.00");
    expect(paid?.count).toBe(0);
    expect(paid?.description).toContain("nenhuma");
  });

  it("ajustes manuais preservam o próprio sinal (positivo ou negativo), nunca são forçados a negativo", async () => {
    const deps = buildDeps({
      movementsByType: {
        MANUAL_ADJUSTMENT: [
          new Prisma.Decimal("50.00"),
          new Prisma.Decimal("-20.00"),
        ],
      },
    });

    const result = await getStatusReportSafeUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    const adjustments = result.composition.find(
      (row) => row.label === "Ajustes manuais",
    );
    expect(adjustments?.amount).toBe("30.00");
    expect(adjustments?.count).toBe(2);
  });

  it("reflete a contagem/soma de movimentações pendentes de conferência (fechamentos de caixa aguardando gerente)", async () => {
    const deps = buildDeps({
      pendingCount: 2,
      pendingSum: "340.00",
    });

    const result = await getStatusReportSafeUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.pendingCount).toBe(2);
    expect(result.pendingSum).toBe("340.00");
  });

  it("período curto (<=14 dias) usa granularidade DIÁRIA", async () => {
    const deps = buildDeps({ openingBalance: new Prisma.Decimal("0.00") });
    vi.mocked(deps.safeRepository.getBalanceAsOf).mockResolvedValue(
      new Prisma.Decimal("100.00"),
    );

    // 01/07 a 07/07 = 7 dias — bem abaixo do teto diário (14 dias).
    const result = await getStatusReportSafeUseCase(
      "org-1",
      new Date("2026-07-01T00:00:00.000Z"),
      new Date("2026-07-07T00:00:00.000Z"),
      deps,
    );

    expect(result.granularity).toBe("DAILY");
    expect(result.balanceHistoryTitle).toBe("Saldo por dia");
    expect(result.balanceHistory).toHaveLength(7);
    expect(result.balanceHistory.map((point) => point.label)).toEqual([
      "01/07",
      "02/07",
      "03/07",
      "04/07",
      "05/07",
      "06/07",
      "07/07",
    ]);
    expect(result.balanceHistory.every((point) => point.showLabel)).toBe(true);
  });

  it("período médio (>14 e <=92 dias) usa granularidade SEMANAL com semanas de CALENDÁRIO (domingo a sábado), não blocos de 7 dias a partir do início do período", async () => {
    const deps = buildDeps({ openingBalance: new Prisma.Decimal("100.00") });
    vi.mocked(deps.safeRepository.getBalanceAsOf)
      .mockResolvedValueOnce(new Prisma.Decimal("100.00")) // saldo inicial do período
      .mockResolvedValueOnce(new Prisma.Decimal("150.00")) // fim da semana 1 (parcial)
      .mockResolvedValueOnce(new Prisma.Decimal("200.00")) // fim da semana 2 (cheia)
      .mockResolvedValueOnce(new Prisma.Decimal("250.00")); // fim da semana 3 (parcial)

    // DATE_FROM = 01/07/2026 é uma QUARTA-feira; DATE_TO = 17/07/2026 é
    // uma SEXTA-feira (17 dias) — nem o período começa num domingo, nem
    // termina num sábado, então a 1ª e a última semana devem sair parciais.
    const result = await getStatusReportSafeUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    expect(result.granularity).toBe("WEEKLY");
    expect(result.balanceHistoryTitle).toBe("Saldo por semana");
    expect(result.balanceHistory).toHaveLength(3);
    expect(result.balanceHistory.map((point) => point.label)).toEqual([
      "01/07 a 04/07 (parcial)", // domingo 28/06 a sábado 04/07, clipada em 01/07 (início do período)
      "05/07 a 11/07", // domingo a sábado cheios, dentro do período
      "12/07 a 17/07 (parcial)", // domingo 12/07 a sábado 18/07, clipada em 17/07 (fim do período)
    ]);
    expect(result.balanceHistory.map((point) => point.balance)).toEqual([
      "150.00",
      "200.00",
      "250.00",
    ]);
    expect(result.balanceHistory.every((point) => point.showLabel)).toBe(true);
  });

  it("não marca a semana como parcial quando o período já começa num domingo e termina num sábado", async () => {
    const deps = buildDeps({ openingBalance: new Prisma.Decimal("0.00") });
    vi.mocked(deps.safeRepository.getBalanceAsOf).mockResolvedValue(
      new Prisma.Decimal("0.00"),
    );

    // 05/07/2026 (domingo) a 25/07/2026 (sábado) = 3 semanas cheias
    // (21 dias, acima do teto diário de 14 — garante granularidade
    // SEMANAL mesmo com a data final em "fim de dia", como acontece
    // de verdade em produção via `period-selector.tsx`).
    const result = await getStatusReportSafeUseCase(
      "org-1",
      new Date("2026-07-05T00:00:00.000Z"),
      new Date("2026-07-25T23:59:59.999Z"),
      deps,
    );

    expect(result.granularity).toBe("WEEKLY");
    expect(result.balanceHistory).toHaveLength(3);
    expect(result.balanceHistory.map((point) => point.label)).toEqual([
      "05/07 a 11/07",
      "12/07 a 18/07",
      "19/07 a 25/07",
    ]);
    expect(
      result.balanceHistory.some((point) => point.label.includes("parcial")),
    ).toBe(false);
  });

  it("período longo (>92 dias) usa granularidade MENSAL com meses de calendário, evitando o bug real (26 barras semanais viravam sopa ilegível num período de 13/01 a 17/07)", async () => {
    const deps = buildDeps({ openingBalance: new Prisma.Decimal("0.00") });
    vi.mocked(deps.safeRepository.getBalanceAsOf).mockResolvedValue(
      new Prisma.Decimal("1000.00"),
    );

    // Mesmas datas do bug reportado: 13/01/2026 a 17/07/2026 (~186 dias).
    const result = await getStatusReportSafeUseCase(
      "org-1",
      new Date("2026-01-13T00:00:00.000Z"),
      new Date("2026-07-17T00:00:00.000Z"),
      deps,
    );

    expect(result.granularity).toBe("MONTHLY");
    expect(result.balanceHistoryTitle).toBe("Saldo por mês");
    // 7 barras (jan parcial a jul parcial) — nunca as 26 barras semanais do bug.
    expect(result.balanceHistory.map((point) => point.label)).toEqual([
      "jan/26 (parcial)",
      "fev/26",
      "mar/26",
      "abr/26",
      "mai/26",
      "jun/26",
      "jul/26 (parcial)",
    ]);
    expect(result.balanceHistory.every((point) => point.showLabel)).toBe(true);
  });

  it("degrada os RÓTULOS com elegância (mantém 1ª, última e pontos espaçados) quando mesmo a granularidade mensal ultrapassa o teto de barras legíveis", async () => {
    const deps = buildDeps({ openingBalance: new Prisma.Decimal("0.00") });
    vi.mocked(deps.safeRepository.getBalanceAsOf).mockResolvedValue(
      new Prisma.Decimal("500.00"),
    );

    // 01/2020 a 01/2030 = 121 barras mensais — bem acima do teto de 14.
    const result = await getStatusReportSafeUseCase(
      "org-1",
      new Date("2020-01-01T00:00:00.000Z"),
      new Date("2030-01-01T00:00:00.000Z"),
      deps,
    );

    expect(result.granularity).toBe("MONTHLY");
    expect(result.balanceHistory).toHaveLength(121);
    // A barra em si nunca some — só o rótulo degrada.
    expect(result.balanceHistory[0].showLabel).toBe(true);
    expect(result.balanceHistory[120].showLabel).toBe(true);
    const labeledCount = result.balanceHistory.filter(
      (point) => point.showLabel,
    ).length;
    expect(labeledCount).toBeLessThanOrEqual(14);
    expect(labeledCount).toBeLessThan(result.balanceHistory.length);
  });
});
