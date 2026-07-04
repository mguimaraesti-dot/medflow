import { describe, it, expect, vi } from "vitest";
import { listSuppliersUseCase } from "@/features/suppliers/application/list-suppliers.use-case";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";

describe("listSuppliersUseCase", () => {
  it("delega ao repositório com o organizationId", async () => {
    const suppliers = [{ id: "supplier-1", name: "Fornecedor X" }];
    const listActive = vi.fn().mockResolvedValue(suppliers);
    const supplierRepository = { listActive } as unknown as SupplierRepository;

    const result = await listSuppliersUseCase("org-1", { supplierRepository });

    expect(listActive).toHaveBeenCalledWith("org-1");
    expect(result).toBe(suppliers);
  });
});
