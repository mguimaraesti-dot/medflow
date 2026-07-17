import { describe, it, expect, vi } from "vitest";
import { requestSangriaUseCase } from "@/features/treasury/application/request-sangria.use-case";
import {
  CashRegisterNotOpenError,
  NotFoundError,
  PendingHandoffExistsError,
} from "@/core/errors/domain-error";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

/** Nenhum `CASH_REGISTER_HANDOFF` `PENDING` — mesmo shape de `PaginatedResult` que o repositório real devolveria. */
function noPendingHandoffs() {
  return { items: [], page: 1, pageSize: 1, total: 0, totalPages: 1 };
}

describe("requestSangriaUseCase", () => {
  it("recusa sangria quando já existe handoff PENDING (rede de segurança contra duplicação)", async () => {
    const list = vi.fn().mockResolvedValue({
      items: [{ id: "handoff-1" }],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    const safeMovementRepository = {
      list,
    } as unknown as SafeMovementRepository;
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn(),
    } as unknown as CashRegisterDayRepository;
    const safeRepository = {} as SafeRepository;

    await expect(
      requestSangriaUseCase({ amount: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository,
        safeRepository,
        safeMovementRepository,
      }),
    ).rejects.toThrow(PendingHandoffExistsError);

    expect(list).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        types: ["CASH_REGISTER_HANDOFF"],
        status: "PENDING",
      },
      { page: 1, pageSize: 1 },
    );
    // Não deve nem chegar a checar se há caixa aberto.
    expect(
      cashRegisterDayRepository.findOpenByOrganization,
    ).not.toHaveBeenCalled();
  });

  it("bloqueia sangria quando não há caixa aberto", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const safeRepository = {} as SafeRepository;
    const safeMovementRepository = {
      list: vi.fn().mockResolvedValue(noPendingHandoffs()),
    } as unknown as SafeMovementRepository;

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
    const safeMovementRepository = {
      list: vi.fn().mockResolvedValue(noPendingHandoffs()),
    } as unknown as SafeMovementRepository;

    await expect(
      requestSangriaUseCase({ amount: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository,
        safeRepository,
        safeMovementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("cria a movimentação de sangria vinculada ao caixa aberto (sem handoff pendente)", async () => {
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
      list: vi.fn().mockResolvedValue(noPendingHandoffs()),
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
