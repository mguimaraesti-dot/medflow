import { describe, it, expect, vi } from "vitest";
import { cancelSafeMovementUseCase } from "@/features/treasury/application/cancel-safe-movement.use-case";
import {
  NotFoundError,
  SafeMovementNotPendingError,
} from "@/core/errors/domain-error";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

function buildMovement(overrides: Record<string, unknown> = {}) {
  return {
    id: "movement-1",
    organizationId: "org-1",
    status: "PENDING",
    amount: { toFixed: () => "2450.00" },
    ...overrides,
  };
}

const input = { reason: "Divergência encontrada na contagem física" };

describe("cancelSafeMovementUseCase", () => {
  it("lança NotFoundError quando a movimentação não existe ou é de outra organização", async () => {
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as SafeMovementRepository;

    await expect(
      cancelSafeMovementUseCase("movement-1", input, "manager-1", "org-1", {
        safeMovementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança SafeMovementNotPendingError quando já não está PENDING", async () => {
    const movement = buildMovement({ status: "CANCELLED" });
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
    } as unknown as SafeMovementRepository;

    await expect(
      cancelSafeMovementUseCase("movement-1", input, "manager-1", "org-1", {
        safeMovementRepository,
      }),
    ).rejects.toThrow(SafeMovementNotPendingError);
  });

  it("cancela quando PENDING, gravando o motivo", async () => {
    const movement = buildMovement();
    const cancelled = buildMovement({ status: "CANCELLED" });
    const cancel = vi.fn().mockResolvedValue(cancelled);
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
      cancel,
    } as unknown as SafeMovementRepository;

    const result = await cancelSafeMovementUseCase(
      "movement-1",
      input,
      "manager-1",
      "org-1",
      { safeMovementRepository },
    );

    expect(cancel).toHaveBeenCalledWith(
      "movement-1",
      "manager-1",
      input.reason,
    );
    expect(result.status).toBe("CANCELLED");
  });
});
