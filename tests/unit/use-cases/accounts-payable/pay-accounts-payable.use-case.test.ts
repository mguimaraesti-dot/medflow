import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
  CashRegisterNotOpenError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

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
    const cashRegisterDayRepository = {} as CashRegisterDayRepository;

    await expect(
      payAccountsPayableUseCase(
        "payable-1",
        { paymentMethodId: "pm-1" },
        "user-1",
        "org-1",
        { accountsPayableRepository, cashRegisterDayRepository },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia quando a conta já foi paga ou cancelada", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(buildPayable({ status: "PAID" })),
    } as unknown as AccountsPayableRepository;
    const cashRegisterDayRepository = {} as CashRegisterDayRepository;

    await expect(
      payAccountsPayableUseCase(
        "payable-1",
        { paymentMethodId: "pm-1" },
        "user-1",
        "org-1",
        { accountsPayableRepository, cashRegisterDayRepository },
      ),
    ).rejects.toThrow(PayableAlreadyProcessedError);
  });

  it("bloqueia quando não há caixa aberto hoje", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(buildPayable()),
    } as unknown as AccountsPayableRepository;
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;

    await expect(
      payAccountsPayableUseCase(
        "payable-1",
        { paymentMethodId: "pm-1" },
        "user-1",
        "org-1",
        { accountsPayableRepository, cashRegisterDayRepository },
      ),
    ).rejects.toThrow(CashRegisterNotOpenError);
  });

  it("monta o CreateCashFlowEntryInput corretamente ao pagar com sucesso", async () => {
    const payable = buildPayable();
    const markAsPaid = vi.fn().mockResolvedValue({
      payable: { ...payable, status: "PAID" },
      cashFlowEntry: { id: "entry-1" },
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
      markAsPaid,
    } as unknown as AccountsPayableRepository;
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue({ id: "day-1" }),
    } as unknown as CashRegisterDayRepository;

    const result = await payAccountsPayableUseCase(
      "payable-1",
      { paymentMethodId: "pm-1" },
      "user-1",
      "org-1",
      { accountsPayableRepository, cashRegisterDayRepository },
    );

    expect(markAsPaid).toHaveBeenCalledWith("payable-1", {
      paidByUserId: "user-1",
      cashFlowEntry: {
        organizationId: "org-1",
        cashRegisterDayId: "day-1",
        type: "OUT",
        amount: "150.00",
        description: "Aluguel",
        categoryId: "cat-1",
        paymentMethodId: "pm-1",
        accountsPayableId: "payable-1",
        createdByUserId: "user-1",
      },
    });
    expect(result.status).toBe("PAID");
  });
});
