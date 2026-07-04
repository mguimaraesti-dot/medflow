import { describe, it, expect, vi } from "vitest";
import { deactivateRecurringBillUseCase } from "@/features/recurring-bills/application/deactivate-recurring-bill.use-case";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";

describe("deactivateRecurringBillUseCase", () => {
  it("delega ao repositório o id da recorrência", async () => {
    const deactivated = { id: "bill-1", active: false };
    const deactivate = vi.fn().mockResolvedValue(deactivated);
    const recurringBillRepository = {
      deactivate,
    } as unknown as RecurringBillRepository;

    const result = await deactivateRecurringBillUseCase("bill-1", {
      recurringBillRepository,
    });

    expect(deactivate).toHaveBeenCalledWith("bill-1");
    expect(result).toBe(deactivated);
  });
});
