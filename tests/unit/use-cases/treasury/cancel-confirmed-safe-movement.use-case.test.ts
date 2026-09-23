import { describe, it, expect, vi } from "vitest";
import { cancelConfirmedSafeMovementUseCase } from "@/features/treasury/application/cancel-confirmed-safe-movement.use-case";
import {
  NotFoundError,
  SafeMovementNotConfirmedError,
  SafeMovementTypeNotCancellableError,
} from "@/core/errors/domain-error";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

function buildMovement(overrides: Record<string, unknown> = {}) {
  return {
    id: "movement-1",
    organizationId: "org-1",
    type: "SANGRIA",
    status: "CONFIRMED",
    amount: { toFixed: () => "1100000.00" },
    ...overrides,
  };
}

const input = {
  reason:
    "Erro de digitação: valor deveria ser R$ 1.100,00, não R$ 1.100.000,00",
};

describe("cancelConfirmedSafeMovementUseCase", () => {
  it("lança NotFoundError quando a movimentação não existe ou é de outra organização", async () => {
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as SafeMovementRepository;

    await expect(
      cancelConfirmedSafeMovementUseCase(
        "movement-1",
        input,
        "admin-1",
        "org-1",
        { safeMovementRepository },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança NotFoundError quando a movimentação pertence a outra organização", async () => {
    const movement = buildMovement({ organizationId: "org-2" });
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
    } as unknown as SafeMovementRepository;

    await expect(
      cancelConfirmedSafeMovementUseCase(
        "movement-1",
        input,
        "admin-1",
        "org-1",
        { safeMovementRepository },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança SafeMovementNotConfirmedError quando ainda está PENDING (fluxo é o cancel-safe-movement, não este)", async () => {
    const movement = buildMovement({ status: "PENDING" });
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
    } as unknown as SafeMovementRepository;

    await expect(
      cancelConfirmedSafeMovementUseCase(
        "movement-1",
        input,
        "admin-1",
        "org-1",
        { safeMovementRepository },
      ),
    ).rejects.toThrow(SafeMovementNotConfirmedError);
  });

  it("lança SafeMovementNotConfirmedError quando já está CANCELLED (não permite cancelar duas vezes)", async () => {
    const movement = buildMovement({ status: "CANCELLED" });
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
    } as unknown as SafeMovementRepository;

    await expect(
      cancelConfirmedSafeMovementUseCase(
        "movement-1",
        input,
        "admin-1",
        "org-1",
        { safeMovementRepository },
      ),
    ).rejects.toThrow(SafeMovementNotConfirmedError);
  });

  it.each(["FUNDING", "CASH_REGISTER_HANDOFF", "ACCOUNTS_PAYABLE_PAYMENT"])(
    "lança SafeMovementTypeNotCancellableError para tipo %s (efeito colateral em outra entidade)",
    async (type) => {
      const movement = buildMovement({ type });
      const safeMovementRepository = {
        findById: vi.fn().mockResolvedValue(movement),
      } as unknown as SafeMovementRepository;

      await expect(
        cancelConfirmedSafeMovementUseCase(
          "movement-1",
          input,
          "admin-1",
          "org-1",
          { safeMovementRepository },
        ),
      ).rejects.toThrow(SafeMovementTypeNotCancellableError);
    },
  );

  it("cancela uma SANGRIA confirmada, gravando o motivo", async () => {
    const movement = buildMovement();
    const cancelled = buildMovement({ status: "CANCELLED" });
    const cancel = vi.fn().mockResolvedValue(cancelled);
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
      cancel,
    } as unknown as SafeMovementRepository;

    const result = await cancelConfirmedSafeMovementUseCase(
      "movement-1",
      input,
      "admin-1",
      "org-1",
      { safeMovementRepository },
    );

    expect(cancel).toHaveBeenCalledWith("movement-1", "admin-1", input.reason);
    expect(result.status).toBe("CANCELLED");
  });

  it("cancela um MANUAL_ADJUSTMENT confirmado", async () => {
    const movement = buildMovement({ type: "MANUAL_ADJUSTMENT" });
    const cancelled = buildMovement({
      type: "MANUAL_ADJUSTMENT",
      status: "CANCELLED",
    });
    const cancel = vi.fn().mockResolvedValue(cancelled);
    const safeMovementRepository = {
      findById: vi.fn().mockResolvedValue(movement),
      cancel,
    } as unknown as SafeMovementRepository;

    const result = await cancelConfirmedSafeMovementUseCase(
      "movement-1",
      input,
      "admin-1",
      "org-1",
      { safeMovementRepository },
    );

    expect(result.status).toBe("CANCELLED");
  });
});
