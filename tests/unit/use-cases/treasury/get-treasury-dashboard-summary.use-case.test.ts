import { describe, it, expect, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { getTreasuryDashboardSummaryUseCase } from "@/features/treasury/application/get-treasury-dashboard-summary.use-case";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

describe("getTreasuryDashboardSummaryUseCase", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("usa o dia de Brasília (não UTC) como 'hoje' default, mesmo às 22h locais (já 01h em UTC do dia seguinte)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T01:00:00.000Z")); // 22h de 14/07 em Brasília

    const safeRepository = {
      getBalance: vi.fn().mockResolvedValue(new Prisma.Decimal(0)),
    } as unknown as SafeRepository;
    const sumSignedByDateRangeAndStatus = vi
      .fn()
      .mockResolvedValue({ in: "0.00", out: "0.00" });
    const safeMovementRepository = {
      sumSignedByDateRangeAndStatus,
      countAndSumPending: vi.fn().mockResolvedValue({ count: 0, sum: "0.00" }),
      findLastConfirmed: vi.fn().mockResolvedValue(null),
    } as unknown as SafeMovementRepository;

    await getTreasuryDashboardSummaryUseCase("org-1", {
      safeRepository,
      safeMovementRepository,
    });

    // Instante UTC REAL do dia local 14/07 em Brasília (UTC-3), não o
    // RÓTULO (que seria 2026-07-14T00:00:00.000Z/23:59:59.999Z — 3h
    // adiantado do limite real). Bug real de produção corrigido junto
    // com este teste: usar o rótulo direto contra `createdAt` (uma
    // coluna `DateTime` de verdade) excluía por engano qualquer
    // movimentação entre ~21h e meia-noite local, que já virava "amanhã"
    // em UTC — ver business-day.test.ts (`startOfDayInstant`/
    // `endOfDayInstant`) para o caso completo.
    expect(sumSignedByDateRangeAndStatus).toHaveBeenCalledWith(
      "org-1",
      new Date("2026-07-14T03:00:00.000Z"),
      new Date("2026-07-15T02:59:59.999Z"),
      "CONFIRMED",
    );
  });

  it("agrega saldo, entradas/saídas de hoje, pendentes e última conferência", async () => {
    const safeRepository = {
      getBalance: vi.fn().mockResolvedValue(new Prisma.Decimal("6028.00")),
    } as unknown as SafeRepository;

    const lastConfirmed = {
      confirmedAt: new Date("2026-07-07T22:15:00.000Z"),
      confirmedByUserName: "mguimaraes",
    };

    const safeMovementRepository = {
      sumSignedByDateRangeAndStatus: vi
        .fn()
        .mockResolvedValue({ in: "2350.00", out: "800.00" }),
      countAndSumPending: vi
        .fn()
        .mockResolvedValue({ count: 2, sum: "2450.00" }),
      findLastConfirmed: vi.fn().mockResolvedValue(lastConfirmed),
    } as unknown as SafeMovementRepository;

    const result = await getTreasuryDashboardSummaryUseCase("org-1", {
      safeRepository,
      safeMovementRepository,
    });

    expect(result).toEqual({
      balance: "6028.00",
      periodIn: "2350.00",
      periodOut: "800.00",
      pendingCount: 2,
      pendingSum: "2450.00",
      lastConfirmedAt: lastConfirmed.confirmedAt.toISOString(),
      lastConfirmedByUserName: "mguimaraes",
    });
  });

  it("usa null quando nunca houve confirmação", async () => {
    const safeRepository = {
      getBalance: vi.fn().mockResolvedValue(new Prisma.Decimal(0)),
    } as unknown as SafeRepository;

    const safeMovementRepository = {
      sumSignedByDateRangeAndStatus: vi
        .fn()
        .mockResolvedValue({ in: "0.00", out: "0.00" }),
      countAndSumPending: vi.fn().mockResolvedValue({ count: 0, sum: "0.00" }),
      findLastConfirmed: vi.fn().mockResolvedValue(null),
    } as unknown as SafeMovementRepository;

    const result = await getTreasuryDashboardSummaryUseCase("org-1", {
      safeRepository,
      safeMovementRepository,
    });

    expect(result.lastConfirmedAt).toBeNull();
    expect(result.lastConfirmedByUserName).toBeNull();
  });

  it("aceita um range explícito em vez do padrão 'hoje'", async () => {
    const safeRepository = {
      getBalance: vi.fn().mockResolvedValue(new Prisma.Decimal(0)),
    } as unknown as SafeRepository;

    const sumSignedByDateRangeAndStatus = vi
      .fn()
      .mockResolvedValue({ in: "100.00", out: "50.00" });
    const safeMovementRepository = {
      sumSignedByDateRangeAndStatus,
      countAndSumPending: vi.fn().mockResolvedValue({ count: 0, sum: "0.00" }),
      findLastConfirmed: vi.fn().mockResolvedValue(null),
    } as unknown as SafeMovementRepository;

    const from = new Date("2026-07-01T00:00:00.000Z");
    const to = new Date("2026-07-07T23:59:59.999Z");

    await getTreasuryDashboardSummaryUseCase(
      "org-1",
      { safeRepository, safeMovementRepository },
      { from, to },
    );

    expect(sumSignedByDateRangeAndStatus).toHaveBeenCalledWith(
      "org-1",
      from,
      to,
      "CONFIRMED",
    );
  });
});
