import { describe, it, expect, vi } from "vitest";
import { getTodayCashRegisterUseCase } from "@/features/cash-register/application/get-today-cash-register.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

describe("getTodayCashRegisterUseCase", () => {
  it("retorna null quando não há caixa hoje", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    const result = await getTodayCashRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
    });

    expect(result).toBeNull();
  });

  it("caixa OPEN: substitui totalIn/totalOut pela soma ao vivo e calcula expectedCashAmount só em dinheiro", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "OPEN",
        openingBalance: "100.00",
        totalIn: null,
        totalOut: null,
      }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "200.00", totalOut: "50.00" }),
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "80.00", totalOut: "20.00" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi.fn().mockResolvedValue("10.00"),
    } as unknown as SafeMovementRepository;

    const result = await getTodayCashRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
    });

    // Contábil (todas as formas): 200 entradas - 50 saídas.
    expect(result?.totalIn?.toFixed(2)).toBe("200.00");
    expect(result?.totalOut?.toFixed(2)).toBe("50.00");
    // Só espécie: 100 (abertura) + 80 - 20 - 10 (sangria) = 150.
    expect(result?.expectedCashAmount?.toFixed(2)).toBe("150.00");
  });

  it("caixa CLOSED: retorna sem chamar soma ao vivo", async () => {
    const sumByCashRegisterDay = vi.fn();
    const sumCashOnlyByCashRegisterDay = vi.fn();
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "CLOSED",
        openingBalance: "100.00",
        totalIn: "300.00",
        totalOut: "20.00",
        closingBalance: "380.00",
      }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay,
      sumCashOnlyByCashRegisterDay,
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi.fn(),
    } as unknown as SafeMovementRepository;

    const result = await getTodayCashRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
    });

    expect(sumByCashRegisterDay).not.toHaveBeenCalled();
    expect(sumCashOnlyByCashRegisterDay).not.toHaveBeenCalled();
    expect(result?.totalIn).toBe("300.00");
  });
});
