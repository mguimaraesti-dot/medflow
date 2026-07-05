import { describe, it, expect, vi } from "vitest";
import { getAccountsPayableSummaryUseCase } from "@/features/accounts-payable/application/get-accounts-payable-summary.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

describe("getAccountsPayableSummaryUseCase", () => {
  it("repassa organizationId e período pro repositório", async () => {
    const summary = {
      total: { count: 4, amount: 0 },
      dueToday: { count: 1, amount: 0 },
      upcoming: { count: 1, amount: 0 },
      overdue: { count: 1, amount: 0 },
      paid: { count: 1, amount: 0 },
    };
    const getSummary = vi.fn().mockResolvedValue(summary);
    const accountsPayableRepository = {
      getSummary,
    } as unknown as AccountsPayableRepository;

    const dueDateFrom = new Date("2026-07-01T00:00:00.000Z");
    const dueDateTo = new Date("2026-07-31T23:59:59.999Z");

    const result = await getAccountsPayableSummaryUseCase(
      { dueDateFrom, dueDateTo },
      "org-1",
      { accountsPayableRepository },
    );

    expect(getSummary).toHaveBeenCalledWith("org-1", {
      dueDateFrom,
      dueDateTo,
    });
    expect(result).toBe(summary);
  });
});
