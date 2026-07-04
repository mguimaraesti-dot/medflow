import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toDashboardSummaryResponseDTO } from "@/features/dashboard/application/dtos/dashboard-summary.response-dto";
import type { DashboardSummary } from "@/features/dashboard/domain/dashboard-summary.entity";

function buildSummary(
  overrides: Partial<DashboardSummary> = {},
): DashboardSummary {
  return {
    currentBalance: new Prisma.Decimal("300.5"),
    cashRegisterStatus: "OPEN",
    revenueToday: new Prisma.Decimal("200"),
    expensesToday: new Prisma.Decimal("50"),
    resultToday: new Prisma.Decimal("150"),
    resultMonth: new Prisma.Decimal("1000"),
    dailySeries: [
      {
        date: new Date("2026-07-15T00:00:00Z"),
        totalIn: new Prisma.Decimal("200"),
        totalOut: new Prisma.Decimal("50"),
      },
    ],
    recentEntries: [],
    ...overrides,
  };
}

describe("toDashboardSummaryResponseDTO", () => {
  it("serializa todo campo monetário como string decimal fixa", () => {
    const dto = toDashboardSummaryResponseDTO(buildSummary());

    expect(dto.currentBalance).toBe("300.50");
    expect(dto.revenueToday).toBe("200.00");
    expect(dto.expensesToday).toBe("50.00");
    expect(dto.resultToday).toBe("150.00");
    expect(dto.resultMonth).toBe("1000.00");
    expect(dto.dailySeries[0].totalIn).toBe("200.00");
    expect(dto.dailySeries[0].totalOut).toBe("50.00");
    expect(typeof dto.currentBalance).toBe("string");
  });

  it("serializa a data da série diária como YYYY-MM-DD", () => {
    const dto = toDashboardSummaryResponseDTO(buildSummary());

    expect(dto.dailySeries[0].date).toBe("2026-07-15");
  });

  it("preserva cashRegisterStatus sem alteração", () => {
    const dto = toDashboardSummaryResponseDTO(
      buildSummary({ cashRegisterStatus: "NOT_OPENED" }),
    );

    expect(dto.cashRegisterStatus).toBe("NOT_OPENED");
  });
});
