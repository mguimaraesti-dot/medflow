import { describe, it, expect, vi } from "vitest";
import { manualAdjustmentUseCase } from "@/features/treasury/application/manual-adjustment.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("manualAdjustmentUseCase", () => {
  it("lança erro quando a organização não tem Cofre", async () => {
    const safeRepository = {
      findByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as SafeRepository;
    const safeMovementRepository = {} as SafeMovementRepository;

    await expect(
      manualAdjustmentUseCase(
        { amount: 100, reason: "Correção de saldo divergente" },
        "admin-1",
        "org-1",
        { safeRepository, safeMovementRepository },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("aceita valor negativo (ajuste para baixo)", async () => {
    const safeRepository = {
      findByOrganization: vi.fn().mockResolvedValue({ id: "safe-1" }),
    } as unknown as SafeRepository;
    const create = vi.fn().mockResolvedValue({
      id: "movement-1",
      amount: { toFixed: (n: number) => (-50).toFixed(n) },
    });
    const safeMovementRepository = {
      create,
    } as unknown as SafeMovementRepository;

    await manualAdjustmentUseCase(
      { amount: -50, reason: "Correção de saldo divergente" },
      "admin-1",
      "org-1",
      { safeRepository, safeMovementRepository },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        safeId: "safe-1",
        type: "MANUAL_ADJUSTMENT",
        amount: "-50.00",
        performedByUserId: "admin-1",
        reason: "Correção de saldo divergente",
      }),
    );
  });

  it("aceita valor positivo (ajuste para cima)", async () => {
    const safeRepository = {
      findByOrganization: vi.fn().mockResolvedValue({ id: "safe-1" }),
    } as unknown as SafeRepository;
    const create = vi.fn().mockResolvedValue({
      id: "movement-1",
      amount: { toFixed: (n: number) => (2000).toFixed(n) },
    });
    const safeMovementRepository = {
      create,
    } as unknown as SafeMovementRepository;

    await manualAdjustmentUseCase(
      { amount: 2000, reason: "Saldo inicial de bootstrap" },
      "admin-1",
      "org-1",
      { safeRepository, safeMovementRepository },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "2000.00" }),
    );
  });
});
