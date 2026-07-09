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

  it("fecha direto para CLOSED sem nenhuma movimentação, com expectedCashAmount = abertura", async () => {
    const openRegister = { id: "day-1", openingBalance: "100.00" };
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
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "0.00", totalOut: "0.00" }),
      sumByCashRegisterDay: vi
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
        totalIn: "0.00",
        totalOut: "0.00",
        closingBalance: "100.00",
        handoffAmount: "100.00",
      }),
    );
    expect(result.status).toBe("CLOSED");
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
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "500.00", totalOut: "120.50" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi
        .fn()
        .mockImplementation((_id, type: string) =>
          Promise.resolve(type === "SANGRIA" ? "30.00" : "0.00"),
        ),
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
        handoffAmount: "449.50",
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
      sumByCashRegisterDay: vi
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

  // Bug reportado: reabrir o caixa depois que a Tesouraria já confirmou o
  // handoff, e fechar de novo sem nenhuma movimentação nova, reenviava o
  // valor total do dia (R$1.000 de novo) em vez de R$0 — porque
  // expectedCashAmount/countedAmount são cumulativos (contam desde a
  // abertura do dia, através de todas as reaberturas), mas o handoff
  // criado usava esse total cumulativo direto, sem descontar o que já
  // tinha sido confirmado.
  it("não reenvia o handoff já confirmado ao reabrir e fechar sem movimentação nova", async () => {
    const openRegister = { id: "day-1", openingBalance: "0.00" };
    const close = vi.fn().mockImplementation((id, data) => ({ id, ...data }));

    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(openRegister),
      close,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "1000.00", totalOut: "0.00" }),
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "1000.00", totalOut: "0.00" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi
        .fn()
        .mockImplementation((_id, type: string, status?: string) =>
          Promise.resolve(
            type === "CASH_REGISTER_HANDOFF" && status === "CONFIRMED"
              ? "1000.00"
              : "0.00",
          ),
        ),
    } as unknown as SafeMovementRepository;

    await closeCashRegisterUseCase({ countedAmount: 1000 }, "user-1", "org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
    });

    expect(close).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({
        countedAmount: "1000.00",
        handoffAmount: "0.00",
      }),
    );
  });

  it("envia só a diferença quando reabre e recebe mais movimentação antes de fechar de novo", async () => {
    const openRegister = { id: "day-1", openingBalance: "0.00" };
    const close = vi.fn().mockImplementation((id, data) => ({ id, ...data }));

    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(openRegister),
      close,
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumCashOnlyByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "1200.00", totalOut: "0.00" }),
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "1200.00", totalOut: "0.00" }),
    } as unknown as CashFlowEntryRepository;

    const safeMovementRepository = {
      sumByCashRegisterDayAndType: vi
        .fn()
        .mockImplementation((_id, type: string, status?: string) =>
          Promise.resolve(
            type === "CASH_REGISTER_HANDOFF" && status === "CONFIRMED"
              ? "1000.00"
              : "0.00",
          ),
        ),
    } as unknown as SafeMovementRepository;

    await closeCashRegisterUseCase({ countedAmount: 1200 }, "user-1", "org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
    });

    expect(close).toHaveBeenCalledWith(
      "day-1",
      expect.objectContaining({
        countedAmount: "1200.00",
        handoffAmount: "200.00",
      }),
    );
  });
});
