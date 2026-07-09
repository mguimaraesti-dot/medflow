import { describe, it, expect, vi } from "vitest";
import { reopenCashRegisterUseCase } from "@/features/cash-register/application/reopen-cash-register.use-case";
import {
  CashRegisterAlreadyOpenError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

function buildSafeMovementRepository(
  pending: unknown[] = [],
): SafeMovementRepository {
  return {
    findPendingByCashRegisterDay: vi.fn().mockResolvedValue(pending),
    cancel: vi.fn(),
  } as unknown as SafeMovementRepository;
}

describe("reopenCashRegisterUseCase", () => {
  it("lança NotFoundError quando o caixa não existe", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;

    await expect(
      reopenCashRegisterUseCase(
        "day-x",
        { reason: "correção necessária no valor" },
        "admin-1",
        {
          cashRegisterDayRepository: repo,
          safeMovementRepository: buildSafeMovementRepository(),
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  // Cenário da matriz: "Reabrir caixa já aberto -> Bloqueado"
  it("bloqueia reabrir um caixa que já está OPEN", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "OPEN",
        organizationId: "org-1",
        date: new Date(),
      }),
    } as unknown as CashRegisterDayRepository;

    await expect(
      reopenCashRegisterUseCase(
        "day-1",
        { reason: "correção necessária no valor" },
        "admin-1",
        {
          cashRegisterDayRepository: repo,
          safeMovementRepository: buildSafeMovementRepository(),
        },
      ),
    ).rejects.toThrow(CashRegisterAlreadyOpenError);
  });

  it("reabre um caixa CLOSED e incrementa reopenCount", async () => {
    const reopen = vi
      .fn()
      .mockResolvedValue({ id: "day-1", status: "OPEN", reopenCount: 1 });
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "CLOSED",
        organizationId: "org-1",
        date: new Date(),
      }),
      reopen,
    } as unknown as CashRegisterDayRepository;

    const result = await reopenCashRegisterUseCase(
      "day-1",
      { reason: "ajuste solicitado pelo financeiro" },
      "admin-1",
      {
        cashRegisterDayRepository: repo,
        safeMovementRepository: buildSafeMovementRepository(),
      },
    );

    expect(reopen).toHaveBeenCalledWith("day-1", {
      reopenedByUserId: "admin-1",
      reason: "ajuste solicitado pelo financeiro",
    });
    expect(result.status).toBe("OPEN");
  });

  it("cancela automaticamente um CASH_REGISTER_HANDOFF pendente vinculado ao dia reaberto", async () => {
    const reopen = vi
      .fn()
      .mockResolvedValue({ id: "day-1", status: "OPEN", reopenCount: 1 });
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "CLOSED",
        organizationId: "org-1",
        date: new Date(),
      }),
      reopen,
    } as unknown as CashRegisterDayRepository;

    const safeMovementRepository = buildSafeMovementRepository([
      { id: "movement-1" },
    ]);

    await reopenCashRegisterUseCase(
      "day-1",
      { reason: "ajuste solicitado pelo financeiro" },
      "admin-1",
      { cashRegisterDayRepository: repo, safeMovementRepository },
    );

    expect(
      safeMovementRepository.findPendingByCashRegisterDay,
    ).toHaveBeenCalledWith("day-1");
    expect(safeMovementRepository.cancel).toHaveBeenCalledWith(
      "movement-1",
      "admin-1",
      "Caixa reaberto antes da confirmação do Gerente",
    );
  });

  it("não chama cancel quando não há pendente vinculado", async () => {
    const reopen = vi
      .fn()
      .mockResolvedValue({ id: "day-1", status: "OPEN", reopenCount: 1 });
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "CLOSED",
        organizationId: "org-1",
        date: new Date(),
      }),
      reopen,
    } as unknown as CashRegisterDayRepository;

    const safeMovementRepository = buildSafeMovementRepository([]);

    await reopenCashRegisterUseCase(
      "day-1",
      { reason: "ajuste solicitado pelo financeiro" },
      "admin-1",
      { cashRegisterDayRepository: repo, safeMovementRepository },
    );

    expect(safeMovementRepository.cancel).not.toHaveBeenCalled();
  });
});
