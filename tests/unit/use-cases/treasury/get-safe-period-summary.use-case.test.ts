import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getSafePeriodSummaryUseCase } from "@/features/treasury/application/get-safe-period-summary.use-case";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

function buildDeps(overrides: {
  openingBalance?: string;
  totalIn?: string;
  totalOut?: string;
}) {
  const getBalanceAsOf = vi
    .fn()
    .mockResolvedValue(new Prisma.Decimal(overrides.openingBalance ?? "0"));
  const safeRepository = {
    getBalanceAsOf,
  } as unknown as SafeRepository;

  const sumSignedByDateRangeAndStatus = vi.fn().mockResolvedValue({
    in: overrides.totalIn ?? "0",
    out: overrides.totalOut ?? "0",
  });
  const safeMovementRepository = {
    sumSignedByDateRangeAndStatus,
  } as unknown as SafeMovementRepository;

  return { safeRepository, safeMovementRepository };
}

describe("getSafePeriodSummaryUseCase", () => {
  it("saldo final = saldo inicial + entradas - saídas do período", async () => {
    const deps = buildDeps({
      openingBalance: "1000.00",
      totalIn: "500.00",
      totalOut: "200.00",
    });
    const dateFrom = new Date("2026-07-01T00:00:00.000Z");
    const dateTo = new Date("2026-07-31T23:59:59.999Z");

    const result = await getSafePeriodSummaryUseCase(
      "org-1",
      dateFrom,
      dateTo,
      deps,
    );

    expect(deps.safeRepository.getBalanceAsOf).toHaveBeenCalledWith(
      "org-1",
      dateFrom,
    );
    expect(
      deps.safeMovementRepository.sumSignedByDateRangeAndStatus,
    ).toHaveBeenCalledWith("org-1", dateFrom, dateTo, "CONFIRMED");

    expect(result).toEqual({
      openingBalance: "1000.00",
      closingBalance: "1300.00",
      totalIn: "500.00",
      totalOut: "200.00",
    });
  });

  it("funciona com saldo inicial zero e nenhuma movimentação no período", async () => {
    const deps = buildDeps({});
    const result = await getSafePeriodSummaryUseCase(
      "org-1",
      new Date("2026-07-01T00:00:00.000Z"),
      new Date("2026-07-31T23:59:59.999Z"),
      deps,
    );

    expect(result).toEqual({
      openingBalance: "0.00",
      closingBalance: "0.00",
      totalIn: "0.00",
      totalOut: "0.00",
    });
  });

  it("saldo final pode ficar negativo quando saídas superam entradas + saldo inicial", async () => {
    const deps = buildDeps({
      openingBalance: "100.00",
      totalIn: "0.00",
      totalOut: "300.00",
    });
    const result = await getSafePeriodSummaryUseCase(
      "org-1",
      new Date("2026-07-01T00:00:00.000Z"),
      new Date("2026-07-31T23:59:59.999Z"),
      deps,
    );

    expect(result.closingBalance).toBe("-200.00");
  });
});
