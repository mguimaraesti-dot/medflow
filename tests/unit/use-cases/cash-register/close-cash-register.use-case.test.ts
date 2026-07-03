import { describe, it, expect, vi } from "vitest";
import { closeCashRegisterUseCase } from "@/features/cash-register/application/close-cash-register.use-case";
import { CashRegisterNotOpenError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("closeCashRegisterUseCase", () => {
  it("bloqueia fechar quando não há caixa aberto", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;

    await expect(
      closeCashRegisterUseCase("user-1", "org-1", {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
      }),
    ).rejects.toThrow(CashRegisterNotOpenError);
  });

  // Cenário da matriz: "Fechamento sem movimentação -> Permitido e saldo preservado"
  it("fecha sem nenhuma movimentação, preservando o saldo de abertura", async () => {
    const openRegister = {
      id: "day-1",
      // String simples - o use case é quem envolve em Prisma.Decimal
      // internamente; o teste não precisa instanciar Decimal diretamente.
      openingBalance: "100.00",
    };
    const close = vi.fn().mockImplementation((id, data) => ({
      id,
      ...data,
      status: "CLOSED",
    }));

    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(openRegister),
      close,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "0.00", totalOut: "0.00" }),
    } as unknown as CashFlowEntryRepository;

    const result = await closeCashRegisterUseCase("user-1", "org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(close).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({ closingBalance: "100.00" }),
    );
    expect(result.status).toBe("CLOSED");
  });

  it("calcula closingBalance = abertura + entradas - saídas", async () => {
    const openRegister = {
      id: "day-1",
      // String simples - o use case é quem envolve em Prisma.Decimal
      // internamente; o teste não precisa instanciar Decimal diretamente.
      openingBalance: "100.00",
    };
    const close = vi.fn().mockImplementation((id, data) => ({ id, ...data }));

    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(openRegister),
      close,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "500.00", totalOut: "120.50" }),
    } as unknown as CashFlowEntryRepository;

    await closeCashRegisterUseCase("user-1", "org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(close).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({ closingBalance: "479.50" }),
    );
  });
});
