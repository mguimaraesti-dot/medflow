import { describe, it, expect, vi } from "vitest";
import { createRecurringBillUseCase } from "@/features/recurring-bills/application/create-recurring-bill.use-case";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";

describe("createRecurringBillUseCase", () => {
  it("converte o valor pra string decimal fixa antes de persistir", async () => {
    const created = { id: "bill-1" };
    const create = vi.fn().mockResolvedValue(created);
    const recurringBillRepository = {
      create,
    } as unknown as RecurringBillRepository;

    const result = await createRecurringBillUseCase(
      {
        supplierId: "supplier-1",
        categoryId: "cat-1",
        description: "Aluguel",
        amount: 2000,
        dueDay: 5,
      },
      "org-1",
      { recurringBillRepository },
    );

    expect(create).toHaveBeenCalledWith({
      organizationId: "org-1",
      supplierId: "supplier-1",
      categoryId: "cat-1",
      description: "Aluguel",
      amount: "2000.00",
      dueDay: 5,
    });
    expect(result).toBe(created);
  });
});
