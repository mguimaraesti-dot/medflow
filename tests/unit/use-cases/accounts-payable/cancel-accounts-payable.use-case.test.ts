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

  it("bloqueia cancelar uma conta já cancelada", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "CANCELLED",
      }),
    } as unknown as AccountsPayableRepository;

    await expect(
      cancelAccountsPayableUseCase("payable-1", "user-1", "org-1", {
        accountsPayableRepository,
      }),
    ).rejects.toThrow(PayableAlreadyProcessedError);
  });

  it("cancela uma conta PAGA com sucesso (correção pontual)", async () => {
    const cancel = vi.fn().mockResolvedValue({
      id: "payable-1",
      status: "CANCELLED",
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PAID",
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

  it("cancelar uma conta PAGA com scope SERIES não encerra a recorrência", async () => {
    const cancel = vi.fn().mockResolvedValue({
      id: "payable-1",
      status: "CANCELLED",
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PAID",
        recurringBillId: "recurring-1",
      }),
      cancel,
      listByRecurringBill: vi.fn(),
    } as unknown as AccountsPayableRepository;
    const deactivate = vi.fn();
    const recurringBillRepository = {
      deactivate,
    } as unknown as import("@/features/recurring-bills/domain/recurring-bill.repository").RecurringBillRepository;

    await cancelAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository, recurringBillRepository },
      { scope: "SERIES" },
    );

    expect(deactivate).not.toHaveBeenCalled();
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

  it("scope SINGLE numa conta recorrente não mexe na recorrência nem nas outras ocorrências", async () => {
    const cancel = vi.fn().mockResolvedValue({
      id: "payable-1",
      status: "CANCELLED",
    });
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PENDING",
        recurringBillId: "recurring-1",
      }),
      cancel,
      listByRecurringBill: vi.fn(),
    } as unknown as AccountsPayableRepository;
    const deactivate = vi.fn();
    const recurringBillRepository = {
      deactivate,
    } as unknown as import("@/features/recurring-bills/domain/recurring-bill.repository").RecurringBillRepository;

    await cancelAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository, recurringBillRepository },
      { scope: "SINGLE" },
    );

    expect(deactivate).not.toHaveBeenCalled();
  });

  it("scope SERIES encerra a recorrência e cancela as outras ocorrências PENDENTES, sem tocar nas pagas", async () => {
    const cancel = vi.fn().mockResolvedValue({
      id: "payable-1",
      status: "CANCELLED",
    });
    const siblings = [
      { id: "payable-1", status: "PENDING" },
      { id: "payable-2", status: "PENDING" },
      { id: "payable-3", status: "PAID" },
    ];
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "payable-1",
        organizationId: "org-1",
        status: "PENDING",
        recurringBillId: "recurring-1",
      }),
      cancel,
      listByRecurringBill: vi.fn().mockResolvedValue(siblings),
    } as unknown as AccountsPayableRepository;
    const deactivate = vi.fn().mockResolvedValue({ id: "recurring-1" });
    const recurringBillRepository = {
      deactivate,
    } as unknown as import("@/features/recurring-bills/domain/recurring-bill.repository").RecurringBillRepository;

    await cancelAccountsPayableUseCase(
      "payable-1",
      "user-1",
      "org-1",
      { accountsPayableRepository, recurringBillRepository },
      { scope: "SERIES" },
    );

    expect(deactivate).toHaveBeenCalledWith("recurring-1");
    expect(cancel).toHaveBeenCalledWith("payable-1");
    expect(cancel).toHaveBeenCalledWith("payable-2");
    expect(cancel).not.toHaveBeenCalledWith("payable-3");
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
