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

  it("repassa contato e telefone opcionais quando informados", async () => {
    const created = { id: "supplier-2", name: "Distribuidora ABC" };
    const create = vi.fn().mockResolvedValue(created);
    const supplierRepository = { create } as unknown as SupplierRepository;

    await createSupplierUseCase(
      {
        name: "Distribuidora ABC",
        document: "12.345.678/0001-90",
        contactName: "Maria Silva",
        phone: "(11) 98888-7777",
      },
      "org-1",
      { supplierRepository },
    );

    expect(create).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Distribuidora ABC",
      document: "12.345.678/0001-90",
      contactName: "Maria Silva",
      phone: "(11) 98888-7777",
    });
  });
});
