import { describe, it, expect, vi } from "vitest";
import { updateSupplierUseCase } from "@/features/suppliers/application/update-supplier.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";

function buildSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: "supplier-1",
    organizationId: "org-1",
    name: "Fornecedor X",
    personType: "PESSOA_JURIDICA",
    document: null,
    contactName: null,
    phone: "(17) 99999-9999",
    email: null,
    notes: null,
    active: true,
    ...overrides,
  };
}

const input = {
  name: "Fornecedor X Atualizado",
  personType: "PESSOA_JURIDICA" as const,
  phone: "(11) 98888-7777",
  email: undefined,
};

describe("updateSupplierUseCase", () => {
  it("bloqueia quando o beneficiário não existe ou é de outra organização", async () => {
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as SupplierRepository;

    await expect(
      updateSupplierUseCase("supplier-1", input, "org-1", {
        supplierRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("atualiza os campos editáveis sem tocar active", async () => {
    const supplier = buildSupplier();
    const update = vi.fn().mockResolvedValue({ ...supplier, ...input });
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(supplier),
      update,
    } as unknown as SupplierRepository;

    const result = await updateSupplierUseCase("supplier-1", input, "org-1", {
      supplierRepository,
    });

    expect(update).toHaveBeenCalledWith("supplier-1", input);
    expect(result.name).toBe("Fornecedor X Atualizado");
  });
});
