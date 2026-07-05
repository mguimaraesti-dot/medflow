import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

function buildPayable(overrides: Record<string, unknown> = {}) {
  return {
    id: "payable-1",
    organizationId: "org-1",
    status: "PENDING",
    amount: new Prisma.Decimal("150.00"),
    description: "Aluguel",
    categoryId: "cat-1",
    ...overrides,
  };
}

describe("payAccountsPayableUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;

    await expect(
      payAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia quando a conta já foi paga ou cancelada", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(buildPayable({ status: "PAID" })),
    } as unknown as AccountsPayableRepository;

    await expect(
      payAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableAlreadyProcessedError);
  });

  it("marca como paga com paidByUserId e paidVia 'SYSTEM' — sem caixa nem forma de pagamento", async () => {
    const payable = buildPayable();
    const markAsPaid = vi.fn().mockResolvedValue({
      ...payable,
      status: "PAID",
      paidByUserId: "user-1",
      paidVia: "SYSTEM",
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
      markAsPaid,
    } as unknown as AccountsPayableRepository;

    const result = await payAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository },
    );

    expect(markAsPaid).toHaveBeenCalledWith("payable-1", {
      paidByUserId: "user-1",
      paidVia: "SYSTEM",
    });
    expect(result.status).toBe("PAID");
  });
});
