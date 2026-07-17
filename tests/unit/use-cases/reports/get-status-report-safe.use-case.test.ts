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

  it("gera uma semana por bucket de 7 dias do período, com o saldo (getBalanceAsOf) ao fim de cada uma", async () => {
    const deps = buildDeps({ openingBalance: new Prisma.Decimal("100.00") });
    vi.mocked(deps.safeRepository.getBalanceAsOf)
      .mockResolvedValueOnce(new Prisma.Decimal("100.00")) // saldo inicial do período
      .mockResolvedValueOnce(new Prisma.Decimal("150.00")) // fim da semana 1
      .mockResolvedValueOnce(new Prisma.Decimal("200.00")) // fim da semana 2
      .mockResolvedValueOnce(new Prisma.Decimal("250.00")); // fim da semana 3 (parcial)

    const result = await getStatusReportSafeUseCase(
      "org-1",
      DATE_FROM,
      DATE_TO,
      deps,
    );

    // 01/07 a 17/07 = 17 dias -> 3 buckets de 7 dias (a última mais curta).
    expect(result.weeks).toHaveLength(3);
    expect(result.weeks.map((week) => week.balance)).toEqual([
      "150.00",
      "200.00",
      "250.00",
    ]);
  });
});
