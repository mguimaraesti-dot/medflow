import { describe, it, expect, vi } from "vitest";
import { restoreAccountsPayableUseCase } from "@/features/accounts-payable/application/restore-accounts-payable.use-case";
import {
  NotFoundError,
  PayableNotDeletedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("restoreAccountsPayableUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;

    await expect(
      restoreAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia restaurar uma conta que não está excluída", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        deletedAt: null,
      }),
    } as unknown as AccountsPayableRepository;

    await expect(
      restoreAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableNotDeletedError);
  });

  it("restaura uma conta excluída com sucesso", async () => {
    const restore = vi.fn().mockResolvedValue({
      id: "payable-1",
      status: "PENDING",
      deletedAt: null,
      deletedByUserId: null,
      deletionReason: null,
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        deletedAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
      restore,
    } as unknown as AccountsPayableRepository;

    const result = await restoreAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository },
    );

    expect(restore).toHaveBeenCalledWith("payable-1");
    expect(result.deletedAt).toBeNull();
  });
});
