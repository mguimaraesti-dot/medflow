import { describe, it, expect, vi } from "vitest";
import { listSuppliersUseCase } from "@/features/suppliers/application/list-suppliers.use-case";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";

describe("listSuppliersUseCase", () => {
  it("delega ao repositório com o organizationId e mescla ativos/inativos sem contagem", async () => {
    const suppliers = [
      { id: "supplier-1", name: "Fornecedor X", active: true },
      { id: "supplier-2", name: "Fornecedor Y", active: false },
    ];
    const list = vi.fn().mockResolvedValue(suppliers);
    const countLinkedRecordsByOrganization = vi
      .fn()
      .mockResolvedValue(new Map());
    const supplierRepository = {
      list,
      countLinkedRecordsByOrganization,
    } as unknown as SupplierRepository;

    const result = await listSuppliersUseCase("org-1", { supplierRepository });

    expect(list).toHaveBeenCalledWith("org-1");
    expect(countLinkedRecordsByOrganization).toHaveBeenCalledWith("org-1");
    expect(result).toEqual([
      {
        id: "supplier-1",
        name: "Fornecedor X",
        active: true,
        accountsPayableCount: 0,
        hasLinkedRecurringBills: false,
      },
      {
        id: "supplier-2",
        name: "Fornecedor Y",
        active: false,
        accountsPayableCount: 0,
        hasLinkedRecurringBills: false,
      },
    ]);
  });

  it("mescla a contagem de vínculos por supplierId quando existir", async () => {
    const suppliers = [
      { id: "supplier-1", name: "Fornecedor X", active: true },
    ];
    const list = vi.fn().mockResolvedValue(suppliers);
    const countLinkedRecordsByOrganization = vi
      .fn()
      .mockResolvedValue(
        new Map([["supplier-1", { accountsPayable: 3, recurringBills: 1 }]]),
      );
    const supplierRepository = {
      list,
      countLinkedRecordsByOrganization,
    } as unknown as SupplierRepository;

    const [result] = await listSuppliersUseCase("org-1", {
      supplierRepository,
    });

    expect(result.accountsPayableCount).toBe(3);
    expect(result.hasLinkedRecurringBills).toBe(true);
  });
});
