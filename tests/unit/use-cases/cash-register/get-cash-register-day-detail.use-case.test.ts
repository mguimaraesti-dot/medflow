import { describe, it, expect, vi } from "vitest";
import { getCashRegisterDayDetailUseCase } from "@/features/cash-register/application/get-cash-register-day-detail.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

describe("getCashRegisterDayDetailUseCase", () => {
  it("lança NotFoundError quando o dia não existe", async () => {
    const cashRegisterDayRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    await expect(
      getCashRegisterDayDetailUseCase("day-1", "org-1", {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança NotFoundError quando o dia é de outra organização", async () => {
    const cashRegisterDayRepository = {
      findById: vi
        .fn()
        .mockResolvedValue({ id: "day-1", organizationId: "org-2" }),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    await expect(
      getCashRegisterDayDetailUseCase("day-1", "org-1", {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("combina o dia, os lançamentos e as movimentações do Cofre vinculadas", async () => {
    const day = { id: "day-1", organizationId: "org-1" };
    const cashRegisterDayRepository = {
      findById: vi.fn().mockResolvedValue(day),
    } as unknown as CashRegisterDayRepository;
    const entries = [
      { type: "IN", amount: 100, occurredAt: new Date(), categoryId: "cat-1" },
    ];
    const cashFlowEntryRepository = {
      listByCashRegisterDay: vi.fn().mockResolvedValue(entries),
    } as unknown as CashFlowEntryRepository;
    const safeMovements = [{ id: "mov-1" }];
    const list = vi.fn().mockResolvedValue({ items: safeMovements });
    const safeMovementRepository = {
      list,
    } as unknown as SafeMovementRepository;

    const result = await getCashRegisterDayDetailUseCase("day-1", "org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
    });

    expect(list).toHaveBeenCalledWith(
      { organizationId: "org-1", relatedCashRegisterDayId: "day-1" },
      { page: 1, pageSize: 100 },
    );
    expect(result).toEqual({ day, entries, safeMovements });
  });
});
