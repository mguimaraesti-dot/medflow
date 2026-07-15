import { describe, it, expect, vi } from "vitest";
import { getPreviousDayOpenRegisterUseCase } from "@/features/cash-register/application/get-previous-day-open-register.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

const organizationSettingsRepository: OrganizationSettingsRepository = {
  findByOrganization: vi.fn().mockResolvedValue(null),
  update: vi.fn(),
};

describe("getPreviousDayOpenRegisterUseCase", () => {
  it("retorna null quando não existe nenhum OPEN de data anterior", async () => {
    const cashRegisterDayRepository = {
      findOldestOpenBefore: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    const result = await getPreviousDayOpenRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
      organizationSettingsRepository,
    });

    expect(result).toBeNull();
  });

  // Correção pós-1º commit: o dialog de fechamento é o ÚNICO jeito de
  // encerrar esse caixa esquecido — precisa mostrar o saldo REAL daquele
  // dia (via computeLiveCashRegisterDay, mesma fórmula do fechamento),
  // nunca zeros, senão a secretária declara um valor contado às cegas.
  it("calcula o saldo ao vivo do caixa esquecido (mesma fórmula do fechamento)", async () => {
    const cashRegisterDayRepository = {
      findOldestOpenBefore: vi.fn().mockResolvedValue({
        id: "day-old",
        status: "OPEN",
        date: new Date("2026-07-14T00:00:00.000Z"),
        openingBalance: "40.00",
        totalIn: null,
        totalOut: null,
      }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "60.00", totalOut: "0.00" }),
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "60.00", totalOut: "0.00" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi.fn().mockResolvedValue("0.00"),
    } as unknown as SafeMovementRepository;

    const result = await getPreviousDayOpenRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
      organizationSettingsRepository,
    });

    // 40 (abertura) + 60 (venda de Kit em dinheiro) - 0 - 0 (sangria) = 100.
    expect(result?.expectedCashAmount?.toFixed(2)).toBe("100.00");
    expect(result?.cashIn?.toFixed(2)).toBe("60.00");
    expect(result?.id).toBe("day-old");
  });
});
