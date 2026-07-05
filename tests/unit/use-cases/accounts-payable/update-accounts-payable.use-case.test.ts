import { describe, it, expect, vi } from "vitest";
import { updateAccountsPayableUseCase } from "@/features/accounts-payable/application/update-accounts-payable.use-case";
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
    supplierId: "supplier-old",
    categoryId: "cat-old",
    description: "Antigo",
    dueDate: new Date("2026-07-05T00:00:00.000Z"),
    recurringBillId: null,
    occurrenceNumber: null,
    ...overrides,
  };
}

const baseInput = {
  supplierId: "supplier-new",
  categoryId: "cat-new",
  description: "Novo",
  dueDate: new Date("2026-08-05T00:00:00.000Z"),
  scope: "SINGLE" as const,
};

describe("updateAccountsPayableUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;

    await expect(
      updateAccountsPayableUseCase("payable-1", baseInput, "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia edição de conta já paga ou cancelada", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(buildPayable({ status: "PAID" })),
    } as unknown as AccountsPayableRepository;

    await expect(
      updateAccountsPayableUseCase("payable-1", baseInput, "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableAlreadyProcessedError);
  });

  it("scope SINGLE não altera outras ocorrências, mesmo pertencendo a uma recorrência", async () => {
    const payable = buildPayable({
      recurringBillId: "recurring-1",
      occurrenceNumber: 1,
    });
    const update = vi.fn().mockResolvedValue({ ...payable, ...baseInput });
    const listByRecurringBill = vi.fn();
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
      update,
      listByRecurringBill,
    } as unknown as AccountsPayableRepository;

    await updateAccountsPayableUseCase(
      "payable-1",
      baseInput,
      "user-1",
      "org-1",
      { accountsPayableRepository },
    );

    expect(update).toHaveBeenCalledTimes(1);
    expect(listByRecurringBill).not.toHaveBeenCalled();
  });

  it("scope SERIES propaga fornecedor/categoria/descrição às próximas PENDENTES, sem mexer no vencimento delas nem em ocorrências pagas/canceladas", async () => {
    const payable = buildPayable({
      recurringBillId: "recurring-1",
      occurrenceNumber: 1,
    });
    const siblingDueDate2 = new Date("2026-09-05T00:00:00.000Z");
    const siblings = [
      payable,
      {
        id: "payable-2",
        status: "PENDING",
        occurrenceNumber: 2,
        dueDate: siblingDueDate2,
      },
      {
        id: "payable-3",
        status: "PAID",
        occurrenceNumber: 3,
        dueDate: new Date("2026-10-05T00:00:00.000Z"),
      },
    ];
    const update = vi.fn().mockResolvedValue({ ...payable, ...baseInput });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
      update,
      listByRecurringBill: vi.fn().mockResolvedValue(siblings),
    } as unknown as AccountsPayableRepository;

    await updateAccountsPayableUseCase(
      "payable-1",
      { ...baseInput, scope: "SERIES" },
      "user-1",
      "org-1",
      { accountsPayableRepository },
    );

    // 1x pra esta ocorrência + 1x pra ocorrência 2 (PENDENTE) — nunca pra 3 (PAID)
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith("payable-2", {
      supplierId: "supplier-new",
      categoryId: "cat-new",
      description: "Novo",
      dueDate: siblingDueDate2,
    });
  });
});
