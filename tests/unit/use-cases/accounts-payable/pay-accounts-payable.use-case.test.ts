import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import {
  InsufficientSafeBalanceError,
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";

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
    paymentOrigin: "BANCO",
    ...overrides,
  };
}

function buildSafeRepository(balance = "1000.00") {
  return {
    getBalance: vi.fn().mockResolvedValue(new Prisma.Decimal(balance)),
  } as unknown as SafeRepository;
}

describe("payAccountsPayableUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;

    await expect(
      payAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
        safeRepository: buildSafeRepository(),
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
        safeRepository: buildSafeRepository(),
      }),
    ).rejects.toThrow(PayableAlreadyProcessedError);
  });

  it("BANCO: marca como paga com paidByUserId e paidVia 'SYSTEM' — sem tocar o Cofre", async () => {
    const payable = buildPayable();
    const markAsPaid = vi.fn().mockResolvedValue({
      ...payable,
      status: "PAID",
      paidByUserId: "user-1",
      paidVia: "SYSTEM",
      paidSafeMovementId: null,
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
      markAsPaid,
    } as unknown as AccountsPayableRepository;
    const safeRepository = buildSafeRepository();

    const result = await payAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository, safeRepository },
    );

    expect(safeRepository.getBalance).not.toHaveBeenCalled();
    expect(markAsPaid).toHaveBeenCalledWith("payable-1", {
      paidByUserId: "user-1",
      paidVia: "SYSTEM",
      paymentOrigin: "BANCO",
      amount: "150.00",
      organizationId: "org-1",
    });
    expect(result.status).toBe("PAID");
  });

  it("COFRE: com saldo suficiente, debita o Cofre e marca a conta como paga", async () => {
    const payable = buildPayable({ paymentOrigin: "COFRE" });
    const markAsPaid = vi.fn().mockResolvedValue({
      ...payable,
      status: "PAID",
      paidByUserId: "user-1",
      paidVia: "SYSTEM",
      paidSafeMovementId: "movement-1",
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
      markAsPaid,
    } as unknown as AccountsPayableRepository;
    const safeRepository = buildSafeRepository("500.00");

    const result = await payAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository, safeRepository },
    );

    expect(safeRepository.getBalance).toHaveBeenCalledWith("org-1");
    expect(markAsPaid).toHaveBeenCalledWith("payable-1", {
      paidByUserId: "user-1",
      paidVia: "SYSTEM",
      paymentOrigin: "COFRE",
      amount: "150.00",
      organizationId: "org-1",
    });
    expect(result.paidSafeMovementId).toBe("movement-1");
  });

  it("COFRE: com saldo insuficiente, lança InsufficientSafeBalanceError e nunca chama markAsPaid", async () => {
    const payable = buildPayable({ paymentOrigin: "COFRE" });
    const markAsPaid = vi.fn();
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
      markAsPaid,
    } as unknown as AccountsPayableRepository;
    const safeRepository = buildSafeRepository("100.00");

    await expect(
      payAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
        safeRepository,
      }),
    ).rejects.toThrow(InsufficientSafeBalanceError);
    expect(markAsPaid).not.toHaveBeenCalled();
  });
});
