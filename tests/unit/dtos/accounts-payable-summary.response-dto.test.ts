import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toAccountsPayableSummaryResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable-summary.response-dto";
import type { AccountsPayableSummary } from "@/features/accounts-payable/domain/accounts-payable-summary.entity";

function buildSummary(
  overrides: Partial<AccountsPayableSummary> = {},
): AccountsPayableSummary {
  const zero = { count: 0, amount: new Prisma.Decimal(0) };
  return {
    total: zero,
    dueToday: zero,
    upcoming: zero,
    overdue: zero,
    paid: zero,
    ...overrides,
  };
}

describe("toAccountsPayableSummaryResponseDTO", () => {
  it("serializa cada bucket com amount como string decimal fixa", () => {
    const dto = toAccountsPayableSummaryResponseDTO(
      buildSummary({
        total: { count: 4, amount: new Prisma.Decimal("1326.00") },
        dueToday: { count: 1, amount: new Prisma.Decimal("18.50") },
        upcoming: { count: 1, amount: new Prisma.Decimal("428.00") },
        overdue: { count: 1, amount: new Prisma.Decimal("62.40") },
        paid: { count: 1, amount: new Prisma.Decimal("835.60") },
      }),
    );

    expect(dto.total).toEqual({ count: 4, amount: "1326.00" });
    expect(dto.dueToday).toEqual({ count: 1, amount: "18.50" });
    expect(dto.upcoming).toEqual({ count: 1, amount: "428.00" });
    expect(dto.overdue).toEqual({ count: 1, amount: "62.40" });
    expect(dto.paid).toEqual({ count: 1, amount: "835.60" });
  });

  it("serializa buckets zerados corretamente", () => {
    const dto = toAccountsPayableSummaryResponseDTO(buildSummary());

    expect(dto.total).toEqual({ count: 0, amount: "0.00" });
  });
});
