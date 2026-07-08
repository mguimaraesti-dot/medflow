import { describe, it, expect, vi } from "vitest";
import { setSupplierActiveUseCase } from "@/features/suppliers/application/set-supplier-active.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
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

describe("setSupplierActiveUseCase", () => {
  it("bloqueia quando o beneficiário não existe ou é de outra organização", async () => {
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as SupplierRepository;

    await expect(
      setSupplierActiveUseCase("supplier-1", false, "org-1", {
        supplierRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("inativa sem exigir vínculo zerado — nunca afeta histórico", async () => {
    const supplier = buildSupplier();
    const setActive = vi.fn().mockResolvedValue({ ...supplier, active: false });
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(supplier),
      setActive,
    } as unknown as SupplierRepository;

    const result = await setSupplierActiveUseCase(
      "supplier-1",
      false,
      "org-1",
      { supplierRepository },
    );

    expect(setActive).toHaveBeenCalledWith("supplier-1", false);
    expect(result.active).toBe(false);
  });

  it("reativa normalmente", async () => {
    const supplier = buildSupplier({ active: false });
    const setActive = vi.fn().mockResolvedValue({ ...supplier, active: true });
    const supplierRepository = {
      findById: vi.fn().mockResolvedValue(supplier),
      setActive,
    } as unknown as SupplierRepository;

    const result = await setSupplierActiveUseCase("supplier-1", true, "org-1", {
      supplierRepository,
    });

    expect(setActive).toHaveBeenCalledWith("supplier-1", true);
    expect(result.active).toBe(true);
  });
});
