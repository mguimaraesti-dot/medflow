import { describe, it, expect, vi } from "vitest";
import { createSupplierUseCase } from "@/features/suppliers/application/create-supplier.use-case";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";

describe("createSupplierUseCase", () => {
  it("cria o fornecedor vinculado à organização", async () => {
    const created = { id: "supplier-1", name: "Fornecedor X" };
    const create = vi.fn().mockResolvedValue(created);
    const supplierRepository = { create } as unknown as SupplierRepository;

    const result = await createSupplierUseCase(
      {
        name: "Fornecedor X",
        personType: "PESSOA_JURIDICA",
        phone: "(17) 99999-9999",
        email: undefined,
      },
      "org-1",
      { supplierRepository },
    );

    expect(create).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Fornecedor X",
      personType: "PESSOA_JURIDICA",
      phone: "(17) 99999-9999",
      email: undefined,
    });
    expect(result).toBe(created);
  });

  it("repassa documento, contato e dados opcionais quando informados", async () => {
    const created = { id: "supplier-2", name: "Distribuidora ABC" };
    const create = vi.fn().mockResolvedValue(created);
    const supplierRepository = { create } as unknown as SupplierRepository;

    await createSupplierUseCase(
      {
        name: "Distribuidora ABC",
        personType: "PESSOA_JURIDICA",
        document: "12.345.678/0001-90",
        contactName: "Maria Silva",
        phone: "(11) 98888-7777",
        email: "contato@distribuidoraabc.com",
        notes: "Cliente desde 2020",
      },
      "org-1",
      { supplierRepository },
    );

    expect(create).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Distribuidora ABC",
      personType: "PESSOA_JURIDICA",
      document: "12.345.678/0001-90",
      contactName: "Maria Silva",
      phone: "(11) 98888-7777",
      email: "contato@distribuidoraabc.com",
      notes: "Cliente desde 2020",
    });
  });
});
