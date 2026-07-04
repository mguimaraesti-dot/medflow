import { describe, it, expect, vi } from "vitest";
import { closeCashRegisterUseCase } from "@/features/cash-register/application/close-cash-register.use-case";
import { CashRegisterNotOpenError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("closeCashRegisterUseCase", () => {
  it("bloqueia fechar quando não há caixa aberto", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    await expect(
      closeCashRegisterUseCase({ countedAmount: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
      }),
    ).rejects.toThrow(CashRegisterNotOpenError);
  });

  it("fecha sem nenhuma movimentação, indo para PENDING_CONFERENCE com expectedCashAmount = abertura", async () => {
    const openRegister = { id: "day-1", openingBalance: "100.00" };
    const close = vi.fn().mockImplementation((id, data) => ({
      id,
      ...data,
      status: "PENDING_CONFERENCE",
    }));

    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(openRegister),
      close,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "0.00", totalOut: "0.00" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi.fn().mockResolvedValue("0.00"),
    } as unknown as SafeMovementRepository;

    const result = await closeCashRegisterUseCase(
      { countedAmount: 100 },
      "user-1",
      "org-1",
      {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
      },
    );

    expect(close).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({
        expectedCashAmount: "100.00",
        countedAmount: "100.00",
        difference: "0.00",
      }),
    );
    expect(result.status).toBe("PENDING_CONFERENCE");
  });

  it("calcula expectedCashAmount = abertura + entradas em dinheiro - saídas em dinheiro - sangrias", async () => {
    const openRegister = { id: "day-1", openingBalance: "100.00" };
    const close = vi.fn().mockImplementation((id, data) => ({ id, ...data }));

    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(openRegister),
      close,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "500.00", totalOut: "120.50" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi.fn().mockResolvedValue("30.00"),
    } as unknown as SafeMovementRepository;

    await closeCashRegisterUseCase(
      { countedAmount: 449.5 },
      "user-1",
      "org-1",
      {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
      },
    );

    // 100 + 500 - 120.50 - 30 (sangria) = 449.50
    expect(close).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({
        expectedCashAmount: "449.50",
        difference: "0.00",
      }),
    );
  });

  it("registra difference negativa quando o valor contado é menor que o esperado", async () => {
    const openRegister = { id: "day-1", openingBalance: "100.00" };
    const close = vi.fn().mockImplementation((id, data) => ({ id, ...data }));

    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(openRegister),
      close,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "0.00", totalOut: "0.00" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi.fn().mockResolvedValue("0.00"),
    } as unknown as SafeMovementRepository;

    await closeCashRegisterUseCase({ countedAmount: 90 }, "user-1", "org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
    });

    expect(close).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({ difference: "-10.00" }),
    );
  });
});
