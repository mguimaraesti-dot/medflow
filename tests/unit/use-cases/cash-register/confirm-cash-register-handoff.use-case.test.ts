import { describe, it, expect, vi } from "vitest";
import { confirmCashRegisterHandoffUseCase } from "@/features/cash-register/application/confirm-cash-register-handoff.use-case";
import { CashRegisterNotPendingConferenceError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("confirmCashRegisterHandoffUseCase", () => {
  it("bloqueia quando não há caixa aguardando conferência", async () => {
    const cashRegisterDayRepository = {
      findPendingConferenceByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;

    await expect(
      confirmCashRegisterHandoffUseCase(
        { receivedAmount: 100 },
        "user-1",
        "org-1",
        { cashRegisterDayRepository, cashFlowEntryRepository },
      ),
    ).rejects.toThrow(CashRegisterNotPendingConferenceError);
  });

  it("confirma sem divergência quando receivedAmount === countedAmount", async () => {
    const pendingRegister = {
      id: "day-1",
      openingBalance: "100.00",
      countedAmount: "300.00",
    };
    const confirmHandoff = vi
      .fn()
      .mockImplementation((id, data) => ({ id, ...data, status: "CLOSED" }));

    const cashRegisterDayRepository = {
      findPendingConferenceByOrganization: vi
        .fn()
        .mockResolvedValue(pendingRegister),
      confirmHandoff,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "300.00", totalOut: "100.00" }),
    } as unknown as CashFlowEntryRepository;

    const result = await confirmCashRegisterHandoffUseCase(
      { receivedAmount: 300 },
      "manager-1",
      "org-1",
      { cashRegisterDayRepository, cashFlowEntryRepository },
    );

    expect(confirmHandoff).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({
        receivedAmount: "300.00",
        confirmedDifference: "0.00",
        handoffConfirmedByUserId: "manager-1",
        // 100 (abertura) + 300 (entradas) - 100 (saídas) = 300.00
        totalIn: "300.00",
        totalOut: "100.00",
        closingBalance: "300.00",
      }),
    );
    expect(result.status).toBe("CLOSED");
  });

  // Cenário explicitamente pedido pelo ADR (Seção 7): divergência entre
  // o valor contado pela secretária e o valor recebido pela gerência.
  it("calcula confirmedDifference quando receivedAmount diverge de countedAmount", async () => {
    const pendingRegister = {
      id: "day-1",
      openingBalance: "100.00",
      countedAmount: "300.00",
    };
    const confirmHandoff = vi
      .fn()
      .mockImplementation((id, data) => ({ id, ...data }));

    const cashRegisterDayRepository = {
      findPendingConferenceByOrganization: vi
        .fn()
        .mockResolvedValue(pendingRegister),
      confirmHandoff,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "300.00", totalOut: "100.00" }),
    } as unknown as CashFlowEntryRepository;

    await confirmCashRegisterHandoffUseCase(
      { receivedAmount: 280 },
      "manager-1",
      "org-1",
      { cashRegisterDayRepository, cashFlowEntryRepository },
    );

    expect(confirmHandoff).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({
        receivedAmount: "280.00",
        confirmedDifference: "-20.00",
      }),
    );
  });
});
