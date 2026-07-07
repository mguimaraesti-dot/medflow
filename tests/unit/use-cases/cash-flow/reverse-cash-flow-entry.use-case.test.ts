import { describe, it, expect, vi } from "vitest";
import { reverseCashFlowEntryUseCase } from "@/features/cash-flow/application/reverse-cash-flow-entry.use-case";
import {
  CashRegisterClosedError,
  DuplicateReversalError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("reverseCashFlowEntryUseCase", () => {
  it("lança NotFoundError quando o lançamento não existe", async () => {
    const cashFlowEntryRepository = {
      findById: vi.fn().mockResolvedValue(null),
      reverse: vi.fn(),
    } as unknown as CashFlowEntryRepository;
    const cashRegisterDayRepository = {} as CashRegisterDayRepository;

    await expect(
      reverseCashFlowEntryUseCase(
        "entry-x",
        { description: "Motivo do estorno de teste" },
        "user-1",
        { cashFlowEntryRepository, cashRegisterDayRepository },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  // Cenário da matriz: "Duplo estorno -> Bloqueado"
  it("bloqueia estornar um lançamento que já foi estornado", async () => {
    const cashFlowEntryRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "entry-1",
        cashRegisterDayId: "day-1",
        isReversed: true,
      }),
      reverse: vi.fn(),
    } as unknown as CashFlowEntryRepository;
    const cashRegisterDayRepository = {
      findById: vi.fn(),
    } as unknown as CashRegisterDayRepository;

    await expect(
      reverseCashFlowEntryUseCase(
        "entry-1",
        { description: "Motivo do estorno de teste" },
        "user-1",
        { cashFlowEntryRepository, cashRegisterDayRepository },
      ),
    ).rejects.toThrow(DuplicateReversalError);

    expect(cashFlowEntryRepository.reverse).not.toHaveBeenCalled();
  });

  it("bloqueia estornar um lançamento cujo caixa já está fechado", async () => {
    const cashFlowEntryRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "entry-1",
        cashRegisterDayId: "day-1",
        isReversed: false,
      }),
      reverse: vi.fn(),
    } as unknown as CashFlowEntryRepository;
    const cashRegisterDayRepository = {
      findById: vi.fn().mockResolvedValue({ id: "day-1", status: "CLOSED" }),
    } as unknown as CashRegisterDayRepository;

    await expect(
      reverseCashFlowEntryUseCase(
        "entry-1",
        { description: "Motivo do estorno de teste" },
        "user-1",
        { cashFlowEntryRepository, cashRegisterDayRepository },
      ),
    ).rejects.toThrow(CashRegisterClosedError);

    expect(cashFlowEntryRepository.reverse).not.toHaveBeenCalled();
  });

  // Cenário da matriz: "Estorno -> Cria lançamento inverso vinculado ao original"
  it("cria lançamento de sinal oposto vinculado ao original e marca o original como estornado", async () => {
    const reverse = vi.fn().mockResolvedValue({
      original: { id: "entry-1", isReversed: true },
      reversal: { id: "entry-2", reversalOfEntryId: "entry-1", type: "OUT" },
    });
    const cashFlowEntryRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "entry-1",
        cashRegisterDayId: "day-1",
        type: "IN",
        isReversed: false,
      }),
      reverse,
    } as unknown as CashFlowEntryRepository;
    const cashRegisterDayRepository = {
      findById: vi.fn().mockResolvedValue({ id: "day-1", status: "OPEN" }),
    } as unknown as CashRegisterDayRepository;

    const result = await reverseCashFlowEntryUseCase(
      "entry-1",
      { description: "Motivo do estorno de teste" },
      "user-1",
      { cashFlowEntryRepository, cashRegisterDayRepository },
    );

    expect(reverse).toHaveBeenCalledWith(
      "entry-1",
      "user-1",
      "Motivo do estorno de teste",
    );
    expect(result.reversal.reversalOfEntryId).toBe("entry-1");
    expect(result.original.isReversed).toBe(true);
  });
});
