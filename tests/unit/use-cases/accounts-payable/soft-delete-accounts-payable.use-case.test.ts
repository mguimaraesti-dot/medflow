import { describe, it, expect, vi } from "vitest";
import { softDeleteAccountsPayableUseCase } from "@/features/accounts-payable/application/soft-delete-accounts-payable.use-case";
import {
  NotFoundError,
  PayableAlreadyDeletedError,
  PayableCannotBeDeletedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("softDeleteAccountsPayableUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;

    await expect(
      softDeleteAccountsPayableUseCase("payable-1", {}, "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia excluir uma conta já excluída", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PENDING",
        deletedAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
    } as unknown as AccountsPayableRepository;

    await expect(
      softDeleteAccountsPayableUseCase("payable-1", {}, "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableAlreadyDeletedError);
  });

  it("bloqueia excluir uma conta paga", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PAID",
        deletedAt: null,
      }),
    } as unknown as AccountsPayableRepository;

    await expect(
      softDeleteAccountsPayableUseCase("payable-1", {}, "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableCannotBeDeletedError);
  });

  it("bloqueia excluir uma conta cancelada", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "CANCELLED",
        deletedAt: null,
      }),
    } as unknown as AccountsPayableRepository;

    await expect(
      softDeleteAccountsPayableUseCase("payable-1", {}, "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableCannotBeDeletedError);
  });

  it("exclui (soft delete) uma conta pendente com sucesso, sem remover a linha", async () => {
    const softDelete = vi.fn().mockResolvedValue({
      id: "payable-1",
      status: "PENDING",
      deletedAt: new Date("2026-07-10T00:00:00.000Z"),
      deletedByUserId: "user-1",
      deletionReason: "Duplicidade de cadastro",
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PENDING",
        deletedAt: null,
      }),
      softDelete,
    } as unknown as AccountsPayableRepository;

    const result = await softDeleteAccountsPayableUseCase(
      "payable-1",
      { reason: "Duplicidade de cadastro" },
      "user-1",
      "org-1",
      { accountsPayableRepository },
    );

    expect(softDelete).toHaveBeenCalledWith("payable-1", {
      deletedByUserId: "user-1",
      deletionReason: "Duplicidade de cadastro",
    });
    expect(result.deletedAt).not.toBeNull();
  });
});
