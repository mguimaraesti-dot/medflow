import { describe, it, expect, vi } from "vitest";
import { listAccountsPayableUseCase } from "@/features/accounts-payable/application/list-accounts-payable.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

describe("listAccountsPayableUseCase", () => {
  it("repassa paymentOrigin e excludeCancelled pro repositório (Relatório de Contas a Pagar consolidado)", async () => {
    const list = vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const accountsPayableRepository = {
      list,
    } as unknown as AccountsPayableRepository;

    await listAccountsPayableUseCase(
      {
        page: 1,
        pageSize: 20,
        paymentOrigin: "COFRE",
        excludeCancelled: true,
      },
      "org-1",
      { accountsPayableRepository },
    );

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        paymentOrigin: "COFRE",
        excludeCancelled: true,
      }),
      { page: 1, pageSize: 20 },
    );
  });

  it("não envia paymentOrigin/excludeCancelled quando não informados", async () => {
    const list = vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const accountsPayableRepository = {
      list,
    } as unknown as AccountsPayableRepository;

    await listAccountsPayableUseCase({ page: 1, pageSize: 20 }, "org-1", {
      accountsPayableRepository,
    });

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentOrigin: undefined,
        excludeCancelled: undefined,
      }),
      { page: 1, pageSize: 20 },
    );
  });
});
