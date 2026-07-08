import { describe, it, expect, vi } from "vitest";
import { createAccountsPayableUseCase } from "@/features/accounts-payable/application/create-accounts-payable.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("createAccountsPayableUseCase", () => {
  it("cria a conta com os dados convertidos e vinculados à organização", async () => {
    const created = { id: "payable-1", description: "Aluguel" };
    const create = vi.fn().mockResolvedValue(created);
    const accountsPayableRepository = {
      create,
    } as unknown as AccountsPayableRepository;

    const dueDate = new Date("2026-08-05T00:00:00.000Z");
    const result = await createAccountsPayableUseCase(
      {
        supplierId: "supplier-1",
        categoryId: "cat-1",
        description: "Aluguel",
        amount: 2000,
        dueDate,
        paymentOrigin: "BANCO",
      },
      "user-1",
      "org-1",
      { accountsPayableRepository },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        supplierId: "supplier-1",
        categoryId: "cat-1",
        description: "Aluguel",
        amount: "2000.00",
        dueDate,
        createdByUserId: "user-1",
      }),
    );
    expect(result).toBe(created);
  });
});
