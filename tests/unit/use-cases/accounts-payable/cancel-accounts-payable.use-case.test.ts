import { describe, it, expect, vi } from "vitest";
import { cancelAccountsPayableUseCase } from "@/features/accounts-payable/application/cancel-accounts-payable.use-case";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("cancelAccountsPayableUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;

    await expect(
      cancelAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia cancelar uma conta já paga", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PAID",
      }),
    } as unknown as AccountsPayableRepository;

    await expect(
      cancelAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableAlreadyProcessedError);
  });

  it("cancela uma conta pendente com sucesso", async () => {
    const cancel = vi.fn().mockResolvedValue({
      id: "payable-1",
      status: "CANCELLED",
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PENDING",
      }),
      cancel,
    } as unknown as AccountsPayableRepository;

    const result = await cancelAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository },
    );

    expect(cancel).toHaveBeenCalledWith("payable-1");
    expect(result.status).toBe("CANCELLED");
  });
});
