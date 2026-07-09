import { describe, it, expect, vi } from "vitest";
import { confirmSafeMovementUseCase } from "@/features/treasury/application/confirm-safe-movement.use-case";
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

describe("confirmSafeMovementUseCase", () => {
  it("lança NotFoundError quando a movimentação não existe ou é de outra organização", async () => {
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as SafeMovementRepository;

    await expect(
      confirmSafeMovementUseCase("movement-1", "manager-1", "org-1", {
        safeMovementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança NotFoundError quando a movimentação pertence a outra organização", async () => {
    const movement = buildMovement({ organizationId: "org-2" });
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
    } as unknown as SafeMovementRepository;

    await expect(
      confirmSafeMovementUseCase("movement-1", "manager-1", "org-1", {
        safeMovementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança SafeMovementNotPendingError quando já não está PENDING", async () => {
    const movement = buildMovement({ status: "CONFIRMED" });
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
    } as unknown as SafeMovementRepository;

    await expect(
      confirmSafeMovementUseCase("movement-1", "manager-1", "org-1", {
        safeMovementRepository,
      }),
    ).rejects.toThrow(SafeMovementNotPendingError);
  });

  it("confirma quando PENDING e da organização correta", async () => {
    const movement = buildMovement();
    const confirmed = buildMovement({ status: "CONFIRMED" });
    const confirm = vi.fn().mockResolvedValue(confirmed);
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
      confirm,
    } as unknown as SafeMovementRepository;

    const result = await confirmSafeMovementUseCase(
      "movement-1",
      "manager-1",
      "org-1",
      { safeMovementRepository },
    );

    expect(confirm).toHaveBeenCalledWith("movement-1", "manager-1");
    expect(result.status).toBe("CONFIRMED");
  });
});
