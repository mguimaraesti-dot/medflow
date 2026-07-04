import { describe, it, expect, vi } from "vitest";
import { requestSangriaUseCase } from "@/features/treasury/application/request-sangria.use-case";
import {
  CashRegisterNotOpenError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("requestSangriaUseCase", () => {
  it("bloqueia sangria quando não há caixa aberto", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const safeRepository = {} as SafeRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    await expect(
      requestSangriaUseCase({ amount: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository,
        safeRepository,
        safeMovementRepository,
      }),
    ).rejects.toThrow(CashRegisterNotOpenError);
  });

  it("lança erro quando a organização não tem Cofre", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue({ id: "day-1" }),
    } as unknown as CashRegisterDayRepository;
    const safeRepository = {
      findByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as SafeRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    await expect(
      requestSangriaUseCase({ amount: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository,
        safeRepository,
        safeMovementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("cria a movimentação de sangria vinculada ao caixa aberto", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue({ id: "day-1" }),
    } as unknown as CashRegisterDayRepository;
    const safeRepository = {
      findByOrganization: vi.fn().mockResolvedValue({ id: "safe-1" }),
    } as unknown as SafeRepository;
    const create = vi.fn().mockResolvedValue({
      id: "movement-1",
      amount: { toFixed: (n: number) => (100).toFixed(n) },
    });
    const safeMovementRepository = {
      create,
    } as unknown as SafeMovementRepository;

    await requestSangriaUseCase(
      { amount: 100, reason: "Excesso de dinheiro na gaveta" },
      "user-1",
      "org-1",
      { cashRegisterDayRepository, safeRepository, safeMovementRepository },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        safeId: "safe-1",
        type: "SANGRIA",
        amount: "100.00",
        relatedCashRegisterDayId: "day-1",
        performedByUserId: "user-1",
        reason: "Excesso de dinheiro na gaveta",
      }),
    );
  });
});
