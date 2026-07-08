import { describe, it, expect, vi } from "vitest";
import { deleteSupplierUseCase } from "@/features/suppliers/application/delete-supplier.use-case";
import {
  NotFoundError,
  SupplierHasLinkedRecordsError,
} from "@/core/errors/domain-error";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";

function buildSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: "supplier-1",
    organizationId: "org-1",
    name: "Fornecedor X",
    active: true,
    ...overrides,
  };
}

describe("deleteSupplierUseCase", () => {
  it("bloqueia quando o beneficiário não existe ou é de outra organização", async () => {
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as SupplierRepository;

    await expect(
      deleteSupplierUseCase("supplier-1", "org-1", { supplierRepository }),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança SupplierHasLinkedRecordsError e nunca exclui quando existe Conta a Pagar vinculada", async () => {
    const supplier = buildSupplier();
    const deleteFn = vi.fn();
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(supplier),
      countLinkedRecords: vi
        .fn()
        .mockResolvedValue({ accountsPayable: 3, recurringBills: 0 }),
      delete: deleteFn,
    } as unknown as SupplierRepository;

    await expect(
      deleteSupplierUseCase("supplier-1", "org-1", { supplierRepository }),
    ).rejects.toThrow(SupplierHasLinkedRecordsError);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("lança SupplierHasLinkedRecordsError quando só existe Recorrência vinculada (sem conta avulsa)", async () => {
    const supplier = buildSupplier();
    const deleteFn = vi.fn();
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(supplier),
      countLinkedRecords: vi
        .fn()
        .mockResolvedValue({ accountsPayable: 0, recurringBills: 1 }),
      delete: deleteFn,
    } as unknown as SupplierRepository;

    await expect(
      deleteSupplierUseCase("supplier-1", "org-1", { supplierRepository }),
    ).rejects.toThrow(SupplierHasLinkedRecordsError);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("exclui quando não existe nenhum vínculo", async () => {
    const supplier = buildSupplier();
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(supplier),
      countLinkedRecords: vi
        .fn()
        .mockResolvedValue({ accountsPayable: 0, recurringBills: 0 }),
      delete: deleteFn,
    } as unknown as SupplierRepository;

    await deleteSupplierUseCase("supplier-1", "org-1", { supplierRepository });

    expect(deleteFn).toHaveBeenCalledWith("supplier-1");
  });
});
