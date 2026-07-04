import { describe, it, expect, vi } from "vitest";
import { createSupplierUseCase } from "@/features/suppliers/application/create-supplier.use-case";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";

describe("createSupplierUseCase", () => {
  it("cria o fornecedor vinculado à organização", async () => {
    const created = { id: "supplier-1", name: "Fornecedor X" };
    const create = vi.fn().mockResolvedValue(created);
    const supplierRepository = { create } as unknown as SupplierRepository;

    const result = await createSupplierUseCase(
      { name: "Fornecedor X" },
      "org-1",
      { supplierRepository },
    );

    expect(create).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Fornecedor X",
    });
    expect(result).toBe(created);
  });
});
