import { describe, it, expect, vi } from "vitest";
import { getTodayCashRegisterUseCase } from "@/features/cash-register/application/get-today-cash-register.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";

describe("getTodayCashRegisterUseCase", () => {
  it("retorna null quando não há caixa hoje", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;

    const result = await getTodayCashRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(result).toBeNull();
  });

  it("caixa OPEN: substitui totalIn/totalOut pela soma ao vivo", async () => {
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
    } as unknown as CashFlowEntryRepository;

    const result = await getTodayCashRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(result?.totalIn?.toFixed(2)).toBe("200.00");
    expect(result?.totalOut?.toFixed(2)).toBe("50.00");
  });

  it("caixa CLOSED: retorna sem chamar soma ao vivo", async () => {
    const sumByCashRegisterDay = vi.fn();
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
    } as unknown as CashFlowEntryRepository;

    const result = await getTodayCashRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(sumByCashRegisterDay).not.toHaveBeenCalled();
    expect(result?.totalIn).toBe("300.00");
  });
});
