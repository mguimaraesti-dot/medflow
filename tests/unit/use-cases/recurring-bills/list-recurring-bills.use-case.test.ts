import { describe, it, expect, vi } from "vitest";
import { listRecurringBillsUseCase } from "@/features/recurring-bills/application/list-recurring-bills.use-case";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";

describe("listRecurringBillsUseCase", () => {
  it("delega ao repositório com o organizationId", async () => {
    const bills = [{ id: "bill-1" }];
    const listActive = vi.fn().mockResolvedValue(bills);
    const recurringBillRepository = {
      listActive,
    } as unknown as RecurringBillRepository;

    const result = await listRecurringBillsUseCase("org-1", {
      recurringBillRepository,
    });

    expect(listActive).toHaveBeenCalledWith("org-1");
    expect(result).toBe(bills);
  });
});
